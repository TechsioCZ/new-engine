import { UpstreamHttpError } from "./zane-errors"
import {
  computeEffectiveBuilder,
  computeEffectiveGitSource,
  computeEffectiveHealthcheck,
  computeEffectiveResourceLimits,
} from "./zane-effective-service-config"
import { assertEnvironmentMatchesLane } from "./zane-lane-environment"
import { computeEffectiveUrls } from "./zane-effective-service-urls"
import {
  parseErrorMessage,
  updateCookiesFromHeaders,
  type HttpMethod,
  type ZaneSession,
} from "./zane-upstream"
import type {
  ZaneServiceReconciliationSpec,
  ZaneServiceDetails,
  ZaneServiceHealthcheck,
  ZaneServiceResourceLimits,
  ZaneServiceUrl,
  ZaneServiceVolume,
} from "./zane-contract"

interface ResolveEnvironmentWarning {
  code: "preview_excluded_services_present" | "preview_extra_services_present"
  message: string
  service_slugs: string[]
}

const previewBaselineCompleteEnvKey = "ZANE_OPERATOR_PREVIEW_BASELINE_COMPLETE"

interface ResolveEnvironmentInput {
  lane: "preview" | "main"
  projectSlug: string
  environmentName: string
  sourceEnvironmentName: string
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
  serviceSpecs: ZaneServiceReconciliationSpec[]
}

interface ArchiveEnvironmentInput {
  projectSlug: string
  environmentName: string
}

interface ZaneEnvironment {
  id: string
  is_preview: boolean
  name: string
}

interface ZaneEnvironmentWithVariables extends ZaneEnvironment {
  variables: Array<{
    id: string
    key: string
    value: string
  }>
}

interface ZaneServiceCard {
  slug: string
}

interface ZaneEnvironmentDeps {
  baseUrl: string
  authenticate(): Promise<ZaneSession>
  buildHeaders(
    session: ZaneSession | undefined,
    method: HttpMethod
  ): Record<string, string>
  getEnvironment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string
  ): Promise<ZaneEnvironmentWithVariables | null>
  listServiceCards(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string
  ): Promise<ZaneServiceCard[]>
  getServiceDetails(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string
  ): Promise<ZaneServiceDetails>
  request<T>(
    session: ZaneSession,
    method: HttpMethod,
    path: string,
    payload?: unknown,
    options?: {
      allowNotFound?: boolean
      retryOnAuthFailure?: boolean
    }
  ): Promise<T | null>
}

type ResolvedEnvironmentState = {
  lane: "preview" | "main"
  project_slug: string
  environment_id: string
  environment_name: string
  is_preview: boolean
  created: boolean
  baseline_complete: boolean
  cloned_from_environment: string | null
  ready: boolean
  expected_preview_service_slugs: string[]
  excluded_preview_service_slugs: string[]
  present_service_slugs: string[]
  missing_preview_service_slugs: string[]
  warnings: ResolveEnvironmentWarning[]
}

type CreateGitServicePayload = {
  slug: string
  repository_url: string
  branch_name: string
  builder: "DOCKERFILE"
  dockerfile_path: string
  build_context_dir: string
  git_app_id?: string
}

function buildCreateGitServicePayload(
  source: ZaneServiceDetails,
  projectSlug: string,
  environmentName: string
): CreateGitServicePayload {
  if (source.type !== "git") {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_reconcile_unsupported",
      `Preview safe-drift reconcile supports only Git services; ${projectSlug}/${environmentName}/${source.slug} is ${source.type}`
    )
  }

  const dockerfilePath =
    source.dockerfile_builder_options?.dockerfile_path?.trim() ?? ""
  const buildContextDir =
    source.dockerfile_builder_options?.build_context_dir?.trim() ?? ""
  const repositoryUrl = source.repository_url?.trim() ?? ""
  const branchName = source.branch_name?.trim() ?? ""

  if (!repositoryUrl || !branchName || !dockerfilePath || !buildContextDir) {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_reconcile_invalid_source",
      `Source service ${projectSlug}/${environmentName}/${source.slug} is missing Git clone metadata`
    )
  }

  return {
    slug: source.slug,
    repository_url: repositoryUrl,
    branch_name: branchName,
    builder: "DOCKERFILE",
    dockerfile_path: dockerfilePath,
    build_context_dir: buildContextDir,
    ...(source.git_app?.id ? { git_app_id: source.git_app.id } : {}),
  }
}

function buildDesiredGitSource(
  sourceDetails: ZaneServiceDetails,
  spec: ZaneServiceReconciliationSpec
): {
  repository_url: string
  branch_name: string
  commit_sha: string
  git_app_id: string | null
} {
  if (sourceDetails.type !== "git") {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_reconcile_unsupported",
      `Preview service-spec reconcile supports only Git services; ${sourceDetails.slug} is ${sourceDetails.type}`
    )
  }

  const repositoryUrl = sourceDetails.repository_url?.trim() ?? ""
  const branchName = sourceDetails.branch_name?.trim() ?? ""
  if (!repositoryUrl || !branchName) {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_reconcile_invalid_source",
      `Source service ${sourceDetails.slug} is missing Git source metadata`
    )
  }

  return {
    repository_url: repositoryUrl,
    branch_name: branchName,
    commit_sha: spec.git_source?.commit_sha?.trim() || "HEAD",
    git_app_id: sourceDetails.git_app?.id?.trim() ?? null,
  }
}

function buildDesiredBuilder(
  sourceDetails: ZaneServiceDetails,
  spec: ZaneServiceReconciliationSpec
): {
  builder: "DOCKERFILE"
  dockerfile_path: string
  build_context_dir: string
  build_stage_target: string | null
} {
  if (sourceDetails.type !== "git") {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_reconcile_unsupported",
      `Preview service-spec reconcile supports only Git services; ${sourceDetails.slug} is ${sourceDetails.type}`
    )
  }

  const dockerfilePath =
    sourceDetails.dockerfile_builder_options?.dockerfile_path?.trim() ?? ""
  const buildContextDir =
    sourceDetails.dockerfile_builder_options?.build_context_dir?.trim() ?? ""
  if (!dockerfilePath || !buildContextDir) {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_reconcile_invalid_source",
      `Source service ${sourceDetails.slug} is missing Dockerfile builder metadata`
    )
  }

  return {
    builder: "DOCKERFILE",
    dockerfile_path: dockerfilePath,
    build_context_dir: buildContextDir,
    build_stage_target:
      typeof spec.builder?.build_stage_target !== "undefined"
        ? (spec.builder.build_stage_target ?? null)
        : (sourceDetails.dockerfile_builder_options?.build_stage_target?.trim() ??
          null),
  }
}

function normalizeGitSourceShape(value: {
  repository_url: string | null
  branch_name: string | null
  commit_sha: string | null
  git_app_id: string | null
}): {
  repository_url: string | null
  branch_name: string | null
  commit_sha: string | null
  git_app_id: string | null
} {
  return {
    repository_url: value.repository_url,
    branch_name: value.branch_name,
    commit_sha: value.commit_sha,
    git_app_id: value.git_app_id,
  }
}

function normalizeBuilderShape(value: {
  builder: string | null
  dockerfile_path: string | null
  build_context_dir: string | null
  build_stage_target: string | null
}): {
  builder: string | null
  dockerfile_path: string | null
  build_context_dir: string | null
  build_stage_target: string | null
} {
  return {
    builder: value.builder,
    dockerfile_path: value.dockerfile_path,
    build_context_dir: value.build_context_dir,
    build_stage_target: value.build_stage_target,
  }
}

function normalizeHealthcheckShape(
  healthcheck: ZaneServiceHealthcheck | null
): {
  type: string
  value: string
  timeout_seconds: number
  interval_seconds: number
  associated_port: number | null
} | null {
  if (!healthcheck) {
    return null
  }

  return {
    type: healthcheck.type,
    value: healthcheck.value,
    timeout_seconds: healthcheck.timeout_seconds,
    interval_seconds: healthcheck.interval_seconds,
    associated_port: healthcheck.associated_port ?? null,
  }
}

function normalizeResourceLimitsShape(
  resourceLimits: ZaneServiceResourceLimits | null
): {
  cpus: number | string | null
  memory: { unit?: string; value?: number | string } | null
} | null {
  if (!resourceLimits) {
    return null
  }

  return {
    cpus: resourceLimits.cpus ?? null,
    memory: resourceLimits.memory
      ? {
          ...(resourceLimits.memory.unit
            ? { unit: resourceLimits.memory.unit }
            : {}),
          ...(typeof resourceLimits.memory.value !== "undefined"
            ? { value: resourceLimits.memory.value }
            : {}),
        }
      : null,
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function getSharedEnvironmentVariable(
  environment: ZaneEnvironmentWithVariables,
  key: string
): string | null {
  const variable = environment.variables.find((item) => item.key === key)
  return variable?.value ?? null
}

function normalizeUrlShape(url: ZaneServiceUrl): {
  domain: string
  base_path: string
  strip_prefix: boolean
  redirect_to: string | null
  associated_port: number | null
} {
  return {
    domain: url.domain,
    base_path: url.base_path,
    strip_prefix: url.strip_prefix ?? true,
    redirect_to: url.redirect_to ?? null,
    associated_port: url.associated_port ?? null,
  }
}

function buildUrlChangeValue(url: ZaneServiceUrl): Record<string, unknown> {
  return {
    domain: url.domain,
    base_path: url.base_path,
    strip_prefix: url.strip_prefix ?? true,
    ...(url.redirect_to ? { redirect_to: url.redirect_to } : {}),
    ...(typeof url.associated_port === "number"
      ? { associated_port: url.associated_port }
      : {}),
  }
}

function buildPreviewUrlDomain(
  projectSlug: string,
  serviceSlug: string,
  environmentName: string,
  sourceDomain: string
): string {
  const servicePrefix = `${projectSlug}-${serviceSlug}`
  const match = new RegExp(
    `^${escapeRegExp(servicePrefix)}(?<affix>[^.]*)\\.(?<root>.+)$`
  ).exec(sourceDomain)

  if (!match?.groups?.root) {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_url_contract_invalid",
      `Source service URL ${sourceDomain} does not match the repo-managed route contract for ${servicePrefix}`
    )
  }

  return `${environmentName}-${servicePrefix}${match.groups.affix ?? ""}.${match.groups.root}`
}

function buildDesiredPreviewUrls(
  input: ResolveEnvironmentInput,
  sourceDetails: ZaneServiceDetails
): ZaneServiceUrl[] {
  return (sourceDetails.urls ?? []).map((url) => ({
    ...url,
    domain: buildPreviewUrlDomain(
      input.projectSlug,
      sourceDetails.slug,
      input.environmentName,
      url.domain
    ),
  }))
}

function findMatchingUrl(
  currentUrls: ZaneServiceUrl[],
  desiredUrl: ZaneServiceUrl
): ZaneServiceUrl | undefined {
  return (
    currentUrls.find(
      (currentUrl) =>
        currentUrl.domain === desiredUrl.domain &&
        currentUrl.base_path === desiredUrl.base_path
    ) ??
    currentUrls.find(
      (currentUrl) =>
        (currentUrl.associated_port ?? null) ===
          (desiredUrl.associated_port ?? null) &&
        (currentUrl.redirect_to ?? null) === (desiredUrl.redirect_to ?? null)
    )
  )
}

function logResolveEnvironmentEvent(
  event: string,
  payload: Record<string, unknown>
): void {
  console.info(JSON.stringify({ event, ...payload }))
}

export class ZaneEnvironmentManager {
  readonly #deps: ZaneEnvironmentDeps

  constructor(deps: ZaneEnvironmentDeps) {
    this.#deps = deps
  }

  async resolveEnvironment(input: ResolveEnvironmentInput): Promise<ResolvedEnvironmentState> {
    const session = await this.#deps.authenticate()
    const existing = await this.#deps.getEnvironment(
      session,
      input.projectSlug,
      input.environmentName
    )

    if (existing) {
      logResolveEnvironmentEvent("resolve-environment.found", {
        lane: input.lane,
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
      })
      assertEnvironmentMatchesLane(existing, input.lane)
      return await this.resolveExistingEnvironment(session, input, existing)
    }

    if (input.lane !== "preview") {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.environmentName} does not exist in project ${input.projectSlug}`
      )
    }

    const cloned = await this.#deps.request<ZaneEnvironmentWithVariables>(
      session,
      "POST",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/clone-environment/${encodeURIComponent(
        input.sourceEnvironmentName
      )}/`,
      {
        name: input.environmentName,
        deploy_after_clone: false,
      }
    )

    if (!cloned) {
      throw new UpstreamHttpError(
        502,
        "zane_clone_empty",
        "ZaneOps clone response was empty"
      )
    }

    logResolveEnvironmentEvent("resolve-environment.preview.cloned", {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      source_environment_name: input.sourceEnvironmentName,
      deploy_after_clone: false,
    })

    await this.reconcileExcludedPreviewServices(
      session,
      input,
      input.excludedPreviewServiceSlugs
    )
    await this.reconcilePreviewServiceSpecs(
      session,
      input,
      input.serviceSpecs
    )
    await this.reconcilePreviewServiceUrls(
      session,
      input,
      input.expectedPreviewServiceSlugs
    )

    return await this.buildResolvedEnvironmentState(
      session,
      input,
      cloned,
      true,
      input.sourceEnvironmentName
    )
  }

  async archiveEnvironment(input: ArchiveEnvironmentInput): Promise<{
    project_slug: string
    environment_name: string
    deleted: boolean
    noop: boolean
    noop_reason: string | null
  }> {
    const session = await this.#deps.authenticate()
    const response = await fetch(
      `${this.#deps.baseUrl}/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(input.environmentName)}/`,
      {
        method: "DELETE",
        headers: this.#deps.buildHeaders(session, "DELETE"),
      }
    )

    updateCookiesFromHeaders(session.cookies, response.headers)

    if (response.status === 404) {
      return {
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        deleted: false,
        noop: true,
        noop_reason: "environment_not_found",
      }
    }

    if (!response.ok) {
      let errorMessage = `ZaneOps environment archive failed (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback message when upstream response is not JSON
      }
      throw new UpstreamHttpError(
        response.status,
        "zane_environment_archive_failed",
        errorMessage
      )
    }

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      deleted: true,
      noop: false,
      noop_reason: null,
    }
  }

  private async resolveExistingEnvironment(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    environment: ZaneEnvironmentWithVariables
  ): Promise<ResolvedEnvironmentState> {
    let state = await this.buildResolvedEnvironmentState(
      session,
      input,
      environment,
      false,
      null
    )

    if (input.lane !== "preview") {
      if (input.serviceSpecs.length > 0) {
        await this.reconcilePreviewServiceSpecs(session, input, input.serviceSpecs)
        state = await this.buildResolvedEnvironmentState(
          session,
          input,
          environment,
          false,
          null
        )
      }
      return state
    }

    if (state.ready && state.baseline_complete) {
      logResolveEnvironmentEvent("resolve-environment.preview.reuse", {
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        baseline_complete: state.baseline_complete,
        ready: state.ready,
      })
      return state
    }

    logResolveEnvironmentEvent("resolve-environment.preview.reconcile", {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      baseline_complete: state.baseline_complete,
      ready: state.ready,
      missing_preview_service_slugs: state.missing_preview_service_slugs,
      present_excluded_preview_service_slugs:
        state.excluded_preview_service_slugs.filter((serviceSlug) =>
          state.present_service_slugs.includes(serviceSlug)
        ),
    })

    await this.reconcileExcludedPreviewServices(
      session,
      input,
      state.excluded_preview_service_slugs.filter((serviceSlug) =>
        state.present_service_slugs.includes(serviceSlug)
      )
    )
    await this.reconcileMissingPreviewServices(
      session,
      input,
      state.missing_preview_service_slugs
    )
    await this.reconcilePreviewServiceSpecs(
      session,
      input,
      input.serviceSpecs
    )
    await this.reconcilePreviewServiceUrls(
      session,
      input,
      state.expected_preview_service_slugs
    )

    state = await this.buildResolvedEnvironmentState(
      session,
      input,
      environment,
      false,
      null
    )

    return state
  }

  private async reconcileMissingPreviewServices(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    missingServiceSlugs: string[]
  ): Promise<void> {
    if (missingServiceSlugs.length === 0) {
      return
    }

    logResolveEnvironmentEvent("resolve-environment.preview.clone-missing.start", {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slugs: [...new Set(missingServiceSlugs)],
    })

    for (const serviceSlug of missingServiceSlugs) {
      const sourceDetails = await this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.sourceEnvironmentName,
        serviceSlug
      )
      await this.cloneMissingPreviewService(session, input, sourceDetails)
    }
  }

  private async cloneMissingPreviewService(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    sourceDetails: ZaneServiceDetails
  ): Promise<void> {
    const createPayload = buildCreateGitServicePayload(
      sourceDetails,
      input.projectSlug,
      input.sourceEnvironmentName
    )

    await this.#deps.request(
      session,
      "POST",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
        input.environmentName
      )}/create-service/git/`,
      createPayload
    )

    logResolveEnvironmentEvent("resolve-environment.preview.clone-missing.service", {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slug: sourceDetails.slug,
    })

    if (sourceDetails.command) {
      await this.requestServiceChange(session, input, sourceDetails.slug, {
        field: "command",
        type: "UPDATE",
        new_value: sourceDetails.command,
      })
    }

    for (const volume of sourceDetails.volumes ?? []) {
      await this.addVolume(session, input, sourceDetails.slug, volume)
    }

    await this.reconcilePreviewServiceUrls(session, input, [sourceDetails.slug])

    if (sourceDetails.healthcheck) {
      await this.updateHealthcheck(
        session,
        input,
        sourceDetails.slug,
        sourceDetails.healthcheck
      )
    }

    if (sourceDetails.resource_limits) {
      await this.updateResourceLimits(
        session,
        input,
        sourceDetails.slug,
        sourceDetails.resource_limits
      )
    }

    for (const envVar of sourceDetails.env_variables ?? []) {
      await this.requestServiceChange(session, input, sourceDetails.slug, {
        field: "env_variables",
        type: "ADD",
        new_value: {
          key: envVar.key,
          value: envVar.value,
        },
      })
    }
  }

  private async reconcileExcludedPreviewServices(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlugs: string[]
  ): Promise<void> {
    if (input.lane !== "preview" || serviceSlugs.length === 0) {
      return
    }

    logResolveEnvironmentEvent("resolve-environment.preview.cleanup.start", {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slugs: [...new Set(serviceSlugs)],
    })

    for (const serviceSlug of [...new Set(serviceSlugs)]) {
      let currentDetails: ZaneServiceDetails
      try {
        currentDetails = await this.#deps.getServiceDetails(
          session,
          input.projectSlug,
          input.environmentName,
          serviceSlug
        )
      } catch (error) {
        if (error instanceof UpstreamHttpError && error.status === 404) {
          continue
        }

        throw error
      }
      await this.archiveService(
        session,
        input,
        serviceSlug,
        currentDetails.type
      )
      try {
        await this.#deps.getServiceDetails(
          session,
          input.projectSlug,
          input.environmentName,
          serviceSlug
        )
      } catch (error) {
        if (error instanceof UpstreamHttpError && error.status === 404) {
          logResolveEnvironmentEvent("resolve-environment.preview.cleanup.archived", {
            project_slug: input.projectSlug,
            environment_name: input.environmentName,
            service_slug: serviceSlug,
            service_type: currentDetails.type,
          })
          continue
        }

        throw error
      }

      throw new UpstreamHttpError(
        409,
        "preview_cleanup_service_still_present",
        `Preview cleanup did not remove excluded service ${serviceSlug} from ${input.projectSlug}/${input.environmentName}`,
      )
    }
  }

  private async reconcilePreviewServiceSpecs(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSpecs: ZaneServiceReconciliationSpec[]
  ): Promise<void> {
    if (input.lane !== "preview" || serviceSpecs.length === 0) {
      return
    }

    logResolveEnvironmentEvent("resolve-environment.preview.spec.start", {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slugs: [...new Set(serviceSpecs.map((spec) => spec.service_slug))],
    })

    for (const spec of serviceSpecs) {
      const sourceDetails = await this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.sourceEnvironmentName,
        spec.service_slug
      )
      let currentDetails = await this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.environmentName,
        spec.service_slug
      )

      if (spec.git_source?.sync_from_source) {
        currentDetails = await this.reconcilePreviewGitSource(
          session,
          input,
          spec,
          sourceDetails,
          currentDetails
        )
      }

      if (spec.builder?.sync_from_source) {
        currentDetails = await this.reconcilePreviewBuilder(
          session,
          input,
          spec,
          sourceDetails,
          currentDetails
        )
      }

      if (spec.healthcheck?.sync_from_source) {
        currentDetails = await this.reconcilePreviewHealthcheck(
          session,
          input,
          spec,
          sourceDetails,
          currentDetails
        )
      }

      if (spec.resource_limits?.sync_from_source) {
        currentDetails = await this.reconcilePreviewResourceLimits(
          session,
          input,
          spec,
          sourceDetails,
          currentDetails
        )
      }
    }
  }

  private async reconcilePreviewGitSource(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    spec: ZaneServiceReconciliationSpec,
    sourceDetails: ZaneServiceDetails,
    currentDetails: ZaneServiceDetails
  ): Promise<ZaneServiceDetails> {
    const desiredGitSource = buildDesiredGitSource(sourceDetails, spec)
    const ensureCurrentDetails = await this.cancelPendingFieldChangesIfPresent(
      session,
      input,
      spec.service_slug,
      currentDetails,
      "git_source"
    )
    const currentGitSource = normalizeGitSourceShape(
      computeEffectiveGitSource(ensureCurrentDetails)
    )

    if (
      JSON.stringify(currentGitSource) ===
      JSON.stringify(normalizeGitSourceShape(desiredGitSource))
    ) {
      return ensureCurrentDetails
    }

    await this.requestServiceChange(session, input, spec.service_slug, {
      field: "git_source",
      type: "UPDATE",
      new_value: {
        repository_url: desiredGitSource.repository_url,
        branch_name: desiredGitSource.branch_name,
        commit_sha: desiredGitSource.commit_sha,
        git_app_id: desiredGitSource.git_app_id,
      },
    })
    logResolveEnvironmentEvent("resolve-environment.preview.spec.git-source", {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slug: spec.service_slug,
      commit_sha: desiredGitSource.commit_sha,
    })

    return await this.getCurrentServiceDetails(session, input, spec.service_slug)
  }

  private async reconcilePreviewBuilder(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    spec: ZaneServiceReconciliationSpec,
    sourceDetails: ZaneServiceDetails,
    currentDetails: ZaneServiceDetails
  ): Promise<ZaneServiceDetails> {
    const desiredBuilder = buildDesiredBuilder(sourceDetails, spec)
    const ensuredCurrentDetails = await this.cancelPendingFieldChangesIfPresent(
      session,
      input,
      spec.service_slug,
      currentDetails,
      "builder"
    )
    const currentBuilder = normalizeBuilderShape(
      computeEffectiveBuilder(ensuredCurrentDetails)
    )

    if (
      JSON.stringify(currentBuilder) ===
      JSON.stringify(normalizeBuilderShape(desiredBuilder))
    ) {
      return ensuredCurrentDetails
    }

    await this.requestServiceChange(session, input, spec.service_slug, {
      field: "builder",
      type: "UPDATE",
      new_value: {
        builder: desiredBuilder.builder,
        dockerfile_path: desiredBuilder.dockerfile_path,
        build_context_dir: desiredBuilder.build_context_dir,
        build_stage_target: desiredBuilder.build_stage_target,
      },
    })
    logResolveEnvironmentEvent("resolve-environment.preview.spec.builder", {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slug: spec.service_slug,
      build_stage_target: desiredBuilder.build_stage_target,
    })

    return await this.getCurrentServiceDetails(session, input, spec.service_slug)
  }

  private async reconcilePreviewHealthcheck(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    spec: ZaneServiceReconciliationSpec,
    sourceDetails: ZaneServiceDetails,
    currentDetails: ZaneServiceDetails
  ): Promise<ZaneServiceDetails> {
    const desiredHealthcheck = normalizeHealthcheckShape(
      sourceDetails.healthcheck ?? null
    )
    if (!desiredHealthcheck) {
      return currentDetails
    }

    const ensuredCurrentDetails = await this.cancelPendingFieldChangesIfPresent(
      session,
      input,
      spec.service_slug,
      currentDetails,
      "healthcheck"
    )
    const currentHealthcheck = normalizeHealthcheckShape(
      computeEffectiveHealthcheck(ensuredCurrentDetails)
    )

    if (JSON.stringify(currentHealthcheck) === JSON.stringify(desiredHealthcheck)) {
      return ensuredCurrentDetails
    }

    await this.updateHealthcheck(
      session,
      input,
      spec.service_slug,
      desiredHealthcheck
    )
    logResolveEnvironmentEvent("resolve-environment.preview.spec.healthcheck", {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slug: spec.service_slug,
    })

    return await this.getCurrentServiceDetails(session, input, spec.service_slug)
  }

  private async reconcilePreviewResourceLimits(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    spec: ZaneServiceReconciliationSpec,
    sourceDetails: ZaneServiceDetails,
    currentDetails: ZaneServiceDetails
  ): Promise<ZaneServiceDetails> {
    const desiredResourceLimits = normalizeResourceLimitsShape(
      sourceDetails.resource_limits ?? null
    )
    if (!desiredResourceLimits) {
      return currentDetails
    }

    const ensuredCurrentDetails = await this.cancelPendingFieldChangesIfPresent(
      session,
      input,
      spec.service_slug,
      currentDetails,
      "resource_limits"
    )
    const currentResourceLimits = normalizeResourceLimitsShape(
      computeEffectiveResourceLimits(ensuredCurrentDetails)
    )

    if (
      JSON.stringify(currentResourceLimits) ===
      JSON.stringify(desiredResourceLimits)
    ) {
      return ensuredCurrentDetails
    }

    await this.updateResourceLimits(
      session,
      input,
      spec.service_slug,
      desiredResourceLimits
    )
    logResolveEnvironmentEvent("resolve-environment.preview.spec.resource-limits", {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slug: spec.service_slug,
    })

    return await this.getCurrentServiceDetails(session, input, spec.service_slug)
  }

  private async reconcilePreviewServiceUrls(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlugs: string[]
  ): Promise<void> {
    if (input.lane !== "preview" || serviceSlugs.length === 0) {
      return
    }

    logResolveEnvironmentEvent("resolve-environment.preview.urls.start", {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slugs: [...new Set(serviceSlugs)],
    })

    for (const serviceSlug of [...new Set(serviceSlugs)]) {
      const sourceDetails = await this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.sourceEnvironmentName,
        serviceSlug
      )
      let currentDetails = await this.getCurrentServiceDetails(
        session,
        input,
        serviceSlug
      )
      currentDetails = await this.cancelPendingFieldChangesIfPresent(
        session,
        input,
        serviceSlug,
        currentDetails,
        "urls"
      )
      const desiredUrls = buildDesiredPreviewUrls(input, sourceDetails)
      const desiredShapes = new Set(
        desiredUrls.map((url) => JSON.stringify(normalizeUrlShape(url)))
      )
      for (const currentUrl of currentDetails.urls ?? []) {
        if (desiredShapes.has(JSON.stringify(normalizeUrlShape(currentUrl)))) {
          continue
        }
        if (!currentUrl.id) {
          throw new UpstreamHttpError(
            409,
            "zane_preview_service_url_missing_id",
            `Cannot remove unexpected preview URL for ${input.projectSlug}/${input.environmentName}/${serviceSlug} because the URL id is missing`
          )
        }

        await this.deleteUrl(session, input, serviceSlug, currentUrl.id)
        logResolveEnvironmentEvent("resolve-environment.preview.urls.deleted", {
          project_slug: input.projectSlug,
          environment_name: input.environmentName,
          service_slug: serviceSlug,
          domain: currentUrl.domain,
          base_path: currentUrl.base_path,
        })
      }

      currentDetails = await this.getCurrentServiceDetails(session, input, serviceSlug)
      let effectiveCurrentUrls = computeEffectiveUrls(currentDetails)

      for (const desiredUrl of desiredUrls) {
        const currentUrl = findMatchingUrl(effectiveCurrentUrls, desiredUrl)
        if (currentUrl) {
          const currentShape = normalizeUrlShape(currentUrl)
          const desiredShape = normalizeUrlShape(desiredUrl)
          if (
            currentShape.domain === desiredShape.domain &&
            currentShape.base_path === desiredShape.base_path &&
            currentShape.strip_prefix === desiredShape.strip_prefix &&
            currentShape.redirect_to === desiredShape.redirect_to &&
            currentShape.associated_port === desiredShape.associated_port
          ) {
            continue
          }

          if (currentUrl.id) {
            await this.updateUrl(
              session,
              input,
              serviceSlug,
              currentUrl.id,
              desiredUrl
            )
            logResolveEnvironmentEvent("resolve-environment.preview.urls.updated", {
              project_slug: input.projectSlug,
              environment_name: input.environmentName,
              service_slug: serviceSlug,
              domain: desiredUrl.domain,
              base_path: desiredUrl.base_path,
            })
            currentDetails = await this.getCurrentServiceDetails(
              session,
              input,
              serviceSlug
            )
            effectiveCurrentUrls = computeEffectiveUrls(currentDetails)
            continue
          }
        }

        await this.addUrl(session, input, serviceSlug, desiredUrl)
        logResolveEnvironmentEvent("resolve-environment.preview.urls.added", {
          project_slug: input.projectSlug,
          environment_name: input.environmentName,
          service_slug: serviceSlug,
          domain: desiredUrl.domain,
          base_path: desiredUrl.base_path,
        })
        currentDetails = await this.getCurrentServiceDetails(
          session,
          input,
          serviceSlug
        )
        effectiveCurrentUrls = computeEffectiveUrls(currentDetails)
      }
    }
  }

  private async addVolume(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    volume: ZaneServiceVolume
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "volumes",
      type: "ADD",
      new_value: {
        name: volume.name,
        container_path: volume.container_path,
        host_path: volume.host_path ?? null,
        mode: volume.mode,
      },
    })
  }

  private async addUrl(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    url: ZaneServiceUrl
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "urls",
      type: "ADD",
      new_value: buildUrlChangeValue(url),
    })
  }

  private async deleteUrl(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    itemId: string
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "urls",
      type: "DELETE",
      item_id: itemId,
    })
  }

  private async updateUrl(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    itemId: string,
    url: ZaneServiceUrl
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "urls",
      type: "UPDATE",
      item_id: itemId,
      new_value: buildUrlChangeValue(url),
    })
  }

  private async updateHealthcheck(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    healthcheck: ZaneServiceHealthcheck
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "healthcheck",
      type: "UPDATE",
      new_value: {
        type: healthcheck.type,
        value: healthcheck.value,
        timeout_seconds: healthcheck.timeout_seconds,
        interval_seconds: healthcheck.interval_seconds,
        associated_port: healthcheck.associated_port ?? null,
      },
    })
  }

  private async updateResourceLimits(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    resourceLimits: ZaneServiceResourceLimits
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "resource_limits",
      type: "UPDATE",
      new_value: resourceLimits,
    })
  }

  private async getCurrentServiceDetails(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string
  ): Promise<ZaneServiceDetails> {
    return await this.#deps.getServiceDetails(
      session,
      input.projectSlug,
      input.environmentName,
      serviceSlug
    )
  }

  private listPendingFieldChanges(
    serviceDetails: ZaneServiceDetails,
    field:
      | "git_source"
      | "builder"
      | "healthcheck"
      | "resource_limits"
      | "urls"
  ): Array<{ id: string }> {
    return (serviceDetails.unapplied_changes ?? []).flatMap((change) =>
      change.field === field && typeof change.id === "string"
        ? [{ id: change.id }]
        : []
    )
  }

  private async cancelPendingFieldChangesIfPresent(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    serviceDetails: ZaneServiceDetails,
    field:
      | "git_source"
      | "builder"
      | "healthcheck"
      | "resource_limits"
      | "urls"
  ): Promise<ZaneServiceDetails> {
    const pendingChanges = this.listPendingFieldChanges(serviceDetails, field)
    if (pendingChanges.length === 0) {
      return serviceDetails
    }

    for (const change of pendingChanges) {
      await this.cancelServiceChange(session, input, serviceSlug, change.id)
    }

    return await this.getCurrentServiceDetails(session, input, serviceSlug)
  }

  private async requestServiceChange(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    payload: unknown
  ): Promise<void> {
    await this.#deps.request(
      session,
      "PUT",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
        input.environmentName
      )}/request-service-changes/${encodeURIComponent(serviceSlug)}/`,
      payload
    )
  }

  private async cancelServiceChange(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    changeId: string
  ): Promise<void> {
    await this.#deps.request(
      session,
      "DELETE",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
        input.environmentName
      )}/cancel-service-changes/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(
        changeId
      )}/`
    )
  }

  private async archiveService(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    serviceType: "docker" | "git"
  ): Promise<void> {
    const path =
      serviceType === "git"
        ? `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName
          )}/archive-service/git/${encodeURIComponent(serviceSlug)}/`
        : `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName
          )}/archive-service/docker/${encodeURIComponent(serviceSlug)}/`

    await this.#deps.request(session, "DELETE", path)
  }

  private async buildResolvedEnvironmentState(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    environment: ZaneEnvironmentWithVariables,
    created: boolean,
    clonedFromEnvironment: string | null
  ): Promise<ResolvedEnvironmentState> {
    const cards = await this.#deps.listServiceCards(
      session,
      input.projectSlug,
      environment.name
    )
    const presentServiceSlugs = [...new Set(cards.map((service) => service.slug))].sort()
    const expectedPreviewServiceSlugs = [...new Set(input.expectedPreviewServiceSlugs)].sort()
    const excludedPreviewServiceSlugs = [...new Set(input.excludedPreviewServiceSlugs)].sort()
    const presentSet = new Set(presentServiceSlugs)
    const expectedSet = new Set(expectedPreviewServiceSlugs)
    const excludedSet = new Set(excludedPreviewServiceSlugs)
    const missingPreviewServiceSlugs = expectedPreviewServiceSlugs.filter(
      (slug) => !presentSet.has(slug)
    )
    const warnings: ResolveEnvironmentWarning[] = []

    if (input.lane === "preview") {
      const excludedPresent = excludedPreviewServiceSlugs.filter((slug) =>
        presentSet.has(slug)
      )
      if (excludedPresent.length > 0) {
        warnings.push({
          code: "preview_excluded_services_present",
          message: `Preview environment ${environment.name} still contains non-cloned services: ${excludedPresent.join(", ")}`,
          service_slugs: excludedPresent,
        })
      }

      const extraPresent = presentServiceSlugs.filter(
        (slug) => !expectedSet.has(slug) && !excludedSet.has(slug)
      )
      if (extraPresent.length > 0) {
        warnings.push({
          code: "preview_extra_services_present",
          message: `Preview environment ${environment.name} contains additional services outside the managed preview clone set: ${extraPresent.join(", ")}`,
          service_slugs: extraPresent,
        })
      }
    }

    const state = {
      lane: input.lane,
      project_slug: input.projectSlug,
      environment_id: environment.id,
      environment_name: environment.name,
      is_preview: environment.is_preview,
      created,
      baseline_complete:
        getSharedEnvironmentVariable(environment, previewBaselineCompleteEnvKey) ===
        "true",
      cloned_from_environment: clonedFromEnvironment,
      ready: missingPreviewServiceSlugs.length === 0,
      expected_preview_service_slugs: expectedPreviewServiceSlugs,
      excluded_preview_service_slugs: excludedPreviewServiceSlugs,
      present_service_slugs: presentServiceSlugs,
      missing_preview_service_slugs: missingPreviewServiceSlugs,
      warnings,
    }

    logResolveEnvironmentEvent("resolve-environment.state", {
      lane: state.lane,
      project_slug: state.project_slug,
      environment_name: state.environment_name,
      environment_id: state.environment_id,
      created: state.created,
      baseline_complete: state.baseline_complete,
      ready: state.ready,
      missing_preview_service_slugs: state.missing_preview_service_slugs,
      warning_count: state.warnings.length,
    })

    return state
  }
}

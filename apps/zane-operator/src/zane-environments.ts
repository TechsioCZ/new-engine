import type {
  ZaneServiceReconciliationSpec,
  ZaneServiceDetails,
  ZaneServiceHealthcheck,
  ZaneServiceResourceLimits,
  ZaneServiceUrl,
  ZaneServiceVolume,
} from "./zane-contract"
import {
  computeEffectiveBuilder,
  computeEffectiveGitSource,
  computeEffectiveHealthcheck,
  computeEffectiveResourceLimits,
} from "./zane-effective-service-config"
import { computeEffectiveUrls } from "./zane-effective-service-urls"
import { UpstreamHttpError } from "./zane-errors"
import { assertEnvironmentMatchesLane } from "./zane-lane-environment"
import { parseErrorMessage, updateCookiesFromHeaders } from "./zane-upstream"
import type { HttpMethod, ZaneSession } from "./zane-upstream"

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
  variables: {
    id: string
    key: string
    value: string
  }[]
}

interface ZaneServiceCard {
  slug: string
}

interface ZaneEnvironmentDeps {
  baseUrl: string
  authenticate: () => Promise<ZaneSession>
  buildHeaders: (
    session: ZaneSession | undefined,
    method: HttpMethod,
  ) => Record<string, string>
  getEnvironment: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ) => Promise<ZaneEnvironmentWithVariables | null>
  listServiceCards: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ) => Promise<ZaneServiceCard[]>
  getServiceDetails: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ) => Promise<ZaneServiceDetails>
  request: <T>(
    session: ZaneSession,
    method: HttpMethod,
    path: string,
    payload?: unknown,
    options?: {
      allowNotFound?: boolean
      retryOnAuthFailure?: boolean
    },
  ) => Promise<T | null>
}

interface ResolvedEnvironmentState {
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

type ReconciledServiceField = NonNullable<
  ZaneServiceDetails["unapplied_changes"]
>[number]["field"]

interface CreateGitServicePayload {
  slug: string
  repository_url: string
  branch_name: string
  builder: "DOCKERFILE"
  dockerfile_path: string
  build_context_dir: string
  git_app_id?: string
}

const buildCreateGitServicePayload = (
  source: ZaneServiceDetails,
  projectSlug: string,
  environmentName: string,
): CreateGitServicePayload => {
  if (source.type !== "git") {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_reconcile_unsupported",
      `Preview safe-drift reconcile supports only Git services; ${projectSlug}/${environmentName}/${source.slug} is ${source.type}`,
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
      `Source service ${projectSlug}/${environmentName}/${source.slug} is missing Git clone metadata`,
    )
  }

  return {
    branch_name: branchName,
    build_context_dir: buildContextDir,
    builder: "DOCKERFILE",
    dockerfile_path: dockerfilePath,
    repository_url: repositoryUrl,
    slug: source.slug,
    ...(typeof source.git_app?.id === "string" && source.git_app.id.length > 0
      ? { git_app_id: source.git_app.id }
      : {}),
  }
}

const buildDesiredGitSource = (
  sourceDetails: ZaneServiceDetails,
  spec: ZaneServiceReconciliationSpec,
): {
  repository_url: string
  branch_name: string
  git_app_id: string | null
} => {
  if (sourceDetails.type !== "git") {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_reconcile_unsupported",
      `Preview service-spec reconcile supports only Git services; ${sourceDetails.slug} is ${sourceDetails.type}`,
    )
  }

  const repositoryUrl = sourceDetails.repository_url?.trim() ?? ""
  const branchName =
    spec.git_source?.branch_name?.trim() ??
    sourceDetails.branch_name?.trim() ??
    ""
  if (repositoryUrl.length === 0 || branchName.length === 0) {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_reconcile_invalid_source",
      `Source service ${sourceDetails.slug} is missing Git source metadata`,
    )
  }

  return {
    branch_name: branchName,
    git_app_id: sourceDetails.git_app?.id?.trim() ?? null,
    repository_url: repositoryUrl,
  }
}

const buildDesiredBuilder = (
  sourceDetails: ZaneServiceDetails,
  spec: ZaneServiceReconciliationSpec,
): {
  builder: "DOCKERFILE"
  dockerfile_path: string
  build_context_dir: string
  build_stage_target: string | null
} => {
  if (sourceDetails.type !== "git") {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_reconcile_unsupported",
      `Preview service-spec reconcile supports only Git services; ${sourceDetails.slug} is ${sourceDetails.type}`,
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
      `Source service ${sourceDetails.slug} is missing Dockerfile builder metadata`,
    )
  }

  return {
    build_context_dir: buildContextDir,
    build_stage_target:
      spec.builder?.build_stage_target === undefined
        ? (sourceDetails.dockerfile_builder_options?.build_stage_target?.trim() ??
          null)
        : (spec.builder.build_stage_target ?? null),
    builder: "DOCKERFILE",
    dockerfile_path: dockerfilePath,
  }
}

const normalizeGitSourceShape = (value: {
  repository_url: string | null
  branch_name: string | null
  git_app_id: string | null
}): {
  repository_url: string | null
  branch_name: string | null
  git_app_id: string | null
} => ({
  branch_name: value.branch_name,
  git_app_id: value.git_app_id,
  repository_url: value.repository_url,
})

const normalizeBuilderShape = (value: {
  builder: string | null
  dockerfile_path: string | null
  build_context_dir: string | null
  build_stage_target: string | null
}): {
  builder: string | null
  dockerfile_path: string | null
  build_context_dir: string | null
  build_stage_target: string | null
} => ({
  build_context_dir: value.build_context_dir,
  build_stage_target: value.build_stage_target,
  builder: value.builder,
  dockerfile_path: value.dockerfile_path,
})

const normalizeHealthcheckShape = (
  healthcheck: ZaneServiceHealthcheck | null,
): {
  type: string
  value: string
  timeout_seconds: number
  interval_seconds: number
  associated_port: number | null
} | null => {
  if (!healthcheck) {
    return null
  }

  return {
    associated_port: healthcheck.associated_port ?? null,
    interval_seconds: healthcheck.interval_seconds,
    timeout_seconds: healthcheck.timeout_seconds,
    type: healthcheck.type,
    value: healthcheck.value,
  }
}

const normalizeResourceLimitsShape = (
  resourceLimits: ZaneServiceResourceLimits | null,
): {
  cpus: number | string | null
  memory: { unit?: string; value?: number | string } | null
} | null => {
  if (!resourceLimits) {
    return null
  }

  return {
    cpus: resourceLimits.cpus ?? null,
    memory: resourceLimits.memory
      ? {
          ...(typeof resourceLimits.memory.unit === "string" &&
          resourceLimits.memory.unit.length > 0
            ? { unit: resourceLimits.memory.unit }
            : {}),
          ...(resourceLimits.memory.value === undefined
            ? {}
            : { value: resourceLimits.memory.value }),
        }
      : null,
  }
}

const escapeRegExp = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&")

const getSharedEnvironmentVariable = (
  environment: ZaneEnvironmentWithVariables,
  key: string,
): string | null => {
  const variable = environment.variables.find((item) => item.key === key)
  return variable?.value ?? null
}

const normalizeUrlShape = (
  url: ZaneServiceUrl,
): {
  domain: string
  base_path: string
  strip_prefix: boolean
  redirect_to: string | null
  associated_port: number | null
} => ({
  associated_port: url.associated_port ?? null,
  base_path: url.base_path,
  domain: url.domain,
  redirect_to: url.redirect_to ?? null,
  strip_prefix: url.strip_prefix ?? true,
})

const buildUrlChangeValue = (url: ZaneServiceUrl): Record<string, unknown> => ({
  base_path: url.base_path,
  domain: url.domain,
  strip_prefix: url.strip_prefix ?? true,
  ...(typeof url.redirect_to === "string" && url.redirect_to.length > 0
    ? { redirect_to: url.redirect_to }
    : {}),
  ...(typeof url.associated_port === "number"
    ? { associated_port: url.associated_port }
    : {}),
})

const buildBuilderChangeValue = (value: {
  builder: string
  dockerfile_path: string
  build_context_dir: string
  build_stage_target: string | null
}): Record<string, unknown> => ({
  build_context_dir: value.build_context_dir,
  builder: value.builder,
  dockerfile_path: value.dockerfile_path,
  ...(typeof value.build_stage_target === "string" &&
  value.build_stage_target.trim().length > 0
    ? { build_stage_target: value.build_stage_target }
    : {}),
})

const buildHealthcheckChangeValue = (
  healthcheck: ZaneServiceHealthcheck,
): Record<string, unknown> => ({
  interval_seconds: healthcheck.interval_seconds,
  timeout_seconds: healthcheck.timeout_seconds,
  type: healthcheck.type,
  value: healthcheck.value,
  ...(typeof healthcheck.associated_port === "number"
    ? { associated_port: healthcheck.associated_port }
    : {}),
})

const buildPreviewUrlDomain = (
  projectSlug: string,
  serviceSlug: string,
  environmentName: string,
  sourceDomain: string,
): string => {
  const servicePrefix = `${projectSlug}-${serviceSlug}`
  const match = new RegExp(
    `^${escapeRegExp(servicePrefix)}(?<affix>[^.]*)\\.(?<root>.+)$`,
    "u",
  ).exec(sourceDomain)

  const { affix, root } = match?.groups ?? {}
  if (typeof root !== "string" || root.length === 0) {
    throw new UpstreamHttpError(
      409,
      "zane_preview_service_url_contract_invalid",
      `Source service URL ${sourceDomain} does not match the repo-managed route contract for ${servicePrefix}`,
    )
  }

  return `${environmentName}-${servicePrefix}${affix ?? ""}.${root}`
}

const buildDesiredPreviewUrls = (
  input: ResolveEnvironmentInput,
  sourceDetails: ZaneServiceDetails,
): ZaneServiceUrl[] =>
  (sourceDetails.urls ?? []).map((url) => ({
    ...url,
    domain: buildPreviewUrlDomain(
      input.projectSlug,
      sourceDetails.slug,
      input.environmentName,
      url.domain,
    ),
  }))

const urlRouteMatches = (
  currentUrl: ZaneServiceUrl,
  desiredUrl: ZaneServiceUrl,
): boolean =>
  currentUrl.domain === desiredUrl.domain &&
  currentUrl.base_path === desiredUrl.base_path

const urlTargetMatches = (
  currentUrl: ZaneServiceUrl,
  desiredUrl: ZaneServiceUrl,
): boolean => {
  const currentPort = currentUrl.associated_port ?? null
  const desiredPort = desiredUrl.associated_port ?? null
  const currentRedirect = currentUrl.redirect_to ?? null
  const desiredRedirect = desiredUrl.redirect_to ?? null
  return currentPort === desiredPort && currentRedirect === desiredRedirect
}

const findMatchingUrl = (
  currentUrls: ZaneServiceUrl[],
  desiredUrl: ZaneServiceUrl,
): ZaneServiceUrl | undefined =>
  currentUrls.find((currentUrl) => urlRouteMatches(currentUrl, desiredUrl)) ??
  currentUrls.find((currentUrl) => urlTargetMatches(currentUrl, desiredUrl))

const urlShapesMatch = (
  currentUrl: ZaneServiceUrl,
  desiredUrl: ZaneServiceUrl,
): boolean =>
  JSON.stringify(normalizeUrlShape(currentUrl)) ===
  JSON.stringify(normalizeUrlShape(desiredUrl))

const logResolveEnvironmentEvent = (
  event: string,
  payload: Record<string, unknown>,
): void => {
  console.info(JSON.stringify({ event, ...payload }))
}

export class ZaneEnvironmentManager {
  readonly #deps: ZaneEnvironmentDeps

  constructor(deps: ZaneEnvironmentDeps) {
    this.#deps = deps
  }

  async resolveEnvironment(
    input: ResolveEnvironmentInput,
  ): Promise<ResolvedEnvironmentState> {
    const session = await this.#deps.authenticate()
    const existing = await this.#deps.getEnvironment(
      session,
      input.projectSlug,
      input.environmentName,
    )

    if (existing) {
      logResolveEnvironmentEvent("resolve-environment.found", {
        environment_name: input.environmentName,
        lane: input.lane,
        project_slug: input.projectSlug,
      })
      assertEnvironmentMatchesLane(existing, input.lane)
      return await this.resolveExistingEnvironment(session, input, existing)
    }

    if (input.lane !== "preview") {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.environmentName} does not exist in project ${input.projectSlug}`,
      )
    }

    const cloned = await this.#deps.request<ZaneEnvironmentWithVariables>(
      session,
      "POST",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/clone-environment/${encodeURIComponent(
        input.sourceEnvironmentName,
      )}/`,
      {
        deploy_after_clone: false,
        name: input.environmentName,
      },
    )

    if (!cloned) {
      throw new UpstreamHttpError(
        502,
        "zane_clone_empty",
        "ZaneOps clone response was empty",
      )
    }

    logResolveEnvironmentEvent("resolve-environment.preview.cloned", {
      deploy_after_clone: false,
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      source_environment_name: input.sourceEnvironmentName,
    })

    await this.reconcileExcludedPreviewServices(
      session,
      input,
      input.excludedPreviewServiceSlugs,
    )
    await this.reconcilePreviewServiceSpecs(session, input, input.serviceSpecs)
    await this.reconcilePreviewServiceUrls(
      session,
      input,
      input.expectedPreviewServiceSlugs,
    )

    return await this.buildResolvedEnvironmentState(
      session,
      input,
      cloned,
      true,
      input.sourceEnvironmentName,
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
        headers: this.#deps.buildHeaders(session, "DELETE"),
        method: "DELETE",
      },
    )

    updateCookiesFromHeaders(session.cookies, response.headers)

    if (response.status === 404) {
      return {
        deleted: false,
        environment_name: input.environmentName,
        noop: true,
        noop_reason: "environment_not_found",
        project_slug: input.projectSlug,
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
        errorMessage,
      )
    }

    return {
      deleted: true,
      environment_name: input.environmentName,
      noop: false,
      noop_reason: null,
      project_slug: input.projectSlug,
    }
  }

  private async resolveExistingEnvironment(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    environment: ZaneEnvironmentWithVariables,
  ): Promise<ResolvedEnvironmentState> {
    let state = await this.buildResolvedEnvironmentState(
      session,
      input,
      environment,
      false,
      null,
    )

    if (input.lane !== "preview") {
      if (input.serviceSpecs.length > 0) {
        await this.reconcilePreviewServiceSpecs(
          session,
          input,
          input.serviceSpecs,
        )
        state = await this.buildResolvedEnvironmentState(
          session,
          input,
          environment,
          false,
          null,
        )
      }
      return state
    }

    if (state.ready && state.baseline_complete) {
      logResolveEnvironmentEvent("resolve-environment.preview.reuse", {
        baseline_complete: state.baseline_complete,
        environment_name: input.environmentName,
        project_slug: input.projectSlug,
        ready: state.ready,
      })
      return state
    }

    const requiresBaselineReplay =
      state.missing_preview_service_slugs.length > 0

    const presentServiceSlugs = new Set(state.present_service_slugs)
    const presentExcludedPreviewServiceSlugs =
      state.excluded_preview_service_slugs.filter((serviceSlug) =>
        presentServiceSlugs.has(serviceSlug),
      )
    logResolveEnvironmentEvent("resolve-environment.preview.reconcile", {
      baseline_complete: state.baseline_complete,
      environment_name: input.environmentName,
      missing_preview_service_slugs: state.missing_preview_service_slugs,
      present_excluded_preview_service_slugs:
        presentExcludedPreviewServiceSlugs,
      project_slug: input.projectSlug,
      ready: state.ready,
    })

    await this.reconcileExcludedPreviewServices(
      session,
      input,
      presentExcludedPreviewServiceSlugs,
    )
    await this.reconcileMissingPreviewServices(
      session,
      input,
      state.missing_preview_service_slugs,
    )
    await this.reconcilePreviewServiceSpecs(session, input, input.serviceSpecs)
    await this.reconcilePreviewServiceUrls(
      session,
      input,
      state.expected_preview_service_slugs,
    )

    state = await this.buildResolvedEnvironmentState(
      session,
      input,
      environment,
      false,
      null,
    )

    if (requiresBaselineReplay && state.baseline_complete) {
      // Recreated preview-cloned services exist but have not been baseline-deployed yet.
      state = {
        ...state,
        baseline_complete: false,
      }
    }

    return state
  }

  private async reconcileMissingPreviewServices(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    missingServiceSlugs: string[],
  ): Promise<void> {
    if (missingServiceSlugs.length === 0) {
      return
    }

    logResolveEnvironmentEvent(
      "resolve-environment.preview.clone-missing.start",
      {
        environment_name: input.environmentName,
        project_slug: input.projectSlug,
        service_slugs: [...new Set(missingServiceSlugs)],
      },
    )

    await Promise.all(
      missingServiceSlugs.map(async (serviceSlug) => {
        const sourceDetails = await this.#deps.getServiceDetails(
          session,
          input.projectSlug,
          input.sourceEnvironmentName,
          serviceSlug,
        )
        await this.cloneMissingPreviewService(session, input, sourceDetails)
      }),
    )
  }

  private async cloneMissingPreviewService(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    sourceDetails: ZaneServiceDetails,
  ): Promise<void> {
    const createPayload = buildCreateGitServicePayload(
      sourceDetails,
      input.projectSlug,
      input.sourceEnvironmentName,
    )

    await this.#deps.request(
      session,
      "POST",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
        input.environmentName,
      )}/create-service/git/`,
      createPayload,
    )

    logResolveEnvironmentEvent(
      "resolve-environment.preview.clone-missing.service",
      {
        environment_name: input.environmentName,
        project_slug: input.projectSlug,
        service_slug: sourceDetails.slug,
      },
    )

    if (
      typeof sourceDetails.command === "string" &&
      sourceDetails.command.length > 0
    ) {
      await this.requestServiceChange(session, input, sourceDetails.slug, {
        field: "command",
        new_value: sourceDetails.command,
        type: "UPDATE",
      })
    }

    await Promise.all(
      (sourceDetails.volumes ?? []).map(async (volume) => {
        await this.addVolume(session, input, sourceDetails.slug, volume)
      }),
    )

    await this.reconcilePreviewServiceUrls(session, input, [sourceDetails.slug])

    if (sourceDetails.healthcheck) {
      await this.updateHealthcheck(
        session,
        input,
        sourceDetails.slug,
        sourceDetails.healthcheck,
      )
    }

    if (sourceDetails.resource_limits) {
      await this.updateResourceLimits(
        session,
        input,
        sourceDetails.slug,
        sourceDetails.resource_limits,
      )
    }

    await Promise.all(
      (sourceDetails.env_variables ?? []).map(async (envVar) => {
        await this.requestServiceChange(session, input, sourceDetails.slug, {
          field: "env_variables",
          new_value: {
            key: envVar.key,
            value: envVar.value,
          },
          type: "ADD",
        })
      }),
    )
  }

  private async reconcileExcludedPreviewServices(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlugs: string[],
  ): Promise<void> {
    if (input.lane !== "preview" || serviceSlugs.length === 0) {
      return
    }

    logResolveEnvironmentEvent("resolve-environment.preview.cleanup.start", {
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      service_slugs: [...new Set(serviceSlugs)],
    })

    await Promise.all(
      [...new Set(serviceSlugs)].map(async (serviceSlug) => {
        await this.reconcileExcludedPreviewService(session, input, serviceSlug)
      }),
    )
  }

  private async reconcileExcludedPreviewService(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
  ): Promise<void> {
    let currentDetails: ZaneServiceDetails
    try {
      currentDetails = await this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.environmentName,
        serviceSlug,
      )
    } catch (error) {
      if (error instanceof UpstreamHttpError && error.status === 404) {
        return
      }
      throw error
    }

    await this.archiveService(session, input, serviceSlug, currentDetails.type)
    try {
      await this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.environmentName,
        serviceSlug,
      )
    } catch (error) {
      if (error instanceof UpstreamHttpError && error.status === 404) {
        logResolveEnvironmentEvent(
          "resolve-environment.preview.cleanup.archived",
          {
            environment_name: input.environmentName,
            project_slug: input.projectSlug,
            service_slug: serviceSlug,
            service_type: currentDetails.type,
          },
        )
        return
      }
      throw error
    }

    throw new UpstreamHttpError(
      409,
      "preview_cleanup_service_still_present",
      `Preview cleanup did not remove excluded service ${serviceSlug} from ${input.projectSlug}/${input.environmentName}`,
    )
  }

  private async reconcilePreviewServiceSpecs(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSpecs: ZaneServiceReconciliationSpec[],
  ): Promise<void> {
    if (input.lane !== "preview" || serviceSpecs.length === 0) {
      return
    }

    logResolveEnvironmentEvent("resolve-environment.preview.spec.start", {
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      service_slugs: [
        ...new Set(serviceSpecs.map((spec) => spec.service_slug)),
      ],
    })

    await Promise.all(
      serviceSpecs.map(async (spec) => {
        await this.reconcilePreviewServiceSpec(session, input, spec)
      }),
    )
  }

  private async reconcilePreviewServiceSpec(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    spec: ZaneServiceReconciliationSpec,
  ): Promise<void> {
    const [sourceDetails, initialCurrentDetails] = await Promise.all([
      this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.sourceEnvironmentName,
        spec.service_slug,
      ),
      this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.environmentName,
        spec.service_slug,
      ),
    ])
    let currentDetails = initialCurrentDetails

    if (spec.git_source?.sync_from_source === true) {
      currentDetails = await this.reconcilePreviewGitSource(
        session,
        input,
        spec,
        sourceDetails,
        currentDetails,
      )
    }
    if (spec.builder?.sync_from_source === true) {
      currentDetails = await this.reconcilePreviewBuilder(
        session,
        input,
        spec,
        sourceDetails,
        currentDetails,
      )
    }
    if (spec.healthcheck?.sync_from_source === true) {
      currentDetails = await this.reconcilePreviewHealthcheck(
        session,
        input,
        spec,
        sourceDetails,
        currentDetails,
      )
    }
    if (spec.resource_limits?.sync_from_source === true) {
      await this.reconcilePreviewResourceLimits(
        session,
        input,
        spec,
        sourceDetails,
        currentDetails,
      )
    }
  }

  private async reconcilePreviewGitSource(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    spec: ZaneServiceReconciliationSpec,
    sourceDetails: ZaneServiceDetails,
    currentDetails: ZaneServiceDetails,
  ): Promise<ZaneServiceDetails> {
    const desiredGitSource = buildDesiredGitSource(sourceDetails, spec)
    const currentGitSource = normalizeGitSourceShape(
      computeEffectiveGitSource(currentDetails),
    )

    if (
      JSON.stringify(currentGitSource) ===
      JSON.stringify(normalizeGitSourceShape(desiredGitSource))
    ) {
      return currentDetails
    }

    await this.requestServiceChange(session, input, spec.service_slug, {
      field: "git_source",
      new_value: {
        branch_name: desiredGitSource.branch_name,
        git_app_id: desiredGitSource.git_app_id,
        repository_url: desiredGitSource.repository_url,
      },
      type: "UPDATE",
    })
    logResolveEnvironmentEvent("resolve-environment.preview.spec.git-source", {
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      service_slug: spec.service_slug,
    })

    return await this.getCurrentServiceDetails(
      session,
      input,
      spec.service_slug,
    )
  }

  private async reconcilePreviewBuilder(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    spec: ZaneServiceReconciliationSpec,
    sourceDetails: ZaneServiceDetails,
    currentDetails: ZaneServiceDetails,
  ): Promise<ZaneServiceDetails> {
    const desiredBuilder = buildDesiredBuilder(sourceDetails, spec)
    const currentBuilder = normalizeBuilderShape(
      computeEffectiveBuilder(currentDetails),
    )

    if (
      JSON.stringify(currentBuilder) ===
      JSON.stringify(normalizeBuilderShape(desiredBuilder))
    ) {
      return currentDetails
    }

    await this.requestServiceChange(session, input, spec.service_slug, {
      field: "builder",
      new_value: buildBuilderChangeValue(desiredBuilder),
      type: "UPDATE",
    })
    logResolveEnvironmentEvent("resolve-environment.preview.spec.builder", {
      build_stage_target: desiredBuilder.build_stage_target,
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      service_slug: spec.service_slug,
    })

    return await this.getCurrentServiceDetails(
      session,
      input,
      spec.service_slug,
    )
  }

  private async reconcilePreviewHealthcheck(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    spec: ZaneServiceReconciliationSpec,
    sourceDetails: ZaneServiceDetails,
    currentDetails: ZaneServiceDetails,
  ): Promise<ZaneServiceDetails> {
    const desiredHealthcheck = normalizeHealthcheckShape(
      sourceDetails.healthcheck ?? null,
    )
    if (!desiredHealthcheck) {
      return currentDetails
    }

    const ensuredCurrentDetails = await this.cancelPendingFieldChangesIfPresent(
      session,
      input,
      spec.service_slug,
      currentDetails,
      "healthcheck",
    )
    const currentHealthcheck = normalizeHealthcheckShape(
      computeEffectiveHealthcheck(ensuredCurrentDetails),
    )

    if (
      JSON.stringify(currentHealthcheck) === JSON.stringify(desiredHealthcheck)
    ) {
      return ensuredCurrentDetails
    }

    await this.updateHealthcheck(
      session,
      input,
      spec.service_slug,
      desiredHealthcheck,
    )
    logResolveEnvironmentEvent("resolve-environment.preview.spec.healthcheck", {
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      service_slug: spec.service_slug,
    })

    return await this.getCurrentServiceDetails(
      session,
      input,
      spec.service_slug,
    )
  }

  private async reconcilePreviewResourceLimits(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    spec: ZaneServiceReconciliationSpec,
    sourceDetails: ZaneServiceDetails,
    currentDetails: ZaneServiceDetails,
  ): Promise<ZaneServiceDetails> {
    const desiredResourceLimits = normalizeResourceLimitsShape(
      sourceDetails.resource_limits ?? null,
    )
    if (!desiredResourceLimits) {
      return currentDetails
    }

    const ensuredCurrentDetails = await this.cancelPendingFieldChangesIfPresent(
      session,
      input,
      spec.service_slug,
      currentDetails,
      "resource_limits",
    )
    const currentResourceLimits = normalizeResourceLimitsShape(
      computeEffectiveResourceLimits(ensuredCurrentDetails),
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
      desiredResourceLimits,
    )
    logResolveEnvironmentEvent(
      "resolve-environment.preview.spec.resource-limits",
      {
        environment_name: input.environmentName,
        project_slug: input.projectSlug,
        service_slug: spec.service_slug,
      },
    )

    return await this.getCurrentServiceDetails(
      session,
      input,
      spec.service_slug,
    )
  }

  private async reconcilePreviewServiceUrls(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlugs: string[],
  ): Promise<void> {
    if (input.lane !== "preview" || serviceSlugs.length === 0) {
      return
    }

    logResolveEnvironmentEvent("resolve-environment.preview.urls.start", {
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      service_slugs: [...new Set(serviceSlugs)],
    })

    await Promise.all(
      [...new Set(serviceSlugs)].map(async (serviceSlug) => {
        await this.reconcilePreviewServiceUrl(session, input, serviceSlug)
      }),
    )
  }

  private async reconcilePreviewServiceUrl(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
  ): Promise<void> {
    const [sourceDetails, initialCurrentDetails] = await Promise.all([
      this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.sourceEnvironmentName,
        serviceSlug,
      ),
      this.getCurrentServiceDetails(session, input, serviceSlug),
    ])
    const currentDetails = await this.cancelPendingFieldChangesIfPresent(
      session,
      input,
      serviceSlug,
      initialCurrentDetails,
      "urls",
    )
    const desiredUrls = buildDesiredPreviewUrls(input, sourceDetails)
    const desiredShapes = new Set(
      desiredUrls.map((url) => JSON.stringify(normalizeUrlShape(url))),
    )
    const unexpectedUrls = (currentDetails.urls ?? []).filter(
      (url) => !desiredShapes.has(JSON.stringify(normalizeUrlShape(url))),
    )
    await this.deleteUnexpectedPreviewUrls(
      session,
      input,
      serviceSlug,
      unexpectedUrls,
      0,
    )

    const refreshedDetails = await this.getCurrentServiceDetails(
      session,
      input,
      serviceSlug,
    )
    await this.reconcileDesiredPreviewUrls(
      session,
      input,
      serviceSlug,
      desiredUrls,
      0,
      computeEffectiveUrls(refreshedDetails),
    )
  }

  private async deleteUnexpectedPreviewUrls(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    urls: ZaneServiceUrl[],
    index: number,
  ): Promise<void> {
    const currentUrl = urls[index]
    if (!currentUrl) {
      return
    }
    if (typeof currentUrl.id !== "string" || currentUrl.id.length === 0) {
      throw new UpstreamHttpError(
        409,
        "zane_preview_service_url_missing_id",
        `Cannot remove unexpected preview URL for ${input.projectSlug}/${input.environmentName}/${serviceSlug} because the URL id is missing`,
      )
    }

    await this.deleteUrl(session, input, serviceSlug, currentUrl.id)
    logResolveEnvironmentEvent("resolve-environment.preview.urls.deleted", {
      base_path: currentUrl.base_path,
      domain: currentUrl.domain,
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      service_slug: serviceSlug,
    })
    await this.deleteUnexpectedPreviewUrls(
      session,
      input,
      serviceSlug,
      urls,
      index + 1,
    )
  }

  private async reconcileDesiredPreviewUrls(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    desiredUrls: ZaneServiceUrl[],
    index: number,
    effectiveCurrentUrls: ZaneServiceUrl[],
  ): Promise<void> {
    const desiredUrl = desiredUrls[index]
    if (!desiredUrl) {
      return
    }
    const currentUrl = findMatchingUrl(effectiveCurrentUrls, desiredUrl)
    if (currentUrl && urlShapesMatch(currentUrl, desiredUrl)) {
      await this.reconcileDesiredPreviewUrls(
        session,
        input,
        serviceSlug,
        desiredUrls,
        index + 1,
        effectiveCurrentUrls,
      )
      return
    }

    if (typeof currentUrl?.id === "string" && currentUrl.id.length > 0) {
      await this.updateUrl(
        session,
        input,
        serviceSlug,
        currentUrl.id,
        desiredUrl,
      )
      logResolveEnvironmentEvent("resolve-environment.preview.urls.updated", {
        base_path: desiredUrl.base_path,
        domain: desiredUrl.domain,
        environment_name: input.environmentName,
        project_slug: input.projectSlug,
        service_slug: serviceSlug,
      })
    } else {
      await this.addUrl(session, input, serviceSlug, desiredUrl)
      logResolveEnvironmentEvent("resolve-environment.preview.urls.added", {
        base_path: desiredUrl.base_path,
        domain: desiredUrl.domain,
        environment_name: input.environmentName,
        project_slug: input.projectSlug,
        service_slug: serviceSlug,
      })
    }

    const refreshedDetails = await this.getCurrentServiceDetails(
      session,
      input,
      serviceSlug,
    )
    await this.reconcileDesiredPreviewUrls(
      session,
      input,
      serviceSlug,
      desiredUrls,
      index + 1,
      computeEffectiveUrls(refreshedDetails),
    )
  }

  private async addVolume(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    volume: ZaneServiceVolume,
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "volumes",
      new_value: {
        container_path: volume.container_path,
        host_path: volume.host_path ?? null,
        mode: volume.mode,
        name: volume.name,
      },
      type: "ADD",
    })
  }

  private async addUrl(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    url: ZaneServiceUrl,
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "urls",
      new_value: buildUrlChangeValue(url),
      type: "ADD",
    })
  }

  private async deleteUrl(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    itemId: string,
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "urls",
      item_id: itemId,
      type: "DELETE",
    })
  }

  private async updateUrl(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    itemId: string,
    url: ZaneServiceUrl,
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "urls",
      item_id: itemId,
      new_value: buildUrlChangeValue(url),
      type: "UPDATE",
    })
  }

  private async updateHealthcheck(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    healthcheck: ZaneServiceHealthcheck,
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "healthcheck",
      new_value: buildHealthcheckChangeValue(healthcheck),
      type: "UPDATE",
    })
  }

  private async updateResourceLimits(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    resourceLimits: ZaneServiceResourceLimits,
  ): Promise<void> {
    await this.requestServiceChange(session, input, serviceSlug, {
      field: "resource_limits",
      new_value: resourceLimits,
      type: "UPDATE",
    })
  }

  private async getCurrentServiceDetails(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
  ): Promise<ZaneServiceDetails> {
    return await this.#deps.getServiceDetails(
      session,
      input.projectSlug,
      input.environmentName,
      serviceSlug,
    )
  }

  private static listPendingFieldChanges(
    serviceDetails: ZaneServiceDetails,
    field: ReconciledServiceField,
  ): { id: string }[] {
    return (serviceDetails.unapplied_changes ?? []).flatMap((change) =>
      change.field === field && typeof change.id === "string"
        ? [{ id: change.id }]
        : [],
    )
  }

  private async cancelPendingFieldChangesIfPresent(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    serviceDetails: ZaneServiceDetails,
    field: ReconciledServiceField,
  ): Promise<ZaneServiceDetails> {
    const pendingChanges = ZaneEnvironmentManager.listPendingFieldChanges(
      serviceDetails,
      field,
    )
    if (pendingChanges.length === 0) {
      return serviceDetails
    }

    await Promise.all(
      pendingChanges.map(async (change) => {
        await this.cancelServiceChange(session, input, serviceSlug, change.id)
      }),
    )

    return await this.getCurrentServiceDetails(session, input, serviceSlug)
  }

  private async requestServiceChange(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    payload: unknown,
  ): Promise<void> {
    await this.#deps.request(
      session,
      "PUT",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
        input.environmentName,
      )}/request-service-changes/${encodeURIComponent(serviceSlug)}/`,
      payload,
    )
  }

  private async cancelServiceChange(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    changeId: string,
  ): Promise<void> {
    await this.#deps.request(
      session,
      "DELETE",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
        input.environmentName,
      )}/cancel-service-changes/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(
        changeId,
      )}/`,
    )
  }

  private async archiveService(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlug: string,
    serviceType: "docker" | "git",
  ): Promise<void> {
    const path =
      serviceType === "git"
        ? `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/archive-service/git/${encodeURIComponent(serviceSlug)}/`
        : `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/archive-service/docker/${encodeURIComponent(serviceSlug)}/`

    await this.#deps.request(session, "DELETE", path)
  }

  private async buildResolvedEnvironmentState(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    environment: ZaneEnvironmentWithVariables,
    created: boolean,
    clonedFromEnvironment: string | null,
  ): Promise<ResolvedEnvironmentState> {
    const cards = await this.#deps.listServiceCards(
      session,
      input.projectSlug,
      environment.name,
    )
    const presentServiceSlugs = [
      ...new Set(cards.map((service) => service.slug)),
    ].toSorted()
    const expectedPreviewServiceSlugs = [
      ...new Set(input.expectedPreviewServiceSlugs),
    ].toSorted()
    const excludedPreviewServiceSlugs = [
      ...new Set(input.excludedPreviewServiceSlugs),
    ].toSorted()
    const presentSet = new Set(presentServiceSlugs)
    const expectedSet = new Set(expectedPreviewServiceSlugs)
    const excludedSet = new Set(excludedPreviewServiceSlugs)
    const missingPreviewServiceSlugs = expectedPreviewServiceSlugs.filter(
      (slug) => !presentSet.has(slug),
    )
    const warnings: ResolveEnvironmentWarning[] = []

    if (input.lane === "preview") {
      const excludedPresent = excludedPreviewServiceSlugs.filter((slug) =>
        presentSet.has(slug),
      )
      if (excludedPresent.length > 0) {
        warnings.push({
          code: "preview_excluded_services_present",
          message: `Preview environment ${environment.name} still contains non-cloned services: ${excludedPresent.join(", ")}`,
          service_slugs: excludedPresent,
        })
      }

      const extraPresent = presentServiceSlugs.filter(
        (slug) => !expectedSet.has(slug) && !excludedSet.has(slug),
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
      baseline_complete:
        getSharedEnvironmentVariable(
          environment,
          previewBaselineCompleteEnvKey,
        ) === "true",
      cloned_from_environment: clonedFromEnvironment,
      created,
      environment_id: environment.id,
      environment_name: environment.name,
      excluded_preview_service_slugs: excludedPreviewServiceSlugs,
      expected_preview_service_slugs: expectedPreviewServiceSlugs,
      is_preview: environment.is_preview,
      lane: input.lane,
      missing_preview_service_slugs: missingPreviewServiceSlugs,
      present_service_slugs: presentServiceSlugs,
      project_slug: input.projectSlug,
      ready: missingPreviewServiceSlugs.length === 0,
      warnings,
    }

    logResolveEnvironmentEvent("resolve-environment.state", {
      baseline_complete: state.baseline_complete,
      created: state.created,
      environment_id: state.environment_id,
      environment_name: state.environment_name,
      lane: state.lane,
      missing_preview_service_slugs: state.missing_preview_service_slugs,
      project_slug: state.project_slug,
      ready: state.ready,
      warning_count: state.warnings.length,
    })

    return state
  }
}

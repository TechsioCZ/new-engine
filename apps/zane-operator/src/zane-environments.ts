import { UpstreamHttpError } from "./zane-errors"
import { assertEnvironmentMatchesLane } from "./zane-lane-environment"
import {
  parseErrorMessage,
  updateCookiesFromHeaders,
  type HttpMethod,
  type ZaneSession,
} from "./zane-upstream"
import type {
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
      return state
    }

    if (state.ready && state.baseline_complete) {
      return state
    }

    await this.reconcileMissingPreviewServices(
      session,
      input,
      state.missing_preview_service_slugs
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

  private async reconcilePreviewServiceUrls(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    serviceSlugs: string[]
  ): Promise<void> {
    if (input.lane !== "preview" || serviceSlugs.length === 0) {
      return
    }

    for (const serviceSlug of [...new Set(serviceSlugs)]) {
      const sourceDetails = await this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.sourceEnvironmentName,
        serviceSlug
      )
      const currentDetails = await this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.environmentName,
        serviceSlug
      )
      const desiredUrls = buildDesiredPreviewUrls(input, sourceDetails)

      for (const desiredUrl of desiredUrls) {
        const currentUrl = findMatchingUrl(currentDetails.urls ?? [], desiredUrl)
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
            continue
          }
        }

        await this.addUrl(session, input, serviceSlug, desiredUrl)
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
      new_value: {
        domain: url.domain,
        base_path: url.base_path,
        strip_prefix: url.strip_prefix ?? true,
        redirect_to: url.redirect_to ?? null,
        associated_port: url.associated_port ?? null,
      },
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
      new_value: {
        domain: url.domain,
        base_path: url.base_path,
        strip_prefix: url.strip_prefix ?? true,
        redirect_to: url.redirect_to ?? null,
        associated_port: url.associated_port ?? null,
      },
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

    return {
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
  }
}

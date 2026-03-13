import { UpstreamHttpError } from "./zane-errors"
import { parseErrorMessage, updateCookiesFromHeaders, type HttpMethod, type ZaneSession } from "./zane-upstream"

interface ResolveEnvironmentWarning {
  code: "preview_excluded_services_present" | "preview_extra_services_present"
  message: string
  service_slugs: string[]
}

interface ResolveEnvironmentInput {
  lane: "preview" | "main"
  projectSlug: string
  environmentName: string
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
  buildHeaders(session: ZaneSession | undefined, method: HttpMethod): Record<string, string>
  getEnvironment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ): Promise<ZaneEnvironmentWithVariables | null>
  listServiceCards(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ): Promise<ZaneServiceCard[]>
  request<T>(
    session: ZaneSession,
    method: HttpMethod,
    path: string,
    payload?: unknown,
    options?: {
      allowNotFound?: boolean
      retryOnAuthFailure?: boolean
    },
  ): Promise<T | null>
}

const ZANE_PRODUCTION_ENVIRONMENT_NAME = "production"

function assertEnvironmentMatchesLane(environment: Pick<ZaneEnvironment, "name" | "is_preview">, lane: "preview" | "main"): void {
  if (lane === "main" && environment.is_preview) {
    throw new UpstreamHttpError(
      409,
      "zane_environment_lane_mismatch",
      `Environment ${environment.name} is a preview environment and cannot be used for main lane operations`,
    )
  }

  if (lane === "preview" && !environment.is_preview) {
    throw new UpstreamHttpError(
      409,
      "zane_environment_lane_mismatch",
      `Environment ${environment.name} is not a preview environment and cannot be used for preview lane operations`,
    )
  }
}

export class ZaneEnvironmentManager {
  readonly #deps: ZaneEnvironmentDeps

  constructor(deps: ZaneEnvironmentDeps) {
    this.#deps = deps
  }

  async resolveEnvironment(input: ResolveEnvironmentInput): Promise<{
    lane: "preview" | "main"
    project_slug: string
    environment_id: string
    environment_name: string
    is_preview: boolean
    created: boolean
    cloned_from_environment: string | null
    ready: boolean
    expected_preview_service_slugs: string[]
    excluded_preview_service_slugs: string[]
    present_service_slugs: string[]
    missing_preview_service_slugs: string[]
    warnings: ResolveEnvironmentWarning[]
  }> {
    const session = await this.#deps.authenticate()
    const existing = await this.#deps.getEnvironment(session, input.projectSlug, input.environmentName)

    if (existing) {
      assertEnvironmentMatchesLane(existing, input.lane)
      return await this.buildResolvedEnvironmentState(session, input, existing, false, null)
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
        ZANE_PRODUCTION_ENVIRONMENT_NAME,
      )}/`,
      {
        name: input.environmentName,
        deploy_after_clone: false,
      },
    )

    if (!cloned) {
      throw new UpstreamHttpError(502, "zane_clone_empty", "ZaneOps clone response was empty")
    }

    return await this.buildResolvedEnvironmentState(session, input, cloned, true, ZANE_PRODUCTION_ENVIRONMENT_NAME)
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
      },
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
      throw new UpstreamHttpError(response.status, "zane_environment_archive_failed", errorMessage)
    }

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      deleted: true,
      noop: false,
      noop_reason: null,
    }
  }

  private async buildResolvedEnvironmentState(
    session: ZaneSession,
    input: ResolveEnvironmentInput,
    environment: ZaneEnvironment,
    created: boolean,
    clonedFromEnvironment: string | null,
  ): Promise<{
    lane: "preview" | "main"
    project_slug: string
    environment_id: string
    environment_name: string
    is_preview: boolean
    created: boolean
    cloned_from_environment: string | null
    ready: boolean
    expected_preview_service_slugs: string[]
    excluded_preview_service_slugs: string[]
    present_service_slugs: string[]
    missing_preview_service_slugs: string[]
    warnings: ResolveEnvironmentWarning[]
  }> {
    const cards = await this.#deps.listServiceCards(session, input.projectSlug, environment.name)
    const presentServiceSlugs = [...new Set(cards.map((service) => service.slug))].sort()
    const expectedPreviewServiceSlugs = [...new Set(input.expectedPreviewServiceSlugs)].sort()
    const excludedPreviewServiceSlugs = [...new Set(input.excludedPreviewServiceSlugs)].sort()
    const presentSet = new Set(presentServiceSlugs)
    const expectedSet = new Set(expectedPreviewServiceSlugs)
    const excludedSet = new Set(excludedPreviewServiceSlugs)
    const missingPreviewServiceSlugs = expectedPreviewServiceSlugs.filter((slug) => !presentSet.has(slug))
    const warnings: ResolveEnvironmentWarning[] = []

    if (input.lane === "preview") {
      const excludedPresent = excludedPreviewServiceSlugs.filter((slug) => presentSet.has(slug))
      if (excludedPresent.length > 0) {
        warnings.push({
          code: "preview_excluded_services_present",
          message: `Preview environment ${environment.name} still contains non-cloned services: ${excludedPresent.join(", ")}`,
          service_slugs: excludedPresent,
        })
      }

      const extraPresent = presentServiceSlugs.filter((slug) => !expectedSet.has(slug) && !excludedSet.has(slug))
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

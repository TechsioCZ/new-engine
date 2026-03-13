import { UpstreamHttpError } from "./zane-errors"
import { parseErrorMessage, type ZaneSession } from "./zane-upstream"

interface ResolveTargetInput {
  service_id: string
  service_slug: string
}

interface EnvOverrideInput {
  service_id: string
  service_slug: string
  env: Record<string, string>
}

type ServiceType = "docker" | "git"
type JsonRecord = Record<string, unknown>

interface ZaneEnvVariable {
  id: string
  key: string
  value: string
}

interface ZaneServiceCard {
  slug: string
}

interface ZaneServiceDetails {
  slug: string
  type: ServiceType | string
  commit_sha?: string | null
  deploy_token: string
  env_variables: ZaneEnvVariable[]
  unapplied_changes?: Array<{ id: string }>
}

interface ZaneResolvedCurrentDeployment {
  deployment_hash: string
  status: string
  commit_sha: string | null
  env: Record<string, string>
}

interface ZaneResolvedTarget {
  service_id: string
  service_slug: string
  service_type: ServiceType
  configured_commit_sha?: string | null
  deploy_token: string
  deploy_url: string
  env_change_url: string
  details_url: string
  has_unapplied_changes?: boolean
  current_production_deployment?: ZaneResolvedCurrentDeployment | null
  active_deployment?: ZaneResolvedCurrentDeployment | null
}

interface TriggeredDeployment {
  service_id: string
  service_slug: string
  service_type: ServiceType
  deployment_hash: string
  status: string
}

interface ZaneDeployment {
  hash: string
  is_current_production?: boolean
  commit_sha?: string | null
  status: string
  service_snapshot?: {
    env_variables?: ZaneEnvVariable[]
  }
}

interface ZaneDeployOpsDeps {
  baseUrl: string
  authenticate(): Promise<ZaneSession>
  buildHeaders(session: ZaneSession | undefined, method: "PUT"): Record<string, string>
  listServiceCards(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ): Promise<ZaneServiceCard[]>
  getServiceDetails(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ): Promise<ZaneServiceDetails>
  getDeployment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
    deploymentHash: string,
  ): Promise<ZaneDeployment>
  listDeployments(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ): Promise<ZaneDeployment[]>
  request<T>(
    session: ZaneSession,
    method: "PUT",
    path: string,
    payload?: unknown,
    options?: {
      allowNotFound?: boolean
      retryOnAuthFailure?: boolean
    },
  ): Promise<T | null>
}

function assertServiceType(value: unknown, label: string): ServiceType {
  if (typeof value !== "string") {
    throw new UpstreamHttpError(502, "zane_service_type_invalid", `${label} must be docker or git`)
  }

  switch (value.toUpperCase()) {
    case "DOCKER":
    case "DOCKER_REGISTRY":
      return "docker"
    case "GIT":
    case "GIT_REPOSITORY":
      return "git"
    default:
      throw new UpstreamHttpError(502, "zane_service_type_invalid", `${label} must be docker or git`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export class ZaneDeployOps {
  readonly #deps: ZaneDeployOpsDeps

  constructor(deps: ZaneDeployOpsDeps) {
    this.#deps = deps
  }

  async resolveTargets(input: {
    projectSlug: string
    environmentName: string
    services: ResolveTargetInput[]
  }): Promise<{
    project_slug: string
    environment_name: string
    services: ZaneResolvedTarget[]
  }> {
    const session = await this.#deps.authenticate()
    const cards = await this.#deps.listServiceCards(session, input.projectSlug, input.environmentName)
    const cardBySlug = new Map(cards.map((service) => [service.slug, service]))

    const services = await Promise.all(
      input.services.map(async (service) => {
        const card = cardBySlug.get(service.service_slug)
        if (!card) {
          throw new UpstreamHttpError(
            404,
            "zane_service_not_found",
            `Service ${service.service_slug} was not found in ${input.projectSlug}/${input.environmentName}`,
          )
        }

        const details = await this.#deps.getServiceDetails(session, input.projectSlug, input.environmentName, service.service_slug)
        const deployments = await this.#deps.listDeployments(session, input.projectSlug, input.environmentName, details.slug)
        const currentProductionDeploymentSummary =
          deployments.find(
            (deployment) => deployment.is_current_production === true && deployment.status.toUpperCase() === "HEALTHY",
          ) ?? null
        const currentProductionDeployment = currentProductionDeploymentSummary
          ? await this.#deps.getDeployment(
              session,
              input.projectSlug,
              input.environmentName,
              details.slug,
              currentProductionDeploymentSummary.hash,
            )
          : null
        const activeDeploymentSummary =
          deployments.find((deployment) =>
            ["QUEUED", "PREPARING", "BUILDING", "STARTING", "RESTARTING"].includes(
              deployment.status.toUpperCase(),
            ),
          ) ?? null
        const activeDeployment = activeDeploymentSummary
          ? await this.#deps.getDeployment(
              session,
              input.projectSlug,
              input.environmentName,
              details.slug,
              activeDeploymentSummary.hash,
            )
          : null

        return {
          service_id: service.service_id,
          service_slug: details.slug,
          service_type: assertServiceType(details.type, `${service.service_slug}.service_type`),
          configured_commit_sha: details.commit_sha ?? null,
          deploy_token: details.deploy_token,
          deploy_url:
            assertServiceType(details.type, `${service.service_slug}.service_type`) === "docker"
              ? `/api/deploy-service/docker/${details.deploy_token}/`
              : `/api/deploy-service/git/${details.deploy_token}/`,
          env_change_url: `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/request-service-changes/${encodeURIComponent(details.slug)}/`,
          details_url: `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/service-details/${encodeURIComponent(details.slug)}/`,
          has_unapplied_changes: Array.isArray(details.unapplied_changes) && details.unapplied_changes.length > 0,
          current_production_deployment: currentProductionDeployment
            ? {
                deployment_hash: currentProductionDeployment.hash,
                status: currentProductionDeployment.status,
                commit_sha: currentProductionDeployment.commit_sha ?? null,
                env: Object.fromEntries(
                  (currentProductionDeployment.service_snapshot?.env_variables ?? []).map((envVar) => [
                    envVar.key,
                    envVar.value,
                  ]),
                ),
              }
            : null,
          active_deployment: activeDeployment
            ? {
                deployment_hash: activeDeployment.hash,
                status: activeDeployment.status,
                commit_sha: activeDeployment.commit_sha ?? null,
                env: Object.fromEntries(
                  (activeDeployment.service_snapshot?.env_variables ?? []).map((envVar) => [envVar.key, envVar.value]),
                ),
              }
            : null,
        } satisfies ZaneResolvedTarget
      }),
    )

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      services,
    }
  }

  async applyEnvOverrides(input: {
    projectSlug: string
    environmentName: string
    targets: ZaneResolvedTarget[]
    envOverrides: EnvOverrideInput[]
  }): Promise<{
    project_slug: string
    environment_name: string
    noop: boolean
    applied_service_ids: string[]
    applied_changes: Array<{
      service_id: string
      service_slug: string
      key: string
      change_type: "ADD" | "UPDATE" | "SKIP"
    }>
  }> {
    if (input.envOverrides.length === 0) {
      return {
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        noop: true,
        applied_service_ids: [],
        applied_changes: [],
      }
    }

    const session = await this.#deps.authenticate()
    const targetsByServiceId = new Map(input.targets.map((target) => [target.service_id, target]))
    const appliedServiceIds = new Set<string>()
    const appliedChanges: Array<{
      service_id: string
      service_slug: string
      key: string
      change_type: "ADD" | "UPDATE" | "SKIP"
    }> = []

    for (const override of input.envOverrides) {
      const target = targetsByServiceId.get(override.service_id)
      if (!target) {
        throw new UpstreamHttpError(
          404,
          "zane_target_missing",
          `No resolved target found for service ${override.service_slug} (${override.service_id})`,
        )
      }

      const serviceDetails = await this.#deps.getServiceDetails(
        session,
        input.projectSlug,
        input.environmentName,
        target.service_slug,
      )
      const envByKey = new Map(serviceDetails.env_variables.map((envVar) => [envVar.key, envVar]))

      for (const [key, value] of Object.entries(override.env)) {
        const current = envByKey.get(key)
        if (current?.value === value) {
          appliedChanges.push({
            service_id: override.service_id,
            service_slug: override.service_slug,
            key,
            change_type: "SKIP",
          })
          continue
        }

        const changeType: "ADD" | "UPDATE" = current ? "UPDATE" : "ADD"
        const requestBody: JsonRecord = {
          field: "env_variables",
          type: changeType,
          new_value: {
            key,
            value,
          },
        }

        if (current) {
          requestBody.item_id = current.id
        }

        await this.#deps.request(
          session,
          "PUT",
          `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/request-service-changes/${encodeURIComponent(target.service_slug)}/`,
          requestBody,
        )

        appliedServiceIds.add(override.service_id)
        appliedChanges.push({
          service_id: override.service_id,
          service_slug: override.service_slug,
          key,
          change_type: changeType,
        })
      }
    }

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      noop: appliedServiceIds.size === 0,
      applied_service_ids: Array.from(appliedServiceIds),
      applied_changes: appliedChanges,
    }
  }

  async triggerDeploys(input: {
    projectSlug: string
    environmentName: string
    targets: ZaneResolvedTarget[]
    gitCommitSha?: string
  }): Promise<{
    project_slug: string
    environment_name: string
    triggered_service_ids: string[]
    services: TriggeredDeployment[]
  }> {
    const session = await this.#deps.authenticate()
    const deployments = await Promise.all(
      input.targets.map(async (target) => {
        const body =
          target.service_type === "docker"
            ? { cleanup_queue: false, commit_message: "CI selective deploy" }
            : {
                cleanup_queue: false,
                ignore_build_cache: false,
                ...(input.gitCommitSha ? { commit_sha: input.gitCommitSha } : {}),
              }

        const previousDeploymentHashes = new Set(
          (await this.#deps.listDeployments(session, input.projectSlug, input.environmentName, target.service_slug)).map(
            (deployment) => deployment.hash,
          ),
        )

        await this.triggerDeployment(target, body)
        const deployment = await this.findTriggeredDeployment(
          session,
          input.projectSlug,
          input.environmentName,
          target.service_slug,
          previousDeploymentHashes,
        )
        return {
          service_id: target.service_id,
          service_slug: target.service_slug,
          service_type: target.service_type,
          deployment_hash: deployment.hash,
          status: deployment.status,
        } satisfies TriggeredDeployment
      }),
    )

    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      triggered_service_ids: deployments.map((deployment) => deployment.service_id),
      services: deployments,
    }
  }

  private async triggerDeployment(target: ZaneResolvedTarget, body: JsonRecord): Promise<void> {
    const response = await fetch(`${this.#deps.baseUrl}${target.deploy_url}`, {
      method: "PUT",
      headers: this.#deps.buildHeaders(undefined, "PUT"),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      let errorMessage = `ZaneOps deploy trigger failed for ${target.service_slug} (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback message when upstream response is not JSON
      }
      throw new UpstreamHttpError(response.status, "zane_deploy_failed", errorMessage)
    }
  }

  private async findTriggeredDeployment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
    previousDeploymentHashes: Set<string>,
  ): Promise<ZaneDeployment> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const deployments = await this.#deps.listDeployments(session, projectSlug, environmentName, serviceSlug)
      const triggered = deployments.find((deployment) => !previousDeploymentHashes.has(deployment.hash))
      if (triggered) {
        return triggered
      }

      await sleep(500)
    }

    throw new UpstreamHttpError(
      502,
      "zane_deploy_not_observed",
      `Triggered deployment for ${serviceSlug} was not visible in deployment history`,
    )
  }
}

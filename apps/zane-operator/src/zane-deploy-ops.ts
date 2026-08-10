import { sleep } from "@techsio/std/async"
import { z } from "zod"

import type {
  EnvOverrideInput,
  ResolveTargetInput,
  ServiceType,
  TriggeredDeployment,
  ZaneDeployment,
  ZaneEnvVariable,
  ZaneResolvedTarget,
  ZaneServiceCard,
  ZaneServiceDetails,
  ZaneUnappliedChange,
  ZaneUnappliedChangeValue,
} from "./zane-contract"
import { computeEffectiveEnvVariables } from "./zane-effective-service-state"
import { UpstreamHttpError } from "./zane-errors"
import { parseErrorMessage } from "./zane-upstream"
import type { ResponseDecoder, ZaneSession } from "./zane-upstream"

type DeployServiceCard = Pick<ZaneServiceCard, "slug">
type DeployServiceDetails = Pick<
  ZaneServiceDetails,
  | "commit_sha"
  | "deploy_token"
  | "env_variables"
  | "slug"
  | "type"
  | "unapplied_changes"
>
type DeployDeployment = Pick<
  ZaneDeployment,
  | "commit_sha"
  | "hash"
  | "is_current_production"
  | "service_snapshot"
  | "status"
>

type EnvChangeType = "ADD" | "UPDATE" | "SKIP"

interface EnvChangeRequestBody {
  field: "env_variables"
  item_id?: string
  new_value: Pick<ZaneUnappliedChangeValue, "key" | "value">
  type: "ADD" | "UPDATE"
}

type TriggerDeploymentBody =
  | {
      cleanup_queue: true
      commit_message: "CI selective deploy"
    }
  | {
      cleanup_queue: true
      commit_sha?: string
      ignore_build_cache: false
    }

interface ZaneDeployOpsDeps {
  baseUrl: string
  authenticate: () => Promise<ZaneSession>
  buildHeaders: (
    session: ZaneSession | undefined,
    method: "PUT",
  ) => Record<string, string>
  listServiceCards: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ) => Promise<DeployServiceCard[]>
  getServiceDetails: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ) => Promise<DeployServiceDetails>
  getDeployment: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
    deploymentHash: string,
  ) => Promise<DeployDeployment>
  listDeployments: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ) => Promise<DeployDeployment[]>
  request: <T>(
    session: ZaneSession,
    method: "PUT" | "DELETE",
    path: string,
    decodeResponse: ResponseDecoder<T>,
    payload?: unknown,
    options?: {
      allowNotFound?: boolean
      retryOnAuthFailure?: boolean
    },
  ) => Promise<T | null>
}

const mutationResponseSchema = z.object({})

const decodeMutationResponse = (payload: unknown): void => {
  if (!mutationResponseSchema.safeParse(payload).success) {
    throw new TypeError("mutation response must be an object")
  }
}

const coercePendingEnvVariable = (
  value: ZaneUnappliedChangeValue | null | undefined,
): { key: string; value: string } | null => {
  if (
    !value ||
    typeof value.key !== "string" ||
    typeof value.value !== "string"
  ) {
    return null
  }

  return {
    key: value.key,
    value: value.value,
  }
}

const findPendingEnvChangeByKey = (
  serviceDetails: DeployServiceDetails,
  key: string,
): ZaneUnappliedChange | null => {
  const persistedEnvById = new Map(
    (serviceDetails.env_variables ?? []).map((envVar) => [envVar.id, envVar]),
  )

  for (const change of serviceDetails.unapplied_changes ?? []) {
    if (change.field !== "env_variables") {
      continue
    }

    const pendingEnv = coercePendingEnvVariable(
      change.type === "DELETE" ? change.old_value : change.new_value,
    )
    if (pendingEnv?.key === key) {
      return change
    }

    if (change.item_id !== null && change.item_id !== undefined) {
      const persistedEnv = persistedEnvById.get(change.item_id)
      if (persistedEnv?.key === key) {
        return change
      }
    }
  }

  return null
}

const assertServiceType = (value: unknown, label: string): ServiceType => {
  if (typeof value !== "string") {
    throw new UpstreamHttpError(
      502,
      "zane_service_type_invalid",
      `${label} must be docker or git`,
    )
  }

  switch (value.toUpperCase()) {
    case "DOCKER":
    case "DOCKER_REGISTRY": {
      return "docker"
    }
    case "GIT":
    case "GIT_REPOSITORY": {
      return "git"
    }
    default: {
      throw new UpstreamHttpError(
        502,
        "zane_service_type_invalid",
        `${label} must be docker or git`,
      )
    }
  }
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
    const cards = await this.#deps.listServiceCards(
      session,
      input.projectSlug,
      input.environmentName,
    )
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

        const details = await this.#deps.getServiceDetails(
          session,
          input.projectSlug,
          input.environmentName,
          service.service_slug,
        )
        const deployments = await this.#deps.listDeployments(
          session,
          input.projectSlug,
          input.environmentName,
          details.slug,
        )
        const currentProductionDeploymentSummary =
          deployments.find(
            (deployment) =>
              deployment.is_current_production === true &&
              deployment.status.toUpperCase() === "HEALTHY",
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
            [
              "QUEUED",
              "PREPARING",
              "BUILDING",
              "STARTING",
              "RESTARTING",
            ].includes(deployment.status.toUpperCase()),
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
          active_deployment: activeDeployment
            ? {
                commit_sha: activeDeployment.commit_sha ?? null,
                deployment_hash: activeDeployment.hash,
                env: Object.fromEntries(
                  (activeDeployment.service_snapshot?.env_variables ?? []).map(
                    (envVar) => [envVar.key, envVar.value],
                  ),
                ),
                status: activeDeployment.status,
              }
            : null,
          configured_commit_sha: details.commit_sha ?? null,
          current_production_deployment: currentProductionDeployment
            ? {
                commit_sha: currentProductionDeployment.commit_sha ?? null,
                deployment_hash: currentProductionDeployment.hash,
                env: Object.fromEntries(
                  (
                    currentProductionDeployment.service_snapshot
                      ?.env_variables ?? []
                  ).map((envVar) => [envVar.key, envVar.value]),
                ),
                status: currentProductionDeployment.status,
              }
            : null,
          deploy_token: details.deploy_token,
          deploy_url:
            assertServiceType(
              details.type,
              `${service.service_slug}.service_type`,
            ) === "docker"
              ? `/api/deploy-service/docker/${details.deploy_token}/`
              : `/api/deploy-service/git/${details.deploy_token}/`,
          details_url: `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/service-details/${encodeURIComponent(details.slug)}/`,
          env_change_url: `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
            input.environmentName,
          )}/request-service-changes/${encodeURIComponent(details.slug)}/`,
          has_unapplied_changes:
            Array.isArray(details.unapplied_changes) &&
            details.unapplied_changes.length > 0,
          service_id: service.service_id,
          service_slug: details.slug,
          service_type: assertServiceType(
            details.type,
            `${service.service_slug}.service_type`,
          ),
        } satisfies ZaneResolvedTarget
      }),
    )

    return {
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
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
    applied_changes: {
      service_id: string
      service_slug: string
      key: string
      change_type: EnvChangeType
    }[]
  }> {
    if (input.envOverrides.length === 0) {
      return {
        applied_changes: [],
        applied_service_ids: [],
        environment_name: input.environmentName,
        noop: true,
        project_slug: input.projectSlug,
      }
    }

    const session = await this.#deps.authenticate()
    const targetsByServiceId = new Map(
      input.targets.map((target) => [target.service_id, target]),
    )
    const appliedServiceIds = new Set<string>()
    const appliedChanges: {
      service_id: string
      service_slug: string
      key: string
      change_type: EnvChangeType
    }[] = []

    await this.applyEnvOverridesSequentially({
      appliedChanges,
      appliedServiceIds,
      environmentName: input.environmentName,
      overrides: input.envOverrides,
      projectSlug: input.projectSlug,
      session,
      targetsByServiceId,
    })

    return {
      applied_changes: appliedChanges,
      applied_service_ids: [...appliedServiceIds],
      environment_name: input.environmentName,
      noop: appliedServiceIds.size === 0,
      project_slug: input.projectSlug,
    }
  }

  // Overrides are applied one service at a time so that the getServiceDetails
  // snapshot and the resulting change requests stay in the original
  // sequential order; the queue is walked through recursion instead of being
  // fanned out, and it terminates when the remaining queue is empty.
  private async applyEnvOverridesSequentially(input: {
    session: ZaneSession
    projectSlug: string
    environmentName: string
    targetsByServiceId: Map<string, ZaneResolvedTarget>
    overrides: EnvOverrideInput[]
    appliedServiceIds: Set<string>
    appliedChanges: {
      service_id: string
      service_slug: string
      key: string
      change_type: EnvChangeType
    }[]
  }): Promise<void> {
    const [override, ...remainingOverrides] = input.overrides
    if (override === undefined) {
      return
    }

    const target = input.targetsByServiceId.get(override.service_id)
    if (!target) {
      throw new UpstreamHttpError(
        404,
        "zane_target_missing",
        `No resolved target found for service ${override.service_slug} (${override.service_id})`,
      )
    }

    const serviceDetails = await this.#deps.getServiceDetails(
      input.session,
      input.projectSlug,
      input.environmentName,
      target.service_slug,
    )
    const effectiveEnvByKey = new Map(
      computeEffectiveEnvVariables(serviceDetails).map((envVar) => [
        envVar.key,
        envVar,
      ]),
    )
    const persistedEnvByKey = new Map(
      (serviceDetails.env_variables ?? []).map((envVar) => [
        envVar.key,
        envVar,
      ]),
    )

    await this.applyEnvEntriesSequentially({
      appliedChanges: input.appliedChanges,
      appliedServiceIds: input.appliedServiceIds,
      effectiveEnvByKey,
      entries: Object.entries(override.env),
      environmentName: input.environmentName,
      override,
      persistedEnvByKey,
      projectSlug: input.projectSlug,
      serviceDetails,
      session: input.session,
      target,
    })

    await this.applyEnvOverridesSequentially({
      ...input,
      overrides: remainingOverrides,
    })
  }

  // Env entries for a single service are applied one at a time (cancel then
  // create/update) so that a pending-change cancellation is always visible to
  // the immediately following request; the queue is walked through recursion
  // instead of being fanned out, and it terminates when the remaining queue
  // is empty.
  private async applyEnvEntriesSequentially(input: {
    session: ZaneSession
    projectSlug: string
    environmentName: string
    target: ZaneResolvedTarget
    override: EnvOverrideInput
    serviceDetails: DeployServiceDetails
    effectiveEnvByKey: Map<string, ZaneEnvVariable>
    persistedEnvByKey: Map<string, ZaneEnvVariable>
    entries: [string, string][]
    appliedServiceIds: Set<string>
    appliedChanges: {
      service_id: string
      service_slug: string
      key: string
      change_type: EnvChangeType
    }[]
  }): Promise<void> {
    const [entry, ...remainingEntries] = input.entries
    if (entry === undefined) {
      return
    }

    const [key, value] = entry
    const effectiveCurrent = input.effectiveEnvByKey.get(key)
    if (effectiveCurrent?.value === value) {
      input.appliedChanges.push({
        change_type: "SKIP",
        key,
        service_id: input.override.service_id,
        service_slug: input.override.service_slug,
      })
      await this.applyEnvEntriesSequentially({
        ...input,
        entries: remainingEntries,
      })
      return
    }

    const pendingChange = findPendingEnvChangeByKey(input.serviceDetails, key)
    if (pendingChange) {
      await this.cancelServiceChange(
        input.session,
        input.projectSlug,
        input.environmentName,
        input.target.service_slug,
        pendingChange.id,
      )
    }

    const persistedCurrent = input.persistedEnvByKey.get(key)
    const changeType: "ADD" | "UPDATE" = persistedCurrent ? "UPDATE" : "ADD"
    const requestBody: EnvChangeRequestBody = {
      field: "env_variables",
      new_value: { key, value },
      type: changeType,
      ...(persistedCurrent?.id !== undefined && persistedCurrent.id !== ""
        ? { item_id: persistedCurrent.id }
        : {}),
    }

    await this.#deps.request(
      input.session,
      "PUT",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
        input.environmentName,
      )}/request-service-changes/${encodeURIComponent(input.target.service_slug)}/`,
      decodeMutationResponse,
      requestBody,
    )

    input.appliedServiceIds.add(input.override.service_id)
    input.appliedChanges.push({
      change_type: changeType,
      key,
      service_id: input.override.service_id,
      service_slug: input.override.service_slug,
    })

    await this.applyEnvEntriesSequentially({
      ...input,
      entries: remainingEntries,
    })
  }

  private async cancelServiceChange(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
    changeId: string,
  ): Promise<void> {
    await this.#deps.request(
      session,
      "DELETE",
      `/api/projects/${encodeURIComponent(projectSlug)}/${encodeURIComponent(
        environmentName,
      )}/cancel-service-changes/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(changeId)}/`,
      decodeMutationResponse,
    )
  }

  async triggerDeploys(input: {
    projectSlug: string
    environmentName: string
    targets: ZaneResolvedTarget[]
    gitCommitSha?: string
  }): Promise<{
    project_slug: string
    environment_name: string
    git_commit_sha: string | null
    triggered_service_ids: string[]
    services: TriggeredDeployment[]
  }> {
    const session = await this.#deps.authenticate()
    const deployments = await Promise.all(
      input.targets.map(async (target) => {
        const body: TriggerDeploymentBody =
          target.service_type === "docker"
            ? { cleanup_queue: true, commit_message: "CI selective deploy" }
            : {
                cleanup_queue: true,
                ignore_build_cache: false,
                ...(input.gitCommitSha !== undefined &&
                input.gitCommitSha !== ""
                  ? { commit_sha: input.gitCommitSha }
                  : {}),
              }

        const previousDeployments = await this.#deps.listDeployments(
          session,
          input.projectSlug,
          input.environmentName,
          target.service_slug,
        )
        const previousDeploymentHashes = new Set(
          previousDeployments.map((deployment) => deployment.hash),
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
          deployment_hash: deployment.hash,
          service_id: target.service_id,
          service_slug: target.service_slug,
          service_type: target.service_type,
          status: deployment.status,
        } satisfies TriggeredDeployment
      }),
    )

    return {
      environment_name: input.environmentName,
      git_commit_sha: input.gitCommitSha ?? null,
      project_slug: input.projectSlug,
      services: deployments,
      triggered_service_ids: deployments.map(
        (deployment) => deployment.service_id,
      ),
    }
  }

  async cancelDeployment(input: {
    projectSlug: string
    environmentName: string
    serviceSlug: string
    deploymentHash: string
  }): Promise<{
    project_slug: string
    environment_name: string
    service_slug: string
    deployment_hash: string
    cancelled: boolean
  }> {
    const session = await this.#deps.authenticate()
    await this.#deps.request(
      session,
      "PUT",
      `/api/projects/${encodeURIComponent(input.projectSlug)}/${encodeURIComponent(
        input.environmentName,
      )}/cancel-deployment/${encodeURIComponent(input.serviceSlug)}/${encodeURIComponent(
        input.deploymentHash,
      )}/`,
      decodeMutationResponse,
      {},
    )

    return {
      cancelled: true,
      deployment_hash: input.deploymentHash,
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      service_slug: input.serviceSlug,
    }
  }

  private async triggerDeployment(
    target: ZaneResolvedTarget,
    body: TriggerDeploymentBody,
  ): Promise<void> {
    const response = await fetch(`${this.#deps.baseUrl}${target.deploy_url}`, {
      body: JSON.stringify(body),
      headers: this.#deps.buildHeaders(undefined, "PUT"),
      method: "PUT",
    })

    if (!response.ok) {
      let errorMessage = `ZaneOps deploy trigger failed for ${target.service_slug} (HTTP ${response.status})`
      try {
        errorMessage = parseErrorMessage(await response.json(), errorMessage)
      } catch {
        // keep fallback message when upstream response is not JSON
      }
      throw new UpstreamHttpError(
        response.status,
        "zane_deploy_failed",
        errorMessage,
      )
    }
  }

  private async findTriggeredDeployment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
    previousDeploymentHashes: Set<string>,
  ): Promise<DeployDeployment> {
    return await this.pollForTriggeredDeployment({
      attempt: 0,
      environmentName,
      previousDeploymentHashes,
      projectSlug,
      serviceSlug,
      session,
    })
  }

  // Polling attempts run one at a time, 500ms apart, so that each check sees
  // the outcome of the previous wait; the bounded attempt count is walked
  // through recursion instead of a loop, and it terminates once a triggered
  // deployment is found or the attempt budget is exhausted.
  private async pollForTriggeredDeployment(input: {
    attempt: number
    session: ZaneSession
    projectSlug: string
    environmentName: string
    serviceSlug: string
    previousDeploymentHashes: Set<string>
  }): Promise<DeployDeployment> {
    if (input.attempt >= 10) {
      throw new UpstreamHttpError(
        502,
        "zane_deploy_not_observed",
        `Triggered deployment for ${input.serviceSlug} was not visible in deployment history`,
      )
    }

    const deployments = await this.#deps.listDeployments(
      input.session,
      input.projectSlug,
      input.environmentName,
      input.serviceSlug,
    )
    const triggered = deployments.find(
      (deployment) => !input.previousDeploymentHashes.has(deployment.hash),
    )
    if (triggered) {
      return triggered
    }

    await sleep(500)
    return await this.pollForTriggeredDeployment({
      ...input,
      attempt: input.attempt + 1,
    })
  }
}

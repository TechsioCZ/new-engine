import type { PlanResponse } from "../contracts/plan.js"
import type { RenderEnvOverridesResponse } from "../contracts/render-env-overrides.js"
import type { ResolveTargetsResponse } from "../contracts/resolve-targets.js"
import type {
  DeploymentRef,
  PreviewRandomOnceSecretInput,
  VerifyResponse,
} from "../contracts/verify.js"
import { normalizeCsvToArray } from "./deploy-inputs.js"
import { executeVerify } from "./verify.js"

export type DeploymentLike = {
  service_id: string
  service_slug: string
  service_type?: string | null
  deployment_hash: string
  status: string
}

type SkippedService = {
  service_id: string
  service_slug: string
  reason: string
  deployment_hash: string | null
  commit_sha: string | null
}

type FilteredTargets = {
  services: ResolveTargetsResponse["services"]
  skippedServices: SkippedService[]
  adoptedDeployments: DeploymentLike[]
  filteredEnvOverrides: RenderEnvOverridesResponse["services"]
}

type WaitForDeploymentsInput = {
  lane: "preview" | "main"
  projectSlug: string
  environmentName: string
  requestedServicesCsv: string
  deployServicesCsv: string
  triggeredServicesCsv: string
  previewClonedServiceIdsCsv: string
  previewExcludedServiceIdsCsv: string
  previewDbName: string
  previewDbUser: string
  previewDbPassword: string
  previewRandomOnceSecrets: PreviewRandomOnceSecretInput[]
  meiliFrontendKey: string
  meiliFrontendEnvVar: string
  meiliBackendKey: string
  deployments: DeploymentRef[]
  baseUrl: string
  apiToken: string
  dryRun: boolean
  pollIntervalSeconds: number
  waitTimeoutSeconds: number
  tolerateBaseUrlUnavailable: boolean
  stackManifestPath: string
  stackInputsPath: string
  onProgress?: (message: string) => void
}

export function mergeCsvValues(existing: string, current: string): string {
  return normalizeCsvToArray(
    [existing, current].filter(Boolean).join(",")
  ).join(",")
}

export function collectStageNumbers(plan: PlanResponse): number[] {
  return [
    ...new Set(plan.deploy_services.map((service) => service.deploy_stage)),
  ].sort((left, right) => left - right)
}

export function buildStagePlan(
  plan: PlanResponse,
  stage: number
): PlanResponse {
  const deployServices = plan.deploy_services.filter(
    (service) => service.deploy_stage === stage
  )

  return {
    ...plan,
    deploy_services: deployServices,
    deploy_services_csv: deployServices.map((service) => service.id).join(","),
  }
}

export function stageHasService(
  plan: PlanResponse,
  stage: number,
  serviceId: string
): boolean {
  return plan.deploy_services.some(
    (service) => service.id === serviceId && service.deploy_stage === stage
  )
}

export function mergeDeployments(
  existing: DeploymentLike[],
  current: DeploymentLike[]
): DeploymentLike[] {
  const merged = [...existing, ...current]
  const deduped = new Map<string, DeploymentLike>()

  for (const deployment of merged) {
    deduped.set(
      `${deployment.service_id}:${deployment.deployment_hash}`,
      deployment
    )
  }

  return [...deduped.values()].sort((left, right) => {
    const leftKey = `${left.service_id}:${left.deployment_hash}`
    const rightKey = `${right.service_id}:${right.deployment_hash}`
    return leftKey.localeCompare(rightKey)
  })
}

function currentEnvMatches(
  currentEnv: Record<string, string> | undefined,
  expectedEnv: Record<string, string>
): boolean {
  return Object.entries(expectedEnv).every(
    ([key, value]) => currentEnv?.[key] === value
  )
}

function tracksBranchHead(
  configuredCommitSha: string | null | undefined
): boolean {
  const normalized = (configuredCommitSha ?? "").toUpperCase()
  return normalized === "" || normalized === "HEAD"
}

function isHealthyCurrentCommitMatch(
  target: ResolveTargetsResponse["services"][number],
  expectedEnv: Record<string, string>,
  desiredCommitSha: string
): boolean {
  return Boolean(
    target.current_production_deployment &&
      target.current_production_deployment.status.toUpperCase() === "HEALTHY" &&
      (target.current_production_deployment.commit_sha ?? "") ===
        desiredCommitSha &&
      currentEnvMatches(target.current_production_deployment.env, expectedEnv)
  )
}

function isReusableActiveDeployment(
  target: ResolveTargetsResponse["services"][number],
  expectedEnv: Record<string, string>,
  desiredCommitSha: string
): boolean {
  return Boolean(
    target.active_deployment &&
      (target.active_deployment.commit_sha ?? "") === desiredCommitSha &&
      currentEnvMatches(target.active_deployment.env, expectedEnv)
  )
}

function resolveSkipReason(
  target: ResolveTargetsResponse["services"][number],
  expectedEnv: Record<string, string>,
  desiredCommitSha: string
): string | null {
  if (target.service_type !== "git") {
    return null
  }

  if (target.has_unapplied_changes ?? false) {
    return "pending_changes"
  }

  if (
    !tracksBranchHead(target.configured_commit_sha) &&
    (target.configured_commit_sha ?? "") !== desiredCommitSha
  ) {
    return "configured_commit_sha_mismatch"
  }

  if (isHealthyCurrentCommitMatch(target, expectedEnv, desiredCommitSha)) {
    return "already_current_commit"
  }

  if (isReusableActiveDeployment(target, expectedEnv, desiredCommitSha)) {
    return "reuse_in_progress_deployment"
  }

  if (
    (target.current_production_deployment?.status ?? "").toUpperCase() !==
    "HEALTHY"
  ) {
    return "current_deployment_not_healthy"
  }

  if (
    (target.current_production_deployment?.commit_sha ?? "") !==
    desiredCommitSha
  ) {
    return "commit_sha_mismatch"
  }

  if (
    !currentEnvMatches(target.current_production_deployment?.env, expectedEnv)
  ) {
    return "env_override_drift"
  }

  return "no_current_healthy_deployment"
}

export function filterTargetsForGitCommit(
  targets: ResolveTargetsResponse["services"],
  envOverrides: RenderEnvOverridesResponse["services"],
  desiredCommitSha: string
): FilteredTargets {
  if (!desiredCommitSha) {
    return {
      services: targets,
      skippedServices: [],
      adoptedDeployments: [],
      filteredEnvOverrides: envOverrides,
    }
  }

  const expectedEnvByServiceId = new Map(
    envOverrides.map((service) => [service.service_id, service.env])
  )
  const filteredTargets: ResolveTargetsResponse["services"] = []
  const skippedServices: SkippedService[] = []
  const adoptedDeployments: DeploymentLike[] = []

  for (const target of targets) {
    const expectedEnv = expectedEnvByServiceId.get(target.service_id) ?? {}
    const skipReason = resolveSkipReason(target, expectedEnv, desiredCommitSha)

    if (skipReason === "already_current_commit") {
      skippedServices.push({
        service_id: target.service_id,
        service_slug: target.service_slug,
        reason: skipReason,
        deployment_hash:
          target.current_production_deployment?.deployment_hash ?? null,
        commit_sha: target.current_production_deployment?.commit_sha ?? null,
      })
      continue
    }

    if (skipReason === "reuse_in_progress_deployment") {
      adoptedDeployments.push({
        service_id: target.service_id,
        service_slug: target.service_slug,
        service_type: null,
        deployment_hash: target.active_deployment?.deployment_hash ?? "",
        status: target.active_deployment?.status ?? "",
      })
      continue
    }

    filteredTargets.push(target)
  }

  const allowedServiceIds = new Set(
    filteredTargets.map((target) => target.service_id)
  )
  const filteredEnvOverrides = envOverrides.filter((service) =>
    allowedServiceIds.has(service.service_id)
  )

  return {
    services: filteredTargets,
    skippedServices,
    adoptedDeployments: adoptedDeployments.filter(
      (deployment) => deployment.deployment_hash && deployment.status
    ),
    filteredEnvOverrides,
  }
}

function isTransientOperatorUnavailabilityError(message: string): boolean {
  return [
    "zane-operator request failed before a successful HTTP response",
    "zane-operator returned non-JSON response",
    "zane-operator request returned HTTP 502",
    "zane-operator request returned HTTP 503",
    "zane-operator request returned HTTP 504",
  ].some((fragment) => message.includes(fragment))
}

function checkedDeploymentFailureSummary(response: VerifyResponse): string {
  return response.checked_deployments
    .filter((deployment) =>
      ["FAILED", "UNHEALTHY", "CANCELLED", "REMOVED"].includes(
        deployment.status.toUpperCase()
      )
    )
    .map(
      (deployment) =>
        `${deployment.service_slug}#${deployment.deployment_hash}=${deployment.status}${
          deployment.status_reason ? `: ${deployment.status_reason}` : ""
        }`
    )
    .join("; ")
}

function checkedDeploymentInProgressCount(response: VerifyResponse): number {
  return response.checked_deployments.filter(
    (deployment) => deployment.status.toUpperCase() !== "HEALTHY"
  ).length
}

function checkedDeploymentNonHealthySummary(response: VerifyResponse): string {
  return response.checked_deployments
    .filter((deployment) => deployment.status.toUpperCase() !== "HEALTHY")
    .map(
      (deployment) =>
        `${deployment.service_slug}#${deployment.deployment_hash}=${deployment.status}${
          deployment.status_reason ? `: ${deployment.status_reason}` : ""
        }`
    )
    .join("; ")
}

function checkedDeploymentSummary(response: VerifyResponse): string {
  return response.checked_deployments
    .map(
      (deployment) =>
        `${deployment.service_slug}#${deployment.deployment_hash}=${deployment.status}${
          deployment.status_reason ? `: ${deployment.status_reason}` : ""
        }`
    )
    .join("; ")
}

function verifyDeploymentsOnce(
  input: WaitForDeploymentsInput
): Promise<VerifyResponse> {
  return executeVerify({
    lane: input.lane,
    projectSlug: input.projectSlug,
    environmentName: input.environmentName,
    requestedServicesCsv: input.requestedServicesCsv,
    deployServicesCsv: input.deployServicesCsv,
    triggeredServicesCsv: input.triggeredServicesCsv,
    previewClonedServiceIdsCsv: input.previewClonedServiceIdsCsv,
    previewExcludedServiceIdsCsv: input.previewExcludedServiceIdsCsv,
    previewDbName: input.previewDbName,
    previewDbUser: input.previewDbUser,
    previewDbPassword: input.previewDbPassword,
    previewRandomOnceSecrets: input.previewRandomOnceSecrets,
    meiliFrontendKey: input.meiliFrontendKey,
    meiliFrontendEnvVar: input.meiliFrontendEnvVar,
    meiliBackendKey: input.meiliBackendKey,
    deployments: input.deployments,
    baseUrl: input.baseUrl,
    apiToken: input.apiToken,
    dryRun: input.dryRun,
    stackManifestPath: input.stackManifestPath,
    stackInputsPath: input.stackInputsPath,
  })
}

async function sleepSeconds(seconds: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000)
  })
}

function shouldRetryTransientError(
  input: WaitForDeploymentsInput,
  startedAt: number,
  error: unknown
): boolean {
  const message = error instanceof Error ? error.message : String(error)
  if (
    input.dryRun ||
    !input.tolerateBaseUrlUnavailable ||
    !isTransientOperatorUnavailabilityError(message)
  ) {
    return false
  }

  if (Date.now() - startedAt >= input.waitTimeoutSeconds * 1000) {
    throw new Error(
      `Timed out after ${input.waitTimeoutSeconds}s waiting for zane-operator to become reachable again.`
    )
  }

  return true
}

function ensureDeploymentsHealthy(
  response: VerifyResponse,
  input: WaitForDeploymentsInput,
  startedAt: number
): boolean {
  const failedServices = checkedDeploymentFailureSummary(response)
  if (failedServices) {
    throw new Error(
      `Deploy wait failed for triggered deployments: ${failedServices}`
    )
  }

  if (checkedDeploymentInProgressCount(response) === 0) {
    return true
  }

  if (Date.now() - startedAt >= input.waitTimeoutSeconds * 1000) {
    throw new Error(
      `Timed out after ${input.waitTimeoutSeconds}s waiting for deployments to become HEALTHY: ${checkedDeploymentNonHealthySummary(
        response
      )}`
    )
  }

  return false
}

export async function waitForDeployments(
  input: WaitForDeploymentsInput
): Promise<VerifyResponse> {
  const startedAt = Date.now()
  let lastProgressMessage = ""

  while (true) {
    try {
      const response = await verifyDeploymentsOnce(input)
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000)

      if (checkedDeploymentInProgressCount(response) === 0) {
        input.onProgress?.(
          `Deployments are healthy after ${elapsedSeconds}s: ${checkedDeploymentSummary(
            response
          )}`
        )
      } else {
        const progressMessage = `Waiting for deployments (${elapsedSeconds}s elapsed): ${checkedDeploymentNonHealthySummary(
          response
        )}`
        if (progressMessage !== lastProgressMessage) {
          input.onProgress?.(progressMessage)
          lastProgressMessage = progressMessage
        }
      }

      if (ensureDeploymentsHealthy(response, input, startedAt)) {
        return response
      }
    } catch (error) {
      if (shouldRetryTransientError(input, startedAt, error)) {
        await sleepSeconds(input.pollIntervalSeconds)
        continue
      }

      throw error
    }

    await sleepSeconds(input.pollIntervalSeconds)
  }
}

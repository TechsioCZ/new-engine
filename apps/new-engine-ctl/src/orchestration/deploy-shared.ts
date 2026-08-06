import { setTimeout as scheduleTimeout } from "node:timers/promises"

import type { PlanResponse } from "../contracts/plan.js"
import type { RenderEnvOverridesResponse } from "../contracts/render-env-overrides.js"
import type { ResolveTargetsResponse } from "../contracts/resolve-targets.js"
import type { RuntimeProviderOutputs } from "../contracts/runtime-provider-outputs.js"
import type {
  DeploymentRef,
  PreviewRandomOnceSecretInput,
  VerifyResponse,
} from "../contracts/verify.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"
import { normalizeCsvToArray } from "./deploy-inputs.js"
import { executeVerify } from "./verify.js"

export interface DeploymentLike {
  service_id: string
  service_slug: string
  service_type?: string | null | undefined
  deployment_hash: string
  status: string
}

interface SkippedService {
  service_id: string
  service_slug: string
  reason: string
  deployment_hash: string | null
  commit_sha: string | null
}

interface FilteredTargets {
  services: ResolveTargetsResponse["services"]
  skippedServices: SkippedService[]
  adoptedDeployments: DeploymentLike[]
  filteredEnvOverrides: RenderEnvOverridesResponse["services"]
}

interface WaitForDeploymentsInput {
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
  runtimeProviderOutputs: RuntimeProviderOutputs
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
  cancelOnInterrupt?: boolean
}

interface DeploymentWaitProgress {
  lastMessage: string
}

interface DeploymentWaitContext {
  input: WaitForDeploymentsInput
  interruptController: AbortController
  progress: DeploymentWaitProgress
  startedAt: number
}

interface CancelDeploymentsInput {
  client: ZaneOperatorClient
  deployments: readonly DeploymentRef[]
  environmentName: string
  errors: readonly string[]
  projectSlug: string
}

const FAILED_DEPLOYMENT_STATUSES = new Set([
  "FAILED",
  "UNHEALTHY",
  "CANCELLED",
  "REMOVED",
])

const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== ""

export const mergeCsvValues = (existing: string, current: string): string =>
  normalizeCsvToArray([existing, current].filter(Boolean).join(",")).join(",")

export const collectStageNumbers = (plan: PlanResponse): number[] =>
  [
    ...new Set(plan.deploy_services.map((service) => service.deploy_stage)),
  ].toSorted((left, right) => left - right)

export const buildStagePlan = (
  plan: PlanResponse,
  stage: number,
): PlanResponse => {
  const deployServices = plan.deploy_services.filter(
    (service) => service.deploy_stage === stage,
  )

  return {
    ...plan,
    deploy_services: deployServices,
    deploy_services_csv: deployServices.map((service) => service.id).join(","),
  }
}

export const stageHasService = (
  plan: PlanResponse,
  stage: number,
  serviceId: string,
): boolean =>
  plan.deploy_services.some(
    (service) => service.id === serviceId && service.deploy_stage === stage,
  )

export const mergeDeployments = (
  existing: DeploymentLike[],
  current: DeploymentLike[],
): DeploymentLike[] => {
  const merged = [...existing, ...current]
  const deduped = new Map<string, DeploymentLike>()

  for (const deployment of merged) {
    deduped.set(
      `${deployment.service_id}:${deployment.deployment_hash}`,
      deployment,
    )
  }

  return [...deduped.values()].toSorted((left, right) => {
    const leftKey = `${left.service_id}:${left.deployment_hash}`
    const rightKey = `${right.service_id}:${right.deployment_hash}`
    return leftKey.localeCompare(rightKey)
  })
}

const currentEnvMatches = (
  currentEnv: Record<string, string> | undefined,
  expectedEnv: Record<string, string>,
): boolean =>
  Object.entries(expectedEnv).every(
    ([key, value]) => currentEnv?.[key] === value,
  )

const tracksBranchHead = (
  configuredCommitSha: string | null | undefined,
): boolean => {
  const normalized = (configuredCommitSha ?? "").toUpperCase()
  return normalized === "" || normalized === "HEAD"
}

const isHealthyCurrentCommitMatch = (
  target: ResolveTargetsResponse["services"][number],
  expectedEnv: Record<string, string>,
  desiredCommitSha: string,
): boolean => {
  const deployment = target.current_production_deployment
  if (!deployment) {
    return false
  }

  return (
    deployment.status.toUpperCase() === "HEALTHY" &&
    (deployment.commit_sha ?? "") === desiredCommitSha &&
    currentEnvMatches(deployment.env, expectedEnv)
  )
}

const isReusableActiveDeployment = (
  target: ResolveTargetsResponse["services"][number],
  expectedEnv: Record<string, string>,
  desiredCommitSha: string,
): boolean => {
  const deployment = target.active_deployment
  if (!deployment) {
    return false
  }

  return (
    (deployment.commit_sha ?? "") === desiredCommitSha &&
    currentEnvMatches(deployment.env, expectedEnv)
  )
}

const resolveSkipReason = (
  target: ResolveTargetsResponse["services"][number],
  expectedEnv: Record<string, string>,
  desiredCommitSha: string,
): string | null => {
  if (target.service_type !== "git") {
    return null
  }

  if (isReusableActiveDeployment(target, expectedEnv, desiredCommitSha)) {
    return "reuse_in_progress_deployment"
  }

  if (isHealthyCurrentCommitMatch(target, expectedEnv, desiredCommitSha)) {
    return "already_current_commit"
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

export const filterTargetsForGitCommit = (
  targets: ResolveTargetsResponse["services"],
  envOverrides: RenderEnvOverridesResponse["services"],
  desiredCommitSha: string,
): FilteredTargets => {
  if (!desiredCommitSha) {
    return {
      adoptedDeployments: [],
      filteredEnvOverrides: envOverrides,
      services: targets,
      skippedServices: [],
    }
  }

  const expectedEnvByServiceId = new Map(
    envOverrides.map((service) => [service.service_id, service.env]),
  )
  const filteredTargets: ResolveTargetsResponse["services"] = []
  const skippedServices: SkippedService[] = []
  const adoptedDeployments: DeploymentLike[] = []

  for (const target of targets) {
    const expectedEnv = expectedEnvByServiceId.get(target.service_id) ?? {}
    const skipReason = resolveSkipReason(target, expectedEnv, desiredCommitSha)

    if (skipReason === "already_current_commit") {
      skippedServices.push({
        commit_sha: target.current_production_deployment?.commit_sha ?? null,
        deployment_hash:
          target.current_production_deployment?.deployment_hash ?? null,
        reason: skipReason,
        service_id: target.service_id,
        service_slug: target.service_slug,
      })
    } else if (skipReason === "reuse_in_progress_deployment") {
      adoptedDeployments.push({
        deployment_hash: target.active_deployment?.deployment_hash ?? "",
        service_id: target.service_id,
        service_slug: target.service_slug,
        service_type: null,
        status: target.active_deployment?.status ?? "",
      })
    } else {
      filteredTargets.push(target)
    }
  }

  const allowedServiceIds = new Set(
    filteredTargets.map((target) => target.service_id),
  )
  const filteredEnvOverrides = envOverrides.filter((service) =>
    allowedServiceIds.has(service.service_id),
  )

  return {
    adoptedDeployments: adoptedDeployments.filter(
      (deployment) => deployment.deployment_hash && deployment.status,
    ),
    filteredEnvOverrides,
    services: filteredTargets,
    skippedServices,
  }
}

const isTransientOperatorUnavailabilityError = (message: string): boolean =>
  [
    "zane-operator request failed before a successful HTTP response",
    "zane-operator returned non-JSON response",
    "zane-operator request returned HTTP 502",
    "zane-operator request returned HTTP 503",
    "zane-operator request returned HTTP 504",
  ].some((fragment) => message.includes(fragment))

const formatCheckedDeployment = (
  deployment: VerifyResponse["checked_deployments"][number],
): string =>
  `${deployment.service_slug}#${deployment.deployment_hash}=${deployment.status}${
    hasText(deployment.status_reason) ? `: ${deployment.status_reason}` : ""
  }`

const checkedDeploymentFailureSummary = (response: VerifyResponse): string => {
  const summaries: string[] = []

  for (const deployment of response.checked_deployments) {
    if (FAILED_DEPLOYMENT_STATUSES.has(deployment.status.toUpperCase())) {
      summaries.push(formatCheckedDeployment(deployment))
    }
  }

  return summaries.join("; ")
}

const checkedDeploymentInProgressCount = (response: VerifyResponse): number =>
  response.checked_deployments.filter(
    (deployment) => deployment.status.toUpperCase() !== "HEALTHY",
  ).length

const checkedDeploymentNonHealthySummary = (
  response: VerifyResponse,
): string => {
  const summaries: string[] = []

  for (const deployment of response.checked_deployments) {
    if (deployment.status.toUpperCase() !== "HEALTHY") {
      summaries.push(formatCheckedDeployment(deployment))
    }
  }

  return summaries.join("; ")
}

const checkedDeploymentSummary = (response: VerifyResponse): string =>
  response.checked_deployments
    .map((deployment) => formatCheckedDeployment(deployment))
    .join("; ")

const verifyDeploymentsOnce = async (
  input: WaitForDeploymentsInput,
): Promise<VerifyResponse> =>
  await executeVerify({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    deployServicesCsv: input.deployServicesCsv,
    deployments: input.deployments,
    dryRun: input.dryRun,
    environmentName: input.environmentName,
    lane: input.lane,
    previewClonedServiceIdsCsv: input.previewClonedServiceIdsCsv,
    previewDbName: input.previewDbName,
    previewDbPassword: input.previewDbPassword,
    previewDbUser: input.previewDbUser,
    previewExcludedServiceIdsCsv: input.previewExcludedServiceIdsCsv,
    previewRandomOnceSecrets: input.previewRandomOnceSecrets,
    projectSlug: input.projectSlug,
    requestedServicesCsv: input.requestedServicesCsv,
    runtimeProviderOutputs: input.runtimeProviderOutputs,
    stackInputsPath: input.stackInputsPath,
    stackManifestPath: input.stackManifestPath,
    triggeredServicesCsv: input.triggeredServicesCsv,
  })

const describeCancelDeploymentError = (
  deployment: DeploymentRef,
  error: unknown,
): string =>
  `${deployment.service_slug}#${deployment.deployment_hash}: ${
    error instanceof Error ? error.message : String(error)
  }`

const cancelSingleDeployment = async (input: {
  client: ZaneOperatorClient
  deployment: DeploymentRef
  environmentName: string
  projectSlug: string
}): Promise<string | null> => {
  try {
    await input.client.cancelDeployment({
      deployment_hash: input.deployment.deployment_hash,
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      service_slug: input.deployment.service_slug,
    })
    return null
  } catch (error) {
    return describeCancelDeploymentError(input.deployment, error)
  }
}

// Cancellations are submitted one deployment at a time so that the request
// order and the aggregated failure order stay identical to the original
// sequential loop; the queue is walked through recursion instead of being
// fanned out, and it terminates when the remaining queue is empty.
const cancelDeploymentsSequentially = async (
  input: CancelDeploymentsInput,
): Promise<readonly string[]> => {
  const [deployment, ...remainingDeployments] = input.deployments
  if (deployment === undefined) {
    return input.errors
  }

  const failure = await cancelSingleDeployment({
    client: input.client,
    deployment,
    environmentName: input.environmentName,
    projectSlug: input.projectSlug,
  })

  return await cancelDeploymentsSequentially({
    client: input.client,
    deployments: remainingDeployments,
    environmentName: input.environmentName,
    errors: failure === null ? input.errors : [...input.errors, failure],
    projectSlug: input.projectSlug,
  })
}

const cancelTriggeredDeployments = async (
  input: WaitForDeploymentsInput,
): Promise<void> => {
  if (
    input.dryRun ||
    input.cancelOnInterrupt !== true ||
    !input.triggeredServicesCsv.trim() ||
    input.deployments.length === 0
  ) {
    return
  }

  const triggeredServiceIds = new Set(
    normalizeCsvToArray(input.triggeredServicesCsv),
  )
  const deploymentsToCancel = input.deployments.filter(
    (deployment) =>
      triggeredServiceIds.has(deployment.service_id) &&
      hasText(deployment.deployment_hash) &&
      !deployment.deployment_hash.startsWith("dry-run:"),
  )

  if (deploymentsToCancel.length === 0) {
    return
  }

  const errors = await cancelDeploymentsSequentially({
    client: new ZaneOperatorClient(input.baseUrl, input.apiToken),
    deployments: deploymentsToCancel,
    environmentName: input.environmentName,
    errors: [],
    projectSlug: input.projectSlug,
  })

  if (errors.length > 0) {
    throw new Error(
      `Failed to cancel interrupted deployments: ${errors.join("; ")}`,
    )
  }
}

const shouldRetryTransientError = (
  input: WaitForDeploymentsInput,
  startedAt: number,
  error: unknown,
): boolean => {
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
      `Timed out after ${input.waitTimeoutSeconds}s waiting for zane-operator to become reachable again.`,
    )
  }

  return true
}

const ensureDeploymentsHealthy = (
  response: VerifyResponse,
  input: WaitForDeploymentsInput,
  startedAt: number,
): boolean => {
  const failedServices = checkedDeploymentFailureSummary(response)
  if (failedServices) {
    throw new Error(
      `Deploy wait failed for triggered deployments: ${failedServices}`,
    )
  }

  if (checkedDeploymentInProgressCount(response) === 0) {
    return true
  }

  if (Date.now() - startedAt >= input.waitTimeoutSeconds * 1000) {
    throw new Error(
      `Timed out after ${input.waitTimeoutSeconds}s waiting for deployments to become HEALTHY: ${checkedDeploymentNonHealthySummary(
        response,
      )}`,
    )
  }

  return false
}

const sleepUntilNextPoll = async (
  context: DeploymentWaitContext,
): Promise<void> => {
  const { signal } = context.interruptController
  if (signal.aborted) {
    return
  }

  try {
    await scheduleTimeout(context.input.pollIntervalSeconds * 1000, null, {
      signal,
    })
  } catch (error) {
    if (!signal.aborted) {
      throw error
    }
  }
}

const reportDeploymentWaitProgress = (
  context: DeploymentWaitContext,
  response: VerifyResponse,
): void => {
  const elapsedSeconds = Math.floor((Date.now() - context.startedAt) / 1000)

  if (checkedDeploymentInProgressCount(response) === 0) {
    context.input.onProgress?.(
      `Deployments are healthy after ${elapsedSeconds}s: ${checkedDeploymentSummary(
        response,
      )}`,
    )
    return
  }

  const progressMessage = `Waiting for deployments (${elapsedSeconds}s elapsed): ${checkedDeploymentNonHealthySummary(
    response,
  )}`
  if (progressMessage === context.progress.lastMessage) {
    return
  }

  context.input.onProgress?.(progressMessage)
  context.progress.lastMessage = progressMessage
}

const pollDeploymentsOnce = async (
  context: DeploymentWaitContext,
): Promise<VerifyResponse | null> => {
  const response = await verifyDeploymentsOnce(context.input)
  reportDeploymentWaitProgress(context, response)

  return ensureDeploymentsHealthy(response, context.input, context.startedAt)
    ? response
    : null
}

// Every poll observes the deployment state left behind by the previous verify
// call, so attempts stay strictly sequential and are walked through recursion
// instead of being fanned out. Recursion terminates on a healthy response, on a
// non-retryable error, on interrupt, or on the wait timeout enforced by
// ensureDeploymentsHealthy and shouldRetryTransientError.
const pollDeploymentsUntilHealthy = async (
  context: DeploymentWaitContext,
): Promise<VerifyResponse> => {
  if (context.interruptController.signal.aborted) {
    context.input.onProgress?.(
      "Interrupt received while waiting; cancelling currently waited triggered deployments.",
    )
    await cancelTriggeredDeployments(context.input)
    throw new Error("Deployment wait interrupted.")
  }

  try {
    const response = await pollDeploymentsOnce(context)
    if (response !== null) {
      return response
    }
  } catch (error) {
    if (!shouldRetryTransientError(context.input, context.startedAt, error)) {
      throw error
    }
  }

  await sleepUntilNextPoll(context)
  return await pollDeploymentsUntilHealthy(context)
}

export const waitForDeployments = async (
  input: WaitForDeploymentsInput,
): Promise<VerifyResponse> => {
  const interruptController = new AbortController()
  const context: DeploymentWaitContext = {
    input,
    interruptController,
    progress: { lastMessage: "" },
    startedAt: Date.now(),
  }

  const handleInterrupt = (): void => {
    interruptController.abort()
  }

  process.once("SIGINT", handleInterrupt)
  process.once("SIGTERM", handleInterrupt)

  try {
    return await pollDeploymentsUntilHealthy(context)
  } finally {
    process.off("SIGINT", handleInterrupt)
    process.off("SIGTERM", handleInterrupt)
  }
}

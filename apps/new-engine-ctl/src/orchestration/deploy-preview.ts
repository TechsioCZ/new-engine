import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import type {
  DeployPreviewCommandInput,
  DeployPreviewResponse,
} from "../contracts/deploy-preview.js"
import { deployPreviewResponseSchema } from "../contracts/deploy-preview.js"
import type { PlanResponse } from "../contracts/plan.js"
import type { ResolveTargetsPayload } from "../contracts/resolve-targets.js"
import type { RuntimeProviderOutputs } from "../contracts/runtime-provider-outputs.js"
import { getPreviewRandomOnceSecretDefinitions } from "../contracts/stack-inputs.js"
import { listPrepareServiceIds } from "../contracts/stack-manifest.js"
import type { PreviewRandomOnceSecretInput } from "../contracts/verify.js"
import { maskGitHubValue } from "../github-actions.js"
import { resolveGitHubPreviewHeadBranch } from "../github-event.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"
import { executeApplyEnvOverridesPayload } from "./apply-env-overrides.js"
import { loadDeployContracts } from "./deploy-inputs.js"
import {
  buildStagePlan,
  collectStageNumbers,
  filterTargetsForGitCommit,
  mergeCsvValues,
  mergeDeployments,
  waitForDeployments,
} from "./deploy-shared.js"
import type { DeploymentLike } from "./deploy-shared.js"
import { executePlan } from "./plan.js"
import { generatePreviewRandomOnceSecrets } from "./preview-random-secrets.js"
import {
  buildPreviewServiceEnvSyncServices,
  buildPreviewSharedEnvSyncVariables,
} from "./preview-runtime-reconciliation.js"
import { executeRenderEnvOverrides } from "./render-env-overrides.js"
import { executeResolveEnvironment } from "./resolve-environment.js"
import { executeResolveTargetsPayload } from "./resolve-targets.js"
import {
  buildRuntimeProviderRenderContext,
  collectConfiguredRuntimeProviderNeeds,
  createRuntimeProviderState,
  ensureStageRuntimeProviderOutputs,
  reuseRuntimeProviderOutputs,
} from "./runtime-provider-orchestration.js"
import type {
  RuntimeProviderNeed,
  RuntimeProviderState,
} from "./runtime-provider-orchestration.js"
import { expandPlanForRuntimeProviderPrerequisites } from "./runtime-provider-prerequisites.js"
import { executeTriggerPayload } from "./trigger.js"

export interface DeployPreviewExecutionResult {
  response: DeployPreviewResponse
  previewRandomOnceSecretsJson: string
  runtimeProviderOutputs: RuntimeProviderOutputs
}

interface PreviewDbContext {
  previewDbName: string
  previewDbUser: string
  previewDbPassword: string
}

interface PreviewStageContext {
  command: DeployPreviewCommandInput
  contracts: Awaited<ReturnType<typeof loadDeployContracts>>
  desiredCommitSha: string
  environmentName: string
  plan: PlanResponse
  previewDbContext: PreviewDbContext
  previewRandomOnceSecrets: PreviewRandomOnceSecretInput[]
  runtimeProviderNeeds: RuntimeProviderNeed[]
  runtimeProviderState: RuntimeProviderState
}

interface PreviewStageAggregate {
  deployments: DeploymentLike[]
  envOverrideServiceIdsCsv: string
  triggeredServicesCsv: string
}

interface PreviewCommitState {
  lastDeployedCommitSha: string | null
  targetCommitSha: string | null
}

const DEFAULT_PREVIEW_DB_PREFIX = "medusa_pr_"
const DEFAULT_PREVIEW_DB_APP_USER_PREFIX = "medusa_pr_app_"

const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== ""

const textOrFallback = (
  value: string | null | undefined,
  fallback = "",
): string => value ?? fallback

const supportsPrettyLogs = (): boolean =>
  process.stderr.isTTY &&
  !hasText(process.env["GITHUB_ACTIONS"]) &&
  !hasText(process.env["NO_COLOR"]) &&
  process.env["TERM"] !== "dumb"

const colorize = (text: string, code: string): string =>
  supportsPrettyLogs() ? `\u001B[${code}m${text}\u001B[0m` : text

const logDeployProgress = (message: string): void => {
  let label = "[preview]"
  let colorCode = "36;1"

  if (message.startsWith("Interrupt received")) {
    label = "[interrupt]"
    colorCode = "33;1"
  } else if (message.includes("Meili")) {
    label = "[meili]"
    colorCode = "35;1"
  } else if (
    message.startsWith("Waiting for deployments") ||
    message.startsWith("Deployments are healthy")
  ) {
    label = "[wait]"
    colorCode = message.startsWith("Deployments are healthy") ? "32;1" : "34;1"
  } else if (message.startsWith("Resolved preview environment")) {
    label = "[env]"
    colorCode = "33;1"
  }

  process.stderr.write(`${colorize(label, colorCode)} ${message}\n`)
}

const previewDbContextIsComplete = (context: PreviewDbContext): boolean =>
  hasText(context.previewDbName) &&
  hasText(context.previewDbUser) &&
  hasText(context.previewDbPassword)

const listPreviewDbRequiredServiceIds = (input: {
  contracts: Awaited<ReturnType<typeof loadDeployContracts>>
  deployServiceIds: string[]
}): string[] => {
  const selected = new Set(input.deployServiceIds)
  return listPrepareServiceIds(input.contracts.manifest, "preview_db").filter(
    (serviceId) => selected.has(serviceId),
  )
}

const resolvePreviewDbContext = async (input: {
  contracts: Awaited<ReturnType<typeof loadDeployContracts>>
  deployServiceIds: string[]
  prNumber: number
  initialContext: PreviewDbContext
  dryRun: boolean
  zaneOperatorClient: ZaneOperatorClient | null
}): Promise<PreviewDbContext> => {
  const requiredServiceIds = listPreviewDbRequiredServiceIds({
    contracts: input.contracts,
    deployServiceIds: input.deployServiceIds,
  })

  if (requiredServiceIds.length === 0) {
    return input.initialContext
  }

  if (previewDbContextIsComplete(input.initialContext)) {
    return input.initialContext
  }

  if (input.dryRun) {
    return {
      previewDbName:
        input.initialContext.previewDbName ||
        `${DEFAULT_PREVIEW_DB_PREFIX}${input.prNumber}`,
      previewDbPassword:
        input.initialContext.previewDbPassword ||
        `dry-run:preview-db:${input.prNumber}`,
      previewDbUser:
        input.initialContext.previewDbUser ||
        `${DEFAULT_PREVIEW_DB_APP_USER_PREFIX}${input.prNumber}`,
    }
  }

  if (!input.zaneOperatorClient) {
    throw new Error(
      `Preview DB credentials are required for services: ${requiredServiceIds.join(",")}.`,
    )
  }

  logDeployProgress(
    `Preview DB credentials are missing for services ${requiredServiceIds.join(",")}; ensuring preview DB now.`,
  )
  const ensuredPreviewDb = await input.zaneOperatorClient.ensurePreviewDb(
    input.prNumber,
  )
  const previewDb = ensuredPreviewDb.body
  maskGitHubValue(previewDb.app_password)

  return {
    previewDbName: previewDb.db_name,
    previewDbPassword: previewDb.app_password,
    previewDbUser: previewDb.app_user,
  }
}

const writeJsonFile = async (
  filePath: string,
  value: unknown,
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value)}\n`, "utf-8")
}

const resolvePreviewRandomOnceSecrets = async (input: {
  stackInputs: Awaited<ReturnType<typeof loadDeployContracts>>["stackInputs"]
  projectSlug: string
  environmentName: string
  environmentCreated: boolean
  allowGenerateMissing: boolean
  dryRun: boolean
  zaneOperatorClient: ZaneOperatorClient | null
}): Promise<PreviewRandomOnceSecretInput[]> => {
  const definitions = getPreviewRandomOnceSecretDefinitions(input.stackInputs)
  if (definitions.length === 0) {
    return []
  }

  if (input.dryRun || !input.zaneOperatorClient) {
    return generatePreviewRandomOnceSecrets(input.stackInputs)
  }

  const resolveSecrets = (
    syncedSecrets: { secret_id: string; value: string }[],
  ): PreviewRandomOnceSecretInput[] => {
    const resolvedValueBySecretId = new Map(
      syncedSecrets.map((secret) => [secret.secret_id, secret.value]),
    )

    return definitions.map((definition) => {
      const value = resolvedValueBySecretId.get(definition.secret_id)
      if (!hasText(value)) {
        throw new Error(
          `Preview random-once secret ${definition.secret_id} was not returned for ${input.environmentName}.`,
        )
      }

      return {
        ...definition,
        value,
      }
    })
  }

  if (input.environmentCreated) {
    const generatedSecrets = generatePreviewRandomOnceSecrets(input.stackInputs)
    const generatedValuesBySecretId = new Map(
      generatedSecrets.map((secret) => [secret["secret_id"], secret.value]),
    )
    const materialized =
      await input.zaneOperatorClient.syncPreviewRandomOnceSecrets({
        environment_name: input.environmentName,
        project_slug: input.projectSlug,
        secrets: definitions.map((definition) => ({
          persist_to: definition.persist_to,
          persisted_env_var: definition.persisted_env_var,
          secret_id: definition.secret_id,
          targets: definition.targets.map((target) => ({
            env_var: target.env_var,
            service_slug: target.service_id,
          })),
          value: generatedValuesBySecretId.get(definition.secret_id),
        })),
      })

    if (materialized.missing_secret_ids.length > 0) {
      throw new Error(
        `Preview random-once secrets are missing in ${input.environmentName}: ${materialized.missing_secret_ids.join(", ")}`,
      )
    }

    return resolveSecrets(materialized.secrets)
  }

  const synced = await input.zaneOperatorClient.syncPreviewRandomOnceSecrets({
    environment_name: input.environmentName,
    project_slug: input.projectSlug,
    secrets: definitions.map((definition) => ({
      persist_to: definition.persist_to,
      persisted_env_var: definition.persisted_env_var,
      secret_id: definition.secret_id,
      targets: definition.targets.map((target) => ({
        env_var: target.env_var,
        service_slug: target.service_id,
      })),
    })),
  })

  if (synced.missing_secret_ids.length === 0) {
    return resolveSecrets(synced.secrets)
  }

  if (!input.allowGenerateMissing) {
    throw new Error(
      `Preview random-once secrets are missing in ${input.environmentName}: ${synced.missing_secret_ids.join(", ")}`,
    )
  }

  // Baseline replays should reuse persisted values. Only fill the gaps left by an
  // interrupted first-creation run; do not rotate secrets that already exist.
  const missingSecretIds = new Set(synced.missing_secret_ids)
  const generatedSecrets = generatePreviewRandomOnceSecrets(input.stackInputs)
  const generatedValuesBySecretId = new Map(
    generatedSecrets.map((secret) => [secret["secret_id"], secret.value]),
  )
  const materialized =
    await input.zaneOperatorClient.syncPreviewRandomOnceSecrets({
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      secrets: definitions.map((definition) => ({
        persist_to: definition.persist_to,
        persisted_env_var: definition.persisted_env_var,
        secret_id: definition.secret_id,
        targets: definition.targets.map((target) => ({
          env_var: target.env_var,
          service_slug: target.service_id,
        })),
        ...(missingSecretIds.has(definition.secret_id)
          ? { value: generatedValuesBySecretId.get(definition.secret_id) }
          : {}),
      })),
    })

  if (materialized.missing_secret_ids.length > 0) {
    throw new Error(
      `Preview random-once secrets are missing in ${input.environmentName}: ${materialized.missing_secret_ids.join(", ")}`,
    )
  }

  return resolveSecrets(materialized.secrets)
}

const syncPreviewSharedEnv = async (input: {
  zaneOperatorClient: ZaneOperatorClient | null
  projectSlug: string
  environmentName: string
  sourceEnvironmentName: string
  contracts: Awaited<ReturnType<typeof loadDeployContracts>>
  deployServiceIds: string[]
  previewDbName: string
  previewDbUser: string
  previewDbPassword: string
}): Promise<void> => {
  if (!input.zaneOperatorClient) {
    return
  }

  const variables = buildPreviewSharedEnvSyncVariables({
    context: {
      previewDbName: input.previewDbName,
      previewDbPassword: input.previewDbPassword,
      previewDbUser: input.previewDbUser,
      sourceEnvironmentName: input.sourceEnvironmentName,
    },
    deployServiceIds: input.deployServiceIds,
    manifest: input.contracts.manifest,
    stackInputs: input.contracts.stackInputs,
  })

  if (variables.length === 0) {
    return
  }

  await input.zaneOperatorClient.syncPreviewSharedEnv({
    environment_name: input.environmentName,
    project_slug: input.projectSlug,
    variables,
  })
}

const syncPreviewServiceEnv = async (input: {
  zaneOperatorClient: ZaneOperatorClient | null
  projectSlug: string
  environmentName: string
  sourceEnvironmentName: string
  contracts: Awaited<ReturnType<typeof loadDeployContracts>>
  deployServiceIds: string[]
  previewDbName: string
  previewDbUser: string
  previewDbPassword: string
}): Promise<void> => {
  if (!input.zaneOperatorClient) {
    return
  }

  const services = buildPreviewServiceEnvSyncServices({
    context: {
      previewDbName: input.previewDbName,
      previewDbPassword: input.previewDbPassword,
      previewDbUser: input.previewDbUser,
      sourceEnvironmentName: input.sourceEnvironmentName,
    },
    deployServiceIds: input.deployServiceIds,
    manifest: input.contracts.manifest,
    stackInputs: input.contracts.stackInputs,
  })

  if (services.length === 0) {
    return
  }

  await input.zaneOperatorClient.syncPreviewServiceEnv({
    environment_name: input.environmentName,
    project_slug: input.projectSlug,
    services,
  })
}

const applyBaselinePreviewEnvOverrides = async (input: {
  command: DeployPreviewCommandInput
  environmentName: string
  plan: PlanResponse
  previewDbContext: PreviewDbContext
  previewRandomOnceSecrets: PreviewRandomOnceSecretInput[]
  runtimeProviderState: RuntimeProviderState
}): Promise<string> => {
  const { command } = input
  logDeployProgress(
    "Applying baseline preview-owned env materialization before staged deploys.",
  )
  const baselineEnvOverrides = await executeRenderEnvOverrides({
    lane: "preview",
    servicesCsv: input.plan.deploy_services_csv,
    ...input.previewDbContext,
    previewRandomOnceSecrets: input.previewRandomOnceSecrets,
    runtimeProviderOutputs: buildRuntimeProviderRenderContext(
      input.runtimeProviderState,
    ).runtimeProviderOutputs,
    stackInputsPath: command.stackInputsPath,
    stackManifestPath: command.stackManifestPath,
  })

  if (baselineEnvOverrides.services.length === 0) {
    return ""
  }

  const baselineEnvOverrideServiceIds = new Set(
    baselineEnvOverrides.services.map((service) => service.service_id),
  )
  const baselineTargetServices = input.plan.deploy_services.filter((service) =>
    baselineEnvOverrideServiceIds.has(service.id),
  )

  if (baselineTargetServices.length === 0) {
    return ""
  }

  logDeployProgress(
    `Persisting preview-owned env values for baseline services: ${baselineTargetServices
      .map((service) => service.service_slug)
      .join(", ")}.`,
  )
  const baselineTargets = await executeResolveTargetsPayload({
    apiToken: command.apiToken,
    baseUrl: command.baseUrl,
    dryRun: command.dryRun,
    payload: {
      environment_name: input.environmentName,
      lane: "preview",
      project_slug: command.projectSlug,
      services: baselineTargetServices.map((service) => ({
        service_id: service.id,
        service_slug: service.service_slug,
      })),
    },
  })

  await executeApplyEnvOverridesPayload({
    apiToken: command.apiToken,
    baseUrl: command.baseUrl,
    dryRun: command.dryRun,
    payload: {
      env_overrides: baselineEnvOverrides.services,
      environment_name: input.environmentName,
      project_slug: command.projectSlug,
      targets: baselineTargets.services,
    },
  })

  return baselineEnvOverrides.services
    .map((service) => service.service_id)
    .join(",")
}

const persistPreviewTargetCommit = async (input: {
  baselineDeploy: boolean
  command: DeployPreviewCommandInput
  environmentName: string
  zaneOperatorClient: ZaneOperatorClient | null
}): Promise<string | null> => {
  const { command } = input
  if (!command.targetCommitSha) {
    return null
  }

  if (!input.zaneOperatorClient) {
    return command.targetCommitSha
  }

  logDeployProgress(
    `Persisting preview target commit metadata before deploy stages: ${command.targetCommitSha}.`,
  )
  const previewCommitState =
    await input.zaneOperatorClient.writePreviewCommitState({
      environment_name: input.environmentName,
      project_slug: command.projectSlug,
      target_commit_sha: command.targetCommitSha,
      ...(input.baselineDeploy ? { baseline_complete: false } : {}),
    })

  return previewCommitState.target_commit_sha
}

const finalizePreviewCommitState = async (input: {
  baselineDeploy: boolean
  command: DeployPreviewCommandInput
  environmentName: string
  targetCommitSha: string | null
  zaneOperatorClient: ZaneOperatorClient | null
}): Promise<PreviewCommitState> => {
  const { command } = input
  if (!command.targetCommitSha) {
    return {
      lastDeployedCommitSha: null,
      targetCommitSha: input.targetCommitSha,
    }
  }

  if (!input.zaneOperatorClient) {
    return {
      lastDeployedCommitSha: command.targetCommitSha,
      targetCommitSha: input.targetCommitSha,
    }
  }

  logDeployProgress(
    `Persisting preview last-deployed commit metadata after successful deploy: ${command.targetCommitSha}.`,
  )
  const previewCommitState =
    await input.zaneOperatorClient.writePreviewCommitState({
      environment_name: input.environmentName,
      last_deployed_commit_sha: command.targetCommitSha,
      project_slug: command.projectSlug,
      ...(input.baselineDeploy ? { baseline_complete: true } : {}),
    })

  return {
    lastDeployedCommitSha: previewCommitState.last_deployed_commit_sha,
    targetCommitSha: previewCommitState.target_commit_sha,
  }
}

const triggerPreviewStageDeployments = async (
  context: PreviewStageContext,
  stage: number,
  filtered: ReturnType<typeof filterTargetsForGitCommit>,
): Promise<{ deployments: DeploymentLike[]; triggeredServicesCsv: string }> => {
  const { command } = context
  logDeployProgress(
    `Applying env overrides for preview stage ${stage}: ${filtered.services
      .map((service) => service.service_slug)
      .join(", ")}.`,
  )
  await executeApplyEnvOverridesPayload({
    apiToken: command.apiToken,
    baseUrl: command.baseUrl,
    dryRun: command.dryRun,
    payload: {
      env_overrides: filtered.filteredEnvOverrides,
      environment_name: context.environmentName,
      project_slug: command.projectSlug,
      targets: filtered.services,
    },
  })
  logDeployProgress(
    `Triggering deploys for preview stage ${stage}: ${filtered.services
      .map((service) => service.service_slug)
      .join(", ")}.`,
  )
  const trigger = await executeTriggerPayload({
    apiToken: command.apiToken,
    baseUrl: command.baseUrl,
    dryRun: command.dryRun,
    environmentName: context.environmentName,
    gitCommitSha: command.targetCommitSha,
    projectSlug: command.projectSlug,
    targets: filtered.services,
  })

  logDeployProgress(
    `Triggered preview stage ${stage} deployments: ${trigger.services
      .map(
        (deployment) =>
          `${deployment.service_slug}#${deployment.deployment_hash}`,
      )
      .join(", ")}.`,
  )

  return {
    deployments: trigger.services,
    triggeredServicesCsv: trigger.triggered_service_ids.join(","),
  }
}

const runPreviewStage = async (
  context: PreviewStageContext,
  stage: number,
  aggregate: PreviewStageAggregate,
): Promise<PreviewStageAggregate> => {
  const { command } = context
  const stagePlan = buildStagePlan(context.plan, stage)
  const stageServicesCsv = stagePlan.deploy_services_csv
  if (!stageServicesCsv) {
    return aggregate
  }

  logDeployProgress(
    `Starting preview deploy stage ${stage} for services: ${stageServicesCsv}.`,
  )
  await ensureStageRuntimeProviderOutputs({
    apiToken: command.apiToken,
    baseUrl: command.baseUrl,
    dryRun: command.dryRun,
    environmentName: context.environmentName,
    fullPlanServices: context.plan.deploy_services.map((service) => ({
      deploy_stage: service.deploy_stage,
      id: service.id,
      service_slug: service.service_slug,
    })),
    lane: "preview",
    meiliApiCredentialsProviderId: command.meiliApiCredentialsProviderId,
    needs: context.runtimeProviderNeeds,
    onProgress: logDeployProgress,
    projectSlug: command.projectSlug,
    stackInputs: context.contracts.stackInputs,
    stage,
    stageServices: stagePlan.deploy_services.map((service) => ({
      id: service.id,
      service_slug: service.service_slug,
    })),
    state: context.runtimeProviderState,
  })

  logDeployProgress(
    `Rendering env overrides for preview stage ${stage}: ${stageServicesCsv}.`,
  )
  const envOverrides = await executeRenderEnvOverrides({
    lane: "preview",
    servicesCsv: stageServicesCsv,
    ...context.previewDbContext,
    previewRandomOnceSecrets: context.previewRandomOnceSecrets,
    runtimeProviderOutputs: buildRuntimeProviderRenderContext(
      context.runtimeProviderState,
    ).runtimeProviderOutputs,
    stackInputsPath: command.stackInputsPath,
    stackManifestPath: command.stackManifestPath,
  })
  logDeployProgress(
    `Resolving deploy targets for preview stage ${stage}: ${stageServicesCsv}.`,
  )
  const resolveTargetsPayload: ResolveTargetsPayload = {
    environment_name: context.environmentName,
    lane: "preview",
    project_slug: command.projectSlug,
    services: stagePlan.deploy_services.map((service) => ({
      service_id: service.id,
      service_slug: service.service_slug,
    })),
  }
  const targets = await executeResolveTargetsPayload({
    apiToken: command.apiToken,
    baseUrl: command.baseUrl,
    dryRun: command.dryRun,
    payload: resolveTargetsPayload,
  })
  const filtered = context.desiredCommitSha
    ? filterTargetsForGitCommit(
        targets.services,
        envOverrides.services,
        context.desiredCommitSha,
      )
    : {
        adoptedDeployments: [] as DeploymentLike[],
        filteredEnvOverrides: envOverrides.services,
        services: targets.services,
        skippedServices: [],
      }

  const adoptedDeployments = mergeDeployments(
    aggregate.deployments,
    filtered.adoptedDeployments,
  )

  if (filtered.skippedServices.length > 0) {
    logDeployProgress(
      `Skipping current preview services for stage ${stage}: ${filtered.skippedServices
        .map((service) => `${service.service_slug} (${service.reason})`)
        .join(", ")}.`,
    )
  }

  if (filtered.adoptedDeployments.length > 0) {
    logDeployProgress(
      `Reusing active deployments for preview stage ${stage}: ${filtered.adoptedDeployments
        .map(
          (deployment) =>
            `${deployment.service_slug}#${deployment.deployment_hash}`,
        )
        .join(", ")}.`,
    )
  }

  if (
    filtered.services.length === 0 &&
    filtered.adoptedDeployments.length === 0
  ) {
    logDeployProgress(
      `No trigger required for preview stage ${stage}; all services were skipped by current-state checks.`,
    )
    return {
      ...aggregate,
      deployments: adoptedDeployments,
    }
  }

  const triggered =
    filtered.services.length > 0
      ? await triggerPreviewStageDeployments(context, stage, filtered)
      : { deployments: [] as DeploymentLike[], triggeredServicesCsv: "" }
  const stageDeployments = mergeDeployments(
    filtered.adoptedDeployments,
    triggered.deployments,
  )

  logDeployProgress(
    `Waiting for preview stage ${stage} deployments to become healthy.`,
  )
  await waitForDeployments({
    deployServicesCsv: stageServicesCsv,
    environmentName: context.environmentName,
    lane: "preview",
    previewClonedServiceIdsCsv: context.plan.preview_cloned_service_ids_csv,
    previewExcludedServiceIdsCsv: context.plan.preview_excluded_service_ids_csv,
    projectSlug: command.projectSlug,
    requestedServicesCsv: stageServicesCsv,
    triggeredServicesCsv: triggered.triggeredServicesCsv,
    ...context.previewDbContext,
    apiToken: command.apiToken,
    baseUrl: command.baseUrl,
    cancelOnInterrupt: true,
    deployments: stageDeployments.map((deployment) => ({ ...deployment })),
    dryRun: command.dryRun,
    onProgress: logDeployProgress,
    pollIntervalSeconds: command.pollIntervalSeconds,
    previewRandomOnceSecrets: context.previewRandomOnceSecrets,
    runtimeProviderOutputs: buildRuntimeProviderRenderContext(
      context.runtimeProviderState,
    ).runtimeProviderOutputs,
    stackInputsPath: command.stackInputsPath,
    stackManifestPath: command.stackManifestPath,
    tolerateBaseUrlUnavailable: false,
    waitTimeoutSeconds: command.waitTimeoutSeconds,
  })

  return {
    deployments: mergeDeployments(adoptedDeployments, triggered.deployments),
    envOverrideServiceIdsCsv: mergeCsvValues(
      aggregate.envOverrideServiceIdsCsv,
      filtered.filteredEnvOverrides
        .map((service) => service.service_id)
        .join(","),
    ),
    triggeredServicesCsv: mergeCsvValues(
      aggregate.triggeredServicesCsv,
      triggered.triggeredServicesCsv,
    ),
  }
}

// Deploy stages must run strictly in order because a later stage consumes the
// runtime provider outputs and healthy deployments produced by earlier stages,
// so they are walked sequentially through recursion instead of in parallel.
const runPreviewStagesSequentially = async (input: {
  aggregate: PreviewStageAggregate
  context: PreviewStageContext
  stages: readonly number[]
}): Promise<PreviewStageAggregate> => {
  const [stage, ...remainingStages] = input.stages
  if (stage === undefined) {
    return input.aggregate
  }

  const aggregate = await runPreviewStage(input.context, stage, input.aggregate)
  return await runPreviewStagesSequentially({
    aggregate,
    context: input.context,
    stages: remainingStages,
  })
}

// preview deploy keeps provider provisioning and staged deploy ordering in one flow
export const executeDeployPreview = async (
  input: DeployPreviewCommandInput,
): Promise<DeployPreviewExecutionResult> => {
  const [contracts, plan, previewGitBranch] = await Promise.all([
    loadDeployContracts(input.stackManifestPath, input.stackInputsPath),
    executePlan({
      lane: "preview",
      prNumber: input.prNumber,
      previewEnvPrefix: input.previewEnvPrefix,
      servicesCsv: input.servicesCsv,
      stackManifestPath: input.stackManifestPath,
    }),
    resolveGitHubPreviewHeadBranch(),
  ])
  const environment = await executeResolveEnvironment({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    dryRun: input.dryRun,
    dryRunCreated: input.dryRunCreated,
    environmentName: plan.preview_environment_name,
    lane: "preview",
    prNumber: input.prNumber,
    previewClonedServiceIdsCsv: plan.preview_cloned_service_ids_csv,
    previewEnvPrefix: input.previewEnvPrefix,
    previewExcludedServiceIdsCsv: plan.preview_excluded_service_ids_csv,
    previewGitBranch,
    projectSlug: input.projectSlug,
    reconcileServiceIdsCsv: "",
    sourceEnvironmentName: input.sourceEnvironmentName,
    stackInputsPath: input.stackInputsPath,
    stackManifestPath: input.stackManifestPath,
  })
  const baselineDeploy = environment.created || !environment.baseline_complete
  logDeployProgress(
    `Resolved preview environment ${environment.environment_name} (${environment.environment_id}); baseline mode: ${baselineDeploy ? "replay" : "redeploy-only"}.`,
  )
  const runtimePlan = baselineDeploy
    ? {
        ...plan,
        deploy_services: plan.preview_cloned_services,
        deploy_services_csv: plan.preview_cloned_service_ids_csv,
      }
    : plan
  const prerequisitePlan = await expandPlanForRuntimeProviderPrerequisites({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    dryRun: input.dryRun,
    environmentName: environment.environment_name,
    lane: "preview",
    manifest: contracts.manifest,
    meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
    plan: runtimePlan,
    projectSlug: input.projectSlug,
    stackInputs: contracts.stackInputs,
  })
  const effectiveRuntimePlan = prerequisitePlan.plan
  if (prerequisitePlan.transientServiceIds.length > 0) {
    logDeployProgress(
      `Adding transient provider prerequisite services to the preview deploy plan: ${prerequisitePlan.transientServiceIds.join(",")}.`,
    )
  }
  const zaneOperatorClient =
    input.dryRun || !input.baseUrl || !input.apiToken
      ? null
      : new ZaneOperatorClient(input.baseUrl, input.apiToken)
  const effectiveDeployServiceIds = effectiveRuntimePlan.deploy_services.map(
    (service) => service.id,
  )
  const previewDbContext = await resolvePreviewDbContext({
    contracts,
    deployServiceIds: effectiveDeployServiceIds,
    dryRun: input.dryRun,
    initialContext: {
      previewDbName: input.previewDbName,
      previewDbPassword: input.previewDbPassword,
      previewDbUser: input.previewDbUser,
    },
    prNumber: input.prNumber,
    zaneOperatorClient,
  })
  await syncPreviewSharedEnv({
    contracts,
    deployServiceIds: effectiveDeployServiceIds,
    environmentName: environment.environment_name,
    projectSlug: input.projectSlug,
    sourceEnvironmentName: input.sourceEnvironmentName,
    zaneOperatorClient,
    ...previewDbContext,
  })
  await syncPreviewServiceEnv({
    contracts,
    deployServiceIds: effectiveDeployServiceIds,
    environmentName: environment.environment_name,
    projectSlug: input.projectSlug,
    sourceEnvironmentName: input.sourceEnvironmentName,
    zaneOperatorClient,
    ...previewDbContext,
  })
  const previewRandomOnceSecrets = await resolvePreviewRandomOnceSecrets({
    allowGenerateMissing: baselineDeploy,
    dryRun: input.dryRun,
    environmentCreated: environment.created,
    environmentName: environment.environment_name,
    projectSlug: input.projectSlug,
    stackInputs: contracts.stackInputs,
    zaneOperatorClient,
  })
  const previewRandomOnceSecretsJson =
    previewRandomOnceSecrets.length > 0
      ? JSON.stringify(previewRandomOnceSecrets)
      : ""
  const runtimeProviderNeeds = collectConfiguredRuntimeProviderNeeds({
    lane: "preview",
    manifest: contracts.manifest,
    meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
    services: effectiveRuntimePlan.deploy_services,
    stackInputs: contracts.stackInputs,
  })
  const runtimeProviderState = createRuntimeProviderState({})
  const baselineEnvOverrideServiceIdsCsv =
    baselineDeploy && effectiveRuntimePlan.deploy_services_csv
      ? await applyBaselinePreviewEnvOverrides({
          command: input,
          environmentName: environment.environment_name,
          plan: effectiveRuntimePlan,
          previewDbContext,
          previewRandomOnceSecrets,
          runtimeProviderState,
        })
      : ""
  const persistedTargetCommitSha = await persistPreviewTargetCommit({
    baselineDeploy,
    command: input,
    environmentName: environment.environment_name,
    zaneOperatorClient,
  })

  if (!baselineDeploy) {
    await reuseRuntimeProviderOutputs({
      apiToken: input.apiToken,
      baseUrl: input.baseUrl,
      dryRun: input.dryRun,
      environmentName: environment.environment_name,
      lane: "preview",
      meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
      needs: runtimeProviderNeeds,
      onProgress: logDeployProgress,
      planServices: effectiveRuntimePlan.deploy_services.map((service) => ({
        id: service.id,
        service_slug: service.service_slug,
      })),
      projectSlug: input.projectSlug,
      stackInputs: contracts.stackInputs,
      state: runtimeProviderState,
    })
  }

  const stageAggregate = await runPreviewStagesSequentially({
    aggregate: {
      deployments: [],
      envOverrideServiceIdsCsv: mergeCsvValues(
        "",
        baselineEnvOverrideServiceIdsCsv,
      ),
      triggeredServicesCsv: "",
    },
    context: {
      command: input,
      contracts,
      desiredCommitSha:
        input.targetCommitSha || textOrFallback(persistedTargetCommitSha),
      environmentName: environment.environment_name,
      plan: effectiveRuntimePlan,
      previewDbContext,
      previewRandomOnceSecrets,
      runtimeProviderNeeds,
      runtimeProviderState,
    },
    stages: collectStageNumbers(effectiveRuntimePlan),
  })
  const runtimeProviderRenderContext =
    buildRuntimeProviderRenderContext(runtimeProviderState)
  const previewCommitState = await finalizePreviewCommitState({
    baselineDeploy,
    command: input,
    environmentName: environment.environment_name,
    targetCommitSha: persistedTargetCommitSha,
    zaneOperatorClient,
  })

  const response = deployPreviewResponseSchema.parse({
    deploy_services_csv: effectiveRuntimePlan.deploy_services_csv,
    deployments: stageAggregate.deployments,
    env_override_service_ids_csv: stageAggregate.envOverrideServiceIdsCsv,
    environment_created: environment.created,
    environment_id: environment.environment_id,
    environment_name: environment.environment_name,
    environment_ready: environment.ready,
    environment_warnings: environment.warnings,
    lane: "preview",
    last_deployed_commit_sha: previewCommitState.lastDeployedCommitSha,
    preview_cloned_service_ids_csv:
      effectiveRuntimePlan.preview_cloned_service_ids_csv,
    preview_excluded_service_ids_csv:
      effectiveRuntimePlan.preview_excluded_service_ids_csv,
    project_slug: input.projectSlug,
    requested_services_csv: plan.requested_services_csv,
    target_commit_sha: previewCommitState.targetCommitSha,
    triggered_services_csv: stageAggregate.triggeredServicesCsv,
  })

  if (hasText(input.outputJson)) {
    await writeJsonFile(input.outputJson, response)
  }

  return {
    previewRandomOnceSecretsJson,
    response,
    runtimeProviderOutputs: runtimeProviderRenderContext.runtimeProviderOutputs,
  }
}

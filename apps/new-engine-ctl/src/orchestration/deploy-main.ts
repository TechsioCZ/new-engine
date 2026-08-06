import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import type {
  DeployMainCommandInput,
  DeployMainResponse,
} from "../contracts/deploy-main.js"
import { deployMainResponseSchema } from "../contracts/deploy-main.js"
import type { ResolveTargetsPayload } from "../contracts/resolve-targets.js"
import type { RuntimeProviderOutputs } from "../contracts/runtime-provider-outputs.js"
import { executeApplyEnvOverridesPayload } from "./apply-env-overrides.js"
import { loadDeployContracts } from "./deploy-inputs.js"
import {
  buildStagePlan,
  collectStageNumbers,
  filterTargetsForGitCommit,
  mergeCsvValues,
  mergeDeployments,
  stageHasService,
  waitForDeployments,
} from "./deploy-shared.js"
import type { DeploymentLike } from "./deploy-shared.js"
import { executePlan } from "./plan.js"
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
import { expandPlanForRuntimeProviderPrerequisites } from "./runtime-provider-prerequisites.js"
import { executeTriggerPayload } from "./trigger.js"

export interface DeployMainExecutionResult {
  response: DeployMainResponse
  runtimeProviderOutputs: RuntimeProviderOutputs
}

type DeployContracts = Awaited<ReturnType<typeof loadDeployContracts>>
type DeployPlan = Awaited<ReturnType<typeof executePlan>>
type ResolvedEnvironment = Awaited<ReturnType<typeof executeResolveEnvironment>>
type RuntimeProviderNeeds = ReturnType<
  typeof collectConfiguredRuntimeProviderNeeds
>
type RuntimeProviderState = ReturnType<typeof createRuntimeProviderState>

interface StageExecutionContext {
  contracts: DeployContracts
  effectivePlan: DeployPlan
  environment: ResolvedEnvironment
  input: DeployMainCommandInput
  plan: DeployPlan
  runtimeProviderNeeds: RuntimeProviderNeeds
  runtimeProviderState: RuntimeProviderState
}

interface StageAccumulator {
  allDeployments: DeploymentLike[]
  envOverrideServiceIdsCsv: string
  skippedServicesCsv: string
  triggeredServicesCsv: string
}

const isEnvFlagSet = (value: string | undefined): boolean =>
  value !== undefined && value !== ""

const supportsPrettyLogs = (): boolean => {
  if (!process.stderr.isTTY) {
    return false
  }

  if (
    isEnvFlagSet(process.env.GITHUB_ACTIONS) ||
    isEnvFlagSet(process.env.NO_COLOR)
  ) {
    return false
  }

  return process.env.TERM !== "dumb"
}

const colorize = (text: string, code: string): string =>
  supportsPrettyLogs() ? `[${code}m${text}[0m` : text

const logDeployProgress = (message: string): void => {
  let label = "[deploy]"
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
  }

  process.stderr.write(`${colorize(label, colorCode)} ${message}\n`)
}

const writeJsonFile = async (
  filePath: string,
  value: unknown,
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value)}\n`, "utf-8")
}

const runDeployStage = async (
  stage: number,
  context: StageExecutionContext,
  accumulator: StageAccumulator,
): Promise<StageAccumulator> => {
  const {
    contracts,
    effectivePlan,
    environment,
    input,
    plan,
    runtimeProviderNeeds,
    runtimeProviderState,
  } = context
  const stagePlan = buildStagePlan(effectivePlan, stage)
  const stageServicesCsv = stagePlan.deploy_services_csv
  if (stageServicesCsv === "") {
    return accumulator
  }

  logDeployProgress(
    `Starting deploy stage ${stage} for services: ${stageServicesCsv}.`,
  )
  await ensureStageRuntimeProviderOutputs({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    dryRun: input.dryRun,
    environmentName: environment.environment_name,
    fullPlanServices: effectivePlan.deploy_services.map((service) => ({
      deploy_stage: service.deploy_stage,
      id: service.id,
      service_slug: service.service_slug,
    })),
    lane: "main",
    meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
    needs: runtimeProviderNeeds,
    onProgress: logDeployProgress,
    projectSlug: input.projectSlug,
    stackInputs: contracts.stackInputs,
    stage,
    stageServices: stagePlan.deploy_services.map((service) => ({
      id: service.id,
      service_slug: service.service_slug,
    })),
    state: runtimeProviderState,
  })

  logDeployProgress(
    `Rendering env overrides for stage ${stage}: ${stageServicesCsv}.`,
  )
  const envOverrides = await executeRenderEnvOverrides({
    lane: "main",
    previewDbName: "",
    previewDbPassword: "",
    previewDbUser: "",
    previewRandomOnceSecrets: [],
    runtimeProviderOutputs:
      buildRuntimeProviderRenderContext(runtimeProviderState)
        .runtimeProviderOutputs,
    servicesCsv: stageServicesCsv,
    stackInputsPath: input.stackInputsPath,
    stackManifestPath: input.stackManifestPath,
  })

  logDeployProgress(
    `Resolving deploy targets for stage ${stage}: ${stageServicesCsv}.`,
  )
  const resolveTargetsPayload: ResolveTargetsPayload = {
    environment_name: environment.environment_name,
    lane: "main",
    project_slug: input.projectSlug,
    services: stagePlan.deploy_services.map((service) => ({
      service_id: service.id,
      service_slug: service.service_slug,
    })),
  }
  const targets = await executeResolveTargetsPayload({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    dryRun: input.dryRun,
    payload: resolveTargetsPayload,
  })
  const filtered = filterTargetsForGitCommit(
    targets.services,
    envOverrides.services,
    input.gitCommitSha ?? "",
  )

  const allDeployments = mergeDeployments(
    accumulator.allDeployments,
    filtered.adoptedDeployments,
  )

  if (filtered.adoptedDeployments.length > 0) {
    logDeployProgress(
      `Reusing active deployments for stage ${stage}: ${filtered.adoptedDeployments
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
      `No trigger required for stage ${stage}; all services were skipped by current-state checks.`,
    )
    return {
      ...accumulator,
      allDeployments,
      skippedServicesCsv: mergeCsvValues(
        accumulator.skippedServicesCsv,
        filtered.skippedServices.map((service) => service.service_id).join(","),
      ),
    }
  }

  let stageDeployments = filtered.adoptedDeployments
  let stageTriggeredServicesCsv = ""
  let mergedDeployments = allDeployments
  let { triggeredServicesCsv } = accumulator

  if (filtered.services.length > 0) {
    logDeployProgress(
      `Applying env overrides for stage ${stage}: ${filtered.services
        .map((service) => service.service_slug)
        .join(", ")}.`,
    )
    await executeApplyEnvOverridesPayload({
      apiToken: input.apiToken,
      baseUrl: input.baseUrl,
      dryRun: input.dryRun,
      payload: {
        env_overrides: filtered.filteredEnvOverrides,
        environment_name: environment.environment_name,
        project_slug: input.projectSlug,
        targets: filtered.services,
      },
    })
    logDeployProgress(
      `Triggering deploys for stage ${stage}: ${filtered.services
        .map((service) => service.service_slug)
        .join(", ")}.`,
    )
    const trigger = await executeTriggerPayload({
      apiToken: input.apiToken,
      baseUrl: input.baseUrl,
      dryRun: input.dryRun,
      environmentName: environment.environment_name,
      gitCommitSha: input.gitCommitSha,
      projectSlug: input.projectSlug,
      targets: filtered.services,
    })
    stageDeployments = mergeDeployments(stageDeployments, trigger.services)
    mergedDeployments = mergeDeployments(mergedDeployments, trigger.services)
    stageTriggeredServicesCsv = trigger.triggered_service_ids.join(",")
    triggeredServicesCsv = mergeCsvValues(
      triggeredServicesCsv,
      stageTriggeredServicesCsv,
    )
    logDeployProgress(
      `Triggered stage ${stage} deployments: ${trigger.services
        .map(
          (deployment) =>
            `${deployment.service_slug}#${deployment.deployment_hash}`,
        )
        .join(", ")}.`,
    )
  }

  const skippedServicesCsv = mergeCsvValues(
    accumulator.skippedServicesCsv,
    filtered.skippedServices.map((service) => service.service_id).join(","),
  )
  const envOverrideServiceIdsCsv = mergeCsvValues(
    accumulator.envOverrideServiceIdsCsv,
    filtered.filteredEnvOverrides
      .map((service) => service.service_id)
      .join(","),
  )

  logDeployProgress(`Waiting for stage ${stage} deployments to become healthy.`)
  await waitForDeployments({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    cancelOnInterrupt: true,
    deployServicesCsv: stageServicesCsv,
    deployments: stageDeployments,
    dryRun: input.dryRun,
    environmentName: environment.environment_name,
    lane: "main",
    onProgress: logDeployProgress,
    pollIntervalSeconds: input.pollIntervalSeconds,
    previewClonedServiceIdsCsv: "",
    previewDbName: "",
    previewDbPassword: "",
    previewDbUser: "",
    previewExcludedServiceIdsCsv: "",
    previewRandomOnceSecrets: [],
    projectSlug: input.projectSlug,
    requestedServicesCsv: stageServicesCsv,
    runtimeProviderOutputs:
      buildRuntimeProviderRenderContext(runtimeProviderState)
        .runtimeProviderOutputs,
    stackInputsPath: input.stackInputsPath,
    stackManifestPath: input.stackManifestPath,
    tolerateBaseUrlUnavailable: stageHasService(plan, stage, "zane-operator"),
    triggeredServicesCsv: stageTriggeredServicesCsv,
    waitTimeoutSeconds: input.waitTimeoutSeconds,
  })

  return {
    allDeployments: mergedDeployments,
    envOverrideServiceIdsCsv,
    skippedServicesCsv,
    triggeredServicesCsv,
  }
}

// Deploy stages are strictly ordered, so this recursion intentionally awaits
// one stage at a time; the stage list is finite and shrinks on every call.
const runDeployStages = async (
  stages: readonly number[],
  context: StageExecutionContext,
  accumulator: StageAccumulator,
): Promise<StageAccumulator> => {
  const [stage, ...remainingStages] = stages
  if (stage === undefined) {
    return accumulator
  }

  const nextAccumulator = await runDeployStage(stage, context, accumulator)
  return await runDeployStages(remainingStages, context, nextAccumulator)
}

export const executeDeployMain = async (
  input: DeployMainCommandInput,
): Promise<DeployMainExecutionResult> => {
  const [contracts, plan] = await Promise.all([
    loadDeployContracts(input.stackManifestPath, input.stackInputsPath),
    executePlan({
      lane: "main",
      previewEnvPrefix: "pr-",
      servicesCsv: input.servicesCsv,
      stackManifestPath: input.stackManifestPath,
    }),
  ])
  const environment = await executeResolveEnvironment({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    dryRun: input.dryRun,
    dryRunCreated: false,
    environmentName: input.environmentName,
    lane: "main",
    previewClonedServiceIdsCsv: "",
    previewEnvPrefix: "pr-",
    previewExcludedServiceIdsCsv: "",
    projectSlug: input.projectSlug,
    reconcileServiceIdsCsv: plan.deploy_services_csv,
    sourceEnvironmentName: input.environmentName,
    stackInputsPath: input.stackInputsPath,
    stackManifestPath: input.stackManifestPath,
  })
  const prerequisitePlan = await expandPlanForRuntimeProviderPrerequisites({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    dryRun: input.dryRun,
    environmentName: environment.environment_name,
    lane: "main",
    manifest: contracts.manifest,
    meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
    plan,
    projectSlug: input.projectSlug,
    stackInputs: contracts.stackInputs,
  })
  const effectivePlan = prerequisitePlan.plan

  if (prerequisitePlan.transientServiceIds.length > 0) {
    logDeployProgress(
      `Adding transient prerequisite services to the main deploy plan: ${prerequisitePlan.transientServiceIds.join(",")}.`,
    )
  }

  const downtimeRiskServiceIds: string[] = []
  for (const service of effectivePlan.deploy_services) {
    if (service.downtime_risk) {
      downtimeRiskServiceIds.push(service.id)
    }
  }

  if (downtimeRiskServiceIds.length > 0 && !input.approveDowntimeRisk) {
    throw new Error(
      `Main deploy includes downtime-risk services: ${downtimeRiskServiceIds.join(",")}. Re-run with --approve-downtime-risk.`,
    )
  }

  logDeployProgress(
    `Resolved main environment ${environment.environment_name} (${environment.environment_id}).`,
  )
  const runtimeProviderNeeds = collectConfiguredRuntimeProviderNeeds({
    lane: "main",
    manifest: contracts.manifest,
    meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
    services: effectivePlan.deploy_services,
    stackInputs: contracts.stackInputs,
  })
  const runtimeProviderState = createRuntimeProviderState({})

  await reuseRuntimeProviderOutputs({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    dryRun: input.dryRun,
    environmentName: environment.environment_name,
    lane: "main",
    meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
    needs: runtimeProviderNeeds,
    onProgress: logDeployProgress,
    planServices: effectivePlan.deploy_services.map((service) => ({
      id: service.id,
      service_slug: service.service_slug,
    })),
    projectSlug: input.projectSlug,
    stackInputs: contracts.stackInputs,
    state: runtimeProviderState,
  })

  const stageResult = await runDeployStages(
    collectStageNumbers(effectivePlan),
    {
      contracts,
      effectivePlan,
      environment,
      input,
      plan,
      runtimeProviderNeeds,
      runtimeProviderState,
    },
    {
      allDeployments: [],
      envOverrideServiceIdsCsv: "",
      skippedServicesCsv: "",
      triggeredServicesCsv: "",
    },
  )

  const runtimeProviderRenderContext =
    buildRuntimeProviderRenderContext(runtimeProviderState)

  const response = deployMainResponseSchema.parse({
    deploy_services_csv: effectivePlan.deploy_services_csv,
    deployments: stageResult.allDeployments,
    env_override_service_ids_csv: stageResult.envOverrideServiceIdsCsv,
    environment_created: environment.created,
    environment_id: environment.environment_id,
    environment_name: environment.environment_name,
    lane: "main",
    project_slug: input.projectSlug,
    requested_services_csv: plan.requested_services_csv,
    skipped_services_csv: stageResult.skippedServicesCsv,
    triggered_services_csv: stageResult.triggeredServicesCsv,
  })

  if (input.outputJson !== undefined && input.outputJson !== "") {
    await writeJsonFile(input.outputJson, response)
  }

  return {
    response,
    runtimeProviderOutputs: runtimeProviderRenderContext.runtimeProviderOutputs,
  }
}

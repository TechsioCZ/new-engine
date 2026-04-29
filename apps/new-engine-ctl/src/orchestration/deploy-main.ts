import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

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
  type DeploymentLike,
  filterTargetsForGitCommit,
  mergeCsvValues,
  mergeDeployments,
  stageHasService,
  waitForDeployments,
} from "./deploy-shared.js"
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

export type DeployMainExecutionResult = {
  response: DeployMainResponse
  runtimeProviderOutputs: RuntimeProviderOutputs
}

function supportsPrettyLogs(): boolean {
  return Boolean(
    process.stderr.isTTY &&
      !process.env.GITHUB_ACTIONS &&
      !process.env.NO_COLOR &&
      process.env.TERM !== "dumb"
  )
}

function colorize(text: string, code: string): string {
  return supportsPrettyLogs() ? `\u001b[${code}m${text}\u001b[0m` : text
}

function logDeployProgress(message: string): void {
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

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executeDeployMain(
  input: DeployMainCommandInput
): Promise<DeployMainExecutionResult> {
  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath
  )
  const plan = await executePlan({
    lane: "main",
    servicesCsv: input.servicesCsv,
    prNumber: undefined,
    outputJson: undefined,
    stackManifestPath: input.stackManifestPath,
    previewEnvPrefix: "pr-",
  })
  const environment = await executeResolveEnvironment({
    lane: "main",
    projectSlug: input.projectSlug,
    prNumber: undefined,
    environmentName: input.environmentName,
    sourceEnvironmentName: input.environmentName,
    reconcileServiceIdsCsv: plan.deploy_services_csv,
    previewClonedServiceIdsCsv: "",
    previewExcludedServiceIdsCsv: "",
    outputJson: undefined,
    baseUrl: input.baseUrl,
    apiToken: input.apiToken,
    dryRun: input.dryRun,
    dryRunCreated: false,
    stackManifestPath: input.stackManifestPath,
    stackInputsPath: input.stackInputsPath,
    previewEnvPrefix: "pr-",
    previewGitBranch: "",
  })
  const prerequisitePlan = await expandPlanForRuntimeProviderPrerequisites({
    lane: "main",
    plan,
    manifest: contracts.manifest,
    stackInputs: contracts.stackInputs,
    projectSlug: input.projectSlug,
    environmentName: environment.environment_name,
    baseUrl: input.baseUrl,
    apiToken: input.apiToken,
    dryRun: input.dryRun,
    meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
  })
  const effectivePlan = prerequisitePlan.plan

  if (prerequisitePlan.transientServiceIds.length > 0) {
    logDeployProgress(
      `Adding transient prerequisite services to the main deploy plan: ${prerequisitePlan.transientServiceIds.join(",")}.`
    )
  }

  const downtimeRiskServiceIds = effectivePlan.deploy_services
    .filter((service) => service.downtime_risk)
    .map((service) => service.id)

  if (downtimeRiskServiceIds.length > 0 && !input.approveDowntimeRisk) {
    throw new Error(
      `Main deploy includes downtime-risk services: ${downtimeRiskServiceIds.join(",")}. Re-run with --approve-downtime-risk.`
    )
  }

  logDeployProgress(
    `Resolved main environment ${environment.environment_name} (${environment.environment_id}).`
  )
  const runtimeProviderNeeds = collectConfiguredRuntimeProviderNeeds({
    lane: "main",
    manifest: contracts.manifest,
    stackInputs: contracts.stackInputs,
    services: effectivePlan.deploy_services,
    meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
  })
  const runtimeProviderState = createRuntimeProviderState({})

  let envOverrideServiceIdsCsv = ""
  let triggeredServicesCsv = ""
  let skippedServicesCsv = ""
  let allDeployments: DeploymentLike[] = []
  await reuseRuntimeProviderOutputs({
    lane: "main",
    projectSlug: input.projectSlug,
    environmentName: environment.environment_name,
    planServices: effectivePlan.deploy_services.map((service) => ({
      id: service.id,
      service_slug: service.service_slug,
    })),
    needs: runtimeProviderNeeds,
    stackInputs: contracts.stackInputs,
    baseUrl: input.baseUrl,
    apiToken: input.apiToken,
    dryRun: input.dryRun,
    state: runtimeProviderState,
    meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
    onProgress: logDeployProgress,
  })

  for (const stage of collectStageNumbers(effectivePlan)) {
    const stagePlan = buildStagePlan(effectivePlan, stage)
    const stageServicesCsv = stagePlan.deploy_services_csv
    if (!stageServicesCsv) {
      continue
    }

    logDeployProgress(
      `Starting deploy stage ${stage} for services: ${stageServicesCsv}.`
    )
    await ensureStageRuntimeProviderOutputs({
      lane: "main",
      stage,
      stageServices: stagePlan.deploy_services.map((service) => ({
        id: service.id,
        service_slug: service.service_slug,
      })),
      fullPlanServices: effectivePlan.deploy_services.map((service) => ({
        id: service.id,
        service_slug: service.service_slug,
        deploy_stage: service.deploy_stage,
      })),
      needs: runtimeProviderNeeds,
      projectSlug: input.projectSlug,
      environmentName: environment.environment_name,
      stackInputs: contracts.stackInputs,
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: input.dryRun,
      state: runtimeProviderState,
      meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
      onProgress: logDeployProgress,
    })

    logDeployProgress(
      `Rendering env overrides for stage ${stage}: ${stageServicesCsv}.`
    )
    const envOverrides = await executeRenderEnvOverrides({
      lane: "main",
      servicesCsv: stageServicesCsv,
      previewDbName: "",
      previewDbUser: "",
      previewDbPassword: "",
      previewRandomOnceSecrets: [],
      runtimeProviderOutputs:
        buildRuntimeProviderRenderContext(runtimeProviderState)
          .runtimeProviderOutputs,
      outputJson: undefined,
      stackManifestPath: input.stackManifestPath,
      stackInputsPath: input.stackInputsPath,
    })

    logDeployProgress(
      `Resolving deploy targets for stage ${stage}: ${stageServicesCsv}.`
    )
    const resolveTargetsPayload: ResolveTargetsPayload = {
      lane: "main",
      project_slug: input.projectSlug,
      environment_name: environment.environment_name,
      services: stagePlan.deploy_services.map((service) => ({
        service_id: service.id,
        service_slug: service.service_slug,
      })),
    }
    const targets = await executeResolveTargetsPayload({
      payload: resolveTargetsPayload,
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: input.dryRun,
    })
    const filtered = filterTargetsForGitCommit(
      targets.services,
      envOverrides.services,
      input.gitCommitSha ?? ""
    )

    allDeployments = mergeDeployments(
      allDeployments,
      filtered.adoptedDeployments
    )

    if (filtered.adoptedDeployments.length > 0) {
      logDeployProgress(
        `Reusing active deployments for stage ${stage}: ${filtered.adoptedDeployments
          .map(
            (deployment) =>
              `${deployment.service_slug}#${deployment.deployment_hash}`
          )
          .join(", ")}.`
      )
    }

    if (
      filtered.services.length === 0 &&
      filtered.adoptedDeployments.length === 0
    ) {
      logDeployProgress(
        `No trigger required for stage ${stage}; all services were skipped by current-state checks.`
      )
      skippedServicesCsv = mergeCsvValues(
        skippedServicesCsv,
        filtered.skippedServices.map((service) => service.service_id).join(",")
      )
      continue
    }

    let stageDeployments = filtered.adoptedDeployments
    let stageTriggeredServicesCsv = ""

    if (filtered.services.length > 0) {
      logDeployProgress(
        `Applying env overrides for stage ${stage}: ${filtered.services
          .map((service) => service.service_slug)
          .join(", ")}.`
      )
      await executeApplyEnvOverridesPayload({
        payload: {
          project_slug: input.projectSlug,
          environment_name: environment.environment_name,
          targets: filtered.services,
          env_overrides: filtered.filteredEnvOverrides,
        },
        baseUrl: input.baseUrl,
        apiToken: input.apiToken,
        dryRun: input.dryRun,
      })
      logDeployProgress(
        `Triggering deploys for stage ${stage}: ${filtered.services
          .map((service) => service.service_slug)
          .join(", ")}.`
      )
      const trigger = await executeTriggerPayload({
        projectSlug: input.projectSlug,
        environmentName: environment.environment_name,
        targets: filtered.services,
        gitCommitSha: input.gitCommitSha,
        baseUrl: input.baseUrl,
        apiToken: input.apiToken,
        dryRun: input.dryRun,
      })
      stageDeployments = mergeDeployments(stageDeployments, trigger.services)
      allDeployments = mergeDeployments(allDeployments, trigger.services)
      stageTriggeredServicesCsv = trigger.triggered_service_ids.join(",")
      triggeredServicesCsv = mergeCsvValues(
        triggeredServicesCsv,
        stageTriggeredServicesCsv
      )
      logDeployProgress(
        `Triggered stage ${stage} deployments: ${trigger.services
          .map(
            (deployment) =>
              `${deployment.service_slug}#${deployment.deployment_hash}`
          )
          .join(", ")}.`
      )
    }

    skippedServicesCsv = mergeCsvValues(
      skippedServicesCsv,
      filtered.skippedServices.map((service) => service.service_id).join(",")
    )
    envOverrideServiceIdsCsv = mergeCsvValues(
      envOverrideServiceIdsCsv,
      filtered.filteredEnvOverrides
        .map((service) => service.service_id)
        .join(",")
    )

    logDeployProgress(
      `Waiting for stage ${stage} deployments to become healthy.`
    )
    await waitForDeployments({
      lane: "main",
      projectSlug: input.projectSlug,
      environmentName: environment.environment_name,
      requestedServicesCsv: stageServicesCsv,
      deployServicesCsv: stageServicesCsv,
      triggeredServicesCsv: stageTriggeredServicesCsv,
      previewClonedServiceIdsCsv: "",
      previewExcludedServiceIdsCsv: "",
      previewDbName: "",
      previewDbUser: "",
      previewDbPassword: "",
      previewRandomOnceSecrets: [],
      runtimeProviderOutputs:
        buildRuntimeProviderRenderContext(runtimeProviderState)
          .runtimeProviderOutputs,
      deployments: stageDeployments,
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: input.dryRun,
      pollIntervalSeconds: input.pollIntervalSeconds,
      waitTimeoutSeconds: input.waitTimeoutSeconds,
      tolerateBaseUrlUnavailable: stageHasService(plan, stage, "zane-operator"),
      stackManifestPath: input.stackManifestPath,
      stackInputsPath: input.stackInputsPath,
      onProgress: logDeployProgress,
      cancelOnInterrupt: true,
    })
  }

  const runtimeProviderRenderContext =
    buildRuntimeProviderRenderContext(runtimeProviderState)

  const response = deployMainResponseSchema.parse({
    lane: "main",
    project_slug: input.projectSlug,
    environment_name: environment.environment_name,
    environment_id: environment.environment_id,
    environment_created: environment.created,
    requested_services_csv: plan.requested_services_csv,
    deploy_services_csv: effectivePlan.deploy_services_csv,
    env_override_service_ids_csv: envOverrideServiceIdsCsv,
    triggered_services_csv: triggeredServicesCsv,
    skipped_services_csv: skippedServicesCsv,
    deployments: allDeployments,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return {
    response,
    runtimeProviderOutputs: runtimeProviderRenderContext.runtimeProviderOutputs,
  }
}

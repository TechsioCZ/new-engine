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

function supportsPrettyLogs(): boolean {
  return Boolean(
    process.stderr.isTTY &&
    !process.env.GITHUB_ACTIONS &&
    !process.env.NO_COLOR &&
    process.env.TERM !== "dumb",
  )
}

function colorize(text: string, code: string): string {
  return supportsPrettyLogs() ? `\u001B[${code}m${text}\u001B[0m` : text
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
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

export async function executeDeployMain(
  input: DeployMainCommandInput,
): Promise<DeployMainExecutionResult> {
  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath,
  )
  const plan = await executePlan({
    lane: "main",
    outputJson: undefined,
    prNumber: undefined,
    previewEnvPrefix: "pr-",
    servicesCsv: input.servicesCsv,
    stackManifestPath: input.stackManifestPath,
  })
  const environment = await executeResolveEnvironment({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    dryRun: input.dryRun,
    dryRunCreated: false,
    environmentName: input.environmentName,
    lane: "main",
    outputJson: undefined,
    prNumber: undefined,
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

  const downtimeRiskServiceIds = effectivePlan.deploy_services
    .filter((service) => service.downtime_risk)
    .map((service) => service.id)

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

  let envOverrideServiceIdsCsv = ""
  let triggeredServicesCsv = ""
  let skippedServicesCsv = ""
  let allDeployments: DeploymentLike[] = []
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

  for (const stage of collectStageNumbers(effectivePlan)) {
    const stagePlan = buildStagePlan(effectivePlan, stage)
    const stageServicesCsv = stagePlan.deploy_services_csv
    if (!stageServicesCsv) {
      continue
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
      outputJson: undefined,
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

    allDeployments = mergeDeployments(
      allDeployments,
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
      skippedServicesCsv = mergeCsvValues(
        skippedServicesCsv,
        filtered.skippedServices.map((service) => service.service_id).join(","),
      )
      continue
    }

    let stageDeployments = filtered.adoptedDeployments
    let stageTriggeredServicesCsv = ""

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
      allDeployments = mergeDeployments(allDeployments, trigger.services)
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

    skippedServicesCsv = mergeCsvValues(
      skippedServicesCsv,
      filtered.skippedServices.map((service) => service.service_id).join(","),
    )
    envOverrideServiceIdsCsv = mergeCsvValues(
      envOverrideServiceIdsCsv,
      filtered.filteredEnvOverrides
        .map((service) => service.service_id)
        .join(","),
    )

    logDeployProgress(
      `Waiting for stage ${stage} deployments to become healthy.`,
    )
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
  }

  const runtimeProviderRenderContext =
    buildRuntimeProviderRenderContext(runtimeProviderState)

  const response = deployMainResponseSchema.parse({
    deploy_services_csv: effectivePlan.deploy_services_csv,
    deployments: allDeployments,
    env_override_service_ids_csv: envOverrideServiceIdsCsv,
    environment_created: environment.created,
    environment_id: environment.environment_id,
    environment_name: environment.environment_name,
    lane: "main",
    project_slug: input.projectSlug,
    requested_services_csv: plan.requested_services_csv,
    skipped_services_csv: skippedServicesCsv,
    triggered_services_csv: triggeredServicesCsv,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return {
    response,
    runtimeProviderOutputs: runtimeProviderRenderContext.runtimeProviderOutputs,
  }
}

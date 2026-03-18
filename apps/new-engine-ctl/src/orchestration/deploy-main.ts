import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  DeployMainCommandInput,
  DeployMainResponse,
} from "../contracts/deploy-main.js"
import { deployMainResponseSchema } from "../contracts/deploy-main.js"
import type { ResolveTargetsPayload } from "../contracts/resolve-targets.js"
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
import { reconcileMainMeiliApiCredentials } from "./meili-api-credentials.js"
import { executePlan } from "./plan.js"
import { getMeiliApiCredentialsProviderSourceService } from "./preview-meili.js"
import { executeRenderEnvOverrides } from "./render-env-overrides.js"
import { executeResolveEnvironment } from "./resolve-environment.js"
import { executeResolveTargetsPayload } from "./resolve-targets.js"
import { executeTriggerPayload } from "./trigger.js"

export type DeployMainExecutionResult = {
  response: DeployMainResponse
  meiliBackendKey: string
  meiliFrontendKey: string
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

  if (message.includes("Meili")) {
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

function stageConsumesMeiliApiCredentials(
  stagePlan: Awaited<ReturnType<typeof executePlan>>
): boolean {
  return stagePlan.deploy_services.some(
    (service) =>
      service.consumes.meili_backend_key || service.consumes.meili_frontend_key
  )
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
  const meiliApiCredentialsSource = getMeiliApiCredentialsProviderSourceService(
    contracts.manifest,
    contracts.stackInputs,
    input.meiliApiCredentialsProviderId
  )
  const sourceServiceInPlan = plan.deploy_services.some(
    (service) => service.id === meiliApiCredentialsSource.serviceId
  )
  const sourceServiceStage =
    plan.deploy_services.find(
      (service) => service.id === meiliApiCredentialsSource.serviceId
    )?.deploy_stage ?? null
  const needsMeiliApiCredentials = plan.deploy_services.some(
    (service) =>
      service.id === meiliApiCredentialsSource.serviceId ||
      service.consumes.meili_backend_key ||
      service.consumes.meili_frontend_key
  )
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
  })

  logDeployProgress(
    `Resolved main environment ${environment.environment_name} (${environment.environment_id}).`
  )

  let envOverrideServiceIdsCsv = ""
  let triggeredServicesCsv = ""
  let skippedServicesCsv = ""
  let allDeployments: DeploymentLike[] = []
  let meiliBackendKey = ""
  let meiliFrontendKey = ""
  let meiliFrontendEnvVar = ""
  let meiliBackendCreated = false
  let meiliBackendUpdated = false
  let meiliFrontendCreated = false
  let meiliFrontendUpdated = false
  let meiliKeysReconciled = false
  let meiliVerified = false

  const reconcileMeiliApiCredentials = async (): Promise<void> => {
    if (meiliKeysReconciled) {
      return
    }

    if (!input.dryRun && (!input.meiliUrl || !input.meiliMasterKey)) {
      throw new Error(
        "Meilisearch URL and master key are required when main deploy needs Meili API credential reconciliation."
      )
    }

    logDeployProgress(
      `Reconciling Meili API credentials from source service ${meiliApiCredentialsSource.serviceId}.`
    )

    const reconciled = await reconcileMainMeiliApiCredentials({
      meiliUrl: input.meiliUrl,
      masterKey: input.meiliMasterKey,
      waitSeconds: input.meiliWaitSeconds,
      retryCount: input.retryCount,
      retryDelaySeconds: input.retryDelaySeconds,
      stackInputs: contracts.stackInputs,
      providerId: input.meiliApiCredentialsProviderId,
      dryRun: input.dryRun,
    })

    meiliBackendKey = reconciled.backendKey
    meiliFrontendKey = reconciled.frontendKey
    meiliFrontendEnvVar = reconciled.frontendEnvVar
    meiliBackendCreated = reconciled.backendCreated
    meiliBackendUpdated = reconciled.backendUpdated
    meiliFrontendCreated = reconciled.frontendCreated
    meiliFrontendUpdated = reconciled.frontendUpdated
    meiliVerified = reconciled.verified
    meiliKeysReconciled = true
    logDeployProgress("Meili API credentials reconciled and verified.")
  }

  if (needsMeiliApiCredentials && !sourceServiceInPlan) {
    logDeployProgress(
      `Meili source service ${meiliApiCredentialsSource.serviceId} is not in this deploy plan; reconciling credentials before deploy stages.`
    )
    await reconcileMeiliApiCredentials()
  }

  for (const stage of collectStageNumbers(plan)) {
    const stagePlan = buildStagePlan(plan, stage)
    const stageServicesCsv = stagePlan.deploy_services_csv
    if (!stageServicesCsv) {
      continue
    }

    logDeployProgress(
      `Starting deploy stage ${stage} for services: ${stageServicesCsv}.`
    )

    if (
      needsMeiliApiCredentials &&
      stageConsumesMeiliApiCredentials(stagePlan) &&
      !meiliKeysReconciled
    ) {
      if (sourceServiceStage !== null && sourceServiceStage >= stage) {
        throw new Error(
          `Meili API credential source service ${meiliApiCredentialsSource.serviceId} must be healthy before consumer stage ${stage}.`
        )
      }
      logDeployProgress(
        `Stage ${stage} consumes Meili API credentials; reconciling before env overrides.`
      )
      await reconcileMeiliApiCredentials()
    }

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
      meiliFrontendKey,
      meiliFrontendEnvVar,
      meiliBackendKey,
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
      meiliFrontendKey,
      meiliFrontendEnvVar,
      meiliBackendKey,
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

    if (
      needsMeiliApiCredentials &&
      stageHasService(plan, stage, meiliApiCredentialsSource.serviceId)
    ) {
      logDeployProgress(
        `Stage ${stage} included Meili source service ${meiliApiCredentialsSource.serviceId}; reconciling credentials after the source became healthy.`
      )
      await reconcileMeiliApiCredentials()
    }
  }

  const response = deployMainResponseSchema.parse({
    lane: "main",
    project_slug: input.projectSlug,
    environment_name: environment.environment_name,
    environment_id: environment.environment_id,
    environment_created: environment.created,
    requested_services_csv: plan.requested_services_csv,
    deploy_services_csv: plan.deploy_services_csv,
    env_override_service_ids_csv: envOverrideServiceIdsCsv,
    triggered_services_csv: triggeredServicesCsv,
    skipped_services_csv: skippedServicesCsv,
    meili_frontend_env_var: meiliFrontendEnvVar,
    meili_backend_created: meiliBackendCreated,
    meili_backend_updated: meiliBackendUpdated,
    meili_frontend_created: meiliFrontendCreated,
    meili_frontend_updated: meiliFrontendUpdated,
    meili_keys_reconciled: meiliKeysReconciled,
    meili_verified: meiliVerified,
    deployments: allDeployments,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return {
    response,
    meiliBackendKey,
    meiliFrontendKey,
  }
}

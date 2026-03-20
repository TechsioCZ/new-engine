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
import { executePlan } from "./plan.js"
import {
  collectMeiliOutputNeeds,
  getMeiliApiCredentialsProviderSourceService,
  provisionMeiliKeys,
  reusePersistedMeiliKeysFromTargets,
} from "./preview-meili.js"
import { executeRenderEnvOverrides } from "./render-env-overrides.js"
import { executeResolveEnvironment } from "./resolve-environment.js"
import { executeResolveTargetsPayload } from "./resolve-targets.js"
import { expandPlanForRuntimeProviderPrerequisites } from "./runtime-provider-prerequisites.js"
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

function stageConsumesMeiliApiCredentials(
  stagePlan: Awaited<ReturnType<typeof executePlan>>
 ): boolean {
  return stagePlan.deploy_services.some(
    (service) =>
      service.consumes.meili_backend_key || service.consumes.meili_frontend_key
  )
}

function stageHasResolvedMainMeiliKeys(
  stagePlan: Awaited<ReturnType<typeof executePlan>>,
  meiliBackendKey: string,
  meiliFrontendKey: string
): boolean {
  return stagePlan.deploy_services.every((service) => {
    if (service.consumes.meili_backend_key && !meiliBackendKey) {
      return false
    }

    if (service.consumes.meili_frontend_key && !meiliFrontendKey) {
      return false
    }

    return true
  })
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
  let effectivePlan = plan
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

  if (prerequisitePlan.transientServiceIds.length > 0) {
    effectivePlan = prerequisitePlan.plan
    logDeployProgress(
      `Adding transient provider prerequisite services to the deploy plan: ${prerequisitePlan.transientServiceIds.join(",")}.`
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

  const sourceServiceInPlan = effectivePlan.deploy_services.some(
    (service) => service.id === meiliApiCredentialsSource.serviceId
  )
  const sourceServiceStage =
    effectivePlan.deploy_services.find(
      (service) => service.id === meiliApiCredentialsSource.serviceId
    )?.deploy_stage ?? null
  const meiliNeeds = collectMeiliOutputNeeds(effectivePlan.deploy_services)
  const needsMeiliApiCredentials =
    meiliNeeds.needBackendKey || meiliNeeds.needFrontendKey

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
  let meiliVerified = false

  const reconcileMeiliApiCredentials = async (needs: {
    needBackendKey: boolean
    needFrontendKey: boolean
  }): Promise<void> => {
    if (!(needs.needBackendKey || needs.needFrontendKey)) {
      return
    }

    logDeployProgress(
      `Reconciling Meili API credentials from source service ${meiliApiCredentialsSource.serviceId}.`
    )

    const reconciled = await provisionMeiliKeys({
      projectSlug: input.projectSlug,
      environmentName: environment.environment_name,
      serviceSlug: meiliApiCredentialsSource.serviceSlug,
      stackInputs: contracts.stackInputs,
      providerId: input.meiliApiCredentialsProviderId,
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: input.dryRun,
      needBackendKey: needs.needBackendKey,
      needFrontendKey: needs.needFrontendKey,
    })

    if (reconciled.backend_key) {
      meiliBackendKey = reconciled.backend_key
      meiliBackendCreated = reconciled.backend_created
      meiliBackendUpdated = reconciled.backend_updated
    }
    if (reconciled.frontend_key) {
      meiliFrontendKey = reconciled.frontend_key
      meiliFrontendCreated = reconciled.frontend_created
      meiliFrontendUpdated = reconciled.frontend_updated
    }
    meiliFrontendEnvVar = reconciled.frontend_env_var
    meiliVerified = true
    logDeployProgress("Meili API credentials reconciled and verified.")
  }

  if (needsMeiliApiCredentials && !sourceServiceInPlan && !input.dryRun) {
    const meiliConsumerTargets = await executeResolveTargetsPayload({
      payload: {
        lane: "main",
        project_slug: input.projectSlug,
        environment_name: environment.environment_name,
        services: effectivePlan.deploy_services
          .filter(
            (service) =>
              service.consumes.meili_backend_key ||
              service.consumes.meili_frontend_key
          )
          .map((service) => ({
            service_id: service.id,
            service_slug: service.service_slug,
          })),
      },
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: false,
    })
    const reusedKeys = reusePersistedMeiliKeysFromTargets({
      targets: meiliConsumerTargets.services,
      stackInputs: contracts.stackInputs,
      providerId: input.meiliApiCredentialsProviderId,
      backendConsumerIds: meiliNeeds.backendConsumerIds,
      frontendConsumerIds: meiliNeeds.frontendConsumerIds,
    })
    meiliBackendKey = reusedKeys.backendKey
    meiliFrontendKey = reusedKeys.frontendKey
    meiliFrontendEnvVar = reusedKeys.frontendEnvVar

    if (
      (!meiliNeeds.needBackendKey || meiliBackendKey) &&
      (!meiliNeeds.needFrontendKey || meiliFrontendKey)
    ) {
      logDeployProgress(
        "Reusing persisted Meili API credentials from current healthy consumer deployments."
      )
    } else {
      logDeployProgress(
        `Meili source service ${meiliApiCredentialsSource.serviceId} is not in this deploy plan and persisted consumer envs are incomplete; reconciling required credentials before deploy stages.`
      )
      await reconcileMeiliApiCredentials({
        needBackendKey: meiliNeeds.needBackendKey && !meiliBackendKey,
        needFrontendKey: meiliNeeds.needFrontendKey && !meiliFrontendKey,
      })
    }
  }

  for (const stage of collectStageNumbers(effectivePlan)) {
    const stagePlan = buildStagePlan(effectivePlan, stage)
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
      !stageHasResolvedMainMeiliKeys(
        stagePlan,
        meiliBackendKey,
        meiliFrontendKey
      )
    ) {
      const stageMeiliNeeds = collectMeiliOutputNeeds(stagePlan.deploy_services)
      if (sourceServiceStage !== null && sourceServiceStage >= stage) {
        throw new Error(
          `Meili API credential source service ${meiliApiCredentialsSource.serviceId} must be healthy before consumer stage ${stage}.`
        )
      }
      logDeployProgress(
        `Stage ${stage} consumes Meili API credentials; reconciling only the required outputs before env overrides.`
      )
      await reconcileMeiliApiCredentials({
        needBackendKey: stageMeiliNeeds.needBackendKey && !meiliBackendKey,
        needFrontendKey: stageMeiliNeeds.needFrontendKey && !meiliFrontendKey,
      })
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
      const postSourceMeiliNeeds = collectMeiliOutputNeeds(
        effectivePlan.deploy_services.filter(
          (service) =>
            service.deploy_stage > stage &&
            (service.consumes.meili_backend_key ||
              service.consumes.meili_frontend_key)
        )
      )
      if (postSourceMeiliNeeds.needBackendKey || postSourceMeiliNeeds.needFrontendKey) {
        logDeployProgress(
          `Stage ${stage} included Meili source service ${meiliApiCredentialsSource.serviceId}; reconciling credentials after the source became healthy.`
        )
        await reconcileMeiliApiCredentials({
          needBackendKey: postSourceMeiliNeeds.needBackendKey && !meiliBackendKey,
          needFrontendKey: postSourceMeiliNeeds.needFrontendKey && !meiliFrontendKey,
        })
      }
    }
  }

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
    meili_frontend_env_var: meiliFrontendEnvVar,
    meili_backend_created: meiliBackendCreated,
    meili_backend_updated: meiliBackendUpdated,
    meili_frontend_created: meiliFrontendCreated,
    meili_frontend_updated: meiliFrontendUpdated,
    meili_keys_reconciled: meiliVerified,
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

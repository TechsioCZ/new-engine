import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  DeployPreviewCommandInput,
  DeployPreviewResponse,
} from "../contracts/deploy-preview.js"
import { deployPreviewResponseSchema } from "../contracts/deploy-preview.js"
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
  getMeiliApiCredentialsProviderSourceService,
  provisionPreviewMeiliKeys,
} from "./preview-meili.js"
import { generatePreviewRandomOnceSecrets } from "./preview-random-secrets.js"
import { executeRenderEnvOverrides } from "./render-env-overrides.js"
import { executeResolveEnvironment } from "./resolve-environment.js"
import { executeResolveTargetsPayload } from "./resolve-targets.js"
import { executeTriggerPayload } from "./trigger.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

export type DeployPreviewExecutionResult = {
  response: DeployPreviewResponse
  previewRandomOnceSecretsJson: string
  meiliBackendKey: string
  meiliFrontendKey: string
  meiliFrontendEnvVar: string
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executeDeployPreview(
  input: DeployPreviewCommandInput
): Promise<DeployPreviewExecutionResult> {
  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath
  )
  const plan = await executePlan({
    lane: "preview",
    servicesCsv: input.servicesCsv,
    prNumber: input.prNumber,
    outputJson: undefined,
    stackManifestPath: input.stackManifestPath,
    previewEnvPrefix: input.previewEnvPrefix,
  })
  const environment = await executeResolveEnvironment({
    lane: "preview",
    projectSlug: input.projectSlug,
    prNumber: input.prNumber,
    environmentName: plan.preview_environment_name,
    sourceEnvironmentName: input.sourceEnvironmentName,
    previewClonedServiceIdsCsv: plan.preview_cloned_service_ids_csv,
    previewExcludedServiceIdsCsv: plan.preview_excluded_service_ids_csv,
    outputJson: undefined,
    baseUrl: input.baseUrl,
    apiToken: input.apiToken,
    dryRun: input.dryRun,
    dryRunCreated: input.dryRunCreated,
    stackManifestPath: input.stackManifestPath,
    previewEnvPrefix: input.previewEnvPrefix,
  })
  const runtimePlan = environment.created
    ? {
        ...plan,
        deploy_services: plan.preview_cloned_services,
        deploy_services_csv: plan.preview_cloned_service_ids_csv,
      }
    : plan
  const previewRandomOnceSecrets = environment.created
    ? generatePreviewRandomOnceSecrets(contracts.stackInputs)
    : []
  const previewRandomOnceSecretsJson =
    previewRandomOnceSecrets.length > 0
      ? JSON.stringify(previewRandomOnceSecrets)
      : ""
  const meiliSourceService = getMeiliApiCredentialsProviderSourceService(
    contracts.manifest,
    contracts.stackInputs,
    input.meiliApiCredentialsProviderId
  )

  let meiliBackendKey = input.meiliBackendKey
  let meiliFrontendKey = input.meiliFrontendKey
  let meiliFrontendEnvVar = input.meiliFrontendEnvVar
  let meiliKeysProvisioned = false
  let targetCommitSha: string | null = null
  let lastDeployedCommitSha: string | null = null
  let envOverrideServiceIdsCsv = ""
  let triggeredServicesCsv = ""
  let allDeployments: DeploymentLike[] = []
  const zaneOperatorClient =
    input.dryRun || !input.baseUrl || !input.apiToken
      ? null
      : new ZaneOperatorClient(input.baseUrl, input.apiToken)

  if (zaneOperatorClient && input.targetCommitSha) {
    const previewCommitState = await zaneOperatorClient.writePreviewCommitState({
      project_slug: input.projectSlug,
      environment_name: environment.environment_name,
      target_commit_sha: input.targetCommitSha,
    })
    targetCommitSha = previewCommitState.target_commit_sha
  } else if (input.targetCommitSha) {
    targetCommitSha = input.targetCommitSha
  }

  for (const stage of collectStageNumbers(runtimePlan)) {
    const stagePlan = buildStagePlan(runtimePlan, stage)
    const stageServicesCsv = stagePlan.deploy_services_csv
    if (!stageServicesCsv) {
      continue
    }

    const envOverrides = await executeRenderEnvOverrides({
      lane: "preview",
      servicesCsv: stageServicesCsv,
      previewDbName: input.previewDbName,
      previewDbUser: input.previewDbUser,
      previewDbPassword: input.previewDbPassword,
      previewRandomOnceSecrets,
      meiliFrontendKey,
      meiliFrontendEnvVar,
      meiliBackendKey,
      outputJson: undefined,
      stackManifestPath: input.stackManifestPath,
      stackInputsPath: input.stackInputsPath,
    })
    const resolveTargetsPayload: ResolveTargetsPayload = {
      lane: "preview",
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
    const filtered =
      environment.created || !input.targetCommitSha
        ? {
            services: targets.services,
            skippedServices: [],
            adoptedDeployments: [] as DeploymentLike[],
            filteredEnvOverrides: envOverrides.services,
          }
        : filterTargetsForGitCommit(
            targets.services,
            envOverrides.services,
            input.targetCommitSha
          )

    allDeployments = mergeDeployments(
      allDeployments,
      filtered.adoptedDeployments
    )

    if (
      filtered.services.length === 0 &&
      filtered.adoptedDeployments.length === 0
    ) {
      continue
    }

    let stageDeployments = filtered.adoptedDeployments
    let stageTriggeredServicesCsv = ""

    if (filtered.services.length > 0) {
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
      const trigger = await executeTriggerPayload({
        projectSlug: input.projectSlug,
        environmentName: environment.environment_name,
        targets: filtered.services,
        gitCommitSha: input.targetCommitSha,
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
    }

    await waitForDeployments({
      lane: "preview",
      projectSlug: input.projectSlug,
      environmentName: environment.environment_name,
      requestedServicesCsv: stageServicesCsv,
      deployServicesCsv: stageServicesCsv,
      triggeredServicesCsv: stageTriggeredServicesCsv,
      previewClonedServiceIdsCsv: runtimePlan.preview_cloned_service_ids_csv,
      previewExcludedServiceIdsCsv:
        runtimePlan.preview_excluded_service_ids_csv,
      previewDbName: input.previewDbName,
      previewDbUser: input.previewDbUser,
      previewDbPassword: input.previewDbPassword,
      previewRandomOnceSecrets,
      meiliFrontendKey,
      meiliFrontendEnvVar,
      meiliBackendKey,
      deployments: stageDeployments,
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: input.dryRun,
      pollIntervalSeconds: input.pollIntervalSeconds,
      waitTimeoutSeconds: input.waitTimeoutSeconds,
      tolerateBaseUrlUnavailable: false,
      stackManifestPath: input.stackManifestPath,
      stackInputsPath: input.stackInputsPath,
    })

    envOverrideServiceIdsCsv = mergeCsvValues(
      envOverrideServiceIdsCsv,
      filtered.filteredEnvOverrides
        .map((service) => service.service_id)
        .join(",")
    )

    if (
      environment.created &&
      stageHasService(runtimePlan, stage, meiliSourceService.serviceId)
    ) {
      const provisionedKeys = await provisionPreviewMeiliKeys({
        projectSlug: input.projectSlug,
        environmentName: environment.environment_name,
        serviceSlug: meiliSourceService.serviceSlug,
        stackInputs: contracts.stackInputs,
        providerId: input.meiliApiCredentialsProviderId,
        baseUrl: input.baseUrl,
        apiToken: input.apiToken,
        dryRun: input.dryRun,
      })
      meiliBackendKey = provisionedKeys.backend_key
      meiliFrontendKey = provisionedKeys.frontend_key
      meiliFrontendEnvVar = provisionedKeys.frontend_env_var
      meiliKeysProvisioned = true
    }
  }

  if (zaneOperatorClient && input.targetCommitSha) {
    const previewCommitState = await zaneOperatorClient.writePreviewCommitState({
      project_slug: input.projectSlug,
      environment_name: environment.environment_name,
      last_deployed_commit_sha: input.targetCommitSha,
    })
    targetCommitSha = previewCommitState.target_commit_sha
    lastDeployedCommitSha = previewCommitState.last_deployed_commit_sha
  } else if (input.targetCommitSha) {
    lastDeployedCommitSha = input.targetCommitSha
  }

  const response = deployPreviewResponseSchema.parse({
    lane: "preview",
    project_slug: input.projectSlug,
    environment_name: environment.environment_name,
    environment_id: environment.environment_id,
    environment_created: environment.created,
    environment_ready: environment.ready,
    preview_cloned_service_ids_csv: runtimePlan.preview_cloned_service_ids_csv,
    preview_excluded_service_ids_csv:
      runtimePlan.preview_excluded_service_ids_csv,
    environment_warnings: environment.warnings,
    requested_services_csv: plan.requested_services_csv,
    deploy_services_csv: runtimePlan.deploy_services_csv,
    target_commit_sha: targetCommitSha,
    last_deployed_commit_sha: lastDeployedCommitSha,
    env_override_service_ids_csv: envOverrideServiceIdsCsv,
    triggered_services_csv: triggeredServicesCsv,
    meili_frontend_env_var: meiliFrontendEnvVar,
    meili_keys_provisioned: meiliKeysProvisioned,
    deployments: allDeployments,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return {
    response,
    previewRandomOnceSecretsJson,
    meiliBackendKey,
    meiliFrontendKey,
    meiliFrontendEnvVar,
  }
}

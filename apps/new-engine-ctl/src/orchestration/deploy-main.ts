import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  DeployMainCommandInput,
  DeployMainResponse,
} from "../contracts/deploy-main.js"
import { deployMainResponseSchema } from "../contracts/deploy-main.js"
import type { ResolveTargetsPayload } from "../contracts/resolve-targets.js"
import { executeApplyEnvOverridesPayload } from "./apply-env-overrides.js"
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
import { executeTriggerPayload } from "./trigger.js"

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executeDeployMain(
  input: DeployMainCommandInput
): Promise<DeployMainResponse> {
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
    previewClonedServiceIdsCsv: "",
    previewExcludedServiceIdsCsv: "",
    outputJson: undefined,
    baseUrl: input.baseUrl,
    apiToken: input.apiToken,
    dryRun: input.dryRun,
    dryRunCreated: false,
    stackManifestPath: input.stackManifestPath,
    previewEnvPrefix: "pr-",
  })

  let envOverrideServiceIdsCsv = ""
  let triggeredServicesCsv = ""
  let skippedServicesCsv = ""
  let allDeployments: DeploymentLike[] = []

  for (const stage of collectStageNumbers(plan)) {
    const stagePlan = buildStagePlan(plan, stage)
    const stageServicesCsv = stagePlan.deploy_services_csv
    if (!stageServicesCsv) {
      continue
    }

    const envOverrides = await executeRenderEnvOverrides({
      lane: "main",
      servicesCsv: stageServicesCsv,
      previewDbName: "",
      previewDbUser: "",
      previewDbPassword: "",
      previewRandomOnceSecrets: [],
      meiliFrontendKey: input.meiliFrontendKey,
      meiliFrontendEnvVar: input.meiliFrontendEnvVar,
      meiliBackendKey: input.meiliBackendKey,
      outputJson: undefined,
      stackManifestPath: input.stackManifestPath,
      stackInputsPath: input.stackInputsPath,
    })
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

    if (
      filtered.services.length === 0 &&
      filtered.adoptedDeployments.length === 0
    ) {
      skippedServicesCsv = mergeCsvValues(
        skippedServicesCsv,
        filtered.skippedServices.map((service) => service.service_id).join(",")
      )
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
      meiliFrontendKey: input.meiliFrontendKey,
      meiliFrontendEnvVar: input.meiliFrontendEnvVar,
      meiliBackendKey: input.meiliBackendKey,
      deployments: stageDeployments,
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: input.dryRun,
      pollIntervalSeconds: input.pollIntervalSeconds,
      waitTimeoutSeconds: input.waitTimeoutSeconds,
      tolerateBaseUrlUnavailable: stageHasService(plan, stage, "zane-operator"),
      stackManifestPath: input.stackManifestPath,
      stackInputsPath: input.stackInputsPath,
    })
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
    deployments: allDeployments,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}

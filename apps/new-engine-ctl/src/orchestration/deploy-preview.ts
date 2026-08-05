import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  DeployPreviewCommandInput,
  DeployPreviewResponse,
} from "../contracts/deploy-preview.js"
import { deployPreviewResponseSchema } from "../contracts/deploy-preview.js"
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

const DEFAULT_PREVIEW_DB_PREFIX = "medusa_pr_"
const DEFAULT_PREVIEW_DB_APP_USER_PREFIX = "medusa_pr_app_"

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

function previewDbContextIsComplete(context: PreviewDbContext): boolean {
  return Boolean(
    context.previewDbName && context.previewDbUser && context.previewDbPassword,
  )
}

function listPreviewDbRequiredServiceIds(input: {
  contracts: Awaited<ReturnType<typeof loadDeployContracts>>
  deployServiceIds: string[]
}): string[] {
  const selected = new Set(input.deployServiceIds)
  return listPrepareServiceIds(input.contracts.manifest, "preview_db").filter(
    (serviceId) => selected.has(serviceId),
  )
}

async function resolvePreviewDbContext(input: {
  contracts: Awaited<ReturnType<typeof loadDeployContracts>>
  deployServiceIds: string[]
  prNumber: number
  initialContext: PreviewDbContext
  dryRun: boolean
  zaneOperatorClient: ZaneOperatorClient | null
}): Promise<PreviewDbContext> {
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
  const previewDb = (
    await input.zaneOperatorClient.ensurePreviewDb(input.prNumber)
  ).body
  maskGitHubValue(previewDb.app_password)

  return {
    previewDbName: previewDb.db_name,
    previewDbPassword: previewDb.app_password,
    previewDbUser: previewDb.app_user,
  }
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

async function resolvePreviewRandomOnceSecrets(input: {
  stackInputs: Awaited<ReturnType<typeof loadDeployContracts>>["stackInputs"]
  projectSlug: string
  environmentName: string
  environmentCreated: boolean
  allowGenerateMissing: boolean
  dryRun: boolean
  zaneOperatorClient: ZaneOperatorClient | null
}): Promise<PreviewRandomOnceSecretInput[]> {
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
      if (!value) {
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
      generatedSecrets.map((secret) => [secret.secret_id, secret.value]),
    )
    const materialized =
      await input.zaneOperatorClient.syncPreviewRandomOnceSecrets({
        environment_name: input.environmentName,
        project_slug: input.projectSlug,
        secrets: definitions.map((definition) => ({
          secret_id: definition.secret_id,
          value: generatedValuesBySecretId.get(definition.secret_id),
          persist_to: definition.persist_to,
          persisted_env_var: definition.persisted_env_var,
          targets: definition.targets.map((target) => ({
            service_slug: target.service_id,
            env_var: target.env_var,
          })),
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
      secret_id: definition.secret_id,
      persist_to: definition.persist_to,
      persisted_env_var: definition.persisted_env_var,
      targets: definition.targets.map((target) => ({
        service_slug: target.service_id,
        env_var: target.env_var,
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
    generatedSecrets.map((secret) => [secret.secret_id, secret.value]),
  )
  const materialized =
    await input.zaneOperatorClient.syncPreviewRandomOnceSecrets({
      environment_name: input.environmentName,
      project_slug: input.projectSlug,
      secrets: definitions.map((definition) => ({
        secret_id: definition.secret_id,
        ...(missingSecretIds.has(definition.secret_id)
          ? { value: generatedValuesBySecretId.get(definition.secret_id) }
          : {}),
        persist_to: definition.persist_to,
        persisted_env_var: definition.persisted_env_var,
        targets: definition.targets.map((target) => ({
          service_slug: target.service_id,
          env_var: target.env_var,
        })),
      })),
    })

  if (materialized.missing_secret_ids.length > 0) {
    throw new Error(
      `Preview random-once secrets are missing in ${input.environmentName}: ${materialized.missing_secret_ids.join(", ")}`,
    )
  }

  return resolveSecrets(materialized.secrets)
}

async function syncPreviewSharedEnv(input: {
  zaneOperatorClient: ZaneOperatorClient | null
  projectSlug: string
  environmentName: string
  sourceEnvironmentName: string
  contracts: Awaited<ReturnType<typeof loadDeployContracts>>
  deployServiceIds: string[]
  previewDbName: string
  previewDbUser: string
  previewDbPassword: string
}): Promise<void> {
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

async function syncPreviewServiceEnv(input: {
  zaneOperatorClient: ZaneOperatorClient | null
  projectSlug: string
  environmentName: string
  sourceEnvironmentName: string
  contracts: Awaited<ReturnType<typeof loadDeployContracts>>
  deployServiceIds: string[]
  previewDbName: string
  previewDbUser: string
  previewDbPassword: string
}): Promise<void> {
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

// preview deploy keeps provider provisioning and staged deploy ordering in one flow
export async function executeDeployPreview(
  input: DeployPreviewCommandInput,
): Promise<DeployPreviewExecutionResult> {
  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath,
  )
  const plan = await executePlan({
    lane: "preview",
    outputJson: undefined,
    prNumber: input.prNumber,
    previewEnvPrefix: input.previewEnvPrefix,
    servicesCsv: input.servicesCsv,
    stackManifestPath: input.stackManifestPath,
  })
  const previewGitBranch = await resolveGitHubPreviewHeadBranch()
  const environment = await executeResolveEnvironment({
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    dryRun: input.dryRun,
    dryRunCreated: input.dryRunCreated,
    environmentName: plan.preview_environment_name,
    lane: "preview",
    outputJson: undefined,
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
  let targetCommitSha: string | null = null
  let lastDeployedCommitSha: string | null = null
  let envOverrideServiceIdsCsv = ""
  let triggeredServicesCsv = ""
  let allDeployments: DeploymentLike[] = []

  if (baselineDeploy && effectiveRuntimePlan.deploy_services_csv) {
    logDeployProgress(
      "Applying baseline preview-owned env materialization before staged deploys.",
    )
    const baselineEnvOverrides = await executeRenderEnvOverrides({
      lane: "preview",
      servicesCsv: effectiveRuntimePlan.deploy_services_csv,
      ...previewDbContext,
      previewRandomOnceSecrets,
      runtimeProviderOutputs:
        buildRuntimeProviderRenderContext(runtimeProviderState)
          .runtimeProviderOutputs,
      outputJson: undefined,
      stackManifestPath: input.stackManifestPath,
      stackInputsPath: input.stackInputsPath,
    })

    if (baselineEnvOverrides.services.length > 0) {
      const baselineEnvOverrideServiceIds = new Set(
        baselineEnvOverrides.services.map((service) => service.service_id),
      )
      const baselineTargetServices =
        effectiveRuntimePlan.deploy_services.filter((service) =>
          baselineEnvOverrideServiceIds.has(service.id),
        )

      if (baselineTargetServices.length > 0) {
        logDeployProgress(
          `Persisting preview-owned env values for baseline services: ${baselineTargetServices
            .map((service) => service.service_slug)
            .join(", ")}.`,
        )
        const baselineTargets = await executeResolveTargetsPayload({
          apiToken: input.apiToken,
          baseUrl: input.baseUrl,
          dryRun: input.dryRun,
          payload: {
            environment_name: environment.environment_name,
            lane: "preview",
            project_slug: input.projectSlug,
            services: baselineTargetServices.map((service) => ({
              service_id: service.id,
              service_slug: service.service_slug,
            })),
          },
        })

        await executeApplyEnvOverridesPayload({
          apiToken: input.apiToken,
          baseUrl: input.baseUrl,
          dryRun: input.dryRun,
          payload: {
            env_overrides: baselineEnvOverrides.services,
            environment_name: environment.environment_name,
            project_slug: input.projectSlug,
            targets: baselineTargets.services,
          },
        })

        envOverrideServiceIdsCsv = mergeCsvValues(
          envOverrideServiceIdsCsv,
          baselineEnvOverrides.services
            .map((service) => service.service_id)
            .join(","),
        )
      }
    }
  }

  if (zaneOperatorClient && input.targetCommitSha) {
    logDeployProgress(
      `Persisting preview target commit metadata before deploy stages: ${input.targetCommitSha}.`,
    )
    const previewCommitState = await zaneOperatorClient.writePreviewCommitState(
      {
        environment_name: environment.environment_name,
        project_slug: input.projectSlug,
        target_commit_sha: input.targetCommitSha,
        ...(baselineDeploy ? { baseline_complete: false } : {}),
      },
    )
    targetCommitSha = previewCommitState.target_commit_sha
  } else if (input.targetCommitSha) {
    targetCommitSha = input.targetCommitSha
  }

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

  for (const stage of collectStageNumbers(effectiveRuntimePlan)) {
    const stagePlan = buildStagePlan(effectiveRuntimePlan, stage)
    const stageServicesCsv = stagePlan.deploy_services_csv
    if (!stageServicesCsv) {
      continue
    }

    logDeployProgress(
      `Starting preview deploy stage ${stage} for services: ${stageServicesCsv}.`,
    )
    await ensureStageRuntimeProviderOutputs({
      apiToken: input.apiToken,
      baseUrl: input.baseUrl,
      dryRun: input.dryRun,
      environmentName: environment.environment_name,
      fullPlanServices: effectiveRuntimePlan.deploy_services.map((service) => ({
        id: service.id,
        service_slug: service.service_slug,
        deploy_stage: service.deploy_stage,
      })),
      lane: "preview",
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
      `Rendering env overrides for preview stage ${stage}: ${stageServicesCsv}.`,
    )
    const envOverrides = await executeRenderEnvOverrides({
      lane: "preview",
      servicesCsv: stageServicesCsv,
      ...previewDbContext,
      previewRandomOnceSecrets,
      runtimeProviderOutputs:
        buildRuntimeProviderRenderContext(runtimeProviderState)
          .runtimeProviderOutputs,
      outputJson: undefined,
      stackManifestPath: input.stackManifestPath,
      stackInputsPath: input.stackInputsPath,
    })
    logDeployProgress(
      `Resolving deploy targets for preview stage ${stage}: ${stageServicesCsv}.`,
    )
    const resolveTargetsPayload: ResolveTargetsPayload = {
      environment_name: environment.environment_name,
      lane: "preview",
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
    const desiredCommitSha = input.targetCommitSha || targetCommitSha || ""
    const filtered = desiredCommitSha
      ? filterTargetsForGitCommit(
          targets.services,
          envOverrides.services,
          desiredCommitSha,
        )
      : {
          adoptedDeployments: [] as DeploymentLike[],
          filteredEnvOverrides: envOverrides.services,
          services: targets.services,
          skippedServices: [],
        }

    allDeployments = mergeDeployments(
      allDeployments,
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
      continue
    }

    let stageDeployments = filtered.adoptedDeployments
    let stageTriggeredServicesCsv = ""

    if (filtered.services.length > 0) {
      logDeployProgress(
        `Applying env overrides for preview stage ${stage}: ${filtered.services
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
        `Triggering deploys for preview stage ${stage}: ${filtered.services
          .map((service) => service.service_slug)
          .join(", ")}.`,
      )
      const trigger = await executeTriggerPayload({
        apiToken: input.apiToken,
        baseUrl: input.baseUrl,
        dryRun: input.dryRun,
        environmentName: environment.environment_name,
        gitCommitSha: input.targetCommitSha,
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
        `Triggered preview stage ${stage} deployments: ${trigger.services
          .map(
            (deployment) =>
              `${deployment.service_slug}#${deployment.deployment_hash}`,
          )
          .join(", ")}.`,
      )
    }

    logDeployProgress(
      `Waiting for preview stage ${stage} deployments to become healthy.`,
    )
    await waitForDeployments({
      lane: "preview",
      projectSlug: input.projectSlug,
      environmentName: environment.environment_name,
      requestedServicesCsv: stageServicesCsv,
      deployServicesCsv: stageServicesCsv,
      triggeredServicesCsv: stageTriggeredServicesCsv,
      previewClonedServiceIdsCsv:
        effectiveRuntimePlan.preview_cloned_service_ids_csv,
      previewExcludedServiceIdsCsv:
        effectiveRuntimePlan.preview_excluded_service_ids_csv,
      ...previewDbContext,
      previewRandomOnceSecrets,
      runtimeProviderOutputs:
        buildRuntimeProviderRenderContext(runtimeProviderState)
          .runtimeProviderOutputs,
      deployments: stageDeployments,
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: input.dryRun,
      pollIntervalSeconds: input.pollIntervalSeconds,
      waitTimeoutSeconds: input.waitTimeoutSeconds,
      tolerateBaseUrlUnavailable: false,
      stackManifestPath: input.stackManifestPath,
      stackInputsPath: input.stackInputsPath,
      onProgress: logDeployProgress,
      cancelOnInterrupt: true,
    })

    envOverrideServiceIdsCsv = mergeCsvValues(
      envOverrideServiceIdsCsv,
      filtered.filteredEnvOverrides
        .map((service) => service.service_id)
        .join(","),
    )
  }

  if (zaneOperatorClient && input.targetCommitSha) {
    logDeployProgress(
      `Persisting preview last-deployed commit metadata after successful deploy: ${input.targetCommitSha}.`,
    )
    const previewCommitState = await zaneOperatorClient.writePreviewCommitState(
      {
        environment_name: environment.environment_name,
        last_deployed_commit_sha: input.targetCommitSha,
        project_slug: input.projectSlug,
        ...(baselineDeploy ? { baseline_complete: true } : {}),
      },
    )
    targetCommitSha = previewCommitState.target_commit_sha
    lastDeployedCommitSha = previewCommitState.last_deployed_commit_sha
  } else if (input.targetCommitSha) {
    lastDeployedCommitSha = input.targetCommitSha
  }

  const runtimeProviderRenderContext =
    buildRuntimeProviderRenderContext(runtimeProviderState)

  const response = deployPreviewResponseSchema.parse({
    deploy_services_csv: effectiveRuntimePlan.deploy_services_csv,
    deployments: allDeployments,
    env_override_service_ids_csv: envOverrideServiceIdsCsv,
    environment_created: environment.created,
    environment_id: environment.environment_id,
    environment_name: environment.environment_name,
    environment_ready: environment.ready,
    environment_warnings: environment.warnings,
    lane: "preview",
    last_deployed_commit_sha: lastDeployedCommitSha,
    preview_cloned_service_ids_csv:
      effectiveRuntimePlan.preview_cloned_service_ids_csv,
    preview_excluded_service_ids_csv:
      effectiveRuntimePlan.preview_excluded_service_ids_csv,
    project_slug: input.projectSlug,
    requested_services_csv: plan.requested_services_csv,
    target_commit_sha: targetCommitSha,
    triggered_services_csv: triggeredServicesCsv,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return {
    previewRandomOnceSecretsJson,
    response,
    runtimeProviderOutputs: runtimeProviderRenderContext.runtimeProviderOutputs,
  }
}

import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  DeploymentRef,
  EnvOverride,
  ForbiddenEnvRequirement,
  RequiredPersistedEnv,
  RequiredSharedEnv,
  VerifyCommandInput,
  VerifyDeployPayload,
  VerifyResponse,
} from "../contracts/verify.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"
import {
  buildExpectedEnvOverrides,
  buildForbiddenPreviewOnlyEnv,
  buildRequiredPersistedEnv,
  buildRequiredSharedEnv,
  loadDeployContracts,
  normalizeCsvToArray,
} from "./deploy-inputs.js"

interface DryRunResponseOptions {
  input: VerifyCommandInput
  requestedServiceIds: string[]
  deployServiceIds: string[]
  triggeredServiceIds: string[]
  expectedPreviewServiceSlugs: string[]
  expectedEnvOverrides: EnvOverride[]
  requiredPersistedEnv: RequiredPersistedEnv[]
  requiredSharedEnv: RequiredSharedEnv[]
  forbiddenEnv: ForbiddenEnvRequirement[]
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

function buildDryRunResponse({
  input,
  requestedServiceIds,
  deployServiceIds,
  triggeredServiceIds,
  expectedPreviewServiceSlugs,
  expectedEnvOverrides,
  requiredPersistedEnv,
  requiredSharedEnv,
  forbiddenEnv,
}: DryRunResponseOptions): VerifyResponse {
  return {
    checked_deployment_service_ids: input.deployments.map(
      (deployment: DeploymentRef) => deployment.service_id,
    ),
    checked_deployments: input.deployments.map((deployment: DeploymentRef) => ({
      deployment_hash: deployment.deployment_hash,
      service_id: deployment.service_id,
      service_slug: deployment.service_slug,
      status: deployment.status ?? "HEALTHY",
      status_reason: null,
    })),
    checked_env_override_service_ids: expectedEnvOverrides.map(
      (override) => override.service_id,
    ),
    checked_forbidden_env_service_ids: forbiddenEnv.map(
      (requirement) => requirement.service_id,
    ),
    checked_persisted_env_service_ids: requiredPersistedEnv.map(
      (requirement) => requirement.service_id,
    ),
    checked_preview_cloned_service_slugs: expectedPreviewServiceSlugs,
    checked_shared_env_keys: requiredSharedEnv.map(
      (requirement) => requirement.key,
    ),
    deploy_service_ids: deployServiceIds,
    environment_name: input.environmentName,
    lane: input.lane,
    project_slug: input.projectSlug,
    requested_service_ids: requestedServiceIds,
    triggered_service_ids: triggeredServiceIds,
    verified: true,
    warning_only_preview_service_slugs: [],
  }
}

function resolvePreviewServiceSlugs(
  input: VerifyCommandInput,
  contracts: Awaited<ReturnType<typeof loadDeployContracts>>,
): {
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
} {
  if (input.lane !== "preview") {
    return {
      excludedPreviewServiceSlugs: [],
      expectedPreviewServiceSlugs: [],
    }
  }

  const serviceSlugById = new Map(
    contracts.manifest.services.flatMap((service) =>
      service.ci.deployable && service.ci.zane
        ? [[service.id, service.ci.zane.service_slug] as const]
        : [],
    ),
  )

  const toServiceSlugs = (servicesCsv: string, label: string): string[] =>
    normalizeCsvToArray(servicesCsv).map((serviceId) => {
      const serviceSlug = serviceSlugById.get(serviceId)
      if (!serviceSlug) {
        throw new Error(
          `${label} references missing deployable service ${serviceId}.`,
        )
      }
      return serviceSlug
    })

  return {
    excludedPreviewServiceSlugs: toServiceSlugs(
      input.previewExcludedServiceIdsCsv,
      "Preview excluded service set",
    ),
    expectedPreviewServiceSlugs: toServiceSlugs(
      input.previewClonedServiceIdsCsv,
      "Preview cloned service set",
    ),
  }
}

export async function executeVerify(
  input: VerifyCommandInput,
): Promise<VerifyResponse> {
  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath,
  )
  const deployServiceIds = normalizeCsvToArray(input.deployServicesCsv)
  const requestedServiceIds = normalizeCsvToArray(input.requestedServicesCsv)
  const triggeredServiceIds = normalizeCsvToArray(input.triggeredServicesCsv)
  const { expectedPreviewServiceSlugs, excludedPreviewServiceSlugs } =
    resolvePreviewServiceSlugs(input, contracts)
  const expectedEnvOverrides = buildExpectedEnvOverrides(
    deployServiceIds,
    contracts,
    {
      lane: input.lane,
      previewDbName: input.previewDbName,
      previewDbPassword: input.previewDbPassword,
      previewDbUser: input.previewDbUser,
      previewRandomOnceSecrets: input.previewRandomOnceSecrets,
      runtimeProviderOutputs: input.runtimeProviderOutputs,
    },
  )
  const requiredPersistedEnv = buildRequiredPersistedEnv(
    input.lane,
    deployServiceIds,
    contracts,
  )
  const requiredSharedEnv = buildRequiredSharedEnv(
    input.lane,
    deployServiceIds,
    contracts,
  )
  const forbiddenEnv = buildForbiddenPreviewOnlyEnv(
    input.lane,
    deployServiceIds,
    contracts,
  )
  const payload: VerifyDeployPayload = {
    deploy_service_ids: deployServiceIds,
    deployments: input.deployments.map(
      ({ deployment_hash, service_id, service_slug }: DeploymentRef) => ({
        deployment_hash,
        service_id,
        service_slug,
      }),
    ),
    environment_name: input.environmentName,
    excluded_preview_service_slugs: excludedPreviewServiceSlugs,
    expected_env_overrides: expectedEnvOverrides,
    expected_preview_service_slugs: expectedPreviewServiceSlugs,
    forbidden_env: forbiddenEnv,
    lane: input.lane,
    project_slug: input.projectSlug,
    requested_service_ids: requestedServiceIds,
    required_persisted_env: requiredPersistedEnv,
    required_shared_env: requiredSharedEnv,
    triggered_service_ids: triggeredServiceIds,
  }

  const response = input.dryRun
    ? buildDryRunResponse({
        deployServiceIds,
        expectedEnvOverrides,
        expectedPreviewServiceSlugs,
        forbiddenEnv,
        input,
        requestedServiceIds,
        requiredPersistedEnv,
        requiredSharedEnv,
        triggeredServiceIds,
      })
    : await new ZaneOperatorClient(input.baseUrl, input.apiToken).verifyDeploy(
        payload,
      )

  if (!response.verified) {
    throw new Error("Deploy verification failed.")
  }

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}

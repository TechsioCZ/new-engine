import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  DeploymentRef,
  EnvOverride,
  ForbiddenEnvRequirement,
  RequiredPersistedEnv,
  VerifyCommandInput,
  VerifyDeployPayload,
  VerifyResponse,
} from "../contracts/verify.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"
import {
  buildExpectedEnvOverrides,
  buildForbiddenPreviewOnlyEnv,
  buildRequiredPersistedEnv,
  getMeiliApiCredentialEnvVars,
  loadDeployContracts,
  normalizeCsvToArray,
} from "./deploy-inputs.js"

type DryRunResponseOptions = {
  input: VerifyCommandInput
  requestedServiceIds: string[]
  deployServiceIds: string[]
  triggeredServiceIds: string[]
  expectedPreviewServiceSlugs: string[]
  expectedEnvOverrides: EnvOverride[]
  requiredPersistedEnv: RequiredPersistedEnv[]
  forbiddenEnv: ForbiddenEnvRequirement[]
}

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

function buildDryRunResponse({
  input,
  requestedServiceIds,
  deployServiceIds,
  triggeredServiceIds,
  expectedPreviewServiceSlugs,
  expectedEnvOverrides,
  requiredPersistedEnv,
  forbiddenEnv,
}: DryRunResponseOptions): VerifyResponse {
  return {
    lane: input.lane,
    project_slug: input.projectSlug,
    environment_name: input.environmentName,
    verified: true,
    requested_service_ids: requestedServiceIds,
    deploy_service_ids: deployServiceIds,
    triggered_service_ids: triggeredServiceIds,
    checked_preview_cloned_service_slugs: expectedPreviewServiceSlugs,
    warning_only_preview_service_slugs: [],
    checked_env_override_service_ids: expectedEnvOverrides.map(
      (override) => override.service_id
    ),
    checked_persisted_env_service_ids: requiredPersistedEnv.map(
      (requirement) => requirement.service_id
    ),
    checked_forbidden_env_service_ids: forbiddenEnv.map(
      (requirement) => requirement.service_id
    ),
    checked_deployment_service_ids: input.deployments.map(
      (deployment: DeploymentRef) => deployment.service_id
    ),
    checked_deployments: input.deployments.map((deployment: DeploymentRef) => ({
      service_id: deployment.service_id,
      service_slug: deployment.service_slug,
      deployment_hash: deployment.deployment_hash,
      status: deployment.status ?? "HEALTHY",
      status_reason: null,
    })),
  }
}

function resolvePreviewServiceSlugs(
  input: VerifyCommandInput,
  contracts: Awaited<ReturnType<typeof loadDeployContracts>>
): {
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
} {
  if (input.lane !== "preview") {
    return {
      expectedPreviewServiceSlugs: [],
      excludedPreviewServiceSlugs: [],
    }
  }

  const serviceSlugById = new Map(
    contracts.manifest.services.flatMap((service) =>
      service.ci.deployable === true && service.ci.zane
        ? [[service.id, service.ci.zane.service_slug] as const]
        : []
    )
  )

  const toServiceSlugs = (servicesCsv: string, label: string): string[] =>
    normalizeCsvToArray(servicesCsv).map((serviceId) => {
      const serviceSlug = serviceSlugById.get(serviceId)
      if (!serviceSlug) {
        throw new Error(
          `${label} references missing deployable service ${serviceId}.`
        )
      }
      return serviceSlug
    })

  return {
    expectedPreviewServiceSlugs: toServiceSlugs(
      input.previewClonedServiceIdsCsv,
      "Preview cloned service set"
    ),
    excludedPreviewServiceSlugs: toServiceSlugs(
      input.previewExcludedServiceIdsCsv,
      "Preview excluded service set"
    ),
  }
}

export async function executeVerify(
  input: VerifyCommandInput
): Promise<VerifyResponse> {
  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath
  )
  const deployServiceIds = normalizeCsvToArray(input.deployServicesCsv)
  const requestedServiceIds = normalizeCsvToArray(input.requestedServicesCsv)
  const triggeredServiceIds = normalizeCsvToArray(input.triggeredServicesCsv)
  const { expectedPreviewServiceSlugs, excludedPreviewServiceSlugs } =
    resolvePreviewServiceSlugs(input, contracts)
  const meiliApiCredentialEnvVars = getMeiliApiCredentialEnvVars(
    contracts.stackInputs
  )
  const expectedEnvOverrides = buildExpectedEnvOverrides(
    deployServiceIds,
    contracts,
    {
      lane: input.lane,
      previewDbName: input.previewDbName,
      previewDbUser: input.previewDbUser,
      previewDbPassword: input.previewDbPassword,
      previewRandomOnceSecrets: input.previewRandomOnceSecrets,
      meiliFrontendKey: input.meiliFrontendKey,
      meiliFrontendEnvVar:
        input.meiliFrontendEnvVar || meiliApiCredentialEnvVars.frontend,
      meiliBackendKey: input.meiliBackendKey,
      meiliApiCredentialEnvVars,
    }
  )
  const requiredPersistedEnv = buildRequiredPersistedEnv(
    input.lane,
    deployServiceIds,
    contracts
  )
  const forbiddenEnv = buildForbiddenPreviewOnlyEnv(
    input.lane,
    deployServiceIds,
    contracts
  )
  const payload: VerifyDeployPayload = {
    lane: input.lane,
    project_slug: input.projectSlug,
    environment_name: input.environmentName,
    requested_service_ids: requestedServiceIds,
    deploy_service_ids: deployServiceIds,
    triggered_service_ids: triggeredServiceIds,
    expected_preview_service_slugs: expectedPreviewServiceSlugs,
    excluded_preview_service_slugs: excludedPreviewServiceSlugs,
    expected_env_overrides: expectedEnvOverrides,
    required_persisted_env: requiredPersistedEnv,
    forbidden_env: forbiddenEnv,
    deployments: input.deployments.map(
      ({ deployment_hash, service_id, service_slug }: DeploymentRef) => ({
        service_id,
        service_slug,
        deployment_hash,
      })
    ),
  }

  const response = input.dryRun
    ? buildDryRunResponse({
        input,
        requestedServiceIds,
        deployServiceIds,
        triggeredServiceIds,
        expectedPreviewServiceSlugs,
        expectedEnvOverrides,
        requiredPersistedEnv,
        forbiddenEnv,
      })
    : await new ZaneOperatorClient(input.baseUrl, input.apiToken).verifyDeploy(
        payload
      )

  if (!response.verified) {
    throw new Error("Deploy verification failed.")
  }

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}

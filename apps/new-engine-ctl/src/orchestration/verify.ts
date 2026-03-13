import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  DeploymentRef,
  EnvOverride,
  RequiredPersistedEnv,
  VerifyCommandInput,
  VerifyDeployPayload,
  VerifyResponse,
} from "../contracts/verify.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"
import {
  buildExpectedEnvOverrides,
  buildRequiredPersistedEnv,
  getSearchCredentialEnvVars,
  loadDeployContracts,
  normalizeCsvToArray,
} from "./deploy-inputs.js"

type DryRunResponseOptions = {
  input: VerifyCommandInput
  requestedServiceIds: string[]
  deployServiceIds: string[]
  triggeredServiceIds: string[]
  expectedEnvOverrides: EnvOverride[]
  requiredPersistedEnv: RequiredPersistedEnv[]
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
  expectedEnvOverrides,
  requiredPersistedEnv,
}: DryRunResponseOptions): VerifyResponse {
  return {
    lane: input.lane,
    project_slug: input.projectSlug,
    environment_name: input.environmentName,
    verified: true,
    requested_service_ids: requestedServiceIds,
    deploy_service_ids: deployServiceIds,
    triggered_service_ids: triggeredServiceIds,
    checked_env_override_service_ids: expectedEnvOverrides.map(
      (override) => override.service_id
    ),
    checked_persisted_env_service_ids: requiredPersistedEnv.map(
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
  const searchCredentialEnvVars = getSearchCredentialEnvVars(
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
        input.meiliFrontendEnvVar || searchCredentialEnvVars.frontend,
      meiliBackendKey: input.meiliBackendKey,
      searchCredentialEnvVars,
    }
  )
  const requiredPersistedEnv = buildRequiredPersistedEnv(
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
    expected_env_overrides: expectedEnvOverrides,
    required_persisted_env: requiredPersistedEnv,
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
        expectedEnvOverrides,
        requiredPersistedEnv,
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

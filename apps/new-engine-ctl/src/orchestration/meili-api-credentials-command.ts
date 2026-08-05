import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import type {
  MeiliApiCredentialsCommandInput,
  MeiliApiCredentialsResponse,
} from "../contracts/meili-api-credentials.js"
import { meiliApiCredentialsResponseSchema } from "../contracts/meili-api-credentials.js"
import {
  getRuntimeProviderOutputPolicy,
  getRuntimeProviderTargetEnvVar,
} from "../contracts/stack-inputs.js"
import { loadDeployContracts } from "./deploy-inputs.js"
import { reconcileMainMeiliApiCredentials } from "./meili-api-credentials.js"

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

export async function executeMeiliApiCredentialsCommand(
  input: MeiliApiCredentialsCommandInput,
): Promise<MeiliApiCredentialsResponse> {
  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath,
  )
  const backendPolicy = getRuntimeProviderOutputPolicy(
    contracts.stackInputs,
    input.providerId,
    "backend_key",
  )
  const frontendPolicy = getRuntimeProviderOutputPolicy(
    contracts.stackInputs,
    input.providerId,
    "frontend_key",
  )
  const backendEnvVar = getRuntimeProviderTargetEnvVar(
    contracts.stackInputs,
    input.providerId,
    "backend_key",
    "medusa-be",
  )
  const frontendEnvVar = getRuntimeProviderTargetEnvVar(
    contracts.stackInputs,
    input.providerId,
    "frontend_key",
    "n1",
  )

  const reconciled = await reconcileMainMeiliApiCredentials({
    dryRun: input.dryRun,
    masterKey: input.masterKey,
    meiliUrl: input.meiliUrl,
    providerId: input.providerId,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
    stackInputs: contracts.stackInputs,
    timeoutSeconds: input.timeoutSeconds,
    waitSeconds: input.waitSeconds,
  })

  const response = meiliApiCredentialsResponseSchema.parse({
    backend_created: reconciled.backendCreated,
    backend_env_var: backendEnvVar,
    backend_key: reconciled.backendKey,
    backend_uid: backendPolicy.uid,
    backend_updated: reconciled.backendUpdated,
    frontend_created: reconciled.frontendCreated,
    frontend_env_var: frontendEnvVar,
    frontend_key: reconciled.frontendKey,
    frontend_uid: frontendPolicy.uid,
    frontend_updated: reconciled.frontendUpdated,
    meili_url: input.meiliUrl,
    verified: reconciled.verified,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}

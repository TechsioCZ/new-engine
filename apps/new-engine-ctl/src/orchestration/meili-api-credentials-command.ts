import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import {
  getRuntimeProviderOutputPolicy,
  getRuntimeProviderTargetEnvVar,
} from "../contracts/stack-inputs.js"
import type {
  MeiliApiCredentialsCommandInput,
  MeiliApiCredentialsResponse,
} from "../contracts/meili-api-credentials.js"
import { meiliApiCredentialsResponseSchema } from "../contracts/meili-api-credentials.js"
import { loadDeployContracts } from "./deploy-inputs.js"
import { reconcileMainMeiliApiCredentials } from "./meili-api-credentials.js"

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executeMeiliApiCredentialsCommand(
  input: MeiliApiCredentialsCommandInput
): Promise<MeiliApiCredentialsResponse> {
  const contracts = await loadDeployContracts(
    input.stackManifestPath,
    input.stackInputsPath
  )
  const backendPolicy = getRuntimeProviderOutputPolicy(
    contracts.stackInputs,
    input.providerId,
    "backend_key"
  )
  const frontendPolicy = getRuntimeProviderOutputPolicy(
    contracts.stackInputs,
    input.providerId,
    "frontend_key"
  )
  const backendEnvVar = getRuntimeProviderTargetEnvVar(
    contracts.stackInputs,
    input.providerId,
    "backend_key",
    "medusa-be"
  )
  const frontendEnvVar = getRuntimeProviderTargetEnvVar(
    contracts.stackInputs,
    input.providerId,
    "frontend_key",
    "n1"
  )

  const reconciled = await reconcileMainMeiliApiCredentials({
    meiliUrl: input.meiliUrl,
    masterKey: input.masterKey,
    waitSeconds: input.waitSeconds,
    retryCount: input.retryCount,
    retryDelaySeconds: input.retryDelaySeconds,
    stackInputs: contracts.stackInputs,
    providerId: input.providerId,
    dryRun: input.dryRun,
  })

  const response = meiliApiCredentialsResponseSchema.parse({
    meili_url: input.meiliUrl,
    backend_env_var: backendEnvVar,
    frontend_env_var: frontendEnvVar,
    backend_uid: backendPolicy.uid,
    frontend_uid: frontendPolicy.uid,
    backend_created: reconciled.backendCreated,
    frontend_created: reconciled.frontendCreated,
    backend_updated: reconciled.backendUpdated,
    frontend_updated: reconciled.frontendUpdated,
    backend_key: reconciled.backendKey,
    frontend_key: reconciled.frontendKey,
    verified: reconciled.verified,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}

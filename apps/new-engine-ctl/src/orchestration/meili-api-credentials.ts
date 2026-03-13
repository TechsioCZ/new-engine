import {
  getRuntimeProviderOutputPolicy,
  getRuntimeProviderTargetEnvVar,
  type StackInputs,
} from "../contracts/stack-inputs.js"
import { provisionMeiliKeys, verifyMeiliKeys } from "../providers/meilisearch.js"

export type MainMeiliApiCredentialsResult = {
  backendKey: string
  frontendKey: string
  frontendEnvVar: string
  backendCreated: boolean
  backendUpdated: boolean
  frontendCreated: boolean
  frontendUpdated: boolean
  verified: boolean
}

export async function reconcileMainMeiliApiCredentials(input: {
  meiliUrl: string
  masterKey: string
  waitSeconds: number
  retryCount: number
  retryDelaySeconds: number
  stackInputs: StackInputs
  providerId: string
  dryRun: boolean
}): Promise<MainMeiliApiCredentialsResult> {
  const backendPolicy = getRuntimeProviderOutputPolicy(
    input.stackInputs,
    input.providerId,
    "backend_key"
  )
  const frontendPolicy = getRuntimeProviderOutputPolicy(
    input.stackInputs,
    input.providerId,
    "frontend_key"
  )
  const backendEnvVar = getRuntimeProviderTargetEnvVar(
    input.stackInputs,
    input.providerId,
    "backend_key",
    "medusa-be"
  )
  const frontendEnvVar = getRuntimeProviderTargetEnvVar(
    input.stackInputs,
    input.providerId,
    "frontend_key",
    "n1"
  )

  const provisioned = input.dryRun
    ? {
        backend_key: "dry-run:main:backend",
        frontend_key: "dry-run:main:frontend",
        backend_uid: backendPolicy.uid,
        frontend_uid: frontendPolicy.uid,
        backend_created: false,
        frontend_created: true,
        backend_updated: false,
        frontend_updated: false,
        backend_env_var: backendEnvVar,
        frontend_env_var: frontendEnvVar,
      }
    : await provisionMeiliKeys({
        meiliUrl: input.meiliUrl,
        masterKey: input.masterKey,
        waitSeconds: input.waitSeconds,
        retryCount: input.retryCount,
        retryDelaySeconds: input.retryDelaySeconds,
        stackInputs: input.stackInputs,
        providerId: input.providerId,
      })

  const verified = input.dryRun
    ? { result: "ok" as const }
    : await verifyMeiliKeys({
        meiliUrl: input.meiliUrl,
        masterKey: input.masterKey,
        backendKey: provisioned.backend_key,
        frontendKey: provisioned.frontend_key,
        waitSeconds: input.waitSeconds,
        retryCount: input.retryCount,
        retryDelaySeconds: input.retryDelaySeconds,
        stackInputs: input.stackInputs,
        providerId: input.providerId,
      })

  return {
    backendKey: provisioned.backend_key,
    frontendKey: provisioned.frontend_key,
    frontendEnvVar: provisioned.frontend_env_var,
    backendCreated: provisioned.backend_created,
    backendUpdated: provisioned.backend_updated,
    frontendCreated: provisioned.frontend_created,
    frontendUpdated: provisioned.frontend_updated,
    verified: verified.result === "ok",
  }
}

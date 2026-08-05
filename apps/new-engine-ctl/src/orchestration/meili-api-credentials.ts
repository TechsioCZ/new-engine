import {
  getRuntimeProviderOutputPolicy,
  getRuntimeProviderTargetEnvVar,
} from "../contracts/stack-inputs.js"
import type { StackInputs } from "../contracts/stack-inputs.js"
import {
  provisionMeiliKeys,
  verifyMeiliKeys,
} from "../providers/meilisearch.js"

export interface MainMeiliApiCredentialsResult {
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
  timeoutSeconds: number
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
        backend_created: false,
        backend_env_var: backendEnvVar,
        backend_key: "dry-run:main:backend",
        backend_uid: backendPolicy.uid,
        backend_updated: false,
        frontend_created: true,
        frontend_env_var: frontendEnvVar,
        frontend_key: "dry-run:main:frontend",
        frontend_uid: frontendPolicy.uid,
        frontend_updated: false,
      }
    : await provisionMeiliKeys({
        masterKey: input.masterKey,
        meiliUrl: input.meiliUrl,
        providerId: input.providerId,
        retryCount: input.retryCount,
        retryDelaySeconds: input.retryDelaySeconds,
        stackInputs: input.stackInputs,
        timeoutSeconds: input.timeoutSeconds,
        waitSeconds: input.waitSeconds,
      })

  const verified = input.dryRun
    ? { result: "ok" as const }
    : await verifyMeiliKeys({
        backendKey: provisioned.backend_key,
        frontendKey: provisioned.frontend_key,
        masterKey: input.masterKey,
        meiliUrl: input.meiliUrl,
        providerId: input.providerId,
        retryCount: input.retryCount,
        retryDelaySeconds: input.retryDelaySeconds,
        stackInputs: input.stackInputs,
        timeoutSeconds: input.timeoutSeconds,
        waitSeconds: input.waitSeconds,
      })

  return {
    backendCreated: provisioned.backend_created,
    backendKey: provisioned.backend_key,
    backendUpdated: provisioned.backend_updated,
    frontendCreated: provisioned.frontend_created,
    frontendEnvVar: provisioned.frontend_env_var,
    frontendKey: provisioned.frontend_key,
    frontendUpdated: provisioned.frontend_updated,
    verified: verified.result === "ok",
  }
}

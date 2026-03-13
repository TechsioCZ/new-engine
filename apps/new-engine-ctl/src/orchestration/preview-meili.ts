import type { ProvisionPreviewMeiliKeysResponse } from "../contracts/provision-preview-meili-keys.js"
import {
  getRuntimeProviderOutputPolicy,
  getRuntimeProviderReadinessPath,
  getRuntimeProviderSourceServiceId,
  getRuntimeProviderTargetEnvVar,
  type StackInputs,
} from "../contracts/stack-inputs.js"
import type { StackManifest } from "../contracts/stack-manifest.js"
import { listDeployableServices } from "../contracts/stack-manifest.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

export function getMeiliApiCredentialsProviderSourceService(
  manifest: StackManifest,
  stackInputs: StackInputs,
  providerId: string
): {
  serviceId: string
  serviceSlug: string
} {
  const serviceId = getRuntimeProviderSourceServiceId(stackInputs, providerId)
  const service = listDeployableServices(manifest).find(
    (candidate) => candidate.id === serviceId
  )
  if (!service) {
    throw new Error(
      `Missing service_slug for provider source service ${serviceId}.`
    )
  }

  return {
    serviceId,
    serviceSlug: service.serviceSlug,
  }
}

export function provisionPreviewMeiliKeys(input: {
  projectSlug: string
  environmentName: string
  serviceSlug: string
  stackInputs: StackInputs
  providerId: string
  baseUrl: string
  apiToken: string
  dryRun: boolean
}): Promise<ProvisionPreviewMeiliKeysResponse> {
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
  const readinessPath = getRuntimeProviderReadinessPath(
    input.stackInputs,
    input.providerId
  )
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

  if (input.dryRun) {
    return Promise.resolve({
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slug: input.serviceSlug,
      meili_url: `https://${input.serviceSlug}.dry-run.invalid`,
      backend_key: "dry-run:preview:backend",
      backend_env_var: backendEnvVar,
      backend_created: true,
      backend_updated: false,
      frontend_key: "dry-run:preview:frontend",
      frontend_env_var: frontendEnvVar,
      frontend_created: true,
      frontend_updated: false,
    })
  }

  return new ZaneOperatorClient(
    input.baseUrl,
    input.apiToken
  ).provisionPreviewMeiliKeys({
    project_slug: input.projectSlug,
    environment_name: input.environmentName,
    service_slug: input.serviceSlug,
    readiness_path: readinessPath,
    backend_output: {
      env_var: backendEnvVar,
      policy: backendPolicy,
    },
    frontend_output: {
      env_var: frontendEnvVar,
      policy: frontendPolicy,
    },
  })
}

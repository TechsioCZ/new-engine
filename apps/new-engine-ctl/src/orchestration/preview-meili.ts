import type { ProvisionMeiliKeysResponse } from "../contracts/provision-meili-keys.js"
import {
  getRuntimeProviderOutputPolicy,
  getRuntimeProviderReadinessPath,
  getRuntimeProviderSourceServiceId,
  getRuntimeProviderTargetEnvVar,
  type StackInputs,
} from "../contracts/stack-inputs.js"
import type { StackManifest } from "../contracts/stack-manifest.js"
import { listDeployableServices } from "../contracts/stack-manifest.js"
import type { RuntimeProviderRunResponse } from "../contracts/runtime-provider-run.js"
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

function requireRuntimeProviderOutput(
  response: RuntimeProviderRunResponse,
  outputId: string
) {
  const output = response.outputs.find((candidate) => candidate.output_id === outputId)
  if (!output) {
    throw new Error(
      `Runtime provider ${response.provider_id} did not return output ${outputId}.`
    )
  }

  return output
}

export async function provisionMeiliKeys(input: {
  projectSlug: string
  environmentName: string
  serviceSlug: string
  stackInputs: StackInputs
  providerId: string
  baseUrl: string
  apiToken: string
  dryRun: boolean
}): Promise<ProvisionMeiliKeysResponse> {
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
    return {
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
    }
  }

  const response = await new ZaneOperatorClient(
    input.baseUrl,
    input.apiToken
  ).runRuntimeProvider({
    project_slug: input.projectSlug,
    environment_name: input.environmentName,
    provider_id: input.providerId,
    service_slug: input.serviceSlug,
    readiness_path: readinessPath,
    outputs: [
      {
        output_id: "backend_key",
        env_var: backendEnvVar,
        policy: {
          kind: "meilisearch_key",
          ...backendPolicy,
        },
      },
      {
        output_id: "frontend_key",
        env_var: frontendEnvVar,
        policy: {
          kind: "meilisearch_key",
          ...frontendPolicy,
        },
      },
    ],
  })

  const backendOutput = requireRuntimeProviderOutput(response, "backend_key")
  const frontendOutput = requireRuntimeProviderOutput(response, "frontend_key")

  return {
    project_slug: response.project_slug,
    environment_name: response.environment_name,
    service_slug: response.service_slug,
    meili_url: response.source_url,
    backend_key: backendOutput.value,
    backend_env_var: backendOutput.env_var,
    backend_created: backendOutput.created,
    backend_updated: backendOutput.updated,
    frontend_key: frontendOutput.value,
    frontend_env_var: frontendOutput.env_var,
    frontend_created: frontendOutput.created,
    frontend_updated: frontendOutput.updated,
  }
}

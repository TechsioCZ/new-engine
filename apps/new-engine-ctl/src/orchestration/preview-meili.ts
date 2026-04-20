import type { ProvisionMeiliKeysResponse } from "../contracts/provision-meili-keys.js"
import type { ResolveTargetsResponse } from "../contracts/resolve-targets.js"
import {
  getRuntimeProviderMeiliKeyPolicy,
  getRuntimeProviderReadinessPath,
  getRuntimeProviderSourceServiceId,
  listRuntimeProviderOutputTargets,
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
  const output = response.outputs.find(
    (candidate) => candidate.output_id === outputId
  )
  if (!output) {
    throw new Error(
      `Runtime provider ${response.provider_id} did not return output ${outputId}.`
    )
  }

  return output
}

function resolveSharedPersistedValue(input: {
  targets: ResolveTargetsResponse["services"]
  serviceIds: string[]
  envVar: string
}): string {
  if (input.serviceIds.length === 0) {
    return ""
  }

  const values = input.serviceIds.map((serviceId) => {
    const target = input.targets.find((candidate) => candidate.service_id === serviceId)
    return target?.current_production_deployment?.env?.[input.envVar] ?? ""
  })

  if (values.some((value) => !value)) {
    return ""
  }

  return values.every((value) => value === values[0]) ? (values[0] ?? "") : ""
}

export function reusePersistedMeiliKeysFromTargets(input: {
  targets: ResolveTargetsResponse["services"]
  stackInputs: StackInputs
  providerId: string
  backendConsumerIds: string[]
  frontendConsumerIds: string[]
}): {
  backendKey: string
  frontendKey: string
  frontendEnvVar: string
} {
  const backendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "backend_key"
  )
  const frontendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "frontend_key"
  )

  return {
    backendKey: resolveSharedPersistedValue({
      targets: input.targets,
      serviceIds: input.backendConsumerIds,
      envVar: backendEnvVar,
    }),
    frontendKey: resolveSharedPersistedValue({
      targets: input.targets,
      serviceIds: input.frontendConsumerIds,
      envVar: frontendEnvVar,
    }),
    frontendEnvVar,
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: provider output shaping is intentionally linear here
export async function provisionMeiliKeys(input: {
  projectSlug: string
  environmentName: string
  serviceSlug: string
  stackInputs: StackInputs
  providerId: string
  baseUrl: string
  apiToken: string
  dryRun: boolean
  needBackendKey: boolean
  needFrontendKey: boolean
}): Promise<ProvisionMeiliKeysResponse> {
  const backendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "backend_key"
  )
  const frontendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "frontend_key"
  )
  const readinessPath = getRuntimeProviderReadinessPath(
    input.stackInputs,
    input.providerId
  )
  const backendPolicy = getRuntimeProviderMeiliKeyPolicy(
    input.stackInputs,
    input.providerId,
    "backend_key"
  )
  const frontendPolicy = getRuntimeProviderMeiliKeyPolicy(
    input.stackInputs,
    input.providerId,
    "frontend_key"
  )

  if (!(input.needBackendKey || input.needFrontendKey)) {
    throw new Error("Meili key provisioning requested with no required outputs.")
  }

  if (input.dryRun) {
    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slug: input.serviceSlug,
      meili_url: `https://${input.serviceSlug}.dry-run.invalid`,
      backend_key: input.needBackendKey ? "dry-run:preview:backend" : "",
      backend_env_var: backendEnvVar,
      backend_created: input.needBackendKey,
      backend_updated: false,
      frontend_key: input.needFrontendKey ? "dry-run:preview:frontend" : "",
      frontend_env_var: frontendEnvVar,
      frontend_created: input.needFrontendKey,
      frontend_updated: false,
    }
  }

  const outputs: Array<{
    output_id: string
    env_var: string
    policy: {
      kind: string
      uid: string
      description: string
      actions: string[]
      indexes: string[]
    }
  }> = []
  if (input.needBackendKey) {
    outputs.push({
      output_id: "backend_key",
      env_var: backendEnvVar,
      policy: {
        kind: "meilisearch_key",
        ...backendPolicy,
      },
    })
  }
  if (input.needFrontendKey) {
    outputs.push({
      output_id: "frontend_key",
      env_var: frontendEnvVar,
      policy: {
        kind: "meilisearch_key",
        ...frontendPolicy,
      },
    })
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
    outputs,
  })

  const backendOutput = input.needBackendKey
    ? requireRuntimeProviderOutput(response, "backend_key")
    : null
  const frontendOutput = input.needFrontendKey
    ? requireRuntimeProviderOutput(response, "frontend_key")
    : null

  return {
    project_slug: response.project_slug,
    environment_name: response.environment_name,
    service_slug: response.service_slug,
    meili_url: response.source_url,
    backend_key: backendOutput?.value ?? "",
    backend_env_var: backendEnvVar,
    backend_created: backendOutput?.created ?? false,
    backend_updated: backendOutput?.updated ?? false,
    frontend_key: frontendOutput?.value ?? "",
    frontend_env_var: frontendEnvVar,
    frontend_created: frontendOutput?.created ?? false,
    frontend_updated: frontendOutput?.updated ?? false,
  }
}

function resolveOutputEnvVar(
  stackInputs: StackInputs,
  providerId: string,
  outputId: string
): string {
  const target = listRuntimeProviderOutputTargets(
    stackInputs,
    providerId,
    outputId
  )[0]
  if (!target?.env_var) {
    throw new Error(
      `Missing target env var for runtime provider ${providerId} output ${outputId}.`
    )
  }

  return target.env_var
}

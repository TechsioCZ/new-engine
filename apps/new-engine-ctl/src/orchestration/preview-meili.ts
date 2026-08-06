import type { ProvisionMeiliKeysResponse } from "../contracts/provision-meili-keys.js"
import type { ResolveTargetsResponse } from "../contracts/resolve-targets.js"
import type { RuntimeProviderRunResponse } from "../contracts/runtime-provider-run.js"
import {
  getRuntimeProviderMeiliKeyPolicy,
  getRuntimeProviderReadinessPath,
  getRuntimeProviderSourceServiceId,
  listRuntimeProviderOutputTargets,
} from "../contracts/stack-inputs.js"
import type { StackInputs } from "../contracts/stack-inputs.js"
import type { StackManifest } from "../contracts/stack-manifest.js"
import { listDeployableServices } from "../contracts/stack-manifest.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

export const getMeiliApiCredentialsProviderSourceService = (
  manifest: StackManifest,
  stackInputs: StackInputs,
  providerId: string,
): {
  serviceId: string
  serviceSlug: string
} => {
  const serviceId = getRuntimeProviderSourceServiceId(stackInputs, providerId)
  const service = listDeployableServices(manifest).find(
    (candidate) => candidate.id === serviceId,
  )
  if (!service) {
    throw new Error(
      `Missing service_slug for provider source service ${serviceId}.`,
    )
  }

  return {
    serviceId,
    serviceSlug: service.serviceSlug,
  }
}

const requireRuntimeProviderOutput = (
  response: RuntimeProviderRunResponse,
  outputId: string,
) => {
  const output = response.outputs.find(
    (candidate) => candidate.output_id === outputId,
  )
  if (!output) {
    throw new Error(
      `Runtime provider ${response.provider_id} did not return output ${outputId}.`,
    )
  }

  return output
}

const resolveOutputEnvVar = (
  stackInputs: StackInputs,
  providerId: string,
  outputId: string,
): string => {
  const [target] = listRuntimeProviderOutputTargets(
    stackInputs,
    providerId,
    outputId,
  )
  if (target?.env_var === undefined || target.env_var === "") {
    throw new Error(
      `Missing target env var for runtime provider ${providerId} output ${outputId}.`,
    )
  }

  return target.env_var
}

const resolveSharedPersistedValue = (input: {
  targets: ResolveTargetsResponse["services"]
  serviceIds: string[]
  envVar: string
}): string => {
  if (input.serviceIds.length === 0) {
    return ""
  }

  const values = input.serviceIds.map((serviceId) => {
    const target = input.targets.find(
      (candidate) => candidate.service_id === serviceId,
    )
    return target?.current_production_deployment?.env?.[input.envVar] ?? ""
  })

  if (values.some((value) => !value)) {
    return ""
  }

  return values.every((value) => value === values[0]) ? (values[0] ?? "") : ""
}

export const reusePersistedMeiliKeysFromTargets = (input: {
  targets: ResolveTargetsResponse["services"]
  stackInputs: StackInputs
  providerId: string
  backendConsumerIds: string[]
  frontendConsumerIds: string[]
}): {
  backendKey: string
  frontendKey: string
  frontendEnvVar: string
} => {
  const backendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "backend_key",
  )
  const frontendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "frontend_key",
  )

  return {
    backendKey: resolveSharedPersistedValue({
      envVar: backendEnvVar,
      serviceIds: input.backendConsumerIds,
      targets: input.targets,
    }),
    frontendEnvVar,
    frontendKey: resolveSharedPersistedValue({
      envVar: frontendEnvVar,
      serviceIds: input.frontendConsumerIds,
      targets: input.targets,
    }),
  }
}

const buildMeiliProviderOutputs = (input: {
  backendEnvVar: string
  frontendEnvVar: string
  backendPolicy: ReturnType<typeof getRuntimeProviderMeiliKeyPolicy>
  frontendPolicy: ReturnType<typeof getRuntimeProviderMeiliKeyPolicy>
  needBackendKey: boolean
  needFrontendKey: boolean
}): {
  output_id: string
  env_var: string
  policy: Record<string, unknown> & { kind: string }
}[] => {
  const outputs: {
    output_id: string
    env_var: string
    policy: Record<string, unknown> & { kind: string }
  }[] = []
  if (input.needBackendKey) {
    outputs.push({
      env_var: input.backendEnvVar,
      output_id: "backend_key",
      policy: { kind: "meilisearch_key", ...input.backendPolicy },
    })
  }
  if (input.needFrontendKey) {
    outputs.push({
      env_var: input.frontendEnvVar,
      output_id: "frontend_key",
      policy: { kind: "meilisearch_key", ...input.frontendPolicy },
    })
  }
  return outputs
}

// provider output shaping is intentionally linear here
export const provisionMeiliKeys = async (input: {
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
}): Promise<ProvisionMeiliKeysResponse> => {
  const backendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "backend_key",
  )
  const frontendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "frontend_key",
  )
  const readinessPath = getRuntimeProviderReadinessPath(
    input.stackInputs,
    input.providerId,
  )
  const backendPolicy = getRuntimeProviderMeiliKeyPolicy(
    input.stackInputs,
    input.providerId,
    "backend_key",
  )
  const frontendPolicy = getRuntimeProviderMeiliKeyPolicy(
    input.stackInputs,
    input.providerId,
    "frontend_key",
  )

  if (!(input.needBackendKey || input.needFrontendKey)) {
    throw new Error(
      "Meili key provisioning requested with no required outputs.",
    )
  }

  if (input.dryRun) {
    return {
      backend_created: input.needBackendKey,
      backend_env_var: backendEnvVar,
      backend_key: input.needBackendKey ? "dry-run:preview:backend" : "",
      backend_updated: false,
      environment_name: input.environmentName,
      frontend_created: input.needFrontendKey,
      frontend_env_var: frontendEnvVar,
      frontend_key: input.needFrontendKey ? "dry-run:preview:frontend" : "",
      frontend_updated: false,
      meili_url: `https://${input.serviceSlug}.dry-run.invalid`,
      project_slug: input.projectSlug,
      service_slug: input.serviceSlug,
    }
  }

  const outputs = buildMeiliProviderOutputs({
    backendEnvVar,
    backendPolicy,
    frontendEnvVar,
    frontendPolicy,
    needBackendKey: input.needBackendKey,
    needFrontendKey: input.needFrontendKey,
  })

  const response = await new ZaneOperatorClient(
    input.baseUrl,
    input.apiToken,
  ).runRuntimeProvider({
    environment_name: input.environmentName,
    outputs,
    project_slug: input.projectSlug,
    provider_id: input.providerId,
    readiness_path: readinessPath,
    service_slug: input.serviceSlug,
  })

  const backendOutput = input.needBackendKey
    ? requireRuntimeProviderOutput(response, "backend_key")
    : null
  const frontendOutput = input.needFrontendKey
    ? requireRuntimeProviderOutput(response, "frontend_key")
    : null

  return {
    backend_created: backendOutput?.created ?? false,
    backend_env_var: backendEnvVar,
    backend_key: backendOutput?.value ?? "",
    backend_updated: backendOutput?.updated ?? false,
    environment_name: response.environment_name,
    frontend_created: frontendOutput?.created ?? false,
    frontend_env_var: frontendEnvVar,
    frontend_key: frontendOutput?.value ?? "",
    frontend_updated: frontendOutput?.updated ?? false,
    meili_url: response.source_url,
    project_slug: response.project_slug,
    service_slug: response.service_slug,
  }
}

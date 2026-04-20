import type { RuntimeProviderRunResponse } from "../contracts/runtime-provider-run.js"
import {
  getRuntimeProviderOutputPolicy,
  getRuntimeProviderReadinessPath,
  getRuntimeProviderSourceServiceId,
  listRuntimeProviderConsumerServiceIds,
  listRuntimeProviderOutputTargets,
  type StackInputs,
} from "../contracts/stack-inputs.js"
import type { StackManifest } from "../contracts/stack-manifest.js"
import { listDeployableServices } from "../contracts/stack-manifest.js"
import type { ResolveTargetsResponse } from "../contracts/resolve-targets.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

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

export function getMedusaPublishableKeyProviderSourceService(
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

export function collectMedusaPublishableKeyOutputNeeds(input: {
  services: Array<{ id: string }>
  stackInputs: StackInputs
  providerId: string
}): {
  consumerIds: string[]
  needFrontendKey: boolean
} {
  const consumerIdSet = new Set(
    listRuntimeProviderConsumerServiceIds(input.stackInputs, input.providerId)
  )
  const consumerIds = input.services
    .filter((service) => consumerIdSet.has(service.id))
    .map((service) => service.id)

  return {
    consumerIds,
    needFrontendKey: consumerIds.length > 0,
  }
}

export function reusePersistedMedusaPublishableKeyFromTargets(input: {
  targets: ResolveTargetsResponse["services"]
  stackInputs: StackInputs
  providerId: string
  consumerIds: string[]
}): {
  frontendKey: string
  frontendEnvVar: string
} {
  const frontendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "frontend_key"
  )

  return {
    frontendKey: resolveSharedPersistedValue({
      targets: input.targets,
      serviceIds: input.consumerIds,
      envVar: frontendEnvVar,
    }),
    frontendEnvVar,
  }
}

export async function provisionMedusaPublishableKey(input: {
  projectSlug: string
  environmentName: string
  serviceSlug: string
  stackInputs: StackInputs
  providerId: string
  baseUrl: string
  apiToken: string
  dryRun: boolean
  needFrontendKey: boolean
}): Promise<{
  project_slug: string
  environment_name: string
  service_slug: string
  source_url: string
  frontend_key: string
  frontend_env_var: string
  frontend_created: boolean
  frontend_updated: boolean
}> {
  const frontendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "frontend_key"
  )
  const readinessPath = getRuntimeProviderReadinessPath(
    input.stackInputs,
    input.providerId
  )
  const frontendPolicy = getRuntimeProviderOutputPolicy(
    input.stackInputs,
    input.providerId,
    "frontend_key"
  )

  if (!input.needFrontendKey) {
    throw new Error(
      "Medusa publishable key provisioning requested with no required outputs."
    )
  }

  if (input.dryRun) {
    return {
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      service_slug: input.serviceSlug,
      source_url: `https://${input.serviceSlug}.dry-run.invalid`,
      frontend_key: "dry-run:medusa:publishable",
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
        output_id: "frontend_key",
        env_var: frontendEnvVar,
        policy: {
          kind: "medusa_publishable_key",
          ...frontendPolicy,
        },
      },
    ],
  })

  const frontendOutput = requireRuntimeProviderOutput(response, "frontend_key")

  return {
    project_slug: response.project_slug,
    environment_name: response.environment_name,
    service_slug: response.service_slug,
    source_url: response.source_url,
    frontend_key: frontendOutput.value,
    frontend_env_var: frontendEnvVar,
    frontend_created: frontendOutput.created,
    frontend_updated: frontendOutput.updated,
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

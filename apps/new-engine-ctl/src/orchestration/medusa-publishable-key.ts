import type { ResolveTargetsResponse } from "../contracts/resolve-targets.js"
import type { RuntimeProviderRunResponse } from "../contracts/runtime-provider-run.js"
import {
  getRuntimeProviderOutputPolicy,
  getRuntimeProviderReadinessPath,
  getRuntimeProviderSourceServiceId,
  listRuntimeProviderOutputTargets,
} from "../contracts/stack-inputs.js"
import type { StackInputs } from "../contracts/stack-inputs.js"
import type { StackManifest } from "../contracts/stack-manifest.js"
import { listDeployableServices } from "../contracts/stack-manifest.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

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

export const getMedusaPublishableKeyProviderSourceService = (
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

export const reusePersistedMedusaPublishableKeyFromTargets = (input: {
  targets: ResolveTargetsResponse["services"]
  stackInputs: StackInputs
  providerId: string
  consumerIds: string[]
}): {
  frontendKey: string
  frontendEnvVar: string
} => {
  const frontendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "frontend_key",
  )

  return {
    frontendEnvVar,
    frontendKey: resolveSharedPersistedValue({
      envVar: frontendEnvVar,
      serviceIds: input.consumerIds,
      targets: input.targets,
    }),
  }
}

export const provisionMedusaPublishableKey = async (input: {
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
}> => {
  const frontendEnvVar = resolveOutputEnvVar(
    input.stackInputs,
    input.providerId,
    "frontend_key",
  )
  const readinessPath = getRuntimeProviderReadinessPath(
    input.stackInputs,
    input.providerId,
  )
  const frontendPolicy = getRuntimeProviderOutputPolicy(
    input.stackInputs,
    input.providerId,
    "frontend_key",
  )

  if (!input.needFrontendKey) {
    throw new Error(
      "Medusa publishable key provisioning requested with no required outputs.",
    )
  }

  if (input.dryRun) {
    return {
      environment_name: input.environmentName,
      frontend_created: true,
      frontend_env_var: frontendEnvVar,
      frontend_key: "dry-run:medusa:publishable",
      frontend_updated: false,
      project_slug: input.projectSlug,
      service_slug: input.serviceSlug,
      source_url: `https://${input.serviceSlug}.dry-run.invalid`,
    }
  }

  const response = await new ZaneOperatorClient(
    input.baseUrl,
    input.apiToken,
  ).runRuntimeProvider({
    environment_name: input.environmentName,
    outputs: [
      {
        env_var: frontendEnvVar,
        output_id: "frontend_key",
        policy: {
          ...frontendPolicy,
          kind: "medusa_publishable_key",
        },
      },
    ],
    project_slug: input.projectSlug,
    provider_id: input.providerId,
    readiness_path: readinessPath,
    service_slug: input.serviceSlug,
  })

  const frontendOutput = requireRuntimeProviderOutput(response, "frontend_key")

  return {
    environment_name: response.environment_name,
    frontend_created: frontendOutput.created,
    frontend_env_var: frontendEnvVar,
    frontend_key: frontendOutput.value,
    frontend_updated: frontendOutput.updated,
    project_slug: response.project_slug,
    service_slug: response.service_slug,
    source_url: response.source_url,
  }
}

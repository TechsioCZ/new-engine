import type { PlanResponse } from "../contracts/plan.js"
import type { ResolveTargetsResponse } from "../contracts/resolve-targets.js"
import type { StackInputs } from "../contracts/stack-inputs.js"
import {
  getDeployableService,
  type Lane,
  listDeployableServices,
  type StackManifest,
} from "../contracts/stack-manifest.js"
import { getMeiliApiCredentialsProviderSourceService } from "./preview-meili.js"
import { executeResolveTargetsPayload } from "./resolve-targets.js"

function buildPlanService(
  manifest: StackManifest,
  serviceId: string
): PlanResponse["deploy_services"][number] {
  const service = getDeployableService(manifest, serviceId)

  return {
    id: service.id,
    service_slug: service.serviceSlug,
    clone_to_preview: service.cloneToPreview,
    deploy_lanes: service.deployLanes,
    deploy_stage: service.deployStage,
    downtime_risk: service.downtimeRisk,
    consumes: service.consumes,
    coupled_service_ids: service.coupledServiceIds,
  }
}

function expandPlanWithServices(input: {
  plan: PlanResponse
  manifest: StackManifest
  serviceIds: string[]
}): PlanResponse {
  const allServiceIds = new Set(
    input.plan.deploy_services.map((service) => service.id)
  )

  for (const serviceId of input.serviceIds) {
    allServiceIds.add(serviceId)
  }

  const deployServices = listDeployableServices(input.manifest)
    .filter((service) => allServiceIds.has(service.id))
    .map((service) => buildPlanService(input.manifest, service.id))

  return {
    ...input.plan,
    deploy_services: deployServices,
    deploy_services_csv: deployServices.map((service) => service.id).join(","),
  }
}

function isMeiliSourceProvisionable(
  target: ResolveTargetsResponse["services"][number]
): boolean {
  const deployment = target.current_production_deployment
  if (!deployment || deployment.status.toUpperCase() !== "HEALTHY") {
    return false
  }

  return Boolean((deployment.env?.MEILI_MASTER_KEY ?? "").trim())
}

export async function expandPlanForRuntimeProviderPrerequisites(input: {
  lane: Lane
  plan: PlanResponse
  manifest: StackManifest
  stackInputs: StackInputs
  projectSlug: string
  environmentName: string
  baseUrl: string
  apiToken: string
  dryRun: boolean
  meiliApiCredentialsProviderId: string
}): Promise<{
  plan: PlanResponse
  transientServiceIds: string[]
  transientDowntimeServiceIds: string[]
}> {
  const meiliSource = getMeiliApiCredentialsProviderSourceService(
    input.manifest,
    input.stackInputs,
    input.meiliApiCredentialsProviderId
  )
  const needsMeiliApiCredentials = input.plan.deploy_services.some(
    (service) =>
      service.id === meiliSource.serviceId ||
      service.consumes.meili_backend_key ||
      service.consumes.meili_frontend_key
  )

  if (
    !needsMeiliApiCredentials ||
    input.plan.deploy_services.some(
      (service) => service.id === meiliSource.serviceId
    ) ||
    input.dryRun
  ) {
    return {
      plan: input.plan,
      transientServiceIds: [],
      transientDowntimeServiceIds: [],
    }
  }

  const sourceService = getDeployableService(
    input.manifest,
    meiliSource.serviceId
  )
  const prerequisiteServiceIds = [
    sourceService.id,
    ...sourceService.coupledServiceIds,
  ]
  let sourceTarget: ResolveTargetsResponse["services"][number] | undefined
  try {
    const sourceTargetResponse = await executeResolveTargetsPayload({
      payload: {
        lane: input.lane,
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        services: [
          {
            service_id: sourceService.id,
            service_slug: sourceService.serviceSlug,
          },
        ],
      },
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: false,
    })
    sourceTarget = sourceTargetResponse.services[0]
  } catch {
    sourceTarget = undefined
  }

  if (sourceTarget && isMeiliSourceProvisionable(sourceTarget)) {
    return {
      plan: input.plan,
      transientServiceIds: [],
      transientDowntimeServiceIds: [],
    }
  }

  return {
    plan: expandPlanWithServices({
      plan: input.plan,
      manifest: input.manifest,
      serviceIds: prerequisiteServiceIds,
    }),
    transientServiceIds: prerequisiteServiceIds,
    transientDowntimeServiceIds: prerequisiteServiceIds.filter(
      (serviceId) =>
        getDeployableService(input.manifest, serviceId).downtimeRisk
    ),
  }
}

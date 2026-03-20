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

function collectDependencyServiceIds(
  manifest: StackManifest,
  rootServiceIds: string[]
): string[] {
  const rootSet = new Set(rootServiceIds)
  const dependencyIds = new Set<string>()
  const queue = [...rootServiceIds]

  while (queue.length > 0) {
    const serviceId = queue.shift()
    if (!serviceId) {
      continue
    }

    const service = getDeployableService(manifest, serviceId)
    for (const dependencyId of service.serviceDependencies) {
      if (rootSet.has(dependencyId) || dependencyIds.has(dependencyId)) {
        continue
      }

      dependencyIds.add(dependencyId)
      queue.push(dependencyId)
    }
  }

  return [...dependencyIds]
}

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
    service_dependencies: service.serviceDependencies,
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
  target: ResolveTargetsResponse["services"][number] | undefined
): boolean {
  if (!target) {
    return false
  }

  const deployment = target.current_production_deployment
  if (!deployment || deployment.status.toUpperCase() !== "HEALTHY") {
    return false
  }

  return Boolean((deployment.env?.MEILI_MASTER_KEY ?? "").trim())
}

function isHealthyTarget(
  target: ResolveTargetsResponse["services"][number] | undefined
): boolean {
  return Boolean(
    target?.current_production_deployment?.status.toUpperCase() === "HEALTHY"
  )
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
      service.consumes.meili_backend_key ||
      service.consumes.meili_frontend_key
  )

  if (input.dryRun) {
    return {
      plan: input.plan,
      transientServiceIds: [],
      transientDowntimeServiceIds: [],
    }
  }

  const requestedServiceIds = input.plan.deploy_services.map(
    (service) => service.id
  )
  const dependencyServiceIds = collectDependencyServiceIds(
    input.manifest,
    requestedServiceIds
  )
  const prerequisiteIds = new Set<string>()
  const dependencyServices = dependencyServiceIds
    .map((serviceId) => getDeployableService(input.manifest, serviceId))
    .filter((service) => input.lane !== "preview" || service.cloneToPreview)
  let targetByServiceId = new Map<
    string,
    ResolveTargetsResponse["services"][number]
  >()
  try {
    const targetsResponse = await executeResolveTargetsPayload({
      payload: {
        lane: input.lane,
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        services: dependencyServices.map((service) => ({
          service_id: service.id,
          service_slug: service.serviceSlug,
        })),
      },
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: false,
    })
    targetByServiceId = new Map(
      targetsResponse.services.map((service) => [service.service_id, service])
    )
  } catch {
    targetByServiceId = new Map()
  }

  for (const dependencyService of dependencyServices) {
    const target = targetByServiceId.get(dependencyService.id)
    if (!isHealthyTarget(target)) {
      prerequisiteIds.add(dependencyService.id)
    }
  }

  if (
    needsMeiliApiCredentials &&
    !requestedServiceIds.includes(meiliSource.serviceId) &&
    !isMeiliSourceProvisionable(targetByServiceId.get(meiliSource.serviceId))
  ) {
    prerequisiteIds.add(meiliSource.serviceId)
  }

  if (prerequisiteIds.size === 0) {
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
      serviceIds: [...prerequisiteIds],
    }),
    transientServiceIds: [...prerequisiteIds],
    transientDowntimeServiceIds: [...prerequisiteIds].filter(
      (serviceId) =>
        getDeployableService(input.manifest, serviceId).downtimeRisk
    ),
  }
}

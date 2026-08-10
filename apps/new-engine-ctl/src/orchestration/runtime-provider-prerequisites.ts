import type { PlanResponse } from "../contracts/plan.js"
import type { ResolveTargetsResponse } from "../contracts/resolve-targets.js"
import {
  getRuntimeProviderLaneBehavior,
  listRuntimeProviderOutputIds,
  listRuntimeProviderOutputTargets,
} from "../contracts/stack-inputs.js"
import type { StackInputs } from "../contracts/stack-inputs.js"
import {
  getDeployableService,
  listDeployableServices,
} from "../contracts/stack-manifest.js"
import type { Lane, StackManifest } from "../contracts/stack-manifest.js"
import { getMeiliApiCredentialsProviderSourceService } from "./preview-meili.js"
import { executeResolveTargetsPayload } from "./resolve-targets.js"

const collectDependencyServiceIds = (
  manifest: StackManifest,
  rootServiceIds: string[],
): string[] => {
  const rootSet = new Set(rootServiceIds)
  const dependencyIds = new Set<string>()
  const queue = [...rootServiceIds]

  while (queue.length > 0) {
    const serviceId = queue.shift()
    if (serviceId === undefined || serviceId === "") {
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

const buildPlanService = (
  manifest: StackManifest,
  serviceId: string,
): PlanResponse["deploy_services"][number] => {
  const service = getDeployableService(manifest, serviceId)

  return {
    clone_to_preview: service.cloneToPreview,
    deploy_lanes: service.deployLanes,
    deploy_stage: service.deployStage,
    downtime_risk: service.downtimeRisk,
    id: service.id,
    service_dependencies: service.serviceDependencies,
    service_slug: service.serviceSlug,
  }
}

const expandPlanWithServices = (input: {
  plan: PlanResponse
  manifest: StackManifest
  serviceIds: string[]
}): PlanResponse => {
  const allServiceIds = new Set(
    input.plan.deploy_services.map((service) => service.id),
  )

  for (const serviceId of input.serviceIds) {
    allServiceIds.add(serviceId)
  }

  const deployServices: PlanResponse["deploy_services"] = []
  for (const service of listDeployableServices(input.manifest)) {
    if (allServiceIds.has(service.id)) {
      deployServices.push(buildPlanService(input.manifest, service.id))
    }
  }

  return {
    ...input.plan,
    deploy_services: deployServices,
    deploy_services_csv: deployServices.map((service) => service.id).join(","),
  }
}

const isMeiliSourceProvisionable = (
  target: ResolveTargetsResponse["services"][number] | undefined,
): boolean => {
  if (!target) {
    return false
  }

  const deployment = target.current_production_deployment
  if (!deployment || deployment.status.toUpperCase() !== "HEALTHY") {
    return false
  }

  return Boolean((deployment.env?.["MEILI_MASTER_KEY"] ?? "").trim())
}

const isHealthyTarget = (
  target: ResolveTargetsResponse["services"][number] | undefined,
): boolean =>
  target?.current_production_deployment?.status.toUpperCase() === "HEALTHY"

const planNeedsRuntimeProvider = (input: {
  lane: Lane
  stackInputs: StackInputs
  providerId: string
  serviceIds: string[]
}): boolean => {
  if (
    !getRuntimeProviderLaneBehavior(
      input.stackInputs,
      input.providerId,
      input.lane,
    ).enabled
  ) {
    return false
  }

  const serviceIds = new Set(input.serviceIds)
  return listRuntimeProviderOutputIds(input.stackInputs, input.providerId).some(
    (outputId) =>
      listRuntimeProviderOutputTargets(
        input.stackInputs,
        input.providerId,
        outputId,
      ).some((target) => serviceIds.has(target.service_id)),
  )
}

export const expandPlanForRuntimeProviderPrerequisites = async (input: {
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
}> => {
  const meiliSource = getMeiliApiCredentialsProviderSourceService(
    input.manifest,
    input.stackInputs,
    input.meiliApiCredentialsProviderId,
  )

  if (input.dryRun) {
    return {
      plan: input.plan,
      transientDowntimeServiceIds: [],
      transientServiceIds: [],
    }
  }

  const requestedServiceIds = input.plan.deploy_services.map(
    (service) => service.id,
  )
  const needsMeiliApiCredentials = planNeedsRuntimeProvider({
    lane: input.lane,
    providerId: input.meiliApiCredentialsProviderId,
    serviceIds: requestedServiceIds,
    stackInputs: input.stackInputs,
  })
  const dependencyServiceIds = collectDependencyServiceIds(
    input.manifest,
    requestedServiceIds,
  )
  const prerequisiteIds = new Set<string>()
  const dependencyServices = []
  for (const serviceId of dependencyServiceIds) {
    const service = getDeployableService(input.manifest, serviceId)
    if (input.lane !== "preview" || service.cloneToPreview) {
      dependencyServices.push(service)
    }
  }
  let targetByServiceId: Map<string, ResolveTargetsResponse["services"][number]>
  try {
    const targetsResponse = await executeResolveTargetsPayload({
      apiToken: input.apiToken,
      baseUrl: input.baseUrl,
      dryRun: false,
      payload: {
        environment_name: input.environmentName,
        lane: input.lane,
        project_slug: input.projectSlug,
        services: dependencyServices.map((service) => ({
          service_id: service.id,
          service_slug: service.serviceSlug,
        })),
      },
    })
    targetByServiceId = new Map(
      targetsResponse.services.map((service) => [service.service_id, service]),
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
      transientDowntimeServiceIds: [],
      transientServiceIds: [],
    }
  }

  return {
    plan: expandPlanWithServices({
      manifest: input.manifest,
      plan: input.plan,
      serviceIds: [...prerequisiteIds],
    }),
    transientDowntimeServiceIds: [...prerequisiteIds].filter(
      (serviceId) =>
        getDeployableService(input.manifest, serviceId).downtimeRisk,
    ),
    transientServiceIds: [...prerequisiteIds],
  }
}

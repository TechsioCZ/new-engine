import { z } from "zod"

export const laneSchema = z.enum(["preview", "main"])
export const localPhaseSchema = z.enum([
  "resources",
  "backend",
  "frontend",
  "operator",
])

const defaultCiConfig = {
  affected_path_globs: [],
  deployable: false,
  enabled_by_default: true,
  prepare: {
    preview_db: false,
  },
}

const prepareSchema = z
  .object({
    preview_db: z.boolean().optional().default(false),
  })
  .default(defaultCiConfig.prepare)

const zaneServiceSchema = z.looseObject({
  clone_to_preview: z.boolean().optional().default(true),
  deploy_lanes: z.array(laneSchema).default([]),
  deploy_stage: z.number().int().optional().default(100),
  downtime_risk: z.boolean().optional().default(false),
  service_dependencies: z.array(z.string().min(1)).optional().default([]),
  service_slug: z.string().min(1),
})

const localConfigSchema = z.looseObject({
  enabled_by_default: z.boolean().optional().default(true),
  phase: localPhaseSchema,
  wait_healthy: z.boolean().optional().default(true),
})

const globalRuntimeRuleSchema = z.looseObject({
  path_globs: z.array(z.string().min(1)).default([]),
  service_ids: z.array(z.string().min(1)).default([]),
})

const serviceSchema = z.looseObject({
  ci: z
    .looseObject({
      affected_path_globs: z.array(z.string().min(1)).optional().default([]),
      deployable: z.boolean().optional().default(false),
      enabled_by_default: z.boolean().optional().default(true),
      prepare: prepareSchema.optional().default(defaultCiConfig.prepare),
      zane: zaneServiceSchema.optional(),
    })
    .optional()
    .default(defaultCiConfig),
  compose_service: z.string().min(1).optional(),
  id: z.string().min(1),
  kind: z.string().min(1).optional(),
  local: localConfigSchema.optional(),
  nx_projects: z.array(z.string().min(1)).default([]),
})

export const stackManifestSchema = z.object({
  ci: z
    .object({
      global_runtime_rules: z.array(globalRuntimeRuleSchema).default([]),
      ignore_path_globs: z.array(z.string().min(1)).default([]),
    })
    .default({
      global_runtime_rules: [],
      ignore_path_globs: [],
    }),
  services: z.array(serviceSchema),
})

export type Lane = z.infer<typeof laneSchema>
export type LocalPhase = z.infer<typeof localPhaseSchema>
export type StackManifest = z.infer<typeof stackManifestSchema>
export interface DeployableService {
  id: string
  serviceSlug: string
  enabledByDefault: boolean
  cloneToPreview: boolean
  deployLanes: Lane[]
  deployStage: number
  downtimeRisk: boolean
  serviceDependencies: string[]
}
export interface GlobalRuntimeRule {
  pathGlobs: string[]
  serviceIds: string[]
}

const buildDeployableService = (
  service: StackManifest["services"][number],
): DeployableService => {
  const { zane } = service.ci
  if (!zane) {
    throw new Error(`Service is missing Zane metadata: ${service.id}`)
  }

  return {
    cloneToPreview: zane.clone_to_preview,
    deployLanes: zane.deploy_lanes,
    deployStage: zane.deploy_stage,
    downtimeRisk: zane.downtime_risk,
    enabledByDefault: service.ci.enabled_by_default,
    id: service.id,
    serviceDependencies: zane.service_dependencies,
    serviceSlug: zane.service_slug,
  }
}

const toDeployableService = (
  service: StackManifest["services"][number],
): DeployableService => {
  if (!service.ci.deployable || !service.ci.zane) {
    throw new Error(
      `Service is not deployable or missing Zane metadata: ${service.id}`,
    )
  }

  return buildDeployableService(service)
}

export const listDeployableServices = (
  manifest: StackManifest,
): DeployableService[] =>
  manifest.services.flatMap((service) =>
    service.ci.deployable && service.ci.zane
      ? [toDeployableService(service)]
      : [],
  )

export const getDeployableService = (
  manifest: StackManifest,
  serviceId: string,
): DeployableService => {
  const service = manifest.services.find(
    (candidate) => candidate.id === serviceId,
  )
  if (!service) {
    throw new Error(
      `Service is not deployable or missing Zane metadata: ${serviceId}`,
    )
  }

  return toDeployableService(service)
}

export const getZaneService = (
  manifest: StackManifest,
  serviceId: string,
): DeployableService => {
  const service = manifest.services.find(
    (candidate) => candidate.id === serviceId,
  )
  if (!service?.ci.zane) {
    throw new Error(`Service is missing Zane metadata: ${serviceId}`)
  }

  return buildDeployableService(service)
}

export const listComposeServicesForPhase = (
  manifest: StackManifest,
  phase: LocalPhase,
  defaultOnly: boolean,
): string[] =>
  manifest.services.flatMap((service) => {
    if (
      service.compose_service === undefined ||
      service.compose_service === "" ||
      !service.local
    ) {
      return []
    }

    if (service.local.phase !== phase) {
      return []
    }

    if (defaultOnly && !service.local.enabled_by_default) {
      return []
    }

    return [service.compose_service]
  })

export const listPrepareServiceIds = (
  manifest: StackManifest,
  requirement: "preview_db",
): string[] =>
  manifest.services.flatMap((service) =>
    service.ci.prepare[requirement] ? [service.id] : [],
  )

export const listLaneServiceIds = (
  manifest: StackManifest,
  lane: Lane,
  defaultOnly = false,
): string[] => {
  const serviceIds: string[] = []
  for (const service of listDeployableServices(manifest)) {
    const enabled = !defaultOnly || service.enabledByDefault
    const availableOnLane = service.deployLanes.includes(lane)
    const availableInPreview = lane !== "preview" || service.cloneToPreview
    if (enabled && availableOnLane && availableInPreview) {
      serviceIds.push(service.id)
    }
  }
  return serviceIds
}

export const listDowntimeRiskServiceIds = (
  manifest: StackManifest,
  lane: Lane,
): string[] => {
  const serviceIds: string[] = []
  for (const service of listDeployableServices(manifest)) {
    if (service.deployLanes.includes(lane) && service.downtimeRisk) {
      serviceIds.push(service.id)
    }
  }
  return serviceIds
}

export const getIgnorePathGlobs = (manifest: StackManifest): string[] =>
  manifest.ci.ignore_path_globs

export const getGlobalRuntimeRules = (
  manifest: StackManifest,
): GlobalRuntimeRule[] =>
  manifest.ci.global_runtime_rules.map((rule) => ({
    pathGlobs: rule.path_globs,
    serviceIds: rule.service_ids,
  }))

import { z } from "zod"

export const laneSchema = z.enum(["preview", "main"])
export const localPhaseSchema = z.enum([
  "resources",
  "backend",
  "frontend",
  "operator",
])

const defaultConsumes = {
  preview_db: false,
  meili_frontend_key: false,
  meili_backend_key: false,
}

const defaultCiConfig = {
  deployable: false,
  affected_path_globs: [],
  prepare: {
    preview_db: false,
    meili_keys: false,
  },
}

const consumesSchema = z
  .object({
    preview_db: z.boolean().optional().default(false),
    meili_frontend_key: z.boolean().optional().default(false),
    meili_backend_key: z.boolean().optional().default(false),
  })
  .default(defaultConsumes)

const prepareSchema = z
  .object({
    preview_db: z.boolean().optional().default(false),
    meili_keys: z.boolean().optional().default(false),
  })
  .default(defaultCiConfig.prepare)

const zaneServiceSchema = z.looseObject({
  service_slug: z.string().min(1),
  clone_to_preview: z.boolean().optional().default(true),
  deploy_lanes: z.array(laneSchema).default([]),
  deploy_stage: z.number().int().optional().default(100),
  downtime_risk: z.boolean().optional().default(false),
  consumes: consumesSchema.optional().default(defaultConsumes),
  service_dependencies: z.array(z.string().min(1)).optional().default([]),
})

const localConfigSchema = z.looseObject({
  phase: localPhaseSchema,
  enabled_by_default: z.boolean().optional().default(true),
  wait_healthy: z.boolean().optional().default(true),
})

const globalRuntimeRuleSchema = z.looseObject({
  path_globs: z.array(z.string().min(1)).default([]),
  service_ids: z.array(z.string().min(1)).default([]),
})

const serviceSchema = z.looseObject({
  id: z.string().min(1),
  compose_service: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  nx_projects: z.array(z.string().min(1)).default([]),
  local: localConfigSchema.optional(),
  ci: z
    .looseObject({
      deployable: z.boolean().optional().default(false),
      affected_path_globs: z.array(z.string().min(1)).optional().default([]),
      prepare: prepareSchema.optional().default(defaultCiConfig.prepare),
      zane: zaneServiceSchema.optional(),
    })
    .optional()
    .default(defaultCiConfig),
})

export const stackManifestSchema = z.object({
  ci: z
    .object({
      ignore_path_globs: z.array(z.string().min(1)).default([]),
      global_runtime_rules: z.array(globalRuntimeRuleSchema).default([]),
    })
    .default({
      ignore_path_globs: [],
      global_runtime_rules: [],
    }),
  services: z.array(serviceSchema),
})

export type Lane = z.infer<typeof laneSchema>
export type LocalPhase = z.infer<typeof localPhaseSchema>
export type StackManifest = z.infer<typeof stackManifestSchema>
export type DeployableService = {
  id: string
  serviceSlug: string
  cloneToPreview: boolean
  deployLanes: Lane[]
  deployStage: number
  downtimeRisk: boolean
  consumes: {
    preview_db: boolean
    meili_frontend_key: boolean
    meili_backend_key: boolean
  }
  serviceDependencies: string[]
}
export type GlobalRuntimeRule = {
  pathGlobs: string[]
  serviceIds: string[]
}

function toDeployableService(
  service: StackManifest["services"][number]
): DeployableService {
  if (service.ci.deployable !== true || !service.ci.zane) {
    throw new Error(
      `Service is not deployable or missing Zane metadata: ${service.id}`
    )
  }

  return {
    id: service.id,
    serviceSlug: service.ci.zane.service_slug,
    cloneToPreview: service.ci.zane.clone_to_preview,
    deployLanes: service.ci.zane.deploy_lanes,
    deployStage: service.ci.zane.deploy_stage,
    downtimeRisk: service.ci.zane.downtime_risk,
    consumes: {
      preview_db: service.ci.zane.consumes.preview_db,
      meili_frontend_key: service.ci.zane.consumes.meili_frontend_key,
      meili_backend_key: service.ci.zane.consumes.meili_backend_key,
    },
    serviceDependencies: service.ci.zane.service_dependencies,
  }
}

export function listDeployableServices(
  manifest: StackManifest
): DeployableService[] {
  return manifest.services.flatMap((service) =>
    service.ci.deployable === true && service.ci.zane
      ? [toDeployableService(service)]
      : []
  )
}

export function getDeployableService(
  manifest: StackManifest,
  serviceId: string
): DeployableService {
  const service = manifest.services.find(
    (candidate) => candidate.id === serviceId
  )
  if (!service) {
    throw new Error(
      `Service is not deployable or missing Zane metadata: ${serviceId}`
    )
  }

  return toDeployableService(service)
}

export function listComposeServicesForPhase(
  manifest: StackManifest,
  phase: LocalPhase,
  defaultOnly: boolean
): string[] {
  return manifest.services.flatMap((service) => {
    if (!(service.compose_service && service.local)) {
      return []
    }

    if (service.local.phase !== phase) {
      return []
    }

    if (defaultOnly && service.local.enabled_by_default !== true) {
      return []
    }

    return [service.compose_service]
  })
}

export function listPrepareServiceIds(
  manifest: StackManifest,
  requirement: "preview_db" | "meili_keys"
): string[] {
  return manifest.services.flatMap((service) =>
    service.ci.prepare[requirement] === true ? [service.id] : []
  )
}

export function listLaneServiceIds(
  manifest: StackManifest,
  lane: Lane
): string[] {
  return listDeployableServices(manifest)
    .filter((service) => service.deployLanes.includes(lane))
    .map((service) => service.id)
}

export function listDowntimeRiskServiceIds(
  manifest: StackManifest,
  lane: Lane
): string[] {
  return listDeployableServices(manifest)
    .filter(
      (service) =>
        service.deployLanes.includes(lane) && service.downtimeRisk === true
    )
    .map((service) => service.id)
}

export function getIgnorePathGlobs(manifest: StackManifest): string[] {
  return manifest.ci.ignore_path_globs
}

export function getGlobalRuntimeRules(
  manifest: StackManifest
): GlobalRuntimeRule[] {
  return manifest.ci.global_runtime_rules.map((rule) => ({
    pathGlobs: rule.path_globs,
    serviceIds: rule.service_ids,
  }))
}

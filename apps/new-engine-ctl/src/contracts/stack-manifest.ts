import { z } from "zod"

export const laneSchema = z.enum(["preview", "main"])

const defaultConsumes = {
  preview_db: false,
  meili_frontend_key: false,
  meili_backend_key: false,
}

const defaultCiConfig = {
  deployable: false,
}

const consumesSchema = z
  .object({
    preview_db: z.boolean().optional().default(false),
    meili_frontend_key: z.boolean().optional().default(false),
    meili_backend_key: z.boolean().optional().default(false),
  })
  .default(defaultConsumes)

const zaneServiceSchema = z.looseObject({
  service_slug: z.string().min(1),
  clone_to_preview: z.boolean().optional().default(true),
  deploy_lanes: z.array(laneSchema).default([]),
  deploy_stage: z.number().int().optional().default(100),
  downtime_risk: z.boolean().optional().default(false),
  consumes: consumesSchema.optional().default(defaultConsumes),
  coupled_service_ids: z.array(z.string().min(1)).optional().default([]),
})

const serviceSchema = z.looseObject({
  id: z.string().min(1),
  ci: z
    .looseObject({
      deployable: z.boolean().optional().default(false),
      zane: zaneServiceSchema.optional(),
    })
    .optional()
    .default(defaultCiConfig),
})

export const stackManifestSchema = z.object({
  services: z.array(serviceSchema),
})

export type Lane = z.infer<typeof laneSchema>
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
  coupledServiceIds: string[]
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
    coupledServiceIds: service.ci.zane.coupled_service_ids,
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

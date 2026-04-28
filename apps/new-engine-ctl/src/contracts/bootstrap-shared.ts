import { z } from "zod"

export const bootstrapInspectEnvVarSchema = z.looseObject({
  key: z.string().min(1),
  value: z.string(),
})

export const bootstrapInspectUrlSchema = z.looseObject({
  id: z.string().min(1).optional(),
  domain: z.string().min(1),
  base_path: z.string().min(1),
  strip_prefix: z.boolean().optional(),
  redirect_to: z.string().nullable().optional(),
  associated_port: z.number().int().nullable().optional(),
})

export const bootstrapInspectVolumeSchema = z.looseObject({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  container_path: z.string().min(1),
  host_path: z.string().nullable().optional(),
  mode: z.string().min(1),
})

export const bootstrapInspectHealthcheckSchema = z.looseObject({
  type: z.string().min(1),
  value: z.string().min(1),
  timeout_seconds: z.number().int().positive(),
  interval_seconds: z.number().int().positive(),
  associated_port: z.number().int().positive().nullable().optional(),
})

export const bootstrapInspectResourceLimitsSchema = z.looseObject({
  cpus: z.union([z.number(), z.string()]).nullable().optional(),
  memory: z
    .looseObject({
      unit: z.string().optional(),
      value: z.union([z.number(), z.string()]).optional(),
    })
    .nullable()
    .optional(),
})

export const bootstrapInspectServiceDetailsSchema = z.looseObject({
  id: z.string().min(1),
  slug: z.string().min(1),
  type: z.string().min(1),
  network_alias: z.string().nullable().optional(),
  global_network_alias: z.string().nullable().optional(),
  repository_url: z.string().nullable().optional(),
  branch_name: z.string().nullable().optional(),
  dockerfile_builder_options: z
    .looseObject({
      dockerfile_path: z.string().nullable().optional(),
      build_context_dir: z.string().nullable().optional(),
      build_stage_target: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  git_app: z
    .looseObject({
      id: z.string().min(1),
    })
    .nullable()
    .optional(),
  command: z.string().nullable().optional(),
  env_variables: z.array(bootstrapInspectEnvVarSchema).default([]),
  urls: z.array(bootstrapInspectUrlSchema).default([]),
  volumes: z.array(bootstrapInspectVolumeSchema).default([]),
  healthcheck: bootstrapInspectHealthcheckSchema.nullable().optional(),
  resource_limits: bootstrapInspectResourceLimitsSchema.nullable().optional(),
  unapplied_changes: z
    .array(
      z.looseObject({
        id: z.string().min(1),
        field: z.string().optional(),
      })
    )
    .default([]),
})

export const bootstrapInspectSettingsSchema = z.looseObject({
  root_domain: z.string().nullable().optional(),
  app_domain: z.string().nullable().optional(),
})

export const bootstrapPlanStatusSchema = z.enum(["ready", "blocked"])

export const bootstrapPlanSourceSummarySchema = z.looseObject({
  key: z.string().min(1).optional(),
  env_var: z.string().min(1).optional(),
  source_kind: z.string().min(1),
  source_service_slug: z.string().nullable().optional(),
})

export type BootstrapInspectServiceDetails = z.infer<
  typeof bootstrapInspectServiceDetailsSchema
>

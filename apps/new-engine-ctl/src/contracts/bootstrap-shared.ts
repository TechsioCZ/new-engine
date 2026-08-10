import { z } from "zod"

const bootstrapInspectEnvVarSchema = z.looseObject({
  key: z.string().min(1),
  value: z.string(),
})

export const bootstrapInspectUrlSchema = z.looseObject({
  associated_port: z.number().int().nullable().optional(),
  base_path: z.string().min(1),
  domain: z.string().min(1),
  id: z.string().min(1).optional(),
  redirect_to: z.string().nullable().optional(),
  strip_prefix: z.boolean().optional(),
})

const bootstrapInspectVolumeSchema = z.looseObject({
  container_path: z.string().min(1),
  host_path: z.string().nullable().optional(),
  id: z.string().min(1).optional(),
  mode: z.string().min(1),
  name: z.string().min(1),
})

export const bootstrapInspectHealthcheckSchema = z.looseObject({
  associated_port: z.number().int().positive().nullable().optional(),
  interval_seconds: z.number().int().positive(),
  timeout_seconds: z.number().int().positive(),
  type: z.string().min(1),
  value: z.string().min(1),
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
  branch_name: z.string().nullable().optional(),
  command: z.string().nullable().optional(),
  dockerfile_builder_options: z
    .looseObject({
      build_context_dir: z.string().nullable().optional(),
      build_stage_target: z.string().nullable().optional(),
      dockerfile_path: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  env_variables: z.array(bootstrapInspectEnvVarSchema).default([]),
  git_app: z
    .looseObject({
      id: z.string().min(1),
    })
    .nullable()
    .optional(),
  global_network_alias: z.string().nullable().optional(),
  healthcheck: bootstrapInspectHealthcheckSchema.nullable().optional(),
  id: z.string().min(1),
  network_alias: z.string().nullable().optional(),
  repository_url: z.string().nullable().optional(),
  resource_limits: bootstrapInspectResourceLimitsSchema.nullable().optional(),
  slug: z.string().min(1),
  type: z.string().min(1),
  unapplied_changes: z
    .array(
      z.looseObject({
        field: z.string().optional(),
        id: z.string().min(1),
      }),
    )
    .default([]),
  urls: z.array(bootstrapInspectUrlSchema).default([]),
  volumes: z.array(bootstrapInspectVolumeSchema).default([]),
})

export const bootstrapInspectSettingsSchema = z.looseObject({
  app_domain: z.string().nullable().optional(),
  root_domain: z.string().nullable().optional(),
})

export const bootstrapPlanStatusSchema = z.enum(["ready", "blocked"])

export const bootstrapPlanSourceSummarySchema = z.looseObject({
  env_var: z.string().min(1).optional(),
  key: z.string().min(1).optional(),
  source_kind: z.string().min(1),
  source_service_slug: z.string().nullable().optional(),
})

export type BootstrapInspectServiceDetails = z.infer<
  typeof bootstrapInspectServiceDetailsSchema
>

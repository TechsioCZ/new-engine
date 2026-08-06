import { z } from "zod"

import {
  bootstrapInspectHealthcheckSchema,
  bootstrapInspectResourceLimitsSchema,
  bootstrapInspectServiceDetailsSchema,
  bootstrapInspectSettingsSchema,
  bootstrapInspectUrlSchema,
  bootstrapPlanSourceSummarySchema,
  bootstrapPlanStatusSchema,
} from "./bootstrap-shared.js"

export const bootstrapZaneProjectInspectResponseSchema = z.object({
  environment_exists: z.boolean(),
  environment_name: z.string().min(1),
  project_exists: z.boolean(),
  project_slug: z.string().min(1),
  services: z.array(
    z.looseObject({
      details: bootstrapInspectServiceDetailsSchema.nullable(),
      exists: z.boolean(),
      service_slug: z.string().min(1),
    }),
  ),
  settings: bootstrapInspectSettingsSchema,
  shared_variables: z
    .array(
      z.looseObject({
        key: z.string().min(1),
        value: z.string(),
      }),
    )
    .default([]),
})

export const bootstrapZaneProjectPlanCommandInputSchema = z.object({
  adminCorsOverride: z.string().min(1).optional(),
  authCorsOverride: z.string().min(1).optional(),
  branchName: z.string().min(1).optional(),
  environmentName: z.string().min(1),
  gitAppId: z.string().min(1).optional(),
  inspectJsonPath: z.string().min(1),
  minioFileUrlOverride: z.string().min(1).optional(),
  operatorUpstreamZaneBaseUrl: z.string().min(1).optional(),
  operatorUpstreamZaneConnectBaseUrl: z.string().min(1).optional(),
  operatorUpstreamZaneConnectHostHeader: z.string().min(1).optional(),
  operatorUpstreamZanePassword: z.string().min(1).optional(),
  operatorUpstreamZaneUsername: z.string().min(1).optional(),
  phase: z.enum(["services", "env", "all"]).default("all"),
  projectDescription: z.string().min(1),
  projectSlug: z.string().min(1, "Zane project slug is required."),
  publicDomain: z.string().min(1).optional(),
  publicUrlAffix: z.string().min(1).default("-zane"),
  repositoryUrl: z.string().min(1).optional(),
  stackInputsPath: z.string().min(1),
  stackManifestPath: z.string().min(1),
  storeCorsOverride: z.string().min(1).optional(),
})

export const bootstrapZaneProjectPlanResponseSchema = z.object({
  blocking_reasons: z.array(z.string()).default([]),
  branch_name: z.string().min(1),
  ensure_project: z.boolean(),
  environment_exists: z.boolean(),
  environment_name: z.string().min(1),
  git_app_id: z.string().nullable(),
  operator_upstream: z.object({
    base_url: z.string().nullable(),
    connect_base_url: z.string().nullable(),
    connect_host_header: z.string().nullable(),
  }),
  phase: z.enum(["services", "env", "all"]),
  project_description: z.string().min(1),
  project_exists: z.boolean(),
  project_slug: z.string().min(1),
  public_domain: z.string().nullable(),
  public_url_affix: z.string().min(1),
  repository_url: z.string().min(1),
  services: z.array(
    z.object({
      build_context_dir: z.string().min(1),
      cleanup_env_keys: z.array(z.string()).default([]),
      create_service: z.boolean(),
      desired_builder: z.object({
        build_context_dir: z.string().min(1),
        dockerfile_path: z.string().min(1),
      }),
      desired_command: z.string().nullable(),
      desired_env: z.record(z.string(), z.string()),
      desired_git_source: z.object({
        branch_name: z.string().min(1),
        git_app_id: z.string().nullable(),
        repository_url: z.string().min(1),
      }),
      desired_healthcheck: bootstrapInspectHealthcheckSchema.nullable(),
      desired_resource_limits: bootstrapInspectResourceLimitsSchema.nullable(),
      desired_urls: z.array(bootstrapInspectUrlSchema),
      desired_volumes: z.array(
        z.looseObject({
          container_path: z.string().min(1),
          host_path: z.string().nullable().optional(),
          mode: z.string().min(1),
          name: z.string().min(1),
        }),
      ),
      dockerfile_path: z.string().min(1),
      env_keys: z.array(z.string()).default([]),
      env_sources: z.array(bootstrapPlanSourceSummarySchema).default([]),
      exists: z.boolean(),
      has_command: z.boolean(),
      healthcheck: z
        .object({
          type: z.string().nullable(),
          value: z.string().nullable(),
        })
        .nullable(),
      managed_public_domains: z.array(z.string()).default([]),
      resource_limits: z.object({
        cpus: z.number().nullable(),
        memory_mb: z.number().nullable(),
      }),
      service_id: z.string().min(1),
      service_slug: z.string().min(1),
      service_type: z.string().nullable(),
      volume_names: z.array(z.string()).default([]),
    }),
  ),
  settings: bootstrapInspectSettingsSchema,
  shared_env: z.record(z.string(), z.string()),
  shared_env_cleanup_keys: z.array(z.string()).default([]),
  shared_env_variables: z.array(bootstrapPlanSourceSummarySchema).default([]),
  status: bootstrapPlanStatusSchema,
  warnings: z.array(z.string()).default([]),
})

export type BootstrapZaneProjectPlanCommandInput = z.infer<
  typeof bootstrapZaneProjectPlanCommandInputSchema
>

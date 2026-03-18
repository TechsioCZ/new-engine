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
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  project_exists: z.boolean(),
  environment_exists: z.boolean(),
  settings: bootstrapInspectSettingsSchema,
  shared_variables: z
    .array(
      z.looseObject({
        key: z.string().min(1),
        value: z.string(),
      })
    )
    .default([]),
  services: z.array(
    z.looseObject({
      service_slug: z.string().min(1),
      exists: z.boolean(),
      details: bootstrapInspectServiceDetailsSchema.nullable(),
    })
  ),
})

export const bootstrapZaneProjectPlanCommandInputSchema = z.object({
  projectSlug: z.string().min(1, "Zane project slug is required."),
  projectDescription: z.string().min(1),
  environmentName: z.string().min(1),
  inspectJsonPath: z.string().min(1),
  repositoryUrl: z.string().min(1).optional(),
  branchName: z.string().min(1).optional(),
  gitAppId: z.string().min(1).optional(),
  publicDomain: z.string().min(1).optional(),
  publicUrlAffix: z.string().min(1).default("-zane"),
  minioFileUrlOverride: z.string().min(1).optional(),
  storeCorsOverride: z.string().min(1).optional(),
  adminCorsOverride: z.string().min(1).optional(),
  authCorsOverride: z.string().min(1).optional(),
  operatorUpstreamZaneBaseUrl: z.string().min(1).optional(),
  operatorUpstreamZaneConnectBaseUrl: z.string().min(1).optional(),
  operatorUpstreamZaneConnectHostHeader: z.string().min(1).optional(),
  operatorUpstreamZaneUsername: z.string().min(1).optional(),
  operatorUpstreamZanePassword: z.string().min(1).optional(),
  stackManifestPath: z.string().min(1),
  phase: z.enum(["services", "env", "all"]).default("all"),
})

export const bootstrapZaneProjectPlanResponseSchema = z.object({
  project_slug: z.string().min(1),
  project_description: z.string().min(1),
  environment_name: z.string().min(1),
  phase: z.enum(["services", "env", "all"]),
  status: bootstrapPlanStatusSchema,
  blocking_reasons: z.array(z.string()).default([]),
  ensure_project: z.boolean(),
  project_exists: z.boolean(),
  environment_exists: z.boolean(),
  repository_url: z.string().min(1),
  branch_name: z.string().min(1),
  git_app_id: z.string().nullable(),
  public_domain: z.string().nullable(),
  public_url_affix: z.string().min(1),
  settings: bootstrapInspectSettingsSchema,
  operator_upstream: z.object({
    base_url: z.string().nullable(),
    connect_base_url: z.string().nullable(),
    connect_host_header: z.string().nullable(),
  }),
  services: z.array(
    z.object({
      service_id: z.string().min(1),
      service_slug: z.string().min(1),
      exists: z.boolean(),
      service_type: z.string().nullable(),
      create_service: z.boolean(),
      dockerfile_path: z.string().min(1),
      build_context_dir: z.string().min(1),
      has_command: z.boolean(),
      volume_names: z.array(z.string()).default([]),
      managed_public_domains: z.array(z.string()).default([]),
      env_keys: z.array(z.string()).default([]),
      env_sources: z.array(bootstrapPlanSourceSummarySchema).default([]),
      cleanup_env_keys: z.array(z.string()).default([]),
      desired_git_source: z.object({
        repository_url: z.string().min(1),
        branch_name: z.string().min(1),
        git_app_id: z.string().nullable(),
      }),
      desired_builder: z.object({
        dockerfile_path: z.string().min(1),
        build_context_dir: z.string().min(1),
      }),
      desired_command: z.string().nullable(),
      desired_volumes: z.array(
        z.looseObject({
          name: z.string().min(1),
          container_path: z.string().min(1),
          host_path: z.string().nullable().optional(),
          mode: z.string().min(1),
        })
      ),
      desired_urls: z.array(bootstrapInspectUrlSchema),
      desired_healthcheck: bootstrapInspectHealthcheckSchema.nullable(),
      desired_resource_limits: bootstrapInspectResourceLimitsSchema.nullable(),
      desired_env: z.record(z.string(), z.string()),
      healthcheck: z
        .object({
          type: z.string().nullable(),
          value: z.string().nullable(),
        })
        .nullable(),
      resource_limits: z.object({
        cpus: z.number().nullable(),
        memory_mb: z.number().nullable(),
      }),
    })
  ),
  shared_env_variables: z.array(bootstrapPlanSourceSummarySchema).default([]),
  shared_env: z.record(z.string(), z.string()),
  shared_env_cleanup_keys: z.array(z.string()).default([]),
})

export type BootstrapZaneProjectInspectResponse = z.infer<
  typeof bootstrapZaneProjectInspectResponseSchema
>
export type BootstrapZaneProjectPlanCommandInput = z.infer<
  typeof bootstrapZaneProjectPlanCommandInputSchema
>
export type BootstrapZaneProjectPlanResponse = z.infer<
  typeof bootstrapZaneProjectPlanResponseSchema
>

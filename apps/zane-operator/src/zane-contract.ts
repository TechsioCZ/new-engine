import { z } from "zod"

export type Lane = "preview" | "main"
export type ServiceType = "docker" | "git"

export interface ResolveEnvironmentInput {
  lane: Lane
  projectSlug: string
  environmentName: string
  sourceEnvironmentName: string
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
  serviceSpecs: ZaneServiceReconciliationSpec[]
}

export interface ZaneServiceReconciliationSpec {
  service_id: string
  service_slug: string
  git_source?: {
    sync_from_source: boolean
    branch_name?: string
    commit_sha?: string
  }
  builder?: {
    sync_from_source: boolean
    build_stage_target?: string | null
  }
  healthcheck?: {
    sync_from_source: boolean
  }
  resource_limits?: {
    sync_from_source: boolean
  }
}

export interface ArchiveEnvironmentInput {
  projectSlug: string
  environmentName: string
}

export interface ReadPreviewCommitStateInput {
  projectSlug: string
  environmentName: string
}

export interface WritePreviewCommitStateInput {
  projectSlug: string
  environmentName: string
  targetCommitSha?: string
  lastDeployedCommitSha?: string
  baselineComplete?: boolean
}

interface PreviewRandomOnceSecretValueInput {
  secretId: string
  value?: string
  persistTo?: string
  persistedEnvVar?: string
  targets: {
    serviceSlug: string
    envVar: string
  }[]
}

export interface SyncPreviewRandomOnceSecretsInput {
  projectSlug: string
  environmentName: string
  secrets: PreviewRandomOnceSecretValueInput[]
}

export interface SyncPreviewSharedEnvInput {
  projectSlug: string
  environmentName: string
  variables: {
    key: string
    source: PreviewRuntimeValueSourceInput
  }[]
}

type PreviewRuntimeValueSourceKind = keyof {
  literal: never
  service_network_alias: never
  service_global_network_alias: never
  service_public_origin: never
  service_internal_origin: never
  service_internal_bucket_url: never
}

export interface PreviewRuntimeValueSourceInput {
  kind: PreviewRuntimeValueSourceKind
  value?: string
  serviceSlug?: string
  sourceEnvironmentName?: string
  port?: number
  trailingSlash?: boolean
  bucketSharedEnvKey?: string
}

export interface SyncPreviewServiceEnvInput {
  projectSlug: string
  environmentName: string
  services: {
    service_id: string
    service_slug: string
    env: {
      env_var: string
      source: PreviewRuntimeValueSourceInput
    }[]
  }[]
}

interface MeiliApiCredentialsPolicy {
  uid: string
  description: string
  actions: string[]
  indexes: string[]
}

export interface ProvisionMeiliKeysOutputInput {
  envVar: string
  policy: MeiliApiCredentialsPolicy
}

export interface ProvisionMeiliKeysInput {
  projectSlug: string
  environmentName: string
  serviceSlug: string
  readinessPath: string
  backendOutput?: ProvisionMeiliKeysOutputInput
  frontendOutput?: ProvisionMeiliKeysOutputInput
}

export interface ProvisionMedusaPublishableKeyOutputInput {
  envVar: string
  policy: {
    title?: string
  }
}

export interface ProvisionMedusaPublishableKeyInput {
  projectSlug: string
  environmentName: string
  serviceSlug: string
  readinessPath: string
  frontendOutput: ProvisionMedusaPublishableKeyOutputInput
}

const nonEmptyTrimmedStringSchema = z.string().trim().min(1)

export const runtimeProviderOutputPolicyInputSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({
      actions: z.array(nonEmptyTrimmedStringSchema),
      description: nonEmptyTrimmedStringSchema,
      indexes: z.array(nonEmptyTrimmedStringSchema),
      kind: z.literal("meilisearch_key"),
      uid: nonEmptyTrimmedStringSchema,
    }),
    z.object({
      kind: z.literal("medusa_publishable_key"),
      title: nonEmptyTrimmedStringSchema.nullish(),
    }),
  ],
)

type RuntimeProviderOutputPolicyInput = z.infer<
  typeof runtimeProviderOutputPolicyInputSchema
>

export interface RuntimeProviderOutputInput {
  outputId: string
  envVar: string
  policy: RuntimeProviderOutputPolicyInput
}

export interface RuntimeProviderRunInput {
  projectSlug: string
  environmentName: string
  providerId: string
  serviceSlug: string
  readinessPath: string
  outputs: RuntimeProviderOutputInput[]
}

interface RuntimeProviderOutputResult {
  output_id: string
  env_var: string
  value: string
  created: boolean
  updated: boolean
}

export interface RuntimeProviderRunResult {
  project_slug: string
  environment_name: string
  provider_id: string
  service_slug: string
  source_url: string
  outputs: RuntimeProviderOutputResult[]
}

export interface ResolveTargetInput {
  // Stable repo/manifest service identity used across CI payloads.
  service_id: string
  // Upstream Zane service slug used to resolve the actual target.
  service_slug: string
}

export interface EnvOverrideInput {
  // Stable repo/manifest service identity used across CI payloads.
  service_id: string
  // Upstream Zane service slug used for diagnostics.
  service_slug: string
  env: Record<string, string>
}

export interface VerifyDeploymentRef {
  // Stable repo/manifest service identity used across CI payloads.
  service_id: string
  // Upstream Zane service slug associated with the deployment ref.
  service_slug: string
  deployment_hash: string
}

export interface PersistedEnvRequirement {
  service_id: string
  service_slug: string
  env_keys: string[]
}

interface SharedEnvRequirement {
  key: string
}

export interface ForbiddenEnvRequirement {
  service_id: string
  service_slug: string
  env_keys: string[]
}

export interface VerifyDeployInput {
  lane: Lane
  projectSlug: string
  environmentName: string
  requestedServiceIds: string[]
  deployServiceIds: string[]
  triggeredServiceIds: string[]
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
  expectedEnvOverrides: EnvOverrideInput[]
  requiredPersistedEnv: PersistedEnvRequirement[]
  requiredSharedEnv: SharedEnvRequirement[]
  forbiddenEnv: ForbiddenEnvRequirement[]
  deployments: VerifyDeploymentRef[]
}

export const zaneServiceTypeSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    switch (value.toUpperCase()) {
      case "DOCKER":
      case "DOCKER_REGISTRY": {
        return "docker"
      }
      case "GIT":
      case "GIT_REPOSITORY": {
        return "git"
      }
      default: {
        context.addIssue({
          code: "custom",
          message: "must be docker or git",
        })
        return z.NEVER
      }
    }
  })

const zaneEnvVariableSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
})

export type ZaneEnvVariable = z.infer<typeof zaneEnvVariableSchema>

const zaneEnvironmentSchema = z.object({
  id: nonEmptyTrimmedStringSchema,
  is_preview: z.boolean(),
  name: nonEmptyTrimmedStringSchema,
})

export const zaneEnvironmentWithVariablesSchema = zaneEnvironmentSchema.extend({
  variables: z.array(zaneEnvVariableSchema),
})

export type ZaneEnvironmentWithVariables = z.infer<
  typeof zaneEnvironmentWithVariablesSchema
>

export const zaneServiceCardSchema = z.object({
  id: nonEmptyTrimmedStringSchema,
  slug: nonEmptyTrimmedStringSchema,
  status: z.string().optional(),
  type: zaneServiceTypeSchema,
})

export type ZaneServiceCard = z.infer<typeof zaneServiceCardSchema>

const zaneServiceUrlSchema = z.object({
  associated_port: z.number().nullable().optional(),
  base_path: z.string(),
  domain: z.string(),
  id: z.string().optional(),
  redirect_to: z.string().nullable().optional(),
  strip_prefix: z.boolean().optional(),
})

export type ZaneServiceUrl = z.infer<typeof zaneServiceUrlSchema>

const zaneServiceVolumeSchema = z.object({
  container_path: z.string(),
  host_path: z.string().nullable().optional(),
  id: z.string().optional(),
  mode: z.string(),
  name: z.string(),
})

export type ZaneServiceVolume = z.infer<typeof zaneServiceVolumeSchema>

export const zaneServiceHealthcheckSchema = z.object({
  associated_port: z.number().nullable().optional(),
  interval_seconds: z.number(),
  timeout_seconds: z.number(),
  type: z.string(),
  value: z.string(),
})

export type ZaneServiceHealthcheck = z.infer<
  typeof zaneServiceHealthcheckSchema
>

export const zaneServiceResourceLimitsSchema = z.object({
  cpus: z.union([z.number(), z.string()]).nullable().optional(),
  memory: z
    .object({
      unit: z.string().optional(),
      value: z.union([z.number(), z.string()]).optional(),
    })
    .nullable()
    .optional(),
})

export type ZaneServiceResourceLimits = z.infer<
  typeof zaneServiceResourceLimitsSchema
>

const zaneUnappliedChangeValueSchema = z.object({
  associated_port: z.number().nullable().optional(),
  base_path: z.string().optional(),
  branch_name: z.string().nullable().optional(),
  build_context_dir: z.string().nullable().optional(),
  build_stage_target: z.string().nullable().optional(),
  builder: z.string().nullable().optional(),
  commit_sha: z.string().nullable().optional(),
  container_path: z.string().optional(),
  cpus: z.union([z.number(), z.string()]).nullable().optional(),
  dockerfile_path: z.string().nullable().optional(),
  domain: z.string().optional(),
  git_app_id: z.string().nullable().optional(),
  host_path: z.string().nullable().optional(),
  id: z.string().optional(),
  interval_seconds: z.number().optional(),
  key: z.string().optional(),
  memory: zaneServiceResourceLimitsSchema.shape.memory,
  mode: z.string().optional(),
  name: z.string().optional(),
  redirect_to: z.string().nullable().optional(),
  repository_url: z.string().nullable().optional(),
  strip_prefix: z.boolean().optional(),
  timeout_seconds: z.number().optional(),
  type: z.string().optional(),
  value: z.string().optional(),
})

export type ZaneUnappliedChangeValue = z.infer<
  typeof zaneUnappliedChangeValueSchema
>

const zaneUnappliedChangeSchema = z.object({
  field: z.string().optional(),
  id: z.string(),
  item_id: z.string().nullable().optional(),
  new_value: z.union([
    zaneUnappliedChangeValueSchema.nullable(),
    z.unknown().transform(() => null),
  ]),
  old_value: z.union([
    zaneUnappliedChangeValueSchema.nullable(),
    z.unknown().transform(() => null),
  ]),
  type: z.string().optional(),
})

export type ZaneUnappliedChange = z.infer<typeof zaneUnappliedChangeSchema>

const zaneEnvironmentReferenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  variables: z.array(zaneEnvVariableSchema).optional(),
})

const zaneGitAppRefSchema = z.object({ id: z.string() })

export const zaneServiceDetailsSchema = z.object({
  branch_name: z.string().optional(),
  builder: z.string().optional(),
  command: z.string().nullable().optional(),
  commit_sha: z.string().nullable().optional(),
  deploy_token: nonEmptyTrimmedStringSchema,
  dockerfile_builder_options: z
    .object({
      build_context_dir: z.string().nullable().optional(),
      build_stage_target: z.string().nullable().optional(),
      dockerfile_path: z.string().nullable().optional(),
    })
    .optional(),
  env_variables: z.union([
    z.array(zaneEnvVariableSchema),
    z.unknown().transform(() => []),
  ]),
  environment: zaneEnvironmentReferenceSchema.nullable().optional(),
  git_app: zaneGitAppRefSchema.nullable().optional(),
  global_network_alias: z.string().nullable().optional(),
  healthcheck: zaneServiceHealthcheckSchema.nullable().optional(),
  id: nonEmptyTrimmedStringSchema,
  network_alias: z.string().nullable().optional(),
  repository_url: z.string().optional(),
  resource_limits: zaneServiceResourceLimitsSchema.nullable().optional(),
  slug: nonEmptyTrimmedStringSchema,
  system_env_variables: z.array(zaneEnvVariableSchema).optional(),
  type: zaneServiceTypeSchema,
  unapplied_changes: z.array(zaneUnappliedChangeSchema).optional(),
  urls: z.union([
    z.array(zaneServiceUrlSchema),
    z.unknown().transform(() => []),
  ]),
  volumes: z.array(zaneServiceVolumeSchema).optional(),
})

export type ZaneServiceDetails = z.infer<typeof zaneServiceDetailsSchema>

export const zaneDeploymentSchema = z.object({
  commit_sha: z.string().nullable().optional(),
  hash: nonEmptyTrimmedStringSchema,
  is_current_production: z.boolean().optional(),
  service_snapshot: z
    .object({
      env_variables: z.array(zaneEnvVariableSchema).optional(),
    })
    .optional(),
  status: nonEmptyTrimmedStringSchema,
  status_reason: z.string().nullable().optional(),
})

export type ZaneDeployment = z.infer<typeof zaneDeploymentSchema>

export const zaneDeploymentListResponseSchema = z.object({
  results: z.array(zaneDeploymentSchema).optional(),
})

export type ZaneDeploymentListResponse = z.infer<
  typeof zaneDeploymentListResponseSchema
>

interface ZaneResolvedCurrentDeployment {
  deployment_hash: string
  status: string
  commit_sha: string | null
  env: Record<string, string>
}

export interface ZaneResolvedTarget {
  // Stable repo/manifest service identity used across CI payloads.
  service_id: string
  // Upstream Zane service slug used to resolve the actual target.
  service_slug: string
  service_type: ServiceType
  configured_commit_sha?: string | null
  deploy_token: string
  deploy_url: string
  env_change_url: string
  details_url: string
  has_unapplied_changes?: boolean
  current_production_deployment?: ZaneResolvedCurrentDeployment | null
  active_deployment?: ZaneResolvedCurrentDeployment | null
}

export interface TriggeredDeployment {
  service_id: string
  service_slug: string
  service_type: ServiceType
  deployment_hash: string
  status: string
}

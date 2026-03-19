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

export interface PreviewRandomOnceSecretValueInput {
  secretId: string
  value?: string
  persistTo?: string
  persistedEnvVar?: string
  targets: Array<{
    serviceSlug: string
    envVar: string
  }>
}

export interface SyncPreviewRandomOnceSecretsInput {
  projectSlug: string
  environmentName: string
  secrets: PreviewRandomOnceSecretValueInput[]
}

export interface SyncPreviewSharedEnvInput {
  projectSlug: string
  environmentName: string
  variables: Array<{
    key: string
    source: PreviewRuntimeValueSourceInput
  }>
}

export interface PreviewRuntimeValueSourceInput {
  kind:
    | "literal"
    | "service_network_alias"
    | "service_global_network_alias"
    | "service_public_origin"
    | "service_internal_origin"
    | "service_internal_bucket_url"
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
  services: Array<{
    service_id: string
    service_slug: string
    env: Array<{
      env_var: string
      source: PreviewRuntimeValueSourceInput
    }>
  }>
}

export interface MeiliApiCredentialsPolicy {
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
  backendOutput: ProvisionMeiliKeysOutputInput
  frontendOutput: ProvisionMeiliKeysOutputInput
}

export type RuntimeProviderOutputPolicyInput = Record<string, unknown> & {
  kind: string
}

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

export interface RuntimeProviderOutputResult {
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

export interface SharedEnvRequirement {
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

export interface ZaneEnvironment {
  id: string
  is_preview: boolean
  name: string
}

export interface ZaneServiceCard {
  id: string
  slug: string
  type: ServiceType
  status?: string
}

export interface ZaneEnvVariable {
  id: string
  key: string
  value: string
}

export interface ZaneEnvironmentReference {
  id: string
  name: string
  variables?: ZaneEnvVariable[]
}

export interface ZaneServiceUrl {
  id?: string
  domain: string
  base_path: string
  strip_prefix?: boolean
  redirect_to?: string | null
  associated_port?: number | null
}

export interface ZaneGitAppRef {
  id: string
}

export interface ZaneServiceVolume {
  id?: string
  name: string
  container_path: string
  host_path?: string | null
  mode: string
}

export interface ZaneServiceHealthcheck {
  type: string
  value: string
  timeout_seconds: number
  interval_seconds: number
  associated_port?: number | null
}

export interface ZaneServiceResourceLimits {
  cpus?: number | string | null
  memory?: {
    unit?: string
    value?: number | string
  } | null
}

export interface ZaneServiceDetails {
  id: string
  slug: string
  type: ServiceType
  network_alias?: string | null
  global_network_alias?: string | null
  commit_sha?: string | null
  deploy_token: string
  repository_url?: string
  branch_name?: string
  builder?: string
  dockerfile_builder_options?: {
    dockerfile_path?: string | null
    build_context_dir?: string | null
    build_stage_target?: string | null
  }
  git_app?: ZaneGitAppRef | null
  command?: string | null
  env_variables: ZaneEnvVariable[]
  system_env_variables?: ZaneEnvVariable[]
  environment?: ZaneEnvironmentReference | null
  urls: ZaneServiceUrl[]
  volumes?: ZaneServiceVolume[]
  healthcheck?: ZaneServiceHealthcheck | null
  resource_limits?: ZaneServiceResourceLimits | null
  unapplied_changes?: Array<{
    id: string
    type?: "ADD" | "UPDATE" | "DELETE" | string
    field?: string
    item_id?: string | null
    new_value?: Record<string, unknown> | null
    old_value?: Record<string, unknown> | null
  }>
}

export interface ZaneResolvedCurrentDeployment {
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

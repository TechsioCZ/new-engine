export type Lane = "preview" | "main"
export type ServiceType = "docker" | "git"

export interface ResolveEnvironmentInput {
  lane: Lane
  projectSlug: string
  environmentName: string
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
}

export interface ArchiveEnvironmentInput {
  projectSlug: string
  environmentName: string
}

export interface ProvisionPreviewMeiliKeysInput {
  projectSlug: string
  environmentName: string
  serviceSlug: string
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

export interface VerifyDeployInput {
  lane: Lane
  projectSlug: string
  environmentName: string
  requestedServiceIds: string[]
  deployServiceIds: string[]
  triggeredServiceIds: string[]
  expectedEnvOverrides: EnvOverrideInput[]
  requiredPersistedEnv: PersistedEnvRequirement[]
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

export interface ZaneServiceUrl {
  id: string
  domain: string
  base_path: string
}

export interface ZaneServiceDetails {
  id: string
  slug: string
  type: ServiceType
  commit_sha?: string | null
  deploy_token: string
  env_variables: ZaneEnvVariable[]
  urls: ZaneServiceUrl[]
  unapplied_changes?: Array<{ id: string }>
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

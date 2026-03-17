import { BadRequestError } from "./db"
import type {
  ArchiveEnvironmentInput,
  EnvOverrideInput,
  ForbiddenEnvRequirement,
  Lane,
  ReadPreviewCommitStateInput,
  PersistedEnvRequirement,
  ProvisionPreviewMeiliKeysInput,
  ProvisionPreviewMeiliKeysOutputInput,
  ResolveEnvironmentInput,
  ResolveTargetInput,
  ServiceType,
  VerifyDeployInput,
  VerifyDeploymentRef,
  WritePreviewCommitStateInput,
  ZaneResolvedTarget,
} from "./zane-contract"

type JsonRecord = Record<string, unknown>

function assertObject(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestError(`${label} must be a JSON object`)
  }

  return value as JsonRecord
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new BadRequestError(`${label} must be a string`)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new BadRequestError(`${label} cannot be empty`)
  }

  return trimmed
}

function assertOptionalString(value: unknown, label: string): string | undefined {
  if (value == null) {
    return undefined
  }

  return assertString(value, label)
}

function assertLane(value: unknown, label: string): Lane {
  const lane = assertString(value, label)
  if (lane !== "preview" && lane !== "main") {
    throw new BadRequestError(`${label} must be preview or main`)
  }

  return lane
}

function assertServiceType(value: unknown, label: string): ServiceType {
  const rawServiceType = assertString(value, label)

  switch (rawServiceType.toUpperCase()) {
    case "DOCKER":
    case "DOCKER_REGISTRY":
      return "docker"
    case "GIT":
    case "GIT_REPOSITORY":
      return "git"
    default:
      throw new BadRequestError(`${label} must be docker or git`)
  }
}

function assertStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => assertString(item, `${label}[${index}]`))
}

function normalizeMeiliApiCredentialsOutput(
  value: unknown,
  label: string
): ProvisionPreviewMeiliKeysOutputInput {
  const object = assertObject(value, label)
  const policy = assertObject(object.policy, `${label}.policy`)

  return {
    envVar: assertString(object.env_var, `${label}.env_var`),
    policy: {
      uid: assertString(policy.uid, `${label}.policy.uid`),
      description: assertString(
        policy.description,
        `${label}.policy.description`
      ),
      actions: assertStringArray(policy.actions, `${label}.policy.actions`),
      indexes: assertStringArray(policy.indexes, `${label}.policy.indexes`),
    },
  }
}

function assertStringMap(value: unknown, label: string): Record<string, string> {
  const record = assertObject(value, label)
  const result: Record<string, string> = {}

  for (const [key, rawValue] of Object.entries(record)) {
    result[assertString(key, `${label} key`)] = assertString(rawValue, `${label}.${key}`)
  }

  return result
}

function normalizeProjectSlugFromPayload(payload: JsonRecord): string {
  return assertString(payload.project_slug, "project_slug")
}

function normalizeResolveTargets(value: unknown, label: string): ResolveTargetInput[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(object.service_id, `${label}[${index}].service_id`),
      service_slug: assertString(object.service_slug, `${label}[${index}].service_slug`),
    }
  })
}

function normalizeEnvOverrides(value: unknown, label: string): EnvOverrideInput[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(object.service_id, `${label}[${index}].service_id`),
      service_slug: assertString(object.service_slug, `${label}[${index}].service_slug`),
      env: assertStringMap(object.env, `${label}[${index}].env`),
    }
  })
}

function normalizeDeployments(value: unknown, label: string): VerifyDeploymentRef[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(object.service_id, `${label}[${index}].service_id`),
      service_slug: assertString(object.service_slug, `${label}[${index}].service_slug`),
      deployment_hash: assertString(object.deployment_hash, `${label}[${index}].deployment_hash`),
    }
  })
}

function normalizePersistedEnvRequirements(value: unknown, label: string): PersistedEnvRequirement[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(object.service_id, `${label}[${index}].service_id`),
      service_slug: assertString(object.service_slug, `${label}[${index}].service_slug`),
      env_keys: assertStringArray(object.env_keys, `${label}[${index}].env_keys`),
    }
  })
}

function normalizeForbiddenEnvRequirements(value: unknown, label: string): ForbiddenEnvRequirement[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(object.service_id, `${label}[${index}].service_id`),
      service_slug: assertString(object.service_slug, `${label}[${index}].service_slug`),
      env_keys: assertStringArray(object.env_keys, `${label}[${index}].env_keys`),
    }
  })
}

function parseResolvedTargets(value: unknown): ZaneResolvedTarget[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError("targets must be an array")
  }

  return value.map((item, index) => {
    const object = assertObject(item, `targets[${index}]`)
    return {
      service_id: assertString(object.service_id, `targets[${index}].service_id`),
      service_slug: assertString(object.service_slug, `targets[${index}].service_slug`),
      service_type: assertServiceType(object.service_type, `targets[${index}].service_type`),
      configured_commit_sha: assertOptionalString(
        object.configured_commit_sha,
        `targets[${index}].configured_commit_sha`,
      ),
      deploy_token: assertString(object.deploy_token, `targets[${index}].deploy_token`),
      deploy_url: assertString(object.deploy_url, `targets[${index}].deploy_url`),
      env_change_url: assertString(object.env_change_url, `targets[${index}].env_change_url`),
      details_url: assertString(object.details_url, `targets[${index}].details_url`),
    }
  })
}

export function parseResolveEnvironmentInput(rawPayload: unknown): ResolveEnvironmentInput {
  const payload = assertObject(rawPayload, "request body")
  return {
    lane: assertLane(payload.lane, "lane"),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    sourceEnvironmentName: assertString(
      payload.source_environment_name,
      "source_environment_name",
    ),
    expectedPreviewServiceSlugs: assertStringArray(
      payload.expected_preview_service_slugs ?? [],
      "expected_preview_service_slugs",
    ),
    excludedPreviewServiceSlugs: assertStringArray(
      payload.excluded_preview_service_slugs ?? [],
      "excluded_preview_service_slugs",
    ),
  }
}

export function parseArchiveEnvironmentInput(rawPayload: unknown): ArchiveEnvironmentInput {
  const payload = assertObject(rawPayload, "request body")
  return {
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
  }
}

export function parseReadPreviewCommitStateInput(
  rawPayload: unknown
): ReadPreviewCommitStateInput {
  const payload = assertObject(rawPayload, "request body")
  return {
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
  }
}

export function parseWritePreviewCommitStateInput(
  rawPayload: unknown
): WritePreviewCommitStateInput {
  const payload = assertObject(rawPayload, "request body")
  const targetCommitSha = assertOptionalString(
    payload.target_commit_sha,
    "target_commit_sha"
  )
  const lastDeployedCommitSha = assertOptionalString(
    payload.last_deployed_commit_sha,
    "last_deployed_commit_sha"
  )

  if (!(targetCommitSha || lastDeployedCommitSha)) {
    throw new BadRequestError(
      "target_commit_sha or last_deployed_commit_sha is required"
    )
  }

  return {
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    targetCommitSha,
    lastDeployedCommitSha,
  }
}

export function parseProvisionPreviewMeiliKeysInput(rawPayload: unknown): ProvisionPreviewMeiliKeysInput {
  const payload = assertObject(rawPayload, "request body")
  return {
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    serviceSlug: assertString(payload.service_slug, "service_slug"),
    readinessPath: assertString(payload.readiness_path, "readiness_path"),
    backendOutput: normalizeMeiliApiCredentialsOutput(
      payload.backend_output,
      "backend_output"
    ),
    frontendOutput: normalizeMeiliApiCredentialsOutput(
      payload.frontend_output,
      "frontend_output"
    ),
  }
}

export function parseResolveTargetsInput(rawPayload: unknown): {
  lane: Lane
  projectSlug: string
  environmentName: string
  services: ResolveTargetInput[]
} {
  const payload = assertObject(rawPayload, "request body")
  return {
    lane: assertLane(payload.lane, "lane"),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    services: normalizeResolveTargets(payload.services, "services"),
  }
}

export function parseApplyEnvOverridesInput(rawPayload: unknown): {
  projectSlug: string
  environmentName: string
  targets: ZaneResolvedTarget[]
  envOverrides: EnvOverrideInput[]
} {
  const payload = assertObject(rawPayload, "request body")
  return {
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    targets: parseResolvedTargets(payload.targets),
    envOverrides: normalizeEnvOverrides(payload.env_overrides, "env_overrides"),
  }
}

export function parseTriggerInput(rawPayload: unknown): {
  projectSlug: string
  environmentName: string
  targets: ZaneResolvedTarget[]
  gitCommitSha?: string
} {
  const payload = assertObject(rawPayload, "request body")
  return {
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    targets: parseResolvedTargets(payload.targets),
    gitCommitSha: assertOptionalString(payload.git_commit_sha, "git_commit_sha"),
  }
}

export function parseVerifyInput(rawPayload: unknown): VerifyDeployInput {
  const payload = assertObject(rawPayload, "request body")
  return {
    lane: assertLane(payload.lane, "lane"),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    requestedServiceIds: assertStringArray(payload.requested_service_ids, "requested_service_ids"),
    deployServiceIds: assertStringArray(payload.deploy_service_ids, "deploy_service_ids"),
    triggeredServiceIds: assertStringArray(payload.triggered_service_ids, "triggered_service_ids"),
    expectedPreviewServiceSlugs: assertStringArray(
      payload.expected_preview_service_slugs ?? [],
      "expected_preview_service_slugs"
    ),
    excludedPreviewServiceSlugs: assertStringArray(
      payload.excluded_preview_service_slugs ?? [],
      "excluded_preview_service_slugs"
    ),
    expectedEnvOverrides: normalizeEnvOverrides(payload.expected_env_overrides ?? [], "expected_env_overrides"),
    requiredPersistedEnv: normalizePersistedEnvRequirements(
      payload.required_persisted_env ?? [],
      "required_persisted_env",
    ),
    forbiddenEnv: normalizeForbiddenEnvRequirements(
      payload.forbidden_env ?? [],
      "forbidden_env",
    ),
    deployments: normalizeDeployments(payload.deployments, "deployments"),
  }
}

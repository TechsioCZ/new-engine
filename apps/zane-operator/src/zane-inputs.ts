import { BadRequestError } from "./db"
import type {
  ArchiveEnvironmentInput,
  EnvOverrideInput,
  ForbiddenEnvRequirement,
  Lane,
  PersistedEnvRequirement,
  ProvisionPreviewMeiliKeysInput,
  ProvisionPreviewMeiliKeysOutputInput,
  ReadPreviewCommitStateInput,
  ResolveEnvironmentInput,
  ResolveTargetInput,
  ServiceType,
  SyncPreviewRandomOnceSecretsInput,
  SyncPreviewServiceEnvInput,
  SyncPreviewSharedEnvInput,
  VerifyDeployInput,
  VerifyDeploymentRef,
  WritePreviewCommitStateInput,
  ZaneResolvedTarget,
  ZaneServiceReconciliationSpec,
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

function assertOptionalString(
  value: unknown,
  label: string
): string | undefined {
  if (value == null) {
    return
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

function assertStringMap(
  value: unknown,
  label: string
): Record<string, string> {
  const record = assertObject(value, label)
  const result: Record<string, string> = {}

  for (const [key, rawValue] of Object.entries(record)) {
    result[assertString(key, `${label} key`)] = assertString(
      rawValue,
      `${label}.${key}`
    )
  }

  return result
}

function normalizeProjectSlugFromPayload(payload: JsonRecord): string {
  return assertString(payload.project_slug, "project_slug")
}

function normalizeResolveTargets(
  value: unknown,
  label: string
): ResolveTargetInput[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(
        object.service_id,
        `${label}[${index}].service_id`
      ),
      service_slug: assertString(
        object.service_slug,
        `${label}[${index}].service_slug`
      ),
    }
  })
}

function normalizeEnvOverrides(
  value: unknown,
  label: string
): EnvOverrideInput[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(
        object.service_id,
        `${label}[${index}].service_id`
      ),
      service_slug: assertString(
        object.service_slug,
        `${label}[${index}].service_slug`
      ),
      env: assertStringMap(object.env, `${label}[${index}].env`),
    }
  })
}

function normalizeDeployments(
  value: unknown,
  label: string
): VerifyDeploymentRef[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(
        object.service_id,
        `${label}[${index}].service_id`
      ),
      service_slug: assertString(
        object.service_slug,
        `${label}[${index}].service_slug`
      ),
      deployment_hash: assertString(
        object.deployment_hash,
        `${label}[${index}].deployment_hash`
      ),
    }
  })
}

function normalizePersistedEnvRequirements(
  value: unknown,
  label: string
): PersistedEnvRequirement[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(
        object.service_id,
        `${label}[${index}].service_id`
      ),
      service_slug: assertString(
        object.service_slug,
        `${label}[${index}].service_slug`
      ),
      env_keys: assertStringArray(
        object.env_keys,
        `${label}[${index}].env_keys`
      ),
    }
  })
}

function normalizeSharedEnvRequirements(
  value: unknown,
  label: string
): Array<{ key: string }> {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      key: assertString(object.key, `${label}[${index}].key`),
    }
  })
}

function assertPreviewRuntimeValueSourceKind(
  value: unknown,
  label: string
):
  | "literal"
  | "service_network_alias"
  | "service_global_network_alias"
  | "service_public_origin"
  | "service_internal_origin"
  | "service_internal_bucket_url" {
  const normalized = assertString(value, label)

  if (
    normalized !== "literal" &&
    normalized !== "service_network_alias" &&
    normalized !== "service_global_network_alias" &&
    normalized !== "service_public_origin" &&
    normalized !== "service_internal_origin" &&
    normalized !== "service_internal_bucket_url"
  ) {
    throw new BadRequestError(
      `${label} has unsupported preview runtime source kind`
    )
  }

  return normalized
}

function parsePreviewRuntimeValueSource(rawValue: unknown, label: string) {
  const object = assertObject(rawValue, label)

  return {
    kind: assertPreviewRuntimeValueSourceKind(object.kind, `${label}.kind`),
    value: assertOptionalString(object.value, `${label}.value`),
    serviceSlug: assertOptionalString(
      object.service_slug,
      `${label}.service_slug`
    ),
    sourceEnvironmentName: assertOptionalString(
      object.source_environment_name,
      `${label}.source_environment_name`
    ),
    port:
      typeof object.port === "number" && Number.isInteger(object.port)
        ? object.port
        : undefined,
    trailingSlash:
      typeof object.trailing_slash === "boolean"
        ? object.trailing_slash
        : undefined,
    bucketSharedEnvKey: assertOptionalString(
      object.bucket_shared_env_key,
      `${label}.bucket_shared_env_key`
    ),
  }
}

function normalizeForbiddenEnvRequirements(
  value: unknown,
  label: string
): ForbiddenEnvRequirement[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(
        object.service_id,
        `${label}[${index}].service_id`
      ),
      service_slug: assertString(
        object.service_slug,
        `${label}[${index}].service_slug`
      ),
      env_keys: assertStringArray(
        object.env_keys,
        `${label}[${index}].env_keys`
      ),
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
      service_id: assertString(
        object.service_id,
        `targets[${index}].service_id`
      ),
      service_slug: assertString(
        object.service_slug,
        `targets[${index}].service_slug`
      ),
      service_type: assertServiceType(
        object.service_type,
        `targets[${index}].service_type`
      ),
      configured_commit_sha: assertOptionalString(
        object.configured_commit_sha,
        `targets[${index}].configured_commit_sha`
      ),
      deploy_token: assertString(
        object.deploy_token,
        `targets[${index}].deploy_token`
      ),
      deploy_url: assertString(
        object.deploy_url,
        `targets[${index}].deploy_url`
      ),
      env_change_url: assertString(
        object.env_change_url,
        `targets[${index}].env_change_url`
      ),
      details_url: assertString(
        object.details_url,
        `targets[${index}].details_url`
      ),
    }
  })
}

function parseServiceReconciliationSpecs(
  value: unknown,
  label: string
): ZaneServiceReconciliationSpec[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    const gitSource =
      object.git_source == null
        ? undefined
        : (() => {
            const gitSourceObject = assertObject(
              object.git_source,
              `${label}[${index}].git_source`
            )
            return {
              sync_from_source: gitSourceObject.sync_from_source === true,
              commit_sha:
                assertOptionalString(
                  gitSourceObject.commit_sha,
                  `${label}[${index}].git_source.commit_sha`
                ) ?? "HEAD",
            }
          })()
    const builder =
      object.builder == null
        ? undefined
        : (() => {
            const builderObject = assertObject(
              object.builder,
              `${label}[${index}].builder`
            )
            return {
              sync_from_source: builderObject.sync_from_source === true,
              build_stage_target:
                typeof builderObject.build_stage_target === "string"
                  ? assertString(
                      builderObject.build_stage_target,
                      `${label}[${index}].builder.build_stage_target`
                    )
                  : builderObject.build_stage_target === null
                    ? null
                    : undefined,
            }
          })()
    const healthcheck =
      object.healthcheck == null
        ? undefined
        : (() => {
            const healthcheckObject = assertObject(
              object.healthcheck,
              `${label}[${index}].healthcheck`
            )
            return {
              sync_from_source: healthcheckObject.sync_from_source === true,
            }
          })()
    const resourceLimits =
      object.resource_limits == null
        ? undefined
        : (() => {
            const resourceLimitsObject = assertObject(
              object.resource_limits,
              `${label}[${index}].resource_limits`
            )
            return {
              sync_from_source: resourceLimitsObject.sync_from_source === true,
            }
          })()

    return {
      service_id: assertString(
        object.service_id,
        `${label}[${index}].service_id`
      ),
      service_slug: assertString(
        object.service_slug,
        `${label}[${index}].service_slug`
      ),
      ...(gitSource ? { git_source: gitSource } : {}),
      ...(builder ? { builder } : {}),
      ...(healthcheck ? { healthcheck } : {}),
      ...(resourceLimits ? { resource_limits: resourceLimits } : {}),
    }
  })
}

export function parseResolveEnvironmentInput(
  rawPayload: unknown
): ResolveEnvironmentInput {
  const payload = assertObject(rawPayload, "request body")
  return {
    lane: assertLane(payload.lane, "lane"),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    sourceEnvironmentName: assertString(
      payload.source_environment_name,
      "source_environment_name"
    ),
    expectedPreviewServiceSlugs: assertStringArray(
      payload.expected_preview_service_slugs ?? [],
      "expected_preview_service_slugs"
    ),
    excludedPreviewServiceSlugs: assertStringArray(
      payload.excluded_preview_service_slugs ?? [],
      "excluded_preview_service_slugs"
    ),
    serviceSpecs: parseServiceReconciliationSpecs(
      payload.service_specs,
      "service_specs"
    ),
  }
}

export function parseArchiveEnvironmentInput(
  rawPayload: unknown
): ArchiveEnvironmentInput {
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
  const baselineComplete =
    typeof payload.baseline_complete === "boolean"
      ? payload.baseline_complete
      : undefined

  if (
    !(
      targetCommitSha ||
      lastDeployedCommitSha ||
      typeof baselineComplete === "boolean"
    )
  ) {
    throw new BadRequestError(
      "target_commit_sha, last_deployed_commit_sha, or baseline_complete is required"
    )
  }

  return {
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    targetCommitSha,
    lastDeployedCommitSha,
    baselineComplete,
  }
}

export function parseSyncPreviewRandomOnceSecretsInput(
  rawPayload: unknown
): SyncPreviewRandomOnceSecretsInput {
  const payload = assertObject(rawPayload, "request body")
  const secrets = payload.secrets
  if (!Array.isArray(secrets) || secrets.length === 0) {
    throw new BadRequestError("secrets must be a non-empty array")
  }

  return {
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    secrets: secrets.map((item, index) => {
      const object = assertObject(item, `secrets[${index}]`)
      const targets = object.targets
      if (!Array.isArray(targets)) {
        throw new BadRequestError(`secrets[${index}].targets must be an array`)
      }

      return {
        secretId: assertString(object.secret_id, `secrets[${index}].secret_id`),
        value: assertOptionalString(object.value, `secrets[${index}].value`),
        persistTo: assertOptionalString(
          object.persist_to,
          `secrets[${index}].persist_to`
        ),
        persistedEnvVar: assertOptionalString(
          object.persisted_env_var,
          `secrets[${index}].persisted_env_var`
        ),
        targets: targets.map((target, targetIndex) => {
          const targetObject = assertObject(
            target,
            `secrets[${index}].targets[${targetIndex}]`
          )

          return {
            serviceSlug: assertString(
              targetObject.service_slug,
              `secrets[${index}].targets[${targetIndex}].service_slug`
            ),
            envVar: assertString(
              targetObject.env_var,
              `secrets[${index}].targets[${targetIndex}].env_var`
            ),
          }
        }),
      }
    }),
  }
}

export function parseSyncPreviewSharedEnvInput(
  rawPayload: unknown
): SyncPreviewSharedEnvInput {
  const payload = assertObject(rawPayload, "request body")
  const variables = payload.variables
  if (!Array.isArray(variables) || variables.length === 0) {
    throw new BadRequestError("variables must be a non-empty array")
  }

  return {
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    variables: variables.map((item, index) => {
      const object = assertObject(item, `variables[${index}]`)
      return {
        key: assertString(object.key, `variables[${index}].key`),
        source: parsePreviewRuntimeValueSource(
          object.source,
          `variables[${index}].source`
        ),
      }
    }),
  }
}

export function parseSyncPreviewServiceEnvInput(
  rawPayload: unknown
): SyncPreviewServiceEnvInput {
  const payload = assertObject(rawPayload, "request body")
  const services = payload.services
  if (!Array.isArray(services) || services.length === 0) {
    throw new BadRequestError("services must be a non-empty array")
  }

  return {
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    services: services.map((item, index) => {
      const object = assertObject(item, `services[${index}]`)
      const env = object.env
      if (!Array.isArray(env) || env.length === 0) {
        throw new BadRequestError(
          `services[${index}].env must be a non-empty array`
        )
      }

      return {
        service_id: assertString(
          object.service_id,
          `services[${index}].service_id`
        ),
        service_slug: assertString(
          object.service_slug,
          `services[${index}].service_slug`
        ),
        env: env.map((envItem, envIndex) => {
          const envObject = assertObject(
            envItem,
            `services[${index}].env[${envIndex}]`
          )

          return {
            env_var: assertString(
              envObject.env_var,
              `services[${index}].env[${envIndex}].env_var`
            ),
            source: parsePreviewRuntimeValueSource(
              envObject.source,
              `services[${index}].env[${envIndex}].source`
            ),
          }
        }),
      }
    }),
  }
}

export function parseProvisionPreviewMeiliKeysInput(
  rawPayload: unknown
): ProvisionPreviewMeiliKeysInput {
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
    gitCommitSha: assertOptionalString(
      payload.git_commit_sha,
      "git_commit_sha"
    ),
  }
}

export function parseCancelDeployInput(rawPayload: unknown): {
  projectSlug: string
  environmentName: string
  serviceSlug: string
  deploymentHash: string
} {
  const payload = assertObject(rawPayload, "request body")
  return {
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    serviceSlug: assertString(payload.service_slug, "service_slug"),
    deploymentHash: assertString(payload.deployment_hash, "deployment_hash"),
  }
}

export function parseVerifyInput(rawPayload: unknown): VerifyDeployInput {
  const payload = assertObject(rawPayload, "request body")
  return {
    lane: assertLane(payload.lane, "lane"),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    environmentName: assertString(payload.environment_name, "environment_name"),
    requestedServiceIds: assertStringArray(
      payload.requested_service_ids,
      "requested_service_ids"
    ),
    deployServiceIds: assertStringArray(
      payload.deploy_service_ids,
      "deploy_service_ids"
    ),
    triggeredServiceIds: assertStringArray(
      payload.triggered_service_ids,
      "triggered_service_ids"
    ),
    expectedPreviewServiceSlugs: assertStringArray(
      payload.expected_preview_service_slugs ?? [],
      "expected_preview_service_slugs"
    ),
    excludedPreviewServiceSlugs: assertStringArray(
      payload.excluded_preview_service_slugs ?? [],
      "excluded_preview_service_slugs"
    ),
    expectedEnvOverrides: normalizeEnvOverrides(
      payload.expected_env_overrides ?? [],
      "expected_env_overrides"
    ),
    requiredPersistedEnv: normalizePersistedEnvRequirements(
      payload.required_persisted_env ?? [],
      "required_persisted_env"
    ),
    requiredSharedEnv: normalizeSharedEnvRequirements(
      payload.required_shared_env ?? [],
      "required_shared_env"
    ),
    forbiddenEnv: normalizeForbiddenEnvRequirements(
      payload.forbidden_env ?? [],
      "forbidden_env"
    ),
    deployments: normalizeDeployments(payload.deployments, "deployments"),
  }
}

import { z } from "zod"

import { BadRequestError } from "./db"
import type {
  ArchiveEnvironmentInput,
  EnvOverrideInput,
  ForbiddenEnvRequirement,
  Lane,
  PersistedEnvRequirement,
  PreviewRuntimeValueSourceInput,
  ReadPreviewCommitStateInput,
  ResolveEnvironmentInput,
  ResolveTargetInput,
  RuntimeProviderOutputInput,
  RuntimeProviderRunInput,
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

const nonEmptyTrimmedStringSchema = z.string().trim().min(1, "cannot be empty")

const strictTrueBooleanSchema = z.literal(true)
const requestBodyLabel = "request body"

const optionalTrimmedStringSchema = z.preprocess(
  (value) => value ?? undefined,
  nonEmptyTrimmedStringSchema.optional(),
)

const optionalNullableTrimmedStringSchema = z.preprocess(
  (value) => (value === undefined ? undefined : value),
  nonEmptyTrimmedStringSchema.nullable().optional(),
)

const serviceReconciliationGitSourceSchema = z.object({
  branch_name: optionalTrimmedStringSchema,
  commit_sha: z.preprocess(
    (value) => value ?? "HEAD",
    nonEmptyTrimmedStringSchema,
  ),
  sync_from_source: strictTrueBooleanSchema,
})

const serviceReconciliationBuilderSchema = z.object({
  build_stage_target: optionalNullableTrimmedStringSchema,
  sync_from_source: strictTrueBooleanSchema,
})

const serviceReconciliationSyncFlagSchema = z.object({
  sync_from_source: strictTrueBooleanSchema,
})

const serviceReconciliationSpecSchema = z.object({
  builder: z.preprocess(
    (value) => value ?? undefined,
    serviceReconciliationBuilderSchema.optional(),
  ),
  git_source: z.preprocess(
    (value) => value ?? undefined,
    serviceReconciliationGitSourceSchema.optional(),
  ),
  healthcheck: z.preprocess(
    (value) => value ?? undefined,
    serviceReconciliationSyncFlagSchema.optional(),
  ),
  resource_limits: z.preprocess(
    (value) => value ?? undefined,
    serviceReconciliationSyncFlagSchema.optional(),
  ),
  service_id: nonEmptyTrimmedStringSchema,
  service_slug: nonEmptyTrimmedStringSchema,
})

const serviceReconciliationSpecsSchema = z.array(
  serviceReconciliationSpecSchema,
)

const formatZodPath = (label: string, path: PropertyKey[]): string => {
  let current = label

  for (const part of path) {
    if (typeof part === "number") {
      current = `${current}[${String(part)}]`
      continue
    }

    current = `${current}.${String(part)}`
  }

  return current
}

const parseZodInput = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  label: string,
): T => {
  const result = schema.safeParse(value)
  if (result.success) {
    return result.data
  }

  const [issue] = result.error.issues
  const path = issue ? formatZodPath(label, issue.path) : label
  const message = issue?.message ?? "is invalid"
  throw new BadRequestError(`${path} ${message}`)
}

const assertObject = (value: unknown, label: string): JsonRecord => {
  const result = z.record(z.string(), z.unknown()).safeParse(value)
  if (!result.success || Array.isArray(value)) {
    throw new BadRequestError(`${label} must be a JSON object`)
  }

  return result.data
}

const assertString = (value: unknown, label: string): string => {
  if (typeof value !== "string") {
    throw new BadRequestError(`${label} must be a string`)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new BadRequestError(`${label} cannot be empty`)
  }

  return trimmed
}

const assertOptionalString = (
  value: unknown,
  label: string,
): string | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }

  return assertString(value, label)
}

const assertLane = (value: unknown, label: string): Lane => {
  const lane = assertString(value, label)
  if (lane !== "preview" && lane !== "main") {
    throw new BadRequestError(`${label} must be preview or main`)
  }

  return lane
}

const assertServiceType = (value: unknown, label: string): ServiceType => {
  const rawServiceType = assertString(value, label)

  switch (rawServiceType.toUpperCase()) {
    case "DOCKER":
    case "DOCKER_REGISTRY": {
      return "docker"
    }
    case "GIT":
    case "GIT_REPOSITORY": {
      return "git"
    }
    default: {
      throw new BadRequestError(`${label} must be docker or git`)
    }
  }
}

const assertStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => assertString(item, `${label}[${index}]`))
}

const normalizeRuntimeProviderOutput = (
  value: unknown,
  label: string,
): RuntimeProviderOutputInput => {
  const object = assertObject(value, label)
  const policy = assertObject(object["policy"], `${label}.policy`)
  const kind = assertString(policy["kind"], `${label}.policy.kind`)

  return {
    envVar: assertString(object["env_var"], `${label}.env_var`),
    outputId: assertString(object["output_id"], `${label}.output_id`),
    policy: {
      ...policy,
      kind,
    },
  }
}

const assertStringMap = (
  value: unknown,
  label: string,
): Record<string, string> => {
  const record = assertObject(value, label)
  const result: Record<string, string> = {}

  for (const [key, rawValue] of Object.entries(record)) {
    result[assertString(key, `${label} key`)] = assertString(
      rawValue,
      `${label}.${key}`,
    )
  }

  return result
}

const normalizeProjectSlugFromPayload = (payload: JsonRecord): string =>
  assertString(payload["project_slug"], "project_slug")

const normalizeResolveTargets = (
  value: unknown,
  label: string,
): ResolveTargetInput[] => {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      service_id: assertString(
        object["service_id"],
        `${label}[${index}].service_id`,
      ),
      service_slug: assertString(
        object["service_slug"],
        `${label}[${index}].service_slug`,
      ),
    }
  })
}

const normalizeEnvOverrides = (
  value: unknown,
  label: string,
): EnvOverrideInput[] => {
  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      env: assertStringMap(object["env"], `${label}[${index}].env`),
      service_id: assertString(
        object["service_id"],
        `${label}[${index}].service_id`,
      ),
      service_slug: assertString(
        object["service_slug"],
        `${label}[${index}].service_slug`,
      ),
    }
  })
}

const normalizeDeployments = (
  value: unknown,
  label: string,
): VerifyDeploymentRef[] => {
  if (value === null || value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      deployment_hash: assertString(
        object["deployment_hash"],
        `${label}[${index}].deployment_hash`,
      ),
      service_id: assertString(
        object["service_id"],
        `${label}[${index}].service_id`,
      ),
      service_slug: assertString(
        object["service_slug"],
        `${label}[${index}].service_slug`,
      ),
    }
  })
}

const normalizePersistedEnvRequirements = (
  value: unknown,
  label: string,
): PersistedEnvRequirement[] => {
  if (value === null || value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      env_keys: assertStringArray(
        object["env_keys"],
        `${label}[${index}].env_keys`,
      ),
      service_id: assertString(
        object["service_id"],
        `${label}[${index}].service_id`,
      ),
      service_slug: assertString(
        object["service_slug"],
        `${label}[${index}].service_slug`,
      ),
    }
  })
}

const normalizeSharedEnvRequirements = (
  value: unknown,
  label: string,
): { key: string }[] => {
  if (value === null || value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(`${label} must be an array`)
  }

  return value.map((item, index) => {
    const object = assertObject(item, `${label}[${index}]`)
    return {
      key: assertString(object["key"], `${label}[${index}].key`),
    }
  })
}

const previewRuntimeValueSourceKindSchema = z.enum([
  "literal",
  "service_network_alias",
  "service_global_network_alias",
  "service_public_origin",
  "service_internal_origin",
  "service_internal_bucket_url",
])

const assertPreviewRuntimeValueSourceKind = (
  value: unknown,
  label: string,
): PreviewRuntimeValueSourceInput["kind"] => {
  const result = previewRuntimeValueSourceKindSchema.safeParse(
    assertString(value, label),
  )
  if (!result.success) {
    throw new BadRequestError(
      `${label} has unsupported preview runtime source kind`,
    )
  }

  return result.data
}

const parsePreviewRuntimeValueSource = (rawValue: unknown, label: string) => {
  const object = assertObject(rawValue, label)

  const value = assertOptionalString(object["value"], `${label}.value`)
  const serviceSlug = assertOptionalString(
    object["service_slug"],
    `${label}.service_slug`,
  )
  const sourceEnvironmentName = assertOptionalString(
    object["source_environment_name"],
    `${label}.source_environment_name`,
  )
  const port =
    typeof object["port"] === "number" && Number.isInteger(object["port"])
      ? object["port"]
      : undefined
  const trailingSlash =
    typeof object["trailing_slash"] === "boolean"
      ? object["trailing_slash"]
      : undefined
  const bucketSharedEnvKey = assertOptionalString(
    object["bucket_shared_env_key"],
    `${label}.bucket_shared_env_key`,
  )

  return {
    kind: assertPreviewRuntimeValueSourceKind(object["kind"], `${label}.kind`),
    ...(value === undefined ? {} : { value }),
    ...(serviceSlug === undefined ? {} : { serviceSlug }),
    ...(sourceEnvironmentName === undefined ? {} : { sourceEnvironmentName }),
    ...(port === undefined ? {} : { port }),
    ...(trailingSlash === undefined ? {} : { trailingSlash }),
    ...(bucketSharedEnvKey === undefined ? {} : { bucketSharedEnvKey }),
  }
}

const normalizeForbiddenEnvRequirements = (
  value: unknown,
  label: string,
): ForbiddenEnvRequirement[] => [
  ...normalizePersistedEnvRequirements(value, label),
]

const parseResolvedTargets = (value: unknown): ZaneResolvedTarget[] => {
  if (!Array.isArray(value)) {
    throw new BadRequestError("targets must be an array")
  }

  return value.map((item, index) => {
    const object = assertObject(item, `targets[${index}]`)
    const configuredCommitSha = assertOptionalString(
      object["configured_commit_sha"],
      `targets[${index}].configured_commit_sha`,
    )
    return {
      ...(configuredCommitSha === undefined
        ? {}
        : { configured_commit_sha: configuredCommitSha }),
      deploy_token: assertString(
        object["deploy_token"],
        `targets[${index}].deploy_token`,
      ),
      deploy_url: assertString(
        object["deploy_url"],
        `targets[${index}].deploy_url`,
      ),
      details_url: assertString(
        object["details_url"],
        `targets[${index}].details_url`,
      ),
      env_change_url: assertString(
        object["env_change_url"],
        `targets[${index}].env_change_url`,
      ),
      service_id: assertString(
        object["service_id"],
        `targets[${index}].service_id`,
      ),
      service_slug: assertString(
        object["service_slug"],
        `targets[${index}].service_slug`,
      ),
      service_type: assertServiceType(
        object["service_type"],
        `targets[${index}].service_type`,
      ),
    }
  })
}

const parseServiceReconciliationSpecs = (
  value: unknown,
  label: string,
): ZaneServiceReconciliationSpec[] => {
  if (value === null || value === undefined) {
    return []
  }

  const specs = parseZodInput(serviceReconciliationSpecsSchema, value, label)
  return specs.map((spec) => ({
    service_id: spec.service_id,
    service_slug: spec.service_slug,
    ...(spec.git_source === undefined
      ? {}
      : {
          git_source: {
            commit_sha: spec.git_source.commit_sha,
            sync_from_source: spec.git_source.sync_from_source,
            ...(spec.git_source.branch_name === undefined
              ? {}
              : { branch_name: spec.git_source.branch_name }),
          },
        }),
    ...(spec.builder === undefined
      ? {}
      : {
          builder: {
            sync_from_source: spec.builder.sync_from_source,
            ...(spec.builder.build_stage_target === undefined
              ? {}
              : { build_stage_target: spec.builder.build_stage_target }),
          },
        }),
    ...(spec.healthcheck === undefined
      ? {}
      : { healthcheck: spec.healthcheck }),
    ...(spec.resource_limits === undefined
      ? {}
      : { resource_limits: spec.resource_limits }),
  }))
}

export const parseResolveEnvironmentInput = (
  rawPayload: unknown,
): ResolveEnvironmentInput => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  return {
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    excludedPreviewServiceSlugs: assertStringArray(
      payload["excluded_preview_service_slugs"] ?? [],
      "excluded_preview_service_slugs",
    ),
    expectedPreviewServiceSlugs: assertStringArray(
      payload["expected_preview_service_slugs"] ?? [],
      "expected_preview_service_slugs",
    ),
    lane: assertLane(payload["lane"], "lane"),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    serviceSpecs: parseServiceReconciliationSpecs(
      payload["service_specs"],
      "service_specs",
    ),
    sourceEnvironmentName: assertString(
      payload["source_environment_name"],
      "source_environment_name",
    ),
  }
}

const parseEnvironmentReferenceInput = (
  rawPayload: unknown,
): ArchiveEnvironmentInput => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  return {
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    projectSlug: normalizeProjectSlugFromPayload(payload),
  }
}

export const parseArchiveEnvironmentInput = (
  rawPayload: unknown,
): ArchiveEnvironmentInput => parseEnvironmentReferenceInput(rawPayload)

export const parseReadPreviewCommitStateInput = (
  rawPayload: unknown,
): ReadPreviewCommitStateInput => parseEnvironmentReferenceInput(rawPayload)

export const parseWritePreviewCommitStateInput = (
  rawPayload: unknown,
): WritePreviewCommitStateInput => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  const targetCommitSha = assertOptionalString(
    payload["target_commit_sha"],
    "target_commit_sha",
  )
  const lastDeployedCommitSha = assertOptionalString(
    payload["last_deployed_commit_sha"],
    "last_deployed_commit_sha",
  )
  const baselineComplete =
    typeof payload["baseline_complete"] === "boolean"
      ? payload["baseline_complete"]
      : undefined

  if (
    !(
      targetCommitSha !== undefined ||
      lastDeployedCommitSha !== undefined ||
      typeof baselineComplete === "boolean"
    )
  ) {
    throw new BadRequestError(
      "target_commit_sha, last_deployed_commit_sha, or baseline_complete is required",
    )
  }

  return {
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    ...(targetCommitSha === undefined ? {} : { targetCommitSha }),
    ...(lastDeployedCommitSha === undefined ? {} : { lastDeployedCommitSha }),
    ...(baselineComplete === undefined ? {} : { baselineComplete }),
  }
}

export const parseSyncPreviewRandomOnceSecretsInput = (
  rawPayload: unknown,
): SyncPreviewRandomOnceSecretsInput => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  const { secrets } = payload
  if (!Array.isArray(secrets) || secrets.length === 0) {
    throw new BadRequestError("secrets must be a non-empty array")
  }

  return {
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    secrets: secrets.map((item, index) => {
      const object = assertObject(item, `secrets[${index}]`)
      const { targets } = object
      if (!Array.isArray(targets)) {
        throw new BadRequestError(`secrets[${index}].targets must be an array`)
      }

      const value = assertOptionalString(
        object["value"],
        `secrets[${index}].value`,
      )
      const persistTo = assertOptionalString(
        object["persist_to"],
        `secrets[${index}].persist_to`,
      )
      const persistedEnvVar = assertOptionalString(
        object["persisted_env_var"],
        `secrets[${index}].persisted_env_var`,
      )

      return {
        secretId: assertString(
          object["secret_id"],
          `secrets[${index}].secret_id`,
        ),
        ...(value === undefined ? {} : { value }),
        ...(persistTo === undefined ? {} : { persistTo }),
        ...(persistedEnvVar === undefined ? {} : { persistedEnvVar }),
        targets: targets.map((target, targetIndex) => {
          const targetObject = assertObject(
            target,
            `secrets[${index}].targets[${targetIndex}]`,
          )

          return {
            envVar: assertString(
              targetObject["env_var"],
              `secrets[${index}].targets[${targetIndex}].env_var`,
            ),
            serviceSlug: assertString(
              targetObject["service_slug"],
              `secrets[${index}].targets[${targetIndex}].service_slug`,
            ),
          }
        }),
      }
    }),
  }
}

export const parseSyncPreviewSharedEnvInput = (
  rawPayload: unknown,
): SyncPreviewSharedEnvInput => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  const { variables } = payload
  if (!Array.isArray(variables) || variables.length === 0) {
    throw new BadRequestError("variables must be a non-empty array")
  }

  return {
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    variables: variables.map((item, index) => {
      const object = assertObject(item, `variables[${index}]`)
      return {
        key: assertString(object["key"], `variables[${index}].key`),
        source: parsePreviewRuntimeValueSource(
          object["source"],
          `variables[${index}].source`,
        ),
      }
    }),
  }
}

export const parseSyncPreviewServiceEnvInput = (
  rawPayload: unknown,
): SyncPreviewServiceEnvInput => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  const { services } = payload
  if (!Array.isArray(services) || services.length === 0) {
    throw new BadRequestError("services must be a non-empty array")
  }

  return {
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    services: services.map((item, index) => {
      const object = assertObject(item, `services[${index}]`)
      const { env } = object
      if (!Array.isArray(env) || env.length === 0) {
        throw new BadRequestError(
          `services[${index}].env must be a non-empty array`,
        )
      }

      return {
        env: env.map((envItem, envIndex) => {
          const envObject = assertObject(
            envItem,
            `services[${index}].env[${envIndex}]`,
          )

          return {
            env_var: assertString(
              envObject["env_var"],
              `services[${index}].env[${envIndex}].env_var`,
            ),
            source: parsePreviewRuntimeValueSource(
              envObject["source"],
              `services[${index}].env[${envIndex}].source`,
            ),
          }
        }),
        service_id: assertString(
          object["service_id"],
          `services[${index}].service_id`,
        ),
        service_slug: assertString(
          object["service_slug"],
          `services[${index}].service_slug`,
        ),
      }
    }),
  }
}

export const parseRuntimeProviderRunInput = (
  rawPayload: unknown,
): RuntimeProviderRunInput => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  const rawOutputs = payload["outputs"]
  if (!Array.isArray(rawOutputs) || rawOutputs.length === 0) {
    throw new BadRequestError("outputs must be a non-empty array")
  }

  return {
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    outputs: rawOutputs.map((output, index) =>
      normalizeRuntimeProviderOutput(output, `outputs[${index}]`),
    ),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    providerId: assertString(payload["provider_id"], "provider_id"),
    readinessPath: assertString(payload["readiness_path"], "readiness_path"),
    serviceSlug: assertString(payload["service_slug"], "service_slug"),
  }
}

export const parseResolveTargetsInput = (
  rawPayload: unknown,
): {
  lane: Lane
  projectSlug: string
  environmentName: string
  services: ResolveTargetInput[]
} => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  return {
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    lane: assertLane(payload["lane"], "lane"),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    services: normalizeResolveTargets(payload["services"], "services"),
  }
}

export const parseApplyEnvOverridesInput = (
  rawPayload: unknown,
): {
  projectSlug: string
  environmentName: string
  targets: ZaneResolvedTarget[]
  envOverrides: EnvOverrideInput[]
} => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  return {
    envOverrides: normalizeEnvOverrides(
      payload["env_overrides"],
      "env_overrides",
    ),
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    targets: parseResolvedTargets(payload["targets"]),
  }
}

export const parseTriggerInput = (
  rawPayload: unknown,
): {
  projectSlug: string
  environmentName: string
  targets: ZaneResolvedTarget[]
  gitCommitSha?: string
} => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  const gitCommitSha = assertOptionalString(
    payload["git_commit_sha"],
    "git_commit_sha",
  )
  return {
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    targets: parseResolvedTargets(payload["targets"]),
    ...(gitCommitSha === undefined ? {} : { gitCommitSha }),
  }
}

export const parseCancelDeployInput = (
  rawPayload: unknown,
): {
  projectSlug: string
  environmentName: string
  serviceSlug: string
  deploymentHash: string
} => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  return {
    deploymentHash: assertString(payload["deployment_hash"], "deployment_hash"),
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    serviceSlug: assertString(payload["service_slug"], "service_slug"),
  }
}

export const parseVerifyInput = (rawPayload: unknown): VerifyDeployInput => {
  const payload = assertObject(rawPayload, requestBodyLabel)
  return {
    deployServiceIds: assertStringArray(
      payload["deploy_service_ids"],
      "deploy_service_ids",
    ),
    deployments: normalizeDeployments(payload["deployments"], "deployments"),
    environmentName: assertString(
      payload["environment_name"],
      "environment_name",
    ),
    excludedPreviewServiceSlugs: assertStringArray(
      payload["excluded_preview_service_slugs"] ?? [],
      "excluded_preview_service_slugs",
    ),
    expectedEnvOverrides: normalizeEnvOverrides(
      payload["expected_env_overrides"] ?? [],
      "expected_env_overrides",
    ),
    expectedPreviewServiceSlugs: assertStringArray(
      payload["expected_preview_service_slugs"] ?? [],
      "expected_preview_service_slugs",
    ),
    forbiddenEnv: normalizeForbiddenEnvRequirements(
      payload["forbidden_env"] ?? [],
      "forbidden_env",
    ),
    lane: assertLane(payload["lane"], "lane"),
    projectSlug: normalizeProjectSlugFromPayload(payload),
    requestedServiceIds: assertStringArray(
      payload["requested_service_ids"],
      "requested_service_ids",
    ),
    requiredPersistedEnv: normalizePersistedEnvRequirements(
      payload["required_persisted_env"] ?? [],
      "required_persisted_env",
    ),
    requiredSharedEnv: normalizeSharedEnvRequirements(
      payload["required_shared_env"] ?? [],
      "required_shared_env",
    ),
    triggeredServiceIds: assertStringArray(
      payload["triggered_service_ids"],
      "triggered_service_ids",
    ),
  }
}

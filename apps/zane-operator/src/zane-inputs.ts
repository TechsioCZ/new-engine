import { z } from "zod"

import { BadRequestError } from "./db"
import {
  runtimeProviderOutputPolicyInputSchema,
  zaneServiceTypeSchema,
} from "./zane-contract"
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
  SyncPreviewRandomOnceSecretsInput,
  SyncPreviewServiceEnvInput,
  SyncPreviewSharedEnvInput,
  VerifyDeployInput,
  VerifyDeploymentRef,
  WritePreviewCommitStateInput,
  ZaneResolvedTarget,
  ZaneServiceReconciliationSpec,
} from "./zane-contract"

const requestBodyLabel = "request body"
const nonEmptyTrimmedStringSchema = z.string().trim().min(1, "cannot be empty")
const optionalTrimmedStringSchema = z.preprocess(
  (value) => value ?? undefined,
  nonEmptyTrimmedStringSchema.optional(),
)
const optionalNullableTrimmedStringSchema = z.preprocess(
  (value) => (value === undefined ? undefined : value),
  nonEmptyTrimmedStringSchema.nullable().optional(),
)
const laneSchema = z.enum(["preview", "main"])
const stringArraySchema = z.array(nonEmptyTrimmedStringSchema)
const optionalArraySchema = <T>(schema: z.ZodType<T>) =>
  z.preprocess((value) => value ?? [], z.array(schema))
const stringMapSchema = z.record(
  nonEmptyTrimmedStringSchema,
  nonEmptyTrimmedStringSchema,
)
const environmentReferenceSchema = z.object({
  environment_name: nonEmptyTrimmedStringSchema,
  project_slug: nonEmptyTrimmedStringSchema,
})

const formatZodPath = (label: string, path: PropertyKey[]): string => {
  let current = label
  for (const part of path) {
    current =
      typeof part === "number"
        ? `${current}[${String(part)}]`
        : `${current}.${String(part)}`
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
  throw new BadRequestError(`${path} ${issue?.message ?? "is invalid"}`)
}

const serviceReconciliationGitSourceSchema = z.object({
  branch_name: optionalTrimmedStringSchema,
  commit_sha: z.preprocess(
    (value) => value ?? "HEAD",
    nonEmptyTrimmedStringSchema,
  ),
  sync_from_source: z.literal(true),
})
const serviceReconciliationBuilderSchema = z.object({
  build_stage_target: optionalNullableTrimmedStringSchema,
  sync_from_source: z.literal(true),
})
const serviceReconciliationSyncFlagSchema = z.object({
  sync_from_source: z.literal(true),
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

const parseServiceReconciliationSpecs = (
  value: unknown,
  label: string,
): ZaneServiceReconciliationSpec[] => {
  const specs = parseZodInput(
    z.preprocess(
      (input) => input ?? [],
      z.array(serviceReconciliationSpecSchema),
    ),
    value,
    label,
  )
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

const resolveTargetSchema = z.object({
  service_id: nonEmptyTrimmedStringSchema,
  service_slug: nonEmptyTrimmedStringSchema,
})
const envOverrideSchema = resolveTargetSchema.extend({ env: stringMapSchema })
const deploymentRefSchema = resolveTargetSchema.extend({
  deployment_hash: nonEmptyTrimmedStringSchema,
})
const persistedEnvRequirementSchema = resolveTargetSchema.extend({
  env_keys: stringArraySchema,
})
const sharedEnvRequirementSchema = z.object({
  key: nonEmptyTrimmedStringSchema,
})

const previewRuntimeValueSourceSchema = z.object({
  bucket_shared_env_key: optionalTrimmedStringSchema,
  kind: z.enum([
    "literal",
    "service_network_alias",
    "service_global_network_alias",
    "service_public_origin",
    "service_internal_origin",
    "service_internal_bucket_url",
  ]),
  port: z.preprocess(
    (value) =>
      typeof value === "number" && Number.isInteger(value) ? value : undefined,
    z.number().int().optional(),
  ),
  service_slug: optionalTrimmedStringSchema,
  source_environment_name: optionalTrimmedStringSchema,
  trailing_slash: z.preprocess(
    (value) => (typeof value === "boolean" ? value : undefined),
    z.boolean().optional(),
  ),
  value: optionalTrimmedStringSchema,
})

const parsePreviewRuntimeValueSource = (
  value: unknown,
  label: string,
): PreviewRuntimeValueSourceInput => {
  const source = parseZodInput(previewRuntimeValueSourceSchema, value, label)
  return {
    kind: source.kind,
    ...(source.value === undefined ? {} : { value: source.value }),
    ...(source.service_slug === undefined
      ? {}
      : { serviceSlug: source.service_slug }),
    ...(source.source_environment_name === undefined
      ? {}
      : { sourceEnvironmentName: source.source_environment_name }),
    ...(source.port === undefined ? {} : { port: source.port }),
    ...(source.trailing_slash === undefined
      ? {}
      : { trailingSlash: source.trailing_slash }),
    ...(source.bucket_shared_env_key === undefined
      ? {}
      : { bucketSharedEnvKey: source.bucket_shared_env_key }),
  }
}

const resolvedTargetSchema = z.object({
  configured_commit_sha: optionalTrimmedStringSchema,
  deploy_token: nonEmptyTrimmedStringSchema,
  deploy_url: nonEmptyTrimmedStringSchema,
  details_url: nonEmptyTrimmedStringSchema,
  env_change_url: nonEmptyTrimmedStringSchema,
  service_id: nonEmptyTrimmedStringSchema,
  service_slug: nonEmptyTrimmedStringSchema,
  service_type: zaneServiceTypeSchema,
})

const parseResolvedTargets = (value: unknown): ZaneResolvedTarget[] => {
  const targets = parseZodInput(z.array(resolvedTargetSchema), value, "targets")
  return targets.map((target) => ({
    deploy_token: target.deploy_token,
    deploy_url: target.deploy_url,
    details_url: target.details_url,
    env_change_url: target.env_change_url,
    service_id: target.service_id,
    service_slug: target.service_slug,
    service_type: target.service_type,
    ...(target.configured_commit_sha === undefined
      ? {}
      : { configured_commit_sha: target.configured_commit_sha }),
  }))
}

const runtimeProviderOutputPolicySchema = z.object({
  policy: runtimeProviderOutputPolicyInputSchema,
})
const runtimeProviderOutputFieldsSchema = z.object({
  env_var: nonEmptyTrimmedStringSchema,
  output_id: nonEmptyTrimmedStringSchema,
})
const parseRuntimeProviderOutput = (
  value: unknown,
  label: string,
): RuntimeProviderOutputInput => {
  const { policy } = parseZodInput(
    runtimeProviderOutputPolicySchema,
    value,
    label,
  )
  const output = parseZodInput(runtimeProviderOutputFieldsSchema, value, label)
  return {
    envVar: output.env_var,
    outputId: output.output_id,
    policy,
  }
}

export const parseResolveEnvironmentInput = (
  rawPayload: unknown,
): ResolveEnvironmentInput => {
  const payload = parseZodInput(
    environmentReferenceSchema.extend({
      excluded_preview_service_slugs: optionalArraySchema(
        nonEmptyTrimmedStringSchema,
      ),
      expected_preview_service_slugs: optionalArraySchema(
        nonEmptyTrimmedStringSchema,
      ),
      lane: laneSchema,
      service_specs: z.unknown().optional(),
      source_environment_name: nonEmptyTrimmedStringSchema,
    }),
    rawPayload,
    requestBodyLabel,
  )
  return {
    environmentName: payload.environment_name,
    excludedPreviewServiceSlugs: payload.excluded_preview_service_slugs,
    expectedPreviewServiceSlugs: payload.expected_preview_service_slugs,
    lane: payload.lane,
    projectSlug: payload.project_slug,
    serviceSpecs: parseServiceReconciliationSpecs(
      payload.service_specs,
      "service_specs",
    ),
    sourceEnvironmentName: payload.source_environment_name,
  }
}

const parseEnvironmentReferenceInput = (
  rawPayload: unknown,
): ArchiveEnvironmentInput => {
  const payload = parseZodInput(
    environmentReferenceSchema,
    rawPayload,
    requestBodyLabel,
  )
  return {
    environmentName: payload.environment_name,
    projectSlug: payload.project_slug,
  }
}

export const parseArchiveEnvironmentInput = (
  rawPayload: unknown,
): ArchiveEnvironmentInput => parseEnvironmentReferenceInput(rawPayload)

export const parseReadPreviewCommitStateInput = (
  rawPayload: unknown,
): ReadPreviewCommitStateInput => parseEnvironmentReferenceInput(rawPayload)

const previewCommitStateUpdateSchema = z
  .object({
    baseline_complete: z.boolean().optional(),
    last_deployed_commit_sha: optionalTrimmedStringSchema,
    target_commit_sha: optionalTrimmedStringSchema,
  })
  .refine(
    (input) =>
      input.target_commit_sha !== undefined ||
      input.last_deployed_commit_sha !== undefined ||
      input.baseline_complete !== undefined,
    {
      message:
        "target_commit_sha, last_deployed_commit_sha, or baseline_complete is required",
    },
  )

export const parseWritePreviewCommitStateInput = (
  rawPayload: unknown,
): WritePreviewCommitStateInput => {
  const update = parseZodInput(
    previewCommitStateUpdateSchema,
    rawPayload,
    requestBodyLabel,
  )
  const environment = parseZodInput(
    environmentReferenceSchema,
    rawPayload,
    requestBodyLabel,
  )
  return {
    environmentName: environment.environment_name,
    projectSlug: environment.project_slug,
    ...(update.target_commit_sha === undefined
      ? {}
      : { targetCommitSha: update.target_commit_sha }),
    ...(update.last_deployed_commit_sha === undefined
      ? {}
      : { lastDeployedCommitSha: update.last_deployed_commit_sha }),
    ...(update.baseline_complete === undefined
      ? {}
      : { baselineComplete: update.baseline_complete }),
  }
}

const randomOnceSecretSchema = z.object({
  persist_to: optionalTrimmedStringSchema,
  persisted_env_var: optionalTrimmedStringSchema,
  secret_id: nonEmptyTrimmedStringSchema,
  targets: z.array(
    z.object({
      env_var: nonEmptyTrimmedStringSchema,
      service_slug: nonEmptyTrimmedStringSchema,
    }),
  ),
  value: optionalTrimmedStringSchema,
})

export const parseSyncPreviewRandomOnceSecretsInput = (
  rawPayload: unknown,
): SyncPreviewRandomOnceSecretsInput => {
  const payload = parseZodInput(
    environmentReferenceSchema.extend({
      secrets: z.array(randomOnceSecretSchema).min(1),
    }),
    rawPayload,
    requestBodyLabel,
  )
  return {
    environmentName: payload.environment_name,
    projectSlug: payload.project_slug,
    secrets: payload.secrets.map((secret) => ({
      secretId: secret.secret_id,
      targets: secret.targets.map((target) => ({
        envVar: target.env_var,
        serviceSlug: target.service_slug,
      })),
      ...(secret.value === undefined ? {} : { value: secret.value }),
      ...(secret.persist_to === undefined
        ? {}
        : { persistTo: secret.persist_to }),
      ...(secret.persisted_env_var === undefined
        ? {}
        : { persistedEnvVar: secret.persisted_env_var }),
    })),
  }
}

export const parseSyncPreviewSharedEnvInput = (
  rawPayload: unknown,
): SyncPreviewSharedEnvInput => {
  const payload = parseZodInput(
    environmentReferenceSchema.extend({
      variables: z
        .array(
          z.object({
            key: nonEmptyTrimmedStringSchema,
            source: z.unknown(),
          }),
        )
        .min(1),
    }),
    rawPayload,
    requestBodyLabel,
  )
  return {
    environmentName: payload.environment_name,
    projectSlug: payload.project_slug,
    variables: payload.variables.map((variable, index) => ({
      key: variable.key,
      source: parsePreviewRuntimeValueSource(
        variable.source,
        `variables[${index}].source`,
      ),
    })),
  }
}

export const parseSyncPreviewServiceEnvInput = (
  rawPayload: unknown,
): SyncPreviewServiceEnvInput => {
  const payload = parseZodInput(
    environmentReferenceSchema.extend({
      services: z
        .array(
          resolveTargetSchema.extend({
            env: z
              .array(
                z.object({
                  env_var: nonEmptyTrimmedStringSchema,
                  source: z.unknown(),
                }),
              )
              .min(1),
          }),
        )
        .min(1),
    }),
    rawPayload,
    requestBodyLabel,
  )
  return {
    environmentName: payload.environment_name,
    projectSlug: payload.project_slug,
    services: payload.services.map((service, serviceIndex) => ({
      env: service.env.map((entry, envIndex) => ({
        env_var: entry.env_var,
        source: parsePreviewRuntimeValueSource(
          entry.source,
          `services[${serviceIndex}].env[${envIndex}].source`,
        ),
      })),
      service_id: service.service_id,
      service_slug: service.service_slug,
    })),
  }
}

export const parseRuntimeProviderRunInput = (
  rawPayload: unknown,
): RuntimeProviderRunInput => {
  const payload = parseZodInput(
    environmentReferenceSchema.extend({
      outputs: z.array(z.unknown()).min(1),
      provider_id: nonEmptyTrimmedStringSchema,
      readiness_path: nonEmptyTrimmedStringSchema,
      service_slug: nonEmptyTrimmedStringSchema,
    }),
    rawPayload,
    requestBodyLabel,
  )
  return {
    environmentName: payload.environment_name,
    outputs: payload.outputs.map((output, index) =>
      parseRuntimeProviderOutput(output, `outputs[${index}]`),
    ),
    projectSlug: payload.project_slug,
    providerId: payload.provider_id,
    readinessPath: payload.readiness_path,
    serviceSlug: payload.service_slug,
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
  const payload = parseZodInput(
    environmentReferenceSchema.extend({
      lane: laneSchema,
      services: z.array(resolveTargetSchema),
    }),
    rawPayload,
    requestBodyLabel,
  )
  return {
    environmentName: payload.environment_name,
    lane: payload.lane,
    projectSlug: payload.project_slug,
    services: payload.services,
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
  const payload = parseZodInput(
    environmentReferenceSchema.extend({
      env_overrides: z.array(envOverrideSchema),
      targets: z.unknown(),
    }),
    rawPayload,
    requestBodyLabel,
  )
  return {
    envOverrides: payload.env_overrides,
    environmentName: payload.environment_name,
    projectSlug: payload.project_slug,
    targets: parseResolvedTargets(payload.targets),
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
  const payload = parseZodInput(
    environmentReferenceSchema.extend({
      git_commit_sha: optionalTrimmedStringSchema,
      targets: z.unknown(),
    }),
    rawPayload,
    requestBodyLabel,
  )
  return {
    environmentName: payload.environment_name,
    projectSlug: payload.project_slug,
    targets: parseResolvedTargets(payload.targets),
    ...(payload.git_commit_sha === undefined
      ? {}
      : { gitCommitSha: payload.git_commit_sha }),
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
  const payload = parseZodInput(
    environmentReferenceSchema.extend({
      deployment_hash: nonEmptyTrimmedStringSchema,
      service_slug: nonEmptyTrimmedStringSchema,
    }),
    rawPayload,
    requestBodyLabel,
  )
  return {
    deploymentHash: payload.deployment_hash,
    environmentName: payload.environment_name,
    projectSlug: payload.project_slug,
    serviceSlug: payload.service_slug,
  }
}

export const parseVerifyInput = (rawPayload: unknown): VerifyDeployInput => {
  const payload = parseZodInput(
    environmentReferenceSchema.extend({
      deploy_service_ids: stringArraySchema,
      deployments: optionalArraySchema(deploymentRefSchema),
      excluded_preview_service_slugs: optionalArraySchema(
        nonEmptyTrimmedStringSchema,
      ),
      expected_env_overrides: optionalArraySchema(envOverrideSchema),
      expected_preview_service_slugs: optionalArraySchema(
        nonEmptyTrimmedStringSchema,
      ),
      forbidden_env: optionalArraySchema(persistedEnvRequirementSchema),
      lane: laneSchema,
      requested_service_ids: stringArraySchema,
      required_persisted_env: optionalArraySchema(
        persistedEnvRequirementSchema,
      ),
      required_shared_env: optionalArraySchema(sharedEnvRequirementSchema),
      triggered_service_ids: stringArraySchema,
    }),
    rawPayload,
    requestBodyLabel,
  )
  return {
    deployServiceIds: payload.deploy_service_ids,
    deployments: payload.deployments satisfies VerifyDeploymentRef[],
    environmentName: payload.environment_name,
    excludedPreviewServiceSlugs: payload.excluded_preview_service_slugs,
    expectedEnvOverrides: payload.expected_env_overrides,
    expectedPreviewServiceSlugs: payload.expected_preview_service_slugs,
    forbiddenEnv: payload.forbidden_env satisfies ForbiddenEnvRequirement[],
    lane: payload.lane,
    projectSlug: payload.project_slug,
    requestedServiceIds: payload.requested_service_ids,
    requiredPersistedEnv:
      payload.required_persisted_env satisfies PersistedEnvRequirement[],
    requiredSharedEnv: payload.required_shared_env,
    triggeredServiceIds: payload.triggered_service_ids,
  }
}

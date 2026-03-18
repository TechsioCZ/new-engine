import { z } from "zod"

const secretTargetSchema = z.looseObject({
  service_id: z.string().min(1),
  env_var: z.string().min(1),
})

const previewRandomOnceSecretSchema = z.looseObject({
  secret_id: z.string().min(1),
  scope: z.string().optional(),
  lifecycle: z.string().optional(),
  materializer: z.string().optional(),
  persist_to: z.string().optional(),
  persisted_env_var: z.string().optional(),
  generator: z
    .looseObject({
      kind: z.string().optional(),
      bytes: z.number().int().positive().optional(),
      length: z.number().int().positive().optional(),
    })
    .optional()
    .default({}),
  targets: z.array(secretTargetSchema).default([]),
})

const providerOutputTargetSchema = z.looseObject({
  service_id: z.string().min(1),
  env_var: z.string().min(1),
})

const providerOutputSchema = z.looseObject({
  output_id: z.string().min(1),
  target_envs: z.array(providerOutputTargetSchema).default([]),
  policy: z
    .looseObject({
      uid: z.string().min(1),
      description: z.string().min(1),
      actions: z.array(z.string().min(1)).default([]),
      indexes: z.array(z.string().min(1)).default([]),
    })
    .optional(),
})

const runtimeProviderSchema = z.looseObject({
  provider_id: z.string().min(1),
  status: z.string().optional(),
  materializer: z.string().optional(),
  source_service_id: z.string().optional(),
  readiness: z
    .looseObject({
      kind: z.string().min(1).optional(),
      path: z.string().min(1).optional(),
    })
    .optional(),
  outputs: z.array(providerOutputSchema).default([]),
})

const previewRuntimeSourceSchema = z.looseObject({
  kind: z.string().min(1),
  service_id: z.string().min(1).optional(),
  environment_scope: z.enum(["current", "source"]).optional().default("current"),
  port: z.number().int().positive().optional(),
  trailing_slash: z.boolean().optional().default(false),
  bucket_shared_env_key: z.string().min(1).optional(),
})

const previewSharedEnvDefinitionSchema = z.looseObject({
  key: z.string().min(1),
  consumed_by_service_ids: z.array(z.string().min(1)).default([]),
  source: previewRuntimeSourceSchema,
})

const previewServiceEnvDefinitionSchema = z.looseObject({
  service_id: z.string().min(1),
  env_var: z.string().min(1),
  source: previewRuntimeSourceSchema,
})

const laneBuildStageTargetsSchema = z
  .object({
    preview: z.string().nullable().optional(),
    main: z.string().nullable().optional(),
  })
  .default({})

const serviceGitSourceReconciliationSchema = z
  .object({
    sync_from_source: z.boolean().optional().default(true),
    commit_sha: z.string().min(1).optional().default("HEAD"),
  })
  .default({
    sync_from_source: true,
    commit_sha: "HEAD",
  })

const serviceBuilderReconciliationSchema = z
  .object({
    sync_from_source: z.boolean().optional().default(true),
    build_stage_target_by_lane: laneBuildStageTargetsSchema.optional().default({}),
  })
  .default({
    sync_from_source: true,
    build_stage_target_by_lane: {},
  })

const serviceFieldReconciliationSchema = z
  .object({
    sync_from_source: z.boolean().optional().default(true),
  })
  .default({
    sync_from_source: true,
  })

const serviceReconciliationDefinitionSchema = z.looseObject({
  service_id: z.string().min(1),
  git_source: serviceGitSourceReconciliationSchema.optional().default({
    sync_from_source: true,
    commit_sha: "HEAD",
  }),
  builder: serviceBuilderReconciliationSchema.optional().default({
    sync_from_source: true,
    build_stage_target_by_lane: {},
  }),
  healthcheck: serviceFieldReconciliationSchema.optional().default({
    sync_from_source: true,
  }),
  resource_limits: serviceFieldReconciliationSchema.optional().default({
    sync_from_source: true,
  }),
})

export const stackInputsSchema = z.object({
  secret_materialization: z
    .object({
      secrets: z.array(previewRandomOnceSecretSchema).default([]),
    })
    .default({ secrets: [] }),
  runtime_providers: z
    .object({
      providers: z.array(runtimeProviderSchema).default([]),
    })
    .default({ providers: [] }),
  preview_runtime_reconciliation: z
    .object({
      shared_env: z.array(previewSharedEnvDefinitionSchema).default([]),
      service_env: z.array(previewServiceEnvDefinitionSchema).default([]),
    })
    .default({ shared_env: [], service_env: [] }),
  service_reconciliation: z
    .object({
      services: z.array(serviceReconciliationDefinitionSchema).default([]),
    })
    .default({ services: [] }),
})

export type StackInputs = z.infer<typeof stackInputsSchema>
export type PreviewRandomOnceSecretDefinition = z.infer<
  typeof previewRandomOnceSecretSchema
>
export type PreviewRuntimeSourceDefinition = z.infer<
  typeof previewRuntimeSourceSchema
>
export type PreviewSharedEnvDefinition = z.infer<
  typeof previewSharedEnvDefinitionSchema
>
export type PreviewServiceEnvDefinition = z.infer<
  typeof previewServiceEnvDefinitionSchema
>
export type ServiceReconciliationDefinition = z.infer<
  typeof serviceReconciliationDefinitionSchema
>
export type RuntimeProviderOutput = z.infer<typeof providerOutputSchema>
export type RuntimeProviderPolicy = NonNullable<RuntimeProviderOutput["policy"]>

export function getPreviewRandomOnceSecretDefinitions(
  inputs: StackInputs
): PreviewRandomOnceSecretDefinition[] {
  return inputs.secret_materialization.secrets.filter(
    (secret) => secret.scope === "preview" && secret.lifecycle === "random_once"
  )
}

export function previewRandomOnceSecretPersistsToZaneEnv(
  secret: { persist_to?: string }
): boolean {
  return (secret.persist_to ?? "zane_env") === "zane_env"
}

export function getPreviewSharedEnvDefinitions(
  inputs: StackInputs
): PreviewSharedEnvDefinition[] {
  return inputs.preview_runtime_reconciliation.shared_env
}

export function getPreviewServiceEnvDefinitions(
  inputs: StackInputs
): PreviewServiceEnvDefinition[] {
  return inputs.preview_runtime_reconciliation.service_env
}

export function getServiceReconciliationDefinitions(
  inputs: StackInputs
): ServiceReconciliationDefinition[] {
  return inputs.service_reconciliation.services
}

export function getRuntimeProviderTargetEnvVar(
  inputs: StackInputs,
  providerId: string,
  outputId: string,
  serviceId: string
): string {
  const provider = inputs.runtime_providers.providers.find(
    (candidate) => candidate.provider_id === providerId
  )
  const output = provider?.outputs.find(
    (candidate) => candidate.output_id === outputId
  )
  const target = output?.target_envs.find(
    (candidate) => candidate.service_id === serviceId
  )
  if (!target) {
    throw new Error(
      `Missing ${outputId} target env var for provider ${providerId}.`
    )
  }

  return target.env_var
}

export function getRuntimeProviderSourceServiceId(
  inputs: StackInputs,
  providerId: string
): string {
  const provider = inputs.runtime_providers.providers.find(
    (candidate) => candidate.provider_id === providerId
  )
  const sourceServiceId = provider?.source_service_id
  if (!sourceServiceId) {
    throw new Error(`Missing source_service_id for provider ${providerId}.`)
  }

  return sourceServiceId
}

export function getRuntimeProviderReadinessPath(
  inputs: StackInputs,
  providerId: string
): string {
  const provider = inputs.runtime_providers.providers.find(
    (candidate) => candidate.provider_id === providerId
  )
  const readinessPath = provider?.readiness?.path
  if (!readinessPath) {
    throw new Error(`Missing readiness.path for provider ${providerId}.`)
  }

  return readinessPath
}

export function getRuntimeProviderOutputPolicy(
  inputs: StackInputs,
  providerId: string,
  outputId: string
): RuntimeProviderPolicy {
  const provider = inputs.runtime_providers.providers.find(
    (candidate) => candidate.provider_id === providerId
  )
  const output = provider?.outputs.find(
    (candidate) => candidate.output_id === outputId
  )
  if (!output?.policy) {
    throw new Error(
      `Missing policy for provider ${providerId} output ${outputId}.`
    )
  }

  return output.policy
}

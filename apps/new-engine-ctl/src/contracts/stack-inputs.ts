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
      kind: z.string().min(1).optional(),
      uid: z.string().min(1).optional(),
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      actions: z.array(z.string().min(1)).default([]),
      indexes: z.array(z.string().min(1)).default([]),
    })
    .optional(),
})

const runtimeProviderLaneBehaviorSchema = z.looseObject({
  enabled: z.boolean().optional().default(true),
  reuse_persisted_outputs: z.boolean().optional().default(true),
  reconcile_when_source_not_in_plan: z.boolean().optional().default(false),
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
  orchestration: z
    .looseObject({
      lanes: z
        .looseObject({
          preview: runtimeProviderLaneBehaviorSchema.optional(),
          main: runtimeProviderLaneBehaviorSchema.optional(),
        })
        .optional()
        .default({}),
    })
    .optional()
    .default({ lanes: {} }),
  outputs: z.array(providerOutputSchema).default([]),
})

const localRuntimeProviderOutputAliasSchema = z.looseObject({
  provider_id: z.string().min(1),
  output_id: z.string().min(1),
  service_id: z.string().min(1),
  env_var: z.string().min(1),
  local_env_var: z.string().min(1),
})

const previewRuntimeSourceSchema = z.looseObject({
  kind: z.string().min(1),
  service_id: z.string().min(1).optional(),
  environment_scope: z
    .enum(["current", "source"])
    .optional()
    .default("current"),
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

const previewForbiddenServiceEnvDefinitionSchema = z.looseObject({
  service_id: z.string().min(1),
  env_keys: z.array(z.string().min(1)).default([]),
})

const bootstrapSharedEnvSourceSchema = z
  .looseObject({
    kind: z.enum([
      "service_network_alias",
      "service_global_network_alias",
      "local_env",
    ]),
    service_id: z.string().min(1).optional(),
    env_var: z.string().min(1).optional(),
    default_value: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.kind === "service_network_alias" ||
        value.kind === "service_global_network_alias") &&
      !value.service_id
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["service_id"],
        message: `${value.kind} requires service_id`,
      })
    }

    if (value.kind === "local_env" && !value.env_var) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["env_var"],
        message: "local_env requires env_var",
      })
    }
  })

const bootstrapSharedEnvTargetSchema = z.looseObject({
  service_id: z.string().min(1),
  env_var: z.string().min(1),
})

const bootstrapSharedEnvDefinitionSchema = z.looseObject({
  key: z.string().min(1),
  source: bootstrapSharedEnvSourceSchema,
  service_targets: z.array(bootstrapSharedEnvTargetSchema).default([]),
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
  })
  .default({
    sync_from_source: true,
  })

const serviceBuilderReconciliationSchema = z
  .object({
    sync_from_source: z.boolean().optional().default(true),
    build_stage_target_by_lane: laneBuildStageTargetsSchema
      .optional()
      .default({}),
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
  local_env_aliases: z
    .object({
      runtime_provider_outputs: z
        .array(localRuntimeProviderOutputAliasSchema)
        .default([]),
    })
    .default({ runtime_provider_outputs: [] }),
  preview_runtime_reconciliation: z
    .object({
      shared_env: z.array(previewSharedEnvDefinitionSchema).default([]),
      service_env: z.array(previewServiceEnvDefinitionSchema).default([]),
    })
    .default({ shared_env: [], service_env: [] }),
  preview_verification: z
    .object({
      forbidden_service_env: z
        .array(previewForbiddenServiceEnvDefinitionSchema)
        .default([]),
    })
    .default({ forbidden_service_env: [] }),
  bootstrap_zane_project: z
    .object({
      shared_env: z.array(bootstrapSharedEnvDefinitionSchema).default([]),
    })
    .default({ shared_env: [] }),
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
export type PreviewForbiddenServiceEnvDefinition = z.infer<
  typeof previewForbiddenServiceEnvDefinitionSchema
>
export type BootstrapSharedEnvDefinition = z.infer<
  typeof bootstrapSharedEnvDefinitionSchema
>
export type ServiceReconciliationDefinition = z.infer<
  typeof serviceReconciliationDefinitionSchema
>
export type RuntimeProviderOutput = z.infer<typeof providerOutputSchema>
export type RuntimeProviderOutputTarget = z.infer<
  typeof providerOutputTargetSchema
>
export type LocalRuntimeProviderOutputAlias = z.infer<
  typeof localRuntimeProviderOutputAliasSchema
>
export type RuntimeProviderPolicy = NonNullable<RuntimeProviderOutput["policy"]>
export type RuntimeProviderLaneBehavior = z.infer<
  typeof runtimeProviderLaneBehaviorSchema
>
export type RuntimeProviderMeiliKeyPolicy = {
  uid: string
  description: string
  actions: string[]
  indexes: string[]
}

function getRuntimeProvider(
  inputs: StackInputs,
  providerId: string
): StackInputs["runtime_providers"]["providers"][number] {
  const provider = inputs.runtime_providers.providers.find(
    (candidate) => candidate.provider_id === providerId
  )
  if (!provider) {
    throw new Error(`Missing runtime provider ${providerId}.`)
  }

  return provider
}

export function getPreviewRandomOnceSecretDefinitions(
  inputs: StackInputs
): PreviewRandomOnceSecretDefinition[] {
  return inputs.secret_materialization.secrets.filter(
    (secret) => secret.scope === "preview" && secret.lifecycle === "random_once"
  )
}

export function previewRandomOnceSecretPersistsToZaneEnv(secret: {
  persist_to?: string
}): boolean {
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

export function getPreviewForbiddenServiceEnvDefinitions(
  inputs: StackInputs
): PreviewForbiddenServiceEnvDefinition[] {
  return inputs.preview_verification.forbidden_service_env
}

export function getBootstrapZaneProjectSharedEnvDefinitions(
  inputs: StackInputs
): BootstrapSharedEnvDefinition[] {
  return inputs.bootstrap_zane_project.shared_env
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
  const provider = getRuntimeProvider(inputs, providerId)
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
  const provider = getRuntimeProvider(inputs, providerId)
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
  const provider = getRuntimeProvider(inputs, providerId)
  const readinessPath = provider?.readiness?.path
  if (!readinessPath) {
    throw new Error(`Missing readiness.path for provider ${providerId}.`)
  }

  return readinessPath
}

export function getRuntimeProviderLaneBehavior(
  inputs: StackInputs,
  providerId: string,
  lane: "preview" | "main"
): RuntimeProviderLaneBehavior {
  const provider = getRuntimeProvider(inputs, providerId)
  return runtimeProviderLaneBehaviorSchema.parse(
    provider.orchestration?.lanes?.[lane] ?? {}
  )
}

export function getRuntimeProviderOutputPolicy(
  inputs: StackInputs,
  providerId: string,
  outputId: string
): RuntimeProviderPolicy {
  const provider = getRuntimeProvider(inputs, providerId)
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

export function getRuntimeProviderMeiliKeyPolicy(
  inputs: StackInputs,
  providerId: string,
  outputId: string
): RuntimeProviderMeiliKeyPolicy {
  const policy = getRuntimeProviderOutputPolicy(inputs, providerId, outputId)
  if (!(policy.uid && policy.description)) {
    throw new Error(
      `Missing meili policy uid/description for provider ${providerId} output ${outputId}.`
    )
  }

  return {
    uid: policy.uid,
    description: policy.description,
    actions: policy.actions,
    indexes: policy.indexes,
  }
}

export function listRuntimeProviderConsumerServiceIds(
  inputs: StackInputs,
  providerId: string
): string[] {
  const provider = getRuntimeProvider(inputs, providerId)

  return [
    ...new Set(
      provider.outputs.flatMap((output) =>
        output.target_envs.map((target) => target.service_id)
      )
    ),
  ]
}

export function listRuntimeProviderOutputTargets(
  inputs: StackInputs,
  providerId: string,
  outputId: string
): RuntimeProviderOutputTarget[] {
  const provider = getRuntimeProvider(inputs, providerId)
  const output = provider.outputs.find(
    (candidate) => candidate.output_id === outputId
  )
  if (!output) {
    throw new Error(
      `Missing output ${outputId} for runtime provider ${providerId}.`
    )
  }

  return output.target_envs
}

export function listLocalRuntimeProviderOutputAliases(
  inputs: StackInputs,
  providerId: string,
  outputId: string,
  serviceIds: string[] = []
): LocalRuntimeProviderOutputAlias[] {
  const serviceIdSet = serviceIds.length > 0 ? new Set(serviceIds) : null
  const aliases = inputs.local_env_aliases.runtime_provider_outputs.filter(
    (alias) =>
      alias.provider_id === providerId &&
      alias.output_id === outputId &&
      (!serviceIdSet || serviceIdSet.has(alias.service_id))
  )

  for (const alias of aliases) {
    const runtimeEnvVar = getRuntimeProviderTargetEnvVar(
      inputs,
      providerId,
      outputId,
      alias.service_id
    )
    if (runtimeEnvVar !== alias.env_var) {
      throw new Error(
        `Local env alias mismatch for ${providerId}.${outputId}.${alias.service_id}: target_envs uses ${runtimeEnvVar}, local alias references ${alias.env_var}.`
      )
    }
  }

  if (serviceIds.length > 0) {
    const matchedServiceIds = new Set(aliases.map((alias) => alias.service_id))
    const missingServiceIds = serviceIds.filter(
      (serviceId) => !matchedServiceIds.has(serviceId)
    )
    if (missingServiceIds.length > 0) {
      throw new Error(
        `Missing local env alias for ${providerId}.${outputId} service(s): ${missingServiceIds.join(",")}.`
      )
    }
  }

  return aliases
}

export function listRuntimeProviderOutputIds(
  inputs: StackInputs,
  providerId: string
): string[] {
  return getRuntimeProvider(inputs, providerId).outputs.map(
    (output) => output.output_id
  )
}

export function listRuntimeProviderTargetsForService(
  inputs: StackInputs,
  serviceId: string
): Array<{
  provider_id: string
  output_id: string
  env_var: string
}> {
  return inputs.runtime_providers.providers.flatMap((provider) =>
    provider.outputs.flatMap((output) =>
      output.target_envs.flatMap((target) =>
        target.service_id === serviceId
          ? [
              {
                provider_id: provider.provider_id,
                output_id: output.output_id,
                env_var: target.env_var,
              },
            ]
          : []
      )
    )
  )
}

export function listRuntimeProviderTargetsForServiceInLane(
  inputs: StackInputs,
  lane: "preview" | "main",
  serviceId: string
): Array<{
  provider_id: string
  output_id: string
  env_var: string
}> {
  return listRuntimeProviderTargetsForService(inputs, serviceId).filter(
    (target) =>
      getRuntimeProviderLaneBehavior(inputs, target.provider_id, lane).enabled
  )
}

export function listRuntimeProviderServiceIds(
  inputs: StackInputs,
  providerId: string
): string[] {
  const sourceServiceId = getRuntimeProviderSourceServiceId(inputs, providerId)
  return [
    ...new Set([
      sourceServiceId,
      ...listRuntimeProviderConsumerServiceIds(inputs, providerId),
    ]),
  ]
}

export function listActiveRuntimeProviderIds(inputs: StackInputs): string[] {
  return inputs.runtime_providers.providers
    .filter((provider) => (provider.status ?? "active") === "active")
    .map((provider) => provider.provider_id)
}

export function listActiveRuntimeProviderIdsForLane(
  inputs: StackInputs,
  lane: "preview" | "main"
): string[] {
  return listActiveRuntimeProviderIds(inputs).filter(
    (providerId) =>
      getRuntimeProviderLaneBehavior(inputs, providerId, lane).enabled
  )
}

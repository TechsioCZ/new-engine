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
})

export type StackInputs = z.infer<typeof stackInputsSchema>
export type PreviewRandomOnceSecretDefinition = z.infer<
  typeof previewRandomOnceSecretSchema
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

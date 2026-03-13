import { z } from "zod"

const secretTargetSchema = z.looseObject({
  service_id: z.string().min(1),
  env_var: z.string().min(1),
})

const previewRandomOnceSecretSchema = z.looseObject({
  secret_id: z.string().min(1),
  scope: z.string().optional(),
  lifecycle: z.string().optional(),
  targets: z.array(secretTargetSchema).default([]),
})

const providerOutputTargetSchema = z.looseObject({
  service_id: z.string().min(1),
  env_var: z.string().min(1),
})

const providerOutputSchema = z.looseObject({
  output_id: z.string().min(1),
  target_envs: z.array(providerOutputTargetSchema).default([]),
})

const runtimeProviderSchema = z.looseObject({
  provider_id: z.string().min(1),
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

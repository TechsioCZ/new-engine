import { z } from "zod"

const runtimeProviderPolicySchema = z.looseObject({
  kind: z.string().min(1),
})

const runtimeProviderOutputPayloadSchema = z.looseObject({
  output_id: z.string().min(1),
  env_var: z.string().min(1),
  policy: runtimeProviderPolicySchema,
})

export const runtimeProviderRunPayloadSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  provider_id: z.string().min(1),
  service_slug: z.string().min(1),
  readiness_path: z.string().min(1),
  outputs: z.array(runtimeProviderOutputPayloadSchema).min(1),
})

const runtimeProviderOutputResultSchema = z.object({
  output_id: z.string().min(1),
  env_var: z.string().min(1),
  value: z.string().min(1),
  created: z.boolean(),
  updated: z.boolean(),
})

export const runtimeProviderRunResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  provider_id: z.string().min(1),
  service_slug: z.string().min(1),
  source_url: z.string().min(1),
  outputs: z.array(runtimeProviderOutputResultSchema).min(1),
})

export type RuntimeProviderRunPayload = z.infer<
  typeof runtimeProviderRunPayloadSchema
>
export type RuntimeProviderRunResponse = z.infer<
  typeof runtimeProviderRunResponseSchema
>

import { z } from "zod"

const meiliKeyPolicySchema = z.object({
  uid: z.string().min(1),
  description: z.string().min(1),
  actions: z.array(z.string().min(1)),
  indexes: z.array(z.string().min(1)),
})

const meiliOutputSchema = z.object({
  env_var: z.string().min(1),
  policy: meiliKeyPolicySchema,
})

export const provisionMeiliKeysPayloadSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  service_slug: z.string().min(1),
  readiness_path: z.string().min(1),
  backend_output: meiliOutputSchema,
  frontend_output: meiliOutputSchema,
})

export const provisionMeiliKeysResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  service_slug: z.string().min(1),
  meili_url: z.string().min(1),
  backend_key: z.string().min(1),
  backend_env_var: z.string().min(1),
  backend_created: z.boolean(),
  backend_updated: z.boolean(),
  frontend_key: z.string().min(1),
  frontend_env_var: z.string().min(1),
  frontend_created: z.boolean(),
  frontend_updated: z.boolean(),
})

export type ProvisionMeiliKeysResponse = z.infer<
  typeof provisionMeiliKeysResponseSchema
>
export type ProvisionMeiliKeysPayload = z.infer<
  typeof provisionMeiliKeysPayloadSchema
>

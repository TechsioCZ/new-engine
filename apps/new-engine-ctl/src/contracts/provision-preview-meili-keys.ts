import { z } from "zod"

const meiliKeyPolicySchema = z.object({
  uid: z.string().min(1),
  description: z.string().min(1),
  actions: z.array(z.string().min(1)),
  indexes: z.array(z.string().min(1)),
})

const previewMeiliOutputSchema = z.object({
  env_var: z.string().min(1),
  policy: meiliKeyPolicySchema,
})

export const provisionPreviewMeiliKeysPayloadSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  service_slug: z.string().min(1),
  readiness_path: z.string().min(1),
  backend_output: previewMeiliOutputSchema,
  frontend_output: previewMeiliOutputSchema,
})

export const provisionPreviewMeiliKeysResponseSchema = z.object({
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

export type ProvisionPreviewMeiliKeysResponse = z.infer<
  typeof provisionPreviewMeiliKeysResponseSchema
>
export type ProvisionPreviewMeiliKeysPayload = z.infer<
  typeof provisionPreviewMeiliKeysPayloadSchema
>

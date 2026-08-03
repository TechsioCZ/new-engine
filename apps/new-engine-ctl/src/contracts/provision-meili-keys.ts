import { z } from "zod"

const provisionMeiliKeysResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  service_slug: z.string().min(1),
  meili_url: z.string().min(1),
  backend_key: z.string(),
  backend_env_var: z.string().min(1),
  backend_created: z.boolean(),
  backend_updated: z.boolean(),
  frontend_key: z.string(),
  frontend_env_var: z.string().min(1),
  frontend_created: z.boolean(),
  frontend_updated: z.boolean(),
})

export type ProvisionMeiliKeysResponse = z.infer<
  typeof provisionMeiliKeysResponseSchema
>

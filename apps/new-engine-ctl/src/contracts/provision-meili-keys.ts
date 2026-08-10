import { z } from "zod"

const provisionMeiliKeysResponseSchema = z.object({
  backend_created: z.boolean(),
  backend_env_var: z.string().min(1),
  backend_key: z.string(),
  backend_updated: z.boolean(),
  environment_name: z.string().min(1),
  frontend_created: z.boolean(),
  frontend_env_var: z.string().min(1),
  frontend_key: z.string(),
  frontend_updated: z.boolean(),
  meili_url: z.string().min(1),
  project_slug: z.string().min(1),
  service_slug: z.string().min(1),
})

export type ProvisionMeiliKeysResponse = z.infer<
  typeof provisionMeiliKeysResponseSchema
>

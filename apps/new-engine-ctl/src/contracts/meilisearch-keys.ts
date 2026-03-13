import { z } from "zod"

export const meiliProvisionResponseSchema = z.object({
  meili_url: z.string().min(1),
  backend_key: z.string().min(1),
  frontend_key: z.string().min(1),
  backend_uid: z.string().min(1),
  frontend_uid: z.string().min(1),
  backend_created: z.boolean(),
  frontend_created: z.boolean(),
  backend_updated: z.boolean(),
  frontend_updated: z.boolean(),
  backend_env_var: z.string().min(1),
  frontend_env_var: z.string().min(1),
})

export const meiliVerifyResponseSchema = z.object({
  meili_url: z.string().min(1),
  backend_uid: z.string().min(1),
  frontend_uid: z.string().min(1),
  backend_description: z.string().min(1),
  frontend_description: z.string().min(1),
  backend_policy_actions: z.array(z.string()),
  backend_policy_indexes: z.array(z.string()),
  frontend_policy_actions: z.array(z.string()),
  frontend_policy_indexes: z.array(z.string()),
  result: z.literal("ok"),
})

export type MeiliProvisionResponse = z.infer<
  typeof meiliProvisionResponseSchema
>
export type MeiliVerifyResponse = z.infer<typeof meiliVerifyResponseSchema>

import { z } from "zod"

export const meiliApiCredentialsCommandInputSchema = z
  .object({
    dryRun: z.boolean().default(false),
    masterKey: z.string().default(""),
    meiliUrl: z.string().default(""),
    outputJson: z.string().min(1).optional(),
    providerId: z.string().min(1).default("meili_api_credentials"),
    retryCount: z.number().int().nonnegative().default(3),
    retryDelaySeconds: z.number().int().nonnegative().default(2),
    stackInputsPath: z.string().min(1),
    stackManifestPath: z.string().min(1),
    timeoutSeconds: z.number().int().positive().default(20),
    waitSeconds: z.number().int().positive().default(60),
  })
  .superRefine((value, ctx) => {
    if (!(value.dryRun || value.meiliUrl)) {
      ctx.addIssue({
        code: "custom",
        message: "Meilisearch URL is required.",
        path: ["meiliUrl"],
      })
    }

    if (!(value.dryRun || value.masterKey)) {
      ctx.addIssue({
        code: "custom",
        message: "Meilisearch master key is required.",
        path: ["masterKey"],
      })
    }
  })

export const meiliApiCredentialsResponseSchema = z.object({
  backend_created: z.boolean(),
  backend_env_var: z.string().min(1),
  backend_key: z.string().min(1),
  backend_uid: z.string().min(1),
  backend_updated: z.boolean(),
  frontend_created: z.boolean(),
  frontend_env_var: z.string().min(1),
  frontend_key: z.string().min(1),
  frontend_uid: z.string().min(1),
  frontend_updated: z.boolean(),
  meili_url: z.string(),
  verified: z.boolean(),
})

export type MeiliApiCredentialsCommandInput = z.infer<
  typeof meiliApiCredentialsCommandInputSchema
>
export type MeiliApiCredentialsResponse = z.infer<
  typeof meiliApiCredentialsResponseSchema
>

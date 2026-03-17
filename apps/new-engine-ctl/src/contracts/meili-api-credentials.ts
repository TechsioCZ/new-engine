import { z } from "zod"

export const meiliApiCredentialsCommandInputSchema = z
  .object({
    meiliUrl: z.string().default(""),
    masterKey: z.string().default(""),
    outputJson: z.string().min(1).optional(),
    dryRun: z.boolean().default(false),
    providerId: z.string().min(1).default("meili_api_credentials"),
    waitSeconds: z.number().int().positive().default(60),
    retryCount: z.number().int().nonnegative().default(3),
    retryDelaySeconds: z.number().int().nonnegative().default(2),
    stackManifestPath: z.string().min(1),
    stackInputsPath: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (!(value.dryRun || value.meiliUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meiliUrl"],
        message: "Meilisearch URL is required.",
      })
    }

    if (!(value.dryRun || value.masterKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["masterKey"],
        message: "Meilisearch master key is required.",
      })
    }
  })

export const meiliApiCredentialsResponseSchema = z.object({
  meili_url: z.string(),
  backend_env_var: z.string().min(1),
  frontend_env_var: z.string().min(1),
  backend_uid: z.string().min(1),
  frontend_uid: z.string().min(1),
  backend_created: z.boolean(),
  frontend_created: z.boolean(),
  backend_updated: z.boolean(),
  frontend_updated: z.boolean(),
  backend_key: z.string().min(1),
  frontend_key: z.string().min(1),
  verified: z.boolean(),
})

export type MeiliApiCredentialsCommandInput = z.infer<
  typeof meiliApiCredentialsCommandInputSchema
>
export type MeiliApiCredentialsResponse = z.infer<
  typeof meiliApiCredentialsResponseSchema
>

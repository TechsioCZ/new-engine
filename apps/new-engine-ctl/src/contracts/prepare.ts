import { z } from "zod"

export const prepareCommandInputSchema = z
  .object({
    lane: z.enum(["preview", "main"]),
    projectSlug: z.string().default(""),
    prNumber: z.number().int().positive().optional(),
    requiresPreviewDb: z.boolean().default(false),
    requiresMeiliKeys: z.boolean().default(false),
    meiliUrl: z.string().default(""),
    meiliMasterKey: z.string().default(""),
    meiliWaitSeconds: z.number().int().positive().default(60),
    outputJson: z.string().min(1).optional(),
    baseUrl: z.string().default(""),
    apiToken: z.string().default(""),
    dryRun: z.boolean().default(false),
    stackManifestPath: z.string().min(1),
    stackInputsPath: z.string().min(1),
    previewEnvPrefix: z.string().min(1).default("pr-"),
    searchCredentialsProviderId: z
      .string()
      .min(1)
      .default("search_credentials"),
    timeoutSeconds: z.number().int().positive().default(20),
    retryCount: z.number().int().nonnegative().default(3),
    retryDelaySeconds: z.number().int().nonnegative().default(2),
  })
  .superRefine((value, ctx) => {
    if (value.lane === "preview") {
      if (typeof value.prNumber !== "number") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["prNumber"],
          message: "PR number is required for preview prepare.",
        })
      }

      if (value.requiresPreviewDb && !value.dryRun && !value.baseUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["baseUrl"],
          message: "Zane operator base URL is required.",
        })
      }

      if (value.requiresPreviewDb && !value.dryRun && !value.apiToken) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["apiToken"],
          message: "Zane operator API token is required.",
        })
      }

      return
    }

    if (value.requiresMeiliKeys && !value.meiliUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meiliUrl"],
        message: "Meilisearch URL is required.",
      })
    }

    if (value.requiresMeiliKeys && !value.meiliMasterKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meiliMasterKey"],
        message: "Meilisearch master key is required.",
      })
    }
  })

const previewPrepareResponseSchema = z.object({
  lane: z.literal("preview"),
  prepared: z.boolean(),
  requires_preview_db: z.boolean(),
  preview_db_created: z.boolean(),
  preview_db_name: z.string(),
  preview_db_user: z.string(),
  preview_db_password_redacted: z.boolean(),
})

const mainPrepareResponseSchema = z.object({
  lane: z.literal("main"),
  prepared: z.boolean(),
  requires_meili_keys: z.boolean(),
  meili_url: z.string(),
  meili_backend_env_var: z.string(),
  meili_backend_uid: z.string(),
  meili_backend_created: z.boolean(),
  meili_backend_updated: z.boolean(),
  meili_frontend_env_var: z.string(),
  meili_frontend_uid: z.string(),
  meili_frontend_created: z.boolean(),
  meili_frontend_updated: z.boolean(),
  meili_verified: z.boolean(),
})

export const prepareResponseSchema = z.discriminatedUnion("lane", [
  previewPrepareResponseSchema,
  mainPrepareResponseSchema,
])

export type PrepareCommandInput = z.infer<typeof prepareCommandInputSchema>
export type PrepareResponse = z.infer<typeof prepareResponseSchema>

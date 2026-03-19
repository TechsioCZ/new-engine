import { z } from "zod"

export const prepareCommandInputSchema = z
  .object({
    lane: z.enum(["preview", "main"]),
    projectSlug: z.string().default(""),
    prNumber: z.number().int().positive().optional(),
    requiresPreviewDb: z.boolean().default(false),
    outputJson: z.string().min(1).optional(),
    baseUrl: z.string().default(""),
    apiToken: z.string().default(""),
    dryRun: z.boolean().default(false),
    stackManifestPath: z.string().min(1),
    stackInputsPath: z.string().min(1),
    previewEnvPrefix: z.string().min(1).default("pr-"),
    timeoutSeconds: z.number().int().positive().default(20),
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

      if (!value.dryRun && !value.baseUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["baseUrl"],
          message: "Zane operator base URL is required.",
        })
      }

      if (!value.dryRun && !value.apiToken) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["apiToken"],
          message: "Zane operator API token is required.",
        })
      }

      return
    }

    return
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
  note: z.string(),
})

export const prepareResponseSchema = z.discriminatedUnion("lane", [
  previewPrepareResponseSchema,
  mainPrepareResponseSchema,
])

export type PrepareCommandInput = z.infer<typeof prepareCommandInputSchema>
export type PrepareResponse = z.infer<typeof prepareResponseSchema>

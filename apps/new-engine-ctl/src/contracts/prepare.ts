import { z } from "zod"

export const prepareCommandInputSchema = z
  .object({
    apiToken: z.string().default(""),
    baseUrl: z.string().default(""),
    dryRun: z.boolean().default(false),
    lane: z.enum(["preview", "main"]),
    outputJson: z.string().min(1).optional(),
    prNumber: z.number().int().positive().optional(),
    previewEnvPrefix: z.string().min(1).default("pr-"),
    projectSlug: z.string().default(""),
    requiresPreviewDb: z.boolean().default(false),
    stackInputsPath: z.string().min(1),
    stackManifestPath: z.string().min(1),
    timeoutSeconds: z.number().int().positive().default(20),
  })
  .superRefine((value, ctx) => {
    if (value.lane === "preview") {
      if (typeof value.prNumber !== "number") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "PR number is required for preview prepare.",
          path: ["prNumber"],
        })
      }

      if (!(value.dryRun || value.baseUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Zane operator base URL is required.",
          path: ["baseUrl"],
        })
      }

      if (!(value.dryRun || value.apiToken)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Zane operator API token is required.",
          path: ["apiToken"],
        })
      }

      return
    }

    return
  })

const previewPrepareResponseSchema = z.object({
  lane: z.literal("preview"),
  prepared: z.boolean(),
  preview_db_created: z.boolean(),
  preview_db_name: z.string(),
  preview_db_password_redacted: z.boolean(),
  preview_db_user: z.string(),
  requires_preview_db: z.boolean(),
})

const mainPrepareResponseSchema = z.object({
  lane: z.literal("main"),
  note: z.string(),
  prepared: z.boolean(),
})

export const prepareResponseSchema = z.discriminatedUnion("lane", [
  previewPrepareResponseSchema,
  mainPrepareResponseSchema,
])

export type PrepareCommandInput = z.infer<typeof prepareCommandInputSchema>
export type PrepareResponse = z.infer<typeof prepareResponseSchema>

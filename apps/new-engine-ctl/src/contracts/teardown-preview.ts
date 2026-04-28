import { z } from "zod"

export const teardownPreviewCommandInputSchema = z
  .object({
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    prNumber: z.number().int().positive(),
    baseUrl: z.string().default(""),
    apiToken: z.string().default(""),
    previewEnvPrefix: z.string().min(1).default("pr-"),
    outputJson: z.string().min(1).optional(),
    dryRun: z.boolean().default(false),
    timeoutSeconds: z.number().int().positive().default(20),
    retryCount: z.number().int().nonnegative().default(3),
    retryDelaySeconds: z.number().int().nonnegative().default(2),
  })
  .superRefine((value, ctx) => {
    if (!(value.dryRun || value.baseUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baseUrl"],
        message: "Zane operator base URL is required.",
      })
    }

    if (!(value.dryRun || value.apiToken)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["apiToken"],
        message: "Zane operator API token is required.",
      })
    }
  })

const teardownEnvironmentResultSchema = z.object({
  ok: z.boolean(),
  http_code: z.number().int(),
  status: z.string(),
  deleted: z.boolean(),
  environment_name: z.string(),
  noop: z.boolean(),
  noop_reason: z.string().nullable(),
  error: z.string().nullable(),
})

const teardownDbResultSchema = z.object({
  ok: z.boolean(),
  http_code: z.number().int(),
  status: z.string(),
  deleted: z.boolean(),
  db_name: z.string(),
  noop: z.boolean(),
  noop_reason: z.string().nullable(),
  role_deleted: z.boolean(),
  dev_grants_cleaned: z.boolean(),
  error: z.string().nullable(),
})

export const teardownPreviewResponseSchema = z.object({
  project_slug: z.string().min(1),
  pr_number: z.number().int().positive(),
  environment: teardownEnvironmentResultSchema,
  preview_db: teardownDbResultSchema,
  success: z.boolean(),
})

export type TeardownPreviewCommandInput = z.infer<
  typeof teardownPreviewCommandInputSchema
>
export type TeardownPreviewResponse = z.infer<
  typeof teardownPreviewResponseSchema
>

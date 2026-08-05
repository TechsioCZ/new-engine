import { z } from "zod"

export const teardownPreviewCommandInputSchema = z
  .object({
    apiToken: z.string().default(""),
    baseUrl: z.string().default(""),
    dryRun: z.boolean().default(false),
    outputJson: z.string().min(1).optional(),
    prNumber: z.number().int().positive(),
    previewEnvPrefix: z.string().min(1).default("pr-"),
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    retryCount: z.number().int().nonnegative().default(3),
    retryDelaySeconds: z.number().int().nonnegative().default(2),
    timeoutSeconds: z.number().int().positive().default(20),
  })
  .superRefine((value, ctx) => {
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
  })

const teardownEnvironmentResultSchema = z.object({
  deleted: z.boolean(),
  environment_name: z.string(),
  error: z.string().nullable(),
  http_code: z.number().int(),
  noop: z.boolean(),
  noop_reason: z.string().nullable(),
  ok: z.boolean(),
  status: z.string(),
})

const teardownDbResultSchema = z.object({
  db_name: z.string(),
  deleted: z.boolean(),
  dev_grants_cleaned: z.boolean(),
  error: z.string().nullable(),
  http_code: z.number().int(),
  noop: z.boolean(),
  noop_reason: z.string().nullable(),
  ok: z.boolean(),
  role_deleted: z.boolean(),
  status: z.string(),
})

export const teardownPreviewResponseSchema = z.object({
  environment: teardownEnvironmentResultSchema,
  pr_number: z.number().int().positive(),
  preview_db: teardownDbResultSchema,
  project_slug: z.string().min(1),
  success: z.boolean(),
})

export type TeardownPreviewCommandInput = z.infer<
  typeof teardownPreviewCommandInputSchema
>
export type TeardownPreviewResponse = z.infer<
  typeof teardownPreviewResponseSchema
>

import { z } from "zod"

export const previewCommitStateCommandInputSchema = z
  .object({
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    prNumber: z.number().int().positive().optional(),
    environmentName: z.string().default(""),
    outputJson: z.string().min(1).optional(),
    baseUrl: z.string().default(""),
    apiToken: z.string().default(""),
    dryRun: z.boolean().default(false),
    previewEnvPrefix: z.string().min(1).default("pr-"),
  })
  .superRefine((value, ctx) => {
    if (!(value.environmentName || value.prNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prNumber"],
        message: "Preview commit state requires PR number or environment name.",
      })
    }

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

export const previewCommitStateResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  environment_exists: z.boolean(),
  baseline_complete: z.boolean().default(false),
  target_commit_sha: z.string().nullable(),
  last_deployed_commit_sha: z.string().nullable(),
})

export type PreviewCommitStateCommandInput = z.infer<
  typeof previewCommitStateCommandInputSchema
>
export type PreviewCommitStateResponse = z.infer<
  typeof previewCommitStateResponseSchema
>

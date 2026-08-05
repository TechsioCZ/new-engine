import { z } from "zod"

export const previewCommitStateCommandInputSchema = z
  .object({
    apiToken: z.string().default(""),
    baseUrl: z.string().default(""),
    dryRun: z.boolean().default(false),
    environmentName: z.string().default(""),
    outputJson: z.string().min(1).optional(),
    prNumber: z.number().int().positive().optional(),
    previewEnvPrefix: z.string().min(1).default("pr-"),
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
  })
  .superRefine((value, ctx) => {
    if (!(value.environmentName || value.prNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Preview commit state requires PR number or environment name.",
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
  })

export const previewCommitStateResponseSchema = z.object({
  baseline_complete: z.boolean().default(false),
  environment_exists: z.boolean(),
  environment_name: z.string().min(1),
  last_deployed_commit_sha: z.string().nullable(),
  project_slug: z.string().min(1),
  target_commit_sha: z.string().nullable(),
})

export type PreviewCommitStateCommandInput = z.infer<
  typeof previewCommitStateCommandInputSchema
>
export type PreviewCommitStateResponse = z.infer<
  typeof previewCommitStateResponseSchema
>

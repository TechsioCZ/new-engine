import { z } from "zod"

const deployPreviewCommandInputSchemaBase = z.object({
  apiToken: z.string().default(""),
  baseUrl: z.string().default(""),
  dryRun: z.boolean().default(false),
  dryRunCreated: z.boolean().default(false),
  meiliApiCredentialsProviderId: z
    .string()
    .min(1)
    .default("meili_api_credentials"),
  outputJson: z.string().min(1).optional(),
  pollIntervalSeconds: z.number().int().positive().default(10),
  prNumber: z.number().int().positive(),
  previewDbName: z.string().default(""),
  previewDbPassword: z.string().default(""),
  previewDbUser: z.string().default(""),
  previewEnvPrefix: z.string().min(1).default("pr-"),
  projectSlug: z.string().min(1, "Zane canonical project slug is required."),
  servicesCsv: z.string().default(""),
  sourceEnvironmentName: z.string().default(""),
  stackInputsPath: z.string().min(1),
  stackManifestPath: z.string().min(1),
  targetCommitSha: z.string().default(""),
  waitTimeoutSeconds: z.number().int().positive().default(900),
})

export const deployPreviewCommandInputSchema =
  deployPreviewCommandInputSchemaBase.superRefine((value, ctx) => {
    if (!(value.dryRun || value.sourceEnvironmentName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Canonical source environment name is required.",
        path: ["sourceEnvironmentName"],
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

    if (!(value.dryRun || value.targetCommitSha)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Preview target commit SHA is required.",
        path: ["targetCommitSha"],
      })
    }
  })

export const deployPreviewResponseSchema = z.object({
  deploy_services_csv: z.string(),
  deployments: z.array(z.unknown()),
  env_override_service_ids_csv: z.string(),
  environment_created: z.boolean(),
  environment_id: z.string().min(1),
  environment_name: z.string().min(1),
  environment_ready: z.boolean(),
  environment_warnings: z.array(z.unknown()),
  lane: z.literal("preview"),
  last_deployed_commit_sha: z.string().nullable().optional(),
  preview_cloned_service_ids_csv: z.string(),
  preview_excluded_service_ids_csv: z.string(),
  project_slug: z.string().min(1),
  requested_services_csv: z.string(),
  target_commit_sha: z.string().nullable().optional(),
  triggered_services_csv: z.string(),
})

export type DeployPreviewCommandInput = z.infer<
  typeof deployPreviewCommandInputSchema
>
export type DeployPreviewResponse = z.infer<typeof deployPreviewResponseSchema>

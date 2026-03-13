import { z } from "zod"

const deployPreviewCommandInputSchemaBase = z.object({
  projectSlug: z.string().min(1, "Zane canonical project slug is required."),
  prNumber: z.number().int().positive(),
  servicesCsv: z.string().default(""),
  sourceEnvironmentName: z.string().default(""),
  previewDbName: z.string().default(""),
  previewDbUser: z.string().default(""),
  previewDbPassword: z.string().default(""),
  meiliBackendKey: z.string().default(""),
  meiliFrontendKey: z.string().default(""),
  meiliFrontendEnvVar: z.string().default(""),
  outputJson: z.string().min(1).optional(),
  baseUrl: z.string().default(""),
  apiToken: z.string().default(""),
  dryRun: z.boolean().default(false),
  dryRunCreated: z.boolean().default(false),
  stackManifestPath: z.string().min(1),
  stackInputsPath: z.string().min(1),
  previewEnvPrefix: z.string().min(1).default("pr-"),
  meiliApiCredentialsProviderId: z
    .string()
    .min(1)
    .default("meili_api_credentials"),
  pollIntervalSeconds: z.number().int().positive().default(10),
  waitTimeoutSeconds: z.number().int().positive().default(900),
})

export const deployPreviewCommandInputSchema =
  deployPreviewCommandInputSchemaBase.superRefine((value, ctx) => {
    if (!(value.dryRun || value.sourceEnvironmentName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sourceEnvironmentName"],
        message: "Canonical source environment name is required.",
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

export const deployPreviewResponseSchema = z.object({
  lane: z.literal("preview"),
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  environment_id: z.string().min(1),
  environment_created: z.boolean(),
  environment_ready: z.boolean(),
  preview_cloned_service_ids_csv: z.string(),
  preview_excluded_service_ids_csv: z.string(),
  environment_warnings: z.array(z.unknown()),
  requested_services_csv: z.string(),
  deploy_services_csv: z.string(),
  env_override_service_ids_csv: z.string(),
  triggered_services_csv: z.string(),
  meili_frontend_env_var: z.string(),
  meili_keys_provisioned: z.boolean(),
  deployments: z.array(z.unknown()),
})

export type DeployPreviewCommandInput = z.infer<
  typeof deployPreviewCommandInputSchema
>
export type DeployPreviewResponse = z.infer<typeof deployPreviewResponseSchema>

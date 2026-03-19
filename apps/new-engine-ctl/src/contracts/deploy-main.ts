import { z } from "zod"

export const deployMainCommandInputSchema = z
  .object({
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    environmentName: z.string().min(1, "Environment name is required."),
    servicesCsv: z.string().default(""),
    gitCommitSha: z.string().min(1).optional(),
    outputJson: z.string().min(1).optional(),
    baseUrl: z.string().default(""),
    apiToken: z.string().default(""),
    dryRun: z.boolean().default(false),
    approveDowntimeRisk: z.boolean().default(false),
    stackManifestPath: z.string().min(1),
    stackInputsPath: z.string().min(1),
    meiliApiCredentialsProviderId: z
      .string()
      .min(1)
      .default("meili_api_credentials"),
    meiliWaitSeconds: z.number().int().positive().default(60),
    retryCount: z.number().int().nonnegative().default(3),
    retryDelaySeconds: z.number().int().nonnegative().default(2),
    pollIntervalSeconds: z.number().int().positive().default(10),
    waitTimeoutSeconds: z.number().int().positive().default(900),
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

export const deployMainResponseSchema = z.object({
  lane: z.literal("main"),
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  environment_id: z.string().min(1),
  environment_created: z.boolean(),
  requested_services_csv: z.string(),
  deploy_services_csv: z.string(),
  env_override_service_ids_csv: z.string(),
  triggered_services_csv: z.string(),
  skipped_services_csv: z.string(),
  meili_frontend_env_var: z.string(),
  meili_backend_created: z.boolean(),
  meili_backend_updated: z.boolean(),
  meili_frontend_created: z.boolean(),
  meili_frontend_updated: z.boolean(),
  meili_keys_reconciled: z.boolean(),
  meili_verified: z.boolean(),
  deployments: z.array(z.unknown()),
})

export type DeployMainCommandInput = z.infer<
  typeof deployMainCommandInputSchema
>
export type DeployMainResponse = z.infer<typeof deployMainResponseSchema>

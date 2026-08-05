import { z } from "zod"

export const deployMainCommandInputSchema = z
  .object({
    apiToken: z.string().default(""),
    approveDowntimeRisk: z.boolean().default(false),
    baseUrl: z.string().default(""),
    dryRun: z.boolean().default(false),
    environmentName: z.string().min(1, "Environment name is required."),
    gitCommitSha: z.string().min(1).optional(),
    meiliApiCredentialsProviderId: z
      .string()
      .min(1)
      .default("meili_api_credentials"),
    outputJson: z.string().min(1).optional(),
    pollIntervalSeconds: z.number().int().positive().default(10),
    projectSlug: z.string().min(1, "Zane canonical project slug is required."),
    servicesCsv: z.string().default(""),
    stackInputsPath: z.string().min(1),
    stackManifestPath: z.string().min(1),
    waitTimeoutSeconds: z.number().int().positive().default(900),
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

export const deployMainResponseSchema = z.object({
  deploy_services_csv: z.string(),
  deployments: z.array(z.unknown()),
  env_override_service_ids_csv: z.string(),
  environment_created: z.boolean(),
  environment_id: z.string().min(1),
  environment_name: z.string().min(1),
  lane: z.literal("main"),
  project_slug: z.string().min(1),
  requested_services_csv: z.string(),
  skipped_services_csv: z.string(),
  triggered_services_csv: z.string(),
})

export type DeployMainCommandInput = z.infer<
  typeof deployMainCommandInputSchema
>
export type DeployMainResponse = z.infer<typeof deployMainResponseSchema>

import { Command } from "commander"
import { z } from "zod"

import { applyEnvOverridesCommandInputSchema } from "../contracts/apply-env-overrides.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executeApplyEnvOverrides } from "../orchestration/apply-env-overrides.js"

const commandOptionsSchema = z.object({
  apiToken: z.string().optional(),
  baseUrl: z.string().optional(),
  dryRun: z.boolean(),
  envOverridesJson: z.string(),
  environmentName: z.string(),
  outputJson: z.string().optional(),
  projectSlug: z.string().optional(),
  targetsJson: z.string(),
})

export const createApplyEnvOverridesCommand = (): Command => {
  const command = new Command("apply-env-overrides")

  command
    .description("Apply rendered env overrides through zane-operator")
    .requiredOption("--environment-name <name>")
    .requiredOption("--targets-json <path>")
    .requiredOption("--env-overrides-json <path>")
    .option("--project-slug <slug>")
    .option("--output-json <path>")
    .option("--base-url <url>")
    .option("--api-token <token>")
    .option("--dry-run", "", false)
    .action(async (options: unknown) => {
      const parsedOptions = commandOptionsSchema.parse(options)
      const input = applyEnvOverridesCommandInputSchema.parse({
        apiToken:
          parsedOptions.apiToken ??
          process.env["ZANE_OPERATOR_API_TOKEN"] ??
          "",
        baseUrl:
          parsedOptions.baseUrl ?? process.env["ZANE_OPERATOR_BASE_URL"] ?? "",
        dryRun: parsedOptions.dryRun,
        envOverridesJsonPath: parsedOptions.envOverridesJson,
        environmentName: parsedOptions.environmentName,
        outputJson: parsedOptions.outputJson,
        projectSlug:
          parsedOptions.projectSlug ?? process.env["ZANE_PROJECT_SLUG"] ?? "",
        targetsJsonPath: parsedOptions.targetsJson,
      })
      const result = await executeApplyEnvOverrides(input)
      await appendGitHubOutput(
        "applied_service_ids_csv",
        result.applied_service_ids.join(","),
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

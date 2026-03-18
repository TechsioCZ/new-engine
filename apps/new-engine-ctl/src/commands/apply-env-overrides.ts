import { Command } from "commander"
import { applyEnvOverridesCommandInputSchema } from "../contracts/apply-env-overrides.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executeApplyEnvOverrides } from "../orchestration/apply-env-overrides.js"

export function createApplyEnvOverridesCommand(): Command {
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
    .action(async (options) => {
      const input = applyEnvOverridesCommandInputSchema.parse({
        projectSlug: options.projectSlug ?? process.env.ZANE_PROJECT_SLUG ?? "",
        environmentName: options.environmentName,
        targetsJsonPath: options.targetsJson,
        envOverridesJsonPath: options.envOverridesJson,
        outputJson: options.outputJson,
        baseUrl: options.baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
        apiToken: options.apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
        dryRun: Boolean(options.dryRun),
      })
      const result = await executeApplyEnvOverrides(input)
      await appendGitHubOutput(
        "applied_service_ids_csv",
        result.applied_service_ids.join(",")
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

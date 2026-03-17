import { Command } from "commander"

import { previewCommitStateCommandInputSchema } from "../contracts/preview-commit-state.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executePreviewCommitState } from "../orchestration/preview-commit-state.js"

function buildPreviewCommitStateInput(options: Record<string, unknown>) {
  const parsedPrNumber =
    typeof options.prNumber === "string" && options.prNumber.trim()
      ? Number(options.prNumber)
      : undefined

  return previewCommitStateCommandInputSchema.parse({
    projectSlug:
      options.projectSlug ?? process.env.ZANE_CANONICAL_PROJECT_SLUG ?? "",
    prNumber: parsedPrNumber,
    environmentName: options.environmentName,
    outputJson: options.outputJson,
    baseUrl: options.baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
    apiToken: options.apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
    dryRun: Boolean(options.dryRun),
    previewEnvPrefix: process.env.ZANE_PREVIEW_ENV_PREFIX ?? "pr-",
  })
}

export function createPreviewCommitStateCommand(): Command {
  const command = new Command("preview-commit-state")

  command
    .description("Read preview environment commit state metadata")
    .option("--project-slug <slug>")
    .option("--pr-number <n>")
    .option("--environment-name <name>")
    .option("--output-json <path>")
    .option("--base-url <url>")
    .option("--api-token <token>")
    .option("--dry-run", "", false)
    .action(async (options) => {
      const input = buildPreviewCommitStateInput(options)
      const result = await executePreviewCommitState(input)
      await appendGitHubOutput("environment_name", result.environment_name)
      await appendGitHubOutput(
        "environment_exists",
        String(result.environment_exists)
      )
      await appendGitHubOutput(
        "target_commit_sha",
        result.target_commit_sha ?? ""
      )
      await appendGitHubOutput(
        "last_deployed_commit_sha",
        result.last_deployed_commit_sha ?? ""
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

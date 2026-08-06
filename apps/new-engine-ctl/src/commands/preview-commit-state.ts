import { Command } from "commander"
import { z } from "zod"

import { previewCommitStateCommandInputSchema } from "../contracts/preview-commit-state.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executePreviewCommitState } from "../orchestration/preview-commit-state.js"

const commandOptionsSchema = z.object({
  apiToken: z.string().optional(),
  baseUrl: z.string().optional(),
  dryRun: z.boolean(),
  environmentName: z.string().optional(),
  outputJson: z.string().optional(),
  prNumber: z.string().optional(),
  projectSlug: z.string().optional(),
})

const buildPreviewCommitStateInput = (
  options: z.infer<typeof commandOptionsSchema>,
) => {
  const {
    apiToken,
    baseUrl,
    dryRun,
    environmentName,
    outputJson,
    prNumber,
    projectSlug,
  } = options
  const parsedPrNumber =
    typeof prNumber === "string" && prNumber.trim()
      ? Number(prNumber)
      : undefined

  return previewCommitStateCommandInputSchema.parse({
    apiToken: apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
    baseUrl: baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
    dryRun,
    environmentName,
    outputJson,
    prNumber: parsedPrNumber,
    previewEnvPrefix: process.env.ZANE_PREVIEW_ENV_PREFIX ?? "pr-",
    projectSlug: projectSlug ?? process.env.ZANE_PROJECT_SLUG ?? "",
  })
}

export const createPreviewCommitStateCommand = (): Command => {
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
    .action(async (options: unknown) => {
      const parsedOptions = commandOptionsSchema.parse(options)
      const input = buildPreviewCommitStateInput(parsedOptions)
      const result = await executePreviewCommitState(input)
      await appendGitHubOutput("environment_name", result.environment_name)
      await appendGitHubOutput(
        "environment_exists",
        String(result.environment_exists),
      )
      await appendGitHubOutput(
        "baseline_complete",
        String(result.baseline_complete),
      )
      await appendGitHubOutput(
        "target_commit_sha",
        result.target_commit_sha ?? "",
      )
      await appendGitHubOutput(
        "last_deployed_commit_sha",
        result.last_deployed_commit_sha ?? "",
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

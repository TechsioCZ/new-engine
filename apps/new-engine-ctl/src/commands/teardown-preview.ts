import { Command } from "commander"
import { teardownPreviewCommandInputSchema } from "../contracts/teardown-preview.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executeTeardownPreview } from "../orchestration/teardown-preview.js"

function parseOptionalNumber(value: unknown): number | undefined {
  return typeof value === "string" && value.trim() ? Number(value) : undefined
}

function buildTeardownPreviewInput(options: Record<string, unknown>) {
  return teardownPreviewCommandInputSchema.parse({
    projectSlug: options.projectSlug ?? process.env.ZANE_PROJECT_SLUG ?? "",
    prNumber: Number(options.prNumber),
    baseUrl: options.baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
    apiToken: options.apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
    previewEnvPrefix:
      options.envPrefix ?? process.env.ZANE_PREVIEW_ENV_PREFIX ?? "pr-",
    outputJson: options.outputJson,
    dryRun: Boolean(options.dryRun),
    timeoutSeconds: parseOptionalNumber(options.timeoutSeconds),
    retryCount: parseOptionalNumber(options.retryCount),
    retryDelaySeconds: parseOptionalNumber(options.retryDelaySeconds),
  })
}

async function writeTeardownOutputs(
  result: Awaited<ReturnType<typeof executeTeardownPreview>>
): Promise<void> {
  await appendGitHubOutput(
    "environment_http_code",
    `${result.environment.http_code || ""}`
  )
  await appendGitHubOutput(
    "environment_name",
    result.environment.environment_name
  )
  await appendGitHubOutput("environment_noop", String(result.environment.noop))
  await appendGitHubOutput("environment_status", result.environment.status)
  await appendGitHubOutput(
    "environment_outcome",
    result.environment.ok ? "success" : "failure"
  )
  await appendGitHubOutput(
    "preview_db_http_code",
    `${result.preview_db.http_code || ""}`
  )
  await appendGitHubOutput("preview_db_status", result.preview_db.status)
  await appendGitHubOutput("preview_db_name", result.preview_db.db_name)
  await appendGitHubOutput("preview_db_noop", String(result.preview_db.noop))
  await appendGitHubOutput(
    "preview_db_outcome",
    result.preview_db.ok ? "success" : "failure"
  )
}

export function createTeardownPreviewCommand(): Command {
  const command = new Command("teardown-preview")

  command
    .description("Teardown preview environment and preview DB")
    .requiredOption("--pr-number <n>")
    .option("--project-slug <slug>")
    .option("--base-url <url>")
    .option("--api-token <token>")
    .option("--env-prefix <prefix>")
    .option("--output-json <path>")
    .option("--dry-run", "", false)
    .option("--timeout-seconds <n>")
    .option("--retry-count <n>")
    .option("--retry-delay-seconds <n>")
    .action(async (options) => {
      const input = buildTeardownPreviewInput(options)
      const result = await executeTeardownPreview(input)
      await writeTeardownOutputs(result)

      if (!result.success) {
        throw new Error("Preview teardown failed and requires manual retry.")
      }

      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

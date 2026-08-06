import { Command } from "commander"
import { z } from "zod"

import { teardownPreviewCommandInputSchema } from "../contracts/teardown-preview.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executeTeardownPreview } from "../orchestration/teardown-preview.js"

const commandOptionsSchema = z.object({
  apiToken: z.string().optional(),
  baseUrl: z.string().optional(),
  dryRun: z.boolean(),
  envPrefix: z.string().optional(),
  outputJson: z.string().optional(),
  prNumber: z.string(),
  projectSlug: z.string().optional(),
  retryCount: z.string().optional(),
  retryDelaySeconds: z.string().optional(),
  timeoutSeconds: z.string().optional(),
})

const parseOptionalNumber = (value: unknown): number | undefined =>
  typeof value === "string" && value.trim() ? Number(value) : undefined

const buildTeardownPreviewInput = (
  options: z.infer<typeof commandOptionsSchema>,
) => {
  const {
    apiToken,
    baseUrl,
    dryRun,
    envPrefix,
    outputJson,
    prNumber,
    projectSlug,
    retryCount,
    retryDelaySeconds,
    timeoutSeconds,
  } = options
  return teardownPreviewCommandInputSchema.parse({
    apiToken: apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
    baseUrl: baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
    dryRun,
    outputJson,
    prNumber: Number(prNumber),
    previewEnvPrefix: envPrefix ?? process.env.ZANE_PREVIEW_ENV_PREFIX ?? "pr-",
    projectSlug: projectSlug ?? process.env.ZANE_PROJECT_SLUG ?? "",
    retryCount: parseOptionalNumber(retryCount),
    retryDelaySeconds: parseOptionalNumber(retryDelaySeconds),
    timeoutSeconds: parseOptionalNumber(timeoutSeconds),
  })
}

const writeTeardownOutputs = async (
  result: Awaited<ReturnType<typeof executeTeardownPreview>>,
): Promise<void> => {
  await appendGitHubOutput(
    "environment_http_code",
    `${result.environment.http_code || ""}`,
  )
  await appendGitHubOutput(
    "environment_name",
    result.environment.environment_name,
  )
  await appendGitHubOutput("environment_noop", String(result.environment.noop))
  await appendGitHubOutput("environment_status", result.environment.status)
  await appendGitHubOutput(
    "environment_outcome",
    result.environment.ok ? "success" : "failure",
  )
  await appendGitHubOutput(
    "preview_db_http_code",
    `${result.preview_db.http_code || ""}`,
  )
  await appendGitHubOutput("preview_db_status", result.preview_db.status)
  await appendGitHubOutput("preview_db_name", result.preview_db.db_name)
  await appendGitHubOutput("preview_db_noop", String(result.preview_db.noop))
  await appendGitHubOutput(
    "preview_db_outcome",
    result.preview_db.ok ? "success" : "failure",
  )
}

export const createTeardownPreviewCommand = (): Command => {
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
    .action(async (options: unknown) => {
      const parsedOptions = commandOptionsSchema.parse(options)
      const input = buildTeardownPreviewInput(parsedOptions)
      const result = await executeTeardownPreview(input)
      await writeTeardownOutputs(result)

      if (!result.success) {
        throw new Error("Preview teardown failed and requires manual retry.")
      }

      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

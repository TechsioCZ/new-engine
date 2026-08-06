import { Command } from "commander"
import { z } from "zod"

import { prepareCommandInputSchema } from "../contracts/prepare.js"
import { appendGitHubOutput, maskGitHubValue } from "../github-actions.js"
import { executePrepare } from "../orchestration/prepare.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

const commandOptionsSchema = z.object({
  apiToken: z.string().optional(),
  baseUrl: z.string().optional(),
  dryRun: z.boolean(),
  lane: z.string(),
  outputJson: z.string().optional(),
  prNumber: z.string().optional(),
  projectSlug: z.string().optional(),
  requiresPreviewDb: z.boolean(),
  stackInputsPath: z.string(),
  stackManifestPath: z.string(),
  timeoutSeconds: z.string().optional(),
})

const parseOptionalNumber = (value: unknown): number | undefined =>
  typeof value === "string" && value.trim() ? Number(value) : undefined

const buildPrepareInput = (options: z.infer<typeof commandOptionsSchema>) => {
  const {
    apiToken,
    baseUrl,
    dryRun,
    lane,
    outputJson,
    prNumber,
    projectSlug,
    requiresPreviewDb,
    stackInputsPath,
    stackManifestPath,
    timeoutSeconds,
  } = options
  return prepareCommandInputSchema.parse({
    apiToken: apiToken ?? process.env["ZANE_OPERATOR_API_TOKEN"] ?? "",
    baseUrl: baseUrl ?? process.env["ZANE_OPERATOR_BASE_URL"] ?? "",
    dryRun,
    lane,
    outputJson,
    prNumber: parseOptionalNumber(prNumber),
    previewEnvPrefix: process.env["ZANE_PREVIEW_ENV_PREFIX"] ?? "pr-",
    projectSlug: projectSlug ?? process.env["ZANE_PROJECT_SLUG"] ?? "",
    requiresPreviewDb,
    stackInputsPath,
    stackManifestPath,
    timeoutSeconds: parseOptionalNumber(timeoutSeconds),
  })
}

const writePrepareOutputs = async (
  result: Awaited<ReturnType<typeof executePrepare>>,
): Promise<void> => {
  if (result.response.lane === "preview") {
    maskGitHubValue(result.previewDbPassword)
    await appendGitHubOutput(
      "preview_db_created",
      String(result.response.preview_db_created),
    )
    await appendGitHubOutput("preview_db_name", result.response.preview_db_name)
    await appendGitHubOutput("preview_db_user", result.response.preview_db_user)
    await appendGitHubOutput("preview_db_password", result.previewDbPassword)
  }
}

export const createPrepareCommand = (): Command => {
  const command = new Command("prepare")

  command
    .description("Run preview shared-resource prepare orchestration")
    .requiredOption("--lane <preview|main>")
    .option("--project-slug <slug>")
    .option("--pr-number <n>")
    .option("--requires-preview-db", "", false)
    .option("--output-json <path>")
    .option("--base-url <url>")
    .option("--api-token <token>")
    .option("--dry-run", "", false)
    .option("--timeout-seconds <n>")
    .option(
      "--stack-manifest-path <path>",
      "",
      process.env["STACK_MANIFEST_PATH"] ?? defaultStackManifestPath,
    )
    .option(
      "--stack-inputs-path <path>",
      "",
      process.env["STACK_INPUTS_PATH"] ?? defaultStackInputsPath,
    )
    .action(async (options: unknown) => {
      const parsedOptions = commandOptionsSchema.parse(options)
      const input = buildPrepareInput(parsedOptions)
      const result = await executePrepare(input)
      await writePrepareOutputs(result)
      process.stdout.write(`${JSON.stringify(result.response)}\n`)
    })

  return command
}

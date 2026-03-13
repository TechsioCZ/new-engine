import { Command } from "commander"
import { prepareCommandInputSchema } from "../contracts/prepare.js"
import { appendGitHubOutput, maskGitHubValue } from "../github-actions.js"
import { executePrepare } from "../orchestration/prepare.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

function parseOptionalNumber(value: unknown): number | undefined {
  return typeof value === "string" && value.trim() ? Number(value) : undefined
}

function buildPrepareInput(options: Record<string, unknown>) {
  return prepareCommandInputSchema.parse({
    lane: options.lane,
    projectSlug:
      options.projectSlug ?? process.env.ZANE_CANONICAL_PROJECT_SLUG ?? "",
    prNumber: parseOptionalNumber(options.prNumber),
    requiresPreviewDb: Boolean(options.requiresPreviewDb),
    requiresMeiliKeys: Boolean(options.requiresMeiliKeys),
    meiliUrl: options.meiliUrl ?? process.env.MEILISEARCH_URL ?? "",
    meiliMasterKey:
      options.meiliMasterKey ??
      process.env.MEILISEARCH_MASTER_KEY ??
      process.env.DC_MEILISEARCH_MASTER_KEY ??
      "",
    meiliWaitSeconds: parseOptionalNumber(options.meiliWaitSeconds),
    outputJson: options.outputJson,
    baseUrl: options.baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
    apiToken: options.apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
    dryRun: Boolean(options.dryRun),
    stackManifestPath: options.stackManifestPath,
    stackInputsPath: options.stackInputsPath,
    previewEnvPrefix: process.env.ZANE_PREVIEW_ENV_PREFIX ?? "pr-",
    searchCredentialsProviderId:
      process.env.ZANE_SEARCH_CREDENTIALS_PROVIDER_ID ?? "search_credentials",
    timeoutSeconds: parseOptionalNumber(options.timeoutSeconds),
    retryCount: parseOptionalNumber(options.retryCount),
    retryDelaySeconds: parseOptionalNumber(options.retryDelaySeconds),
  })
}

async function writePrepareOutputs(
  result: Awaited<ReturnType<typeof executePrepare>>
): Promise<void> {
  if (result.response.lane === "preview") {
    maskGitHubValue(result.previewDbPassword)
    await appendGitHubOutput(
      "preview_db_created",
      String(result.response.preview_db_created)
    )
    await appendGitHubOutput("preview_db_name", result.response.preview_db_name)
    await appendGitHubOutput("preview_db_user", result.response.preview_db_user)
    await appendGitHubOutput("preview_db_password", result.previewDbPassword)
    return
  }

  maskGitHubValue(result.meiliBackendKey)
  maskGitHubValue(result.meiliFrontendKey)
  await appendGitHubOutput("meili_backend_key", result.meiliBackendKey)
  await appendGitHubOutput("meili_frontend_key", result.meiliFrontendKey)
  await appendGitHubOutput(
    "meili_frontend_env_var",
    result.response.meili_frontend_env_var
  )
  await appendGitHubOutput(
    "meili_frontend_uid",
    result.response.meili_frontend_uid
  )
  await appendGitHubOutput(
    "meili_frontend_created",
    String(result.response.meili_frontend_created)
  )
  await appendGitHubOutput(
    "meili_frontend_updated",
    String(result.response.meili_frontend_updated)
  )
}

export function createPrepareCommand(): Command {
  const command = new Command("prepare")

  command
    .description("Run preview/main prepare orchestration")
    .requiredOption("--lane <preview|main>")
    .option("--project-slug <slug>")
    .option("--pr-number <n>")
    .option("--requires-preview-db", "", false)
    .option("--requires-meili-keys", "", false)
    .option("--meili-url <url>")
    .option("--meili-master-key <key>")
    .option("--meili-wait-seconds <n>")
    .option("--output-json <path>")
    .option("--base-url <url>")
    .option("--api-token <token>")
    .option("--dry-run", "", false)
    .option("--timeout-seconds <n>")
    .option("--retry-count <n>")
    .option("--retry-delay-seconds <n>")
    .option(
      "--stack-manifest-path <path>",
      "",
      process.env.STACK_MANIFEST_PATH ?? defaultStackManifestPath
    )
    .option(
      "--stack-inputs-path <path>",
      "",
      process.env.STACK_INPUTS_PATH ?? defaultStackInputsPath
    )
    .action(async (options) => {
      const input = buildPrepareInput(options)
      const result = await executePrepare(input)
      await writePrepareOutputs(result)
      process.stdout.write(`${JSON.stringify(result.response)}\n`)
    })

  return command
}

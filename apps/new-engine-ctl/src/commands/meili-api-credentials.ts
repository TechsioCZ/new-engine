import { Command } from "commander"
import { z } from "zod"

import { meiliApiCredentialsCommandInputSchema } from "../contracts/meili-api-credentials.js"
import { appendGitHubOutput, maskGitHubValue } from "../github-actions.js"
import { executeMeiliApiCredentialsCommand } from "../orchestration/meili-api-credentials-command.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

const commandOptionsSchema = z.object({
  dryRun: z.boolean(),
  masterKey: z.string().optional(),
  meiliUrl: z.string().optional(),
  outputJson: z.string().optional(),
  retryCount: z.string().optional(),
  retryDelaySeconds: z.string().optional(),
  stackInputsPath: z.string(),
  stackManifestPath: z.string(),
  timeoutSeconds: z.string().optional(),
  waitSeconds: z.string().optional(),
})

const parseOptionalNumber = (value: unknown): number | undefined =>
  typeof value === "string" && value.trim() ? Number(value) : undefined

export const createMeiliApiCredentialsCommand = (): Command => {
  const command = new Command("meili-api-credentials")

  command
    .description(
      "Reconcile Meili API credentials from the active CLI-managed contract",
    )
    .option("--meili-url <url>")
    .option("--master-key <key>")
    .option("--output-json <path>")
    .option("--dry-run", "", false)
    .option("--wait-seconds <n>")
    .option("--timeout-seconds <n>")
    .option("--retry-count <n>")
    .option("--retry-delay-seconds <n>")
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
      const input = meiliApiCredentialsCommandInputSchema.parse({
        dryRun: parsedOptions.dryRun,
        masterKey:
          parsedOptions.masterKey ??
          process.env["MEILISEARCH_MASTER_KEY"] ??
          process.env["DC_MEILISEARCH_MASTER_KEY"] ??
          "",
        meiliUrl:
          parsedOptions.meiliUrl ?? process.env["MEILISEARCH_URL"] ?? "",
        outputJson: parsedOptions.outputJson,
        providerId:
          process.env["ZANE_MEILI_API_CREDENTIALS_PROVIDER_ID"] ??
          "meili_api_credentials",
        retryCount: parseOptionalNumber(parsedOptions.retryCount),
        retryDelaySeconds: parseOptionalNumber(parsedOptions.retryDelaySeconds),
        stackInputsPath: parsedOptions.stackInputsPath,
        stackManifestPath: parsedOptions.stackManifestPath,
        timeoutSeconds: parseOptionalNumber(parsedOptions.timeoutSeconds),
        waitSeconds: parseOptionalNumber(parsedOptions.waitSeconds),
      })

      const result = await executeMeiliApiCredentialsCommand(input)
      maskGitHubValue(result.backend_key)
      maskGitHubValue(result.frontend_key)
      await appendGitHubOutput("meili_backend_key", result.backend_key)
      await appendGitHubOutput("meili_frontend_key", result.frontend_key)
      await appendGitHubOutput("meili_backend_env_var", result.backend_env_var)
      await appendGitHubOutput(
        "meili_frontend_env_var",
        result.frontend_env_var,
      )
      await appendGitHubOutput("meili_backend_uid", result.backend_uid)
      await appendGitHubOutput("meili_frontend_uid", result.frontend_uid)
      await appendGitHubOutput(
        "meili_backend_created",
        String(result.backend_created),
      )
      await appendGitHubOutput(
        "meili_frontend_created",
        String(result.frontend_created),
      )
      await appendGitHubOutput(
        "meili_backend_updated",
        String(result.backend_updated),
      )
      await appendGitHubOutput(
        "meili_frontend_updated",
        String(result.frontend_updated),
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

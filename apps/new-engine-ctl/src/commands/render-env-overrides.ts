import { Command } from "commander"
import { renderEnvOverridesCommandInputSchema } from "../contracts/render-env-overrides.js"
import { parsePreviewRandomOnceSecrets } from "../contracts/verify.js"
import { appendGitHubOutput, maskGitHubValue } from "../github-actions.js"
import { executeRenderEnvOverrides } from "../orchestration/render-env-overrides.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

function redactResponseValues(
  response: Awaited<ReturnType<typeof executeRenderEnvOverrides>>
) {
  return {
    ...response,
    services: response.services.map((service) => ({
      ...service,
      env: Object.fromEntries(
        Object.keys(service.env).map((key) => [key, "***redacted***"])
      ),
    })),
  }
}

export function createRenderEnvOverridesCommand(): Command {
  const command = new Command("render-env-overrides")

  command
    .description("Render env override payload from deploy inputs")
    .requiredOption("--lane <preview|main>")
    .option("--services-csv <csv>", "", "")
    .option("--preview-db-name <name>", "", "")
    .option("--preview-db-user <user>", "", "")
    .option("--preview-db-password <password>", "", "")
    .option("--preview-random-once-secrets-json <json>", "", "")
    .option("--meili-frontend-key <key>", "", "")
    .option("--meili-frontend-env-var <env-var>", "", "")
    .option("--meili-backend-key <key>", "", "")
    .option("--output-json <path>")
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
      const previewRandomOnceSecrets = parsePreviewRandomOnceSecrets(
        options.previewRandomOnceSecretsJson
      )
      const input = renderEnvOverridesCommandInputSchema.parse({
        lane: options.lane,
        servicesCsv: options.servicesCsv,
        previewDbName: options.previewDbName,
        previewDbUser: options.previewDbUser,
        previewDbPassword: options.previewDbPassword,
        previewRandomOnceSecrets,
        meiliFrontendKey: options.meiliFrontendKey,
        meiliFrontendEnvVar: options.meiliFrontendEnvVar,
        meiliBackendKey: options.meiliBackendKey,
        outputJson: options.outputJson,
        stackManifestPath: options.stackManifestPath,
        stackInputsPath: options.stackInputsPath,
      })

      maskGitHubValue(input.previewDbPassword)
      maskGitHubValue(input.meiliFrontendKey)
      maskGitHubValue(input.meiliBackendKey)

      const result = await executeRenderEnvOverrides(input)
      await appendGitHubOutput(
        "override_service_ids_csv",
        result.services.map((service) => service.service_id).join(",")
      )
      await appendGitHubOutput(
        "override_service_count",
        `${result.services.length}`
      )
      process.stdout.write(`${JSON.stringify(redactResponseValues(result))}\n`)
    })

  return command
}

import { Command } from "commander"
import { z } from "zod"

import { renderEnvOverridesCommandInputSchema } from "../contracts/render-env-overrides.js"
import { parseRuntimeProviderOutputs } from "../contracts/runtime-provider-outputs.js"
import { parsePreviewRandomOnceSecrets } from "../contracts/verify.js"
import { appendGitHubOutput, maskGitHubValue } from "../github-actions.js"
import { executeRenderEnvOverrides } from "../orchestration/render-env-overrides.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

const { STACK_INPUTS_PATH, STACK_MANIFEST_PATH } = process.env

const renderEnvOverridesOptionsSchema = z.object({
  lane: z.unknown(),
  outputJson: z.unknown().optional(),
  previewDbName: z.unknown(),
  previewDbPassword: z.unknown(),
  previewDbUser: z.unknown(),
  previewRandomOnceSecretsJson: z.unknown(),
  runtimeProviderOutputsJson: z.unknown(),
  servicesCsv: z.unknown(),
  stackInputsPath: z.unknown(),
  stackManifestPath: z.unknown(),
})

const redactResponseValues = (
  response: Awaited<ReturnType<typeof executeRenderEnvOverrides>>,
) => ({
  ...response,
  services: response.services.map((service) => ({
    ...service,
    env: Object.fromEntries(
      Object.keys(service.env).map((key) => [key, "***redacted***"]),
    ),
  })),
})

export const createRenderEnvOverridesCommand = (): Command => {
  const command = new Command("render-env-overrides")

  command
    .description("Render env override payload from deploy inputs")
    .requiredOption("--lane <preview|main>")
    .option("--services-csv <csv>", "", "")
    .option("--preview-db-name <name>", "", "")
    .option("--preview-db-user <user>", "", "")
    .option("--preview-db-password <password>", "", "")
    .option("--preview-random-once-secrets-json <json>", "", "")
    .option("--runtime-provider-outputs-json <json>", "", "")
    .option("--output-json <path>")
    .option(
      "--stack-manifest-path <path>",
      "",
      STACK_MANIFEST_PATH ?? defaultStackManifestPath,
    )
    .option(
      "--stack-inputs-path <path>",
      "",
      STACK_INPUTS_PATH ?? defaultStackInputsPath,
    )
    .action(async (rawOptions: unknown) => {
      const options = renderEnvOverridesOptionsSchema.parse(rawOptions)
      const previewRandomOnceSecrets = parsePreviewRandomOnceSecrets(
        z.string().optional().parse(options.previewRandomOnceSecretsJson),
      )
      const runtimeProviderOutputs = parseRuntimeProviderOutputs(
        z.string().optional().parse(options.runtimeProviderOutputsJson),
      )
      const input = renderEnvOverridesCommandInputSchema.parse({
        lane: options.lane,
        outputJson: options.outputJson,
        previewDbName: options.previewDbName,
        previewDbPassword: options.previewDbPassword,
        previewDbUser: options.previewDbUser,
        previewRandomOnceSecrets,
        runtimeProviderOutputs,
        servicesCsv: options.servicesCsv,
        stackInputsPath: options.stackInputsPath,
        stackManifestPath: options.stackManifestPath,
      })

      maskGitHubValue(input.previewDbPassword)
      for (const output of Object.values(input.runtimeProviderOutputs)) {
        maskGitHubValue(output.value)
      }

      const result = await executeRenderEnvOverrides(input)
      await appendGitHubOutput(
        "override_service_ids_csv",
        result.services.map((service) => service.service_id).join(","),
      )
      await appendGitHubOutput(
        "override_service_count",
        `${result.services.length}`,
      )
      process.stdout.write(`${JSON.stringify(redactResponseValues(result))}\n`)
    })

  return command
}

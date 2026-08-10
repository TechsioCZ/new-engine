import { Command } from "commander"
import { z } from "zod"

import { parseRuntimeProviderOutputs } from "../contracts/runtime-provider-outputs.js"
import {
  parsePreviewRandomOnceSecrets,
  resolveDeploymentRefs,
  verifyCommandInputSchema,
} from "../contracts/verify.js"
import { appendGitHubOutput, maskGitHubValue } from "../github-actions.js"
import { executeVerify } from "../orchestration/verify.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

const CommandOptionsSchema = z.object({
  apiToken: z.string().optional(),
  baseUrl: z.string().optional(),
  deployServicesCsv: z.string(),
  deploymentsJson: z.string().optional(),
  deploymentsJsonInline: z.string().optional(),
  dryRun: z.boolean(),
  environmentName: z.string(),
  lane: z.string(),
  outputJson: z.string().optional(),
  previewClonedServiceIdsCsv: z.string(),
  previewDbName: z.string(),
  previewDbPassword: z.string(),
  previewDbUser: z.string(),
  previewExcludedServiceIdsCsv: z.string(),
  previewRandomOnceSecretsJson: z.string(),
  projectSlug: z.string().optional(),
  requestedServicesCsv: z.string(),
  runtimeProviderOutputsJson: z.string(),
  stackInputsPath: z.string(),
  stackManifestPath: z.string(),
  triggeredServicesCsv: z.string(),
})

export const createVerifyCommand = (): Command => {
  const command = new Command("verify")

  command
    .description("Verify preview/main deploy contract through zane-operator")
    .requiredOption("--lane <preview|main>")
    .requiredOption("--environment-name <name>")
    .option("--project-slug <slug>")
    .option("--requested-services-csv <csv>", "", "")
    .option("--deploy-services-csv <csv>", "", "")
    .option("--triggered-services-csv <csv>", "", "")
    .option("--preview-cloned-service-ids-csv <csv>", "", "")
    .option("--preview-excluded-service-ids-csv <csv>", "", "")
    .option("--preview-db-name <name>", "", "")
    .option("--preview-db-user <user>", "", "")
    .option("--preview-db-password <password>", "", "")
    .option("--preview-random-once-secrets-json <json>", "", "")
    .option("--runtime-provider-outputs-json <json>", "", "")
    .option("--deployments-json <path>")
    .option("--deployments-json-inline <json>")
    .option("--output-json <path>")
    .option("--base-url <url>")
    .option("--api-token <token>")
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
    .option(
      "--dry-run",
      "Skip network calls and emit deterministic verification output",
      false,
    )
    .action(async (options: unknown) => {
      const parsedOptions = CommandOptionsSchema.parse(options)
      const deployments = await resolveDeploymentRefs(
        parsedOptions.deploymentsJson,
        parsedOptions.deploymentsJsonInline,
      )
      const previewRandomOnceSecrets = parsePreviewRandomOnceSecrets(
        parsedOptions.previewRandomOnceSecretsJson,
      )
      const runtimeProviderOutputs = parseRuntimeProviderOutputs(
        parsedOptions.runtimeProviderOutputsJson,
      )
      const input = verifyCommandInputSchema.parse({
        apiToken:
          parsedOptions.apiToken ??
          process.env["ZANE_OPERATOR_API_TOKEN"] ??
          "",
        baseUrl:
          parsedOptions.baseUrl ?? process.env["ZANE_OPERATOR_BASE_URL"] ?? "",
        deployServicesCsv: parsedOptions.deployServicesCsv,
        deployments,
        dryRun: parsedOptions.dryRun,
        environmentName: parsedOptions.environmentName,
        lane: parsedOptions.lane,
        outputJson: parsedOptions.outputJson,
        previewClonedServiceIdsCsv: parsedOptions.previewClonedServiceIdsCsv,
        previewDbName: parsedOptions.previewDbName,
        previewDbPassword: parsedOptions.previewDbPassword,
        previewDbUser: parsedOptions.previewDbUser,
        previewExcludedServiceIdsCsv:
          parsedOptions.previewExcludedServiceIdsCsv,
        previewRandomOnceSecrets,
        projectSlug:
          parsedOptions.projectSlug ?? process.env["ZANE_PROJECT_SLUG"] ?? "",
        requestedServicesCsv: parsedOptions.requestedServicesCsv,
        runtimeProviderOutputs,
        stackInputsPath: parsedOptions.stackInputsPath,
        stackManifestPath: parsedOptions.stackManifestPath,
        triggeredServicesCsv: parsedOptions.triggeredServicesCsv,
      })

      maskGitHubValue(input.previewDbPassword)
      for (const output of Object.values(input.runtimeProviderOutputs)) {
        maskGitHubValue(output.value)
      }
      const result = await executeVerify(input)
      await appendGitHubOutput("verified", String(result.verified))
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

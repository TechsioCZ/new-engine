import { Command } from "commander"
import { z } from "zod"

import { deployMainCommandInputSchema } from "../contracts/deploy-main.js"
import { appendGitHubOutput, maskGitHubValue } from "../github-actions.js"
import { executeDeployMain } from "../orchestration/deploy-main.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

const deployMainOptionsSchema = z.object({
  apiToken: z.unknown().optional(),
  approveDowntimeRisk: z.unknown().optional(),
  baseUrl: z.unknown().optional(),
  dryRun: z.unknown().optional(),
  environmentName: z.unknown().optional(),
  gitCommitSha: z.unknown().optional(),
  outputJson: z.unknown().optional(),
  pollIntervalSeconds: z.unknown().optional(),
  projectSlug: z.unknown().optional(),
  servicesCsv: z.unknown().optional(),
  stackInputsPath: z.unknown().optional(),
  stackManifestPath: z.unknown().optional(),
  waitTimeoutSeconds: z.unknown().optional(),
})

export const createDeployMainCommand = (): Command => {
  const command = new Command("deploy-main")

  command
    .description("Run main deploy orchestration end-to-end")
    .option("--project-slug <slug>")
    .requiredOption("--environment-name <name>")
    .option("--services-csv <csv>", "", "")
    .option("--git-commit-sha <sha>")
    .option("--output-json <path>")
    .option("--base-url <url>")
    .option("--api-token <token>")
    .option("--dry-run", "", false)
    .option("--approve-downtime-risk", "", false)
    .option("--poll-interval-seconds <n>")
    .option("--wait-timeout-seconds <n>")
    .option(
      "--stack-manifest-path <path>",
      "",
      process.env.STACK_MANIFEST_PATH ?? defaultStackManifestPath,
    )
    .option(
      "--stack-inputs-path <path>",
      "",
      process.env.STACK_INPUTS_PATH ?? defaultStackInputsPath,
    )
    .action(async (rawOptions: unknown) => {
      const options = deployMainOptionsSchema.parse(rawOptions)
      const input = deployMainCommandInputSchema.parse({
        apiToken: options.apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
        approveDowntimeRisk: Boolean(options.approveDowntimeRisk),
        baseUrl: options.baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
        dryRun: Boolean(options.dryRun),
        environmentName: options.environmentName,
        gitCommitSha: options.gitCommitSha,
        meiliApiCredentialsProviderId:
          process.env.ZANE_MEILI_API_CREDENTIALS_PROVIDER_ID ??
          "meili_api_credentials",
        outputJson: options.outputJson,
        pollIntervalSeconds:
          typeof options.pollIntervalSeconds === "string" &&
          options.pollIntervalSeconds.trim() !== ""
            ? Number(options.pollIntervalSeconds)
            : undefined,
        projectSlug: options.projectSlug ?? process.env.ZANE_PROJECT_SLUG ?? "",
        servicesCsv: options.servicesCsv,
        stackInputsPath: options.stackInputsPath,
        stackManifestPath: options.stackManifestPath,
        waitTimeoutSeconds:
          typeof options.waitTimeoutSeconds === "string" &&
          options.waitTimeoutSeconds.trim() !== ""
            ? Number(options.waitTimeoutSeconds)
            : undefined,
      })
      const result = await executeDeployMain(input)
      const deploymentsJson = JSON.stringify({
        services: result.response.deployments,
      })
      const runtimeProviderOutputsJson = JSON.stringify(
        result.runtimeProviderOutputs,
      )

      for (const output of Object.values(result.runtimeProviderOutputs)) {
        if (output.value) {
          maskGitHubValue(output.value)
        }
      }
      maskGitHubValue(runtimeProviderOutputsJson)

      await appendGitHubOutput("lane", "main")
      await appendGitHubOutput(
        "environment_name",
        result.response.environment_name,
      )
      await appendGitHubOutput("environment_id", result.response.environment_id)
      await appendGitHubOutput(
        "environment_created",
        String(result.response.environment_created),
      )
      await appendGitHubOutput(
        "requested_services_csv",
        result.response.requested_services_csv,
      )
      await appendGitHubOutput(
        "deploy_services_csv",
        result.response.deploy_services_csv,
      )
      await appendGitHubOutput(
        "env_override_service_ids_csv",
        result.response.env_override_service_ids_csv,
      )
      await appendGitHubOutput(
        "triggered_services_csv",
        result.response.triggered_services_csv,
      )
      await appendGitHubOutput(
        "skipped_services_csv",
        result.response.skipped_services_csv,
      )
      await appendGitHubOutput(
        "runtime_provider_output_keys_csv",
        Object.keys(result.runtimeProviderOutputs).join(","),
      )
      await appendGitHubOutput(
        "runtime_provider_outputs_json",
        runtimeProviderOutputsJson,
      )
      await appendGitHubOutput("deployments_json", deploymentsJson)

      process.stdout.write(`${JSON.stringify(result.response)}\n`)
    })

  return command
}

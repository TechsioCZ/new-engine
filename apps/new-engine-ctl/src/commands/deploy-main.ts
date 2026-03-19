import { Command } from "commander"

import { deployMainCommandInputSchema } from "../contracts/deploy-main.js"
import { appendGitHubOutput, maskGitHubValue } from "../github-actions.js"
import { executeDeployMain } from "../orchestration/deploy-main.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

export function createDeployMainCommand(): Command {
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
    .option("--meili-wait-seconds <n>")
    .option("--retry-count <n>")
    .option("--retry-delay-seconds <n>")
    .option("--poll-interval-seconds <n>")
    .option("--wait-timeout-seconds <n>")
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
      const input = deployMainCommandInputSchema.parse({
        projectSlug: options.projectSlug ?? process.env.ZANE_PROJECT_SLUG ?? "",
        environmentName: options.environmentName,
        servicesCsv: options.servicesCsv,
        gitCommitSha: options.gitCommitSha,
        outputJson: options.outputJson,
        baseUrl: options.baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
        apiToken: options.apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
        dryRun: Boolean(options.dryRun),
        approveDowntimeRisk: Boolean(options.approveDowntimeRisk),
        meiliApiCredentialsProviderId:
          process.env.ZANE_MEILI_API_CREDENTIALS_PROVIDER_ID ??
          "meili_api_credentials",
        meiliWaitSeconds:
          typeof options.meiliWaitSeconds === "string" &&
          options.meiliWaitSeconds.trim()
            ? Number(options.meiliWaitSeconds)
            : undefined,
        retryCount:
          typeof options.retryCount === "string" && options.retryCount.trim()
            ? Number(options.retryCount)
            : undefined,
        retryDelaySeconds:
          typeof options.retryDelaySeconds === "string" &&
          options.retryDelaySeconds.trim()
            ? Number(options.retryDelaySeconds)
            : undefined,
        pollIntervalSeconds:
          typeof options.pollIntervalSeconds === "string" &&
          options.pollIntervalSeconds.trim()
            ? Number(options.pollIntervalSeconds)
            : undefined,
        waitTimeoutSeconds:
          typeof options.waitTimeoutSeconds === "string" &&
          options.waitTimeoutSeconds.trim()
            ? Number(options.waitTimeoutSeconds)
            : undefined,
        stackManifestPath: options.stackManifestPath,
        stackInputsPath: options.stackInputsPath,
      })
      const result = await executeDeployMain(input)
      const deploymentsJson = JSON.stringify({
        services: result.response.deployments,
      })
      maskGitHubValue(result.meiliBackendKey)
      maskGitHubValue(result.meiliFrontendKey)

      await appendGitHubOutput("lane", "main")
      await appendGitHubOutput(
        "environment_name",
        result.response.environment_name
      )
      await appendGitHubOutput("environment_id", result.response.environment_id)
      await appendGitHubOutput(
        "environment_created",
        String(result.response.environment_created)
      )
      await appendGitHubOutput(
        "requested_services_csv",
        result.response.requested_services_csv
      )
      await appendGitHubOutput(
        "deploy_services_csv",
        result.response.deploy_services_csv
      )
      await appendGitHubOutput(
        "env_override_service_ids_csv",
        result.response.env_override_service_ids_csv
      )
      await appendGitHubOutput(
        "triggered_services_csv",
        result.response.triggered_services_csv
      )
      await appendGitHubOutput(
        "skipped_services_csv",
        result.response.skipped_services_csv
      )
      await appendGitHubOutput("meili_backend_key", result.meiliBackendKey)
      await appendGitHubOutput("meili_frontend_key", result.meiliFrontendKey)
      await appendGitHubOutput(
        "meili_frontend_env_var",
        result.response.meili_frontend_env_var
      )
      await appendGitHubOutput(
        "meili_backend_created",
        String(result.response.meili_backend_created)
      )
      await appendGitHubOutput(
        "meili_backend_updated",
        String(result.response.meili_backend_updated)
      )
      await appendGitHubOutput(
        "meili_frontend_created",
        String(result.response.meili_frontend_created)
      )
      await appendGitHubOutput(
        "meili_frontend_updated",
        String(result.response.meili_frontend_updated)
      )
      await appendGitHubOutput(
        "meili_keys_reconciled",
        String(result.response.meili_keys_reconciled)
      )
      await appendGitHubOutput(
        "meili_verified",
        String(result.response.meili_verified)
      )
      await appendGitHubOutput("deployments_json", deploymentsJson)

      process.stdout.write(`${JSON.stringify(result.response)}\n`)
    })

  return command
}

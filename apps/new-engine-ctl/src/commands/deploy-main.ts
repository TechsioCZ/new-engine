import { Command } from "commander"

import { deployMainCommandInputSchema } from "../contracts/deploy-main.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executeDeployMain } from "../orchestration/deploy-main.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

export function createDeployMainCommand(): Command {
  const command = new Command("deploy-main")

  command
    .description("Run main deploy orchestration end-to-end")
    .option("--project-slug <slug>")
    .requiredOption("--environment-name <name>")
    .option("--services-csv <csv>", "", "")
    .option("--meili-backend-key <key>", "", "")
    .option("--meili-frontend-key <key>", "", "")
    .option("--meili-frontend-env-var <env-var>", "", "")
    .option("--git-commit-sha <sha>")
    .option("--output-json <path>")
    .option("--base-url <url>")
    .option("--api-token <token>")
    .option("--dry-run", "", false)
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
        projectSlug:
          options.projectSlug ?? process.env.ZANE_CANONICAL_PROJECT_SLUG ?? "",
        environmentName: options.environmentName,
        servicesCsv: options.servicesCsv,
        meiliBackendKey:
          options.meiliBackendKey ?? process.env.MEILI_BACKEND_KEY ?? "",
        meiliFrontendKey:
          options.meiliFrontendKey ?? process.env.MEILI_FRONTEND_KEY ?? "",
        meiliFrontendEnvVar:
          options.meiliFrontendEnvVar ??
          process.env.MEILI_FRONTEND_ENV_VAR ??
          "",
        gitCommitSha: options.gitCommitSha,
        outputJson: options.outputJson,
        baseUrl: options.baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
        apiToken: options.apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
        dryRun: Boolean(options.dryRun),
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
      const deploymentsJson = JSON.stringify({ services: result.deployments })

      await appendGitHubOutput("lane", "main")
      await appendGitHubOutput("environment_name", result.environment_name)
      await appendGitHubOutput("environment_id", result.environment_id)
      await appendGitHubOutput(
        "environment_created",
        String(result.environment_created)
      )
      await appendGitHubOutput(
        "requested_services_csv",
        result.requested_services_csv
      )
      await appendGitHubOutput(
        "deploy_services_csv",
        result.deploy_services_csv
      )
      await appendGitHubOutput(
        "env_override_service_ids_csv",
        result.env_override_service_ids_csv
      )
      await appendGitHubOutput(
        "triggered_services_csv",
        result.triggered_services_csv
      )
      await appendGitHubOutput(
        "skipped_services_csv",
        result.skipped_services_csv
      )
      await appendGitHubOutput("deployments_json", deploymentsJson)

      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

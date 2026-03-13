import { Command } from "commander"

import { deployPreviewCommandInputSchema } from "../contracts/deploy-preview.js"
import { appendGitHubOutput, maskGitHubValue } from "../github-actions.js"
import { executeDeployPreview } from "../orchestration/deploy-preview.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

function buildDeployPreviewInput(options: Record<string, unknown>) {
  const parsedPrNumber =
    typeof options.prNumber === "string" && options.prNumber.trim()
      ? Number(options.prNumber)
      : undefined

  return deployPreviewCommandInputSchema.parse({
    projectSlug:
      options.projectSlug ?? process.env.ZANE_CANONICAL_PROJECT_SLUG ?? "",
    prNumber: parsedPrNumber,
    servicesCsv: options.servicesCsv,
    sourceEnvironmentName:
      options.sourceEnvironmentName ??
      process.env.ZANE_PRODUCTION_ENVIRONMENT_NAME ??
      "",
    previewDbName: options.previewDbName,
    previewDbUser: options.previewDbUser,
    previewDbPassword: options.previewDbPassword,
    meiliBackendKey:
      options.meiliBackendKey ?? process.env.MEILI_BACKEND_KEY ?? "",
    meiliFrontendKey: options.meiliFrontendKey ?? "",
    meiliFrontendEnvVar: options.meiliFrontendEnvVar ?? "",
    outputJson: options.outputJson,
    baseUrl: options.baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
    apiToken: options.apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
    dryRun: Boolean(options.dryRun),
    dryRunCreated: Boolean(options.dryRunCreated),
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
    previewEnvPrefix: process.env.ZANE_PREVIEW_ENV_PREFIX ?? "pr-",
    meiliApiCredentialsProviderId:
      process.env.ZANE_MEILI_API_CREDENTIALS_PROVIDER_ID ??
      "meili_api_credentials",
  })
}

async function writeDeployPreviewOutputs(
  result: Awaited<ReturnType<typeof executeDeployPreview>>
): Promise<void> {
  const deploymentsJson = JSON.stringify({
    services: result.response.deployments,
  })

  maskGitHubValue(result.previewRandomOnceSecretsJson)
  maskGitHubValue(result.meiliBackendKey)
  maskGitHubValue(result.meiliFrontendKey)

  await appendGitHubOutput("lane", "preview")
  await appendGitHubOutput("environment_name", result.response.environment_name)
  await appendGitHubOutput("environment_id", result.response.environment_id)
  await appendGitHubOutput(
    "environment_created",
    String(result.response.environment_created)
  )
  await appendGitHubOutput(
    "environment_ready",
    String(result.response.environment_ready)
  )
  await appendGitHubOutput(
    "environment_warning_count",
    `${result.response.environment_warnings.length}`
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
    "preview_cloned_service_ids_csv",
    result.response.preview_cloned_service_ids_csv
  )
  await appendGitHubOutput(
    "preview_excluded_service_ids_csv",
    result.response.preview_excluded_service_ids_csv
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
    "preview_random_once_secrets_json",
    result.previewRandomOnceSecretsJson
  )
  await appendGitHubOutput("meili_backend_key", result.meiliBackendKey)
  await appendGitHubOutput("meili_frontend_key", result.meiliFrontendKey)
  await appendGitHubOutput(
    "meili_frontend_env_var",
    result.response.meili_frontend_env_var
  )
  await appendGitHubOutput(
    "meili_keys_provisioned",
    String(result.response.meili_keys_provisioned)
  )
  await appendGitHubOutput("deployments_json", deploymentsJson)
}

export function createDeployPreviewCommand(): Command {
  const command = new Command("deploy-preview")

  command
    .description("Run preview deploy orchestration end-to-end")
    .option("--project-slug <slug>")
    .requiredOption("--pr-number <n>")
    .option("--services-csv <csv>", "", "")
    .option("--source-environment-name <name>")
    .option("--preview-db-name <name>", "", "")
    .option("--preview-db-user <user>", "", "")
    .option("--preview-db-password <password>", "", "")
    .option("--meili-backend-key <key>", "", "")
    .option("--meili-frontend-key <key>", "", "")
    .option("--meili-frontend-env-var <env-var>", "", "")
    .option("--output-json <path>")
    .option("--base-url <url>")
    .option("--api-token <token>")
    .option("--dry-run", "", false)
    .option("--dry-run-created", "", false)
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
      const input = buildDeployPreviewInput(options)
      const result = await executeDeployPreview(input)
      await writeDeployPreviewOutputs(result)
      process.stdout.write(`${JSON.stringify(result.response)}\n`)
    })

  return command
}

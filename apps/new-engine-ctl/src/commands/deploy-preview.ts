import { Command } from "commander"
import { z } from "zod"

import { deployPreviewCommandInputSchema } from "../contracts/deploy-preview.js"
import { appendGitHubOutput, maskGitHubValue } from "../github-actions.js"
import { executeDeployPreview } from "../orchestration/deploy-preview.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

const commandOptionsSchema = z.object({
  apiToken: z.string().optional(),
  baseUrl: z.string().optional(),
  dryRun: z.boolean(),
  dryRunCreated: z.boolean(),
  outputJson: z.string().optional(),
  pollIntervalSeconds: z.string().optional(),
  prNumber: z.string(),
  previewDbName: z.string(),
  previewDbPassword: z.string(),
  previewDbUser: z.string(),
  projectSlug: z.string().optional(),
  servicesCsv: z.string(),
  sourceEnvironmentName: z.string().optional(),
  stackInputsPath: z.string(),
  stackManifestPath: z.string(),
  targetCommitSha: z.string().optional(),
  waitTimeoutSeconds: z.string().optional(),
})

const buildDeployPreviewInput = (
  options: z.infer<typeof commandOptionsSchema>,
) => {
  const {
    apiToken,
    baseUrl,
    dryRun,
    dryRunCreated,
    outputJson,
    pollIntervalSeconds,
    prNumber,
    previewDbName,
    previewDbPassword,
    previewDbUser,
    projectSlug,
    servicesCsv,
    sourceEnvironmentName,
    stackInputsPath,
    stackManifestPath,
    targetCommitSha,
    waitTimeoutSeconds,
  } = options
  const parsedPrNumber =
    typeof prNumber === "string" && prNumber.trim()
      ? Number(prNumber)
      : undefined

  return deployPreviewCommandInputSchema.parse({
    apiToken: apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
    baseUrl: baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
    dryRun,
    dryRunCreated,
    meiliApiCredentialsProviderId:
      process.env.ZANE_MEILI_API_CREDENTIALS_PROVIDER_ID ??
      "meili_api_credentials",
    outputJson,
    pollIntervalSeconds:
      typeof pollIntervalSeconds === "string" && pollIntervalSeconds.trim()
        ? Number(pollIntervalSeconds)
        : undefined,
    prNumber: parsedPrNumber,
    previewDbName,
    previewDbPassword,
    previewDbUser,
    previewEnvPrefix: process.env.ZANE_PREVIEW_ENV_PREFIX ?? "pr-",
    projectSlug: projectSlug ?? process.env.ZANE_PROJECT_SLUG ?? "",
    servicesCsv,
    sourceEnvironmentName:
      sourceEnvironmentName ??
      process.env.ZANE_PRODUCTION_ENVIRONMENT_NAME ??
      "",
    stackInputsPath,
    stackManifestPath,
    targetCommitSha: targetCommitSha ?? process.env.TARGET_COMMIT_SHA ?? "",
    waitTimeoutSeconds:
      typeof waitTimeoutSeconds === "string" && waitTimeoutSeconds.trim()
        ? Number(waitTimeoutSeconds)
        : undefined,
  })
}

const writeDeployPreviewOutputs = async (
  result: Awaited<ReturnType<typeof executeDeployPreview>>,
): Promise<void> => {
  const deploymentsJson = JSON.stringify({
    services: result.response.deployments,
  })
  const runtimeProviderOutputsJson = JSON.stringify(
    result.runtimeProviderOutputs,
  )

  maskGitHubValue(result.previewRandomOnceSecretsJson)
  for (const output of Object.values(result.runtimeProviderOutputs)) {
    if (output.value) {
      maskGitHubValue(output.value)
    }
  }
  maskGitHubValue(runtimeProviderOutputsJson)

  await appendGitHubOutput("lane", "preview")
  await appendGitHubOutput("environment_name", result.response.environment_name)
  await appendGitHubOutput("environment_id", result.response.environment_id)
  await appendGitHubOutput(
    "environment_created",
    String(result.response.environment_created),
  )
  await appendGitHubOutput(
    "environment_ready",
    String(result.response.environment_ready),
  )
  await appendGitHubOutput(
    "environment_warning_count",
    `${result.response.environment_warnings.length}`,
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
    "target_commit_sha",
    result.response.target_commit_sha ?? "",
  )
  await appendGitHubOutput(
    "last_deployed_commit_sha",
    result.response.last_deployed_commit_sha ?? "",
  )
  await appendGitHubOutput(
    "preview_cloned_service_ids_csv",
    result.response.preview_cloned_service_ids_csv,
  )
  await appendGitHubOutput(
    "preview_excluded_service_ids_csv",
    result.response.preview_excluded_service_ids_csv,
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
    "preview_random_once_secrets_json",
    result.previewRandomOnceSecretsJson,
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
}

export const createDeployPreviewCommand = (): Command => {
  const command = new Command("deploy-preview")

  command
    .description("Run preview deploy orchestration end-to-end")
    .option("--project-slug <slug>")
    .requiredOption("--pr-number <n>")
    .option("--target-commit-sha <sha>")
    .option("--services-csv <csv>", "", "")
    .option("--source-environment-name <name>")
    .option("--preview-db-name <name>", "", "")
    .option("--preview-db-user <user>", "", "")
    .option("--preview-db-password <password>", "", "")
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
      process.env.STACK_MANIFEST_PATH ?? defaultStackManifestPath,
    )
    .option(
      "--stack-inputs-path <path>",
      "",
      process.env.STACK_INPUTS_PATH ?? defaultStackInputsPath,
    )
    .action(async (options: unknown) => {
      const parsedOptions = commandOptionsSchema.parse(options)
      const input = buildDeployPreviewInput(parsedOptions)
      maskGitHubValue(input.previewDbPassword)
      const result = await executeDeployPreview(input)
      await writeDeployPreviewOutputs(result)
      process.stdout.write(`${JSON.stringify(result.response)}\n`)
    })

  return command
}

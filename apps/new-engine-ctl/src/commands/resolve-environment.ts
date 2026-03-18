import { Command } from "commander"
import { resolveEnvironmentCommandInputSchema } from "../contracts/resolve-environment.js"
import { appendGitHubOutput, warnGitHub } from "../github-actions.js"
import { executeResolveEnvironment } from "../orchestration/resolve-environment.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

export function createResolveEnvironmentCommand(): Command {
  const command = new Command("resolve-environment")

  command
    .description("Resolve preview/main environment through zane-operator")
    .requiredOption("--lane <preview|main>")
    .option("--project-slug <slug>")
    .option("--pr-number <n>")
    .option("--environment-name <name>")
    .option("--source-environment-name <name>")
    .option("--reconcile-service-ids-csv <csv>", "", "")
    .option("--preview-cloned-service-ids-csv <csv>", "", "")
    .option("--preview-excluded-service-ids-csv <csv>", "", "")
    .option("--output-json <path>")
    .option("--base-url <url>")
    .option("--api-token <token>")
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
    .option("--dry-run", "", false)
    .option("--dry-run-created", "", false)
    .action(async (options) => {
      const parsedPrNumber =
        typeof options.prNumber === "string" && options.prNumber.trim()
          ? Number(options.prNumber)
          : undefined
      const input = resolveEnvironmentCommandInputSchema.parse({
        lane: options.lane,
        projectSlug:
          options.projectSlug ?? process.env.ZANE_CANONICAL_PROJECT_SLUG ?? "",
        prNumber: parsedPrNumber,
        environmentName: options.environmentName ?? "",
        sourceEnvironmentName:
          options.sourceEnvironmentName ??
          process.env.ZANE_PRODUCTION_ENVIRONMENT_NAME ??
          "",
        reconcileServiceIdsCsv: options.reconcileServiceIdsCsv,
        previewClonedServiceIdsCsv: options.previewClonedServiceIdsCsv,
        previewExcludedServiceIdsCsv: options.previewExcludedServiceIdsCsv,
        outputJson: options.outputJson,
        baseUrl: options.baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
        apiToken: options.apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
        dryRun: Boolean(options.dryRun),
        dryRunCreated: Boolean(options.dryRunCreated),
        stackManifestPath: options.stackManifestPath,
        stackInputsPath: options.stackInputsPath,
        previewEnvPrefix: process.env.ZANE_PREVIEW_ENV_PREFIX ?? "pr-",
      })

      const result = await executeResolveEnvironment(input)
      for (const warning of result.warnings) {
        warnGitHub(warning.message)
      }

      await appendGitHubOutput("environment_name", result.environment_name)
      await appendGitHubOutput("environment_id", result.environment_id)
      await appendGitHubOutput("environment_created", String(result.created))
      await appendGitHubOutput(
        "environment_baseline_complete",
        String(result.baseline_complete)
      )
      await appendGitHubOutput("environment_ready", String(result.ready))
      await appendGitHubOutput(
        "missing_preview_service_slugs_csv",
        result.missing_preview_service_slugs.join(",")
      )
      await appendGitHubOutput(
        "environment_warning_count",
        `${result.warnings.length}`
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

import { Command } from "commander"
import {
  parsePreviewRandomOnceSecrets,
  resolveDeploymentRefs,
  verifyCommandInputSchema,
} from "../contracts/verify.js"
import { appendGitHubOutput, maskGitHubValue } from "../github-actions.js"
import { executeVerify } from "../orchestration/verify.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

export function createVerifyCommand(): Command {
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
    .option("--meili-frontend-key <key>", "", "")
    .option("--meili-frontend-env-var <env-var>", "", "")
    .option("--meili-backend-key <key>", "", "")
    .option("--deployments-json <path>")
    .option("--deployments-json-inline <json>")
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
    .option(
      "--dry-run",
      "Skip network calls and emit deterministic verification output",
      false
    )
    .action(async (options) => {
      const deployments = await resolveDeploymentRefs(
        options.deploymentsJson,
        options.deploymentsJsonInline
      )
      const previewRandomOnceSecrets = parsePreviewRandomOnceSecrets(
        options.previewRandomOnceSecretsJson
      )
      const input = verifyCommandInputSchema.parse({
        lane: options.lane,
        projectSlug:
          options.projectSlug ?? process.env.ZANE_CANONICAL_PROJECT_SLUG ?? "",
        environmentName: options.environmentName,
        requestedServicesCsv: options.requestedServicesCsv,
        deployServicesCsv: options.deployServicesCsv,
        triggeredServicesCsv: options.triggeredServicesCsv,
        previewClonedServiceIdsCsv: options.previewClonedServiceIdsCsv,
        previewExcludedServiceIdsCsv: options.previewExcludedServiceIdsCsv,
        previewDbName: options.previewDbName,
        previewDbUser: options.previewDbUser,
        previewDbPassword: options.previewDbPassword,
        previewRandomOnceSecrets,
        meiliFrontendKey: options.meiliFrontendKey,
        meiliFrontendEnvVar: options.meiliFrontendEnvVar,
        meiliBackendKey: options.meiliBackendKey,
        deployments,
        outputJson: options.outputJson,
        baseUrl: options.baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
        apiToken: options.apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
        dryRun: Boolean(options.dryRun),
        stackManifestPath: options.stackManifestPath,
        stackInputsPath: options.stackInputsPath,
      })

      maskGitHubValue(input.previewDbPassword)
      maskGitHubValue(input.meiliFrontendKey)
      maskGitHubValue(input.meiliBackendKey)
      const result = await executeVerify(input)
      await appendGitHubOutput("verified", String(result.verified))
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

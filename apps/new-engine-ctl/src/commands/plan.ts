import { Command } from "commander"
import { planCommandInputSchema } from "../contracts/plan.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executePlan } from "../orchestration/plan.js"
import { defaultStackManifestPath } from "../paths.js"

export function createPlanCommand(): Command {
  const command = new Command("plan")

  command
    .description(
      "Resolve requested and coupled deploy services from the manifest"
    )
    .requiredOption("--lane <preview|main>")
    .option("--services-csv <csv>", "", "")
    .option("--pr-number <n>")
    .option("--output-json <path>")
    .option(
      "--stack-manifest-path <path>",
      "",
      process.env.STACK_MANIFEST_PATH ?? defaultStackManifestPath
    )
    .action(async (options) => {
      const parsedPrNumber =
        typeof options.prNumber === "string" && options.prNumber.trim()
          ? Number(options.prNumber)
          : undefined
      const input = planCommandInputSchema.parse({
        lane: options.lane,
        servicesCsv: options.servicesCsv,
        prNumber: parsedPrNumber,
        outputJson: options.outputJson,
        stackManifestPath: options.stackManifestPath,
        previewEnvPrefix: process.env.ZANE_PREVIEW_ENV_PREFIX ?? "pr-",
      })
      const result = await executePlan(input)
      await appendGitHubOutput(
        "requested_services_csv",
        result.requested_services_csv
      )
      await appendGitHubOutput(
        "deploy_services_csv",
        result.deploy_services_csv
      )
      await appendGitHubOutput(
        "preview_environment_name",
        result.preview_environment_name
      )
      await appendGitHubOutput(
        "preview_cloned_service_ids_csv",
        result.preview_cloned_service_ids_csv
      )
      await appendGitHubOutput(
        "preview_excluded_service_ids_csv",
        result.preview_excluded_service_ids_csv
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

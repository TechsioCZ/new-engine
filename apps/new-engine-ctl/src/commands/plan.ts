import { Command } from "commander"
import { z } from "zod"

import { planCommandInputSchema } from "../contracts/plan.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executePlan } from "../orchestration/plan.js"
import { defaultStackManifestPath } from "../paths.js"

const commandOptionsSchema = z.object({
  lane: z.string(),
  outputJson: z.string().optional(),
  prNumber: z.string().optional(),
  servicesCsv: z.string(),
  stackManifestPath: z.string(),
})

export const createPlanCommand = (): Command => {
  const command = new Command("plan")

  command
    .description(
      "Resolve requested and coupled deploy services from the manifest",
    )
    .requiredOption("--lane <preview|main>")
    .option("--services-csv <csv>", "", "")
    .option("--pr-number <n>")
    .option("--output-json <path>")
    .option(
      "--stack-manifest-path <path>",
      "",
      process.env["STACK_MANIFEST_PATH"] ?? defaultStackManifestPath,
    )
    .action(async (options: unknown) => {
      const parsedOptions = commandOptionsSchema.parse(options)
      const parsedPrNumber =
        typeof parsedOptions.prNumber === "string" &&
        parsedOptions.prNumber.trim()
          ? Number(parsedOptions.prNumber)
          : undefined
      const input = planCommandInputSchema.parse({
        lane: parsedOptions.lane,
        outputJson: parsedOptions.outputJson,
        prNumber: parsedPrNumber,
        previewEnvPrefix: process.env["ZANE_PREVIEW_ENV_PREFIX"] ?? "pr-",
        servicesCsv: parsedOptions.servicesCsv,
        stackManifestPath: parsedOptions.stackManifestPath,
      })
      const result = await executePlan(input)
      await appendGitHubOutput(
        "requested_services_csv",
        result.requested_services_csv,
      )
      await appendGitHubOutput(
        "deploy_services_csv",
        result.deploy_services_csv,
      )
      await appendGitHubOutput(
        "preview_environment_name",
        result.preview_environment_name,
      )
      await appendGitHubOutput(
        "preview_cloned_service_ids_csv",
        result.preview_cloned_service_ids_csv,
      )
      await appendGitHubOutput(
        "preview_excluded_service_ids_csv",
        result.preview_excluded_service_ids_csv,
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

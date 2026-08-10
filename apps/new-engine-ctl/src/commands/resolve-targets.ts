import { Command } from "commander"
import { z } from "zod"

import {
  resolveTargetsCommandInputSchema,
  resolveTargetsResponseSchema,
} from "../contracts/resolve-targets.js"
import type { ResolveTargetsResponse } from "../contracts/resolve-targets.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executeResolveTargets } from "../orchestration/resolve-targets.js"

const commandOptionsSchema = z.object({
  apiToken: z.string().optional(),
  baseUrl: z.string().optional(),
  dryRun: z.boolean(),
  environmentName: z.string(),
  lane: z.string(),
  outputJson: z.string().optional(),
  planJson: z.string(),
  projectSlug: z.string().optional(),
})

const redactableResolveTargetKeyPattern = /password|token|secret|key|url|env/iu

const redactResolveTargetsResponse = (
  response: ResolveTargetsResponse,
): ResolveTargetsResponse =>
  resolveTargetsResponseSchema.parse(
    JSON.parse(
      JSON.stringify(response, (key: string, value: unknown) => {
        if (
          key &&
          redactableResolveTargetKeyPattern.test(key) &&
          typeof value === "string"
        ) {
          return "***redacted***"
        }

        return value
      }),
    ),
  )

export const createResolveTargetsCommand = (): Command => {
  const command = new Command("resolve-targets")

  command
    .description("Resolve per-service deploy targets through zane-operator")
    .requiredOption("--lane <preview|main>")
    .requiredOption("--environment-name <name>")
    .requiredOption("--plan-json <path>")
    .option("--project-slug <slug>")
    .option("--output-json <path>")
    .option("--base-url <url>")
    .option("--api-token <token>")
    .option("--dry-run", "", false)
    .action(async (options: unknown) => {
      const parsedOptions = commandOptionsSchema.parse(options)
      const input = resolveTargetsCommandInputSchema.parse({
        apiToken:
          parsedOptions.apiToken ??
          process.env["ZANE_OPERATOR_API_TOKEN"] ??
          "",
        baseUrl:
          parsedOptions.baseUrl ?? process.env["ZANE_OPERATOR_BASE_URL"] ?? "",
        dryRun: parsedOptions.dryRun,
        environmentName: parsedOptions.environmentName,
        lane: parsedOptions.lane,
        outputJson: parsedOptions.outputJson,
        planJsonPath: parsedOptions.planJson,
        projectSlug:
          parsedOptions.projectSlug ?? process.env["ZANE_PROJECT_SLUG"] ?? "",
      })
      const result = await executeResolveTargets(input)
      const serviceIdsCsv = result.services
        .map((service) => service.service_id)
        .join(",")
      await appendGitHubOutput("resolved_service_ids_csv", serviceIdsCsv)
      await appendGitHubOutput("target_service_ids_csv", serviceIdsCsv)
      process.stdout.write(
        `${JSON.stringify(redactResolveTargetsResponse(result))}\n`,
      )
    })

  return command
}

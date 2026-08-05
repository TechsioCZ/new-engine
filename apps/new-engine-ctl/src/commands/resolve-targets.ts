import { Command } from "commander"

import { resolveTargetsCommandInputSchema } from "../contracts/resolve-targets.js"
import type { ResolveTargetsResponse } from "../contracts/resolve-targets.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executeResolveTargets } from "../orchestration/resolve-targets.js"

const redactableResolveTargetKeyPattern = /password|token|secret|key|url|env/i

function redactResolveTargetsResponse(
  response: ResolveTargetsResponse
): ResolveTargetsResponse {
  return JSON.parse(
    JSON.stringify(response, (key: string, value: unknown) => {
      if (
        key &&
        redactableResolveTargetKeyPattern.test(key) &&
        typeof value === "string"
      ) {
        return "***redacted***"
      }

      return value
    })
  ) as ResolveTargetsResponse
}

export function createResolveTargetsCommand(): Command {
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
    .action(async (options) => {
      const input = resolveTargetsCommandInputSchema.parse({
        apiToken: options.apiToken ?? process.env.ZANE_OPERATOR_API_TOKEN ?? "",
        baseUrl: options.baseUrl ?? process.env.ZANE_OPERATOR_BASE_URL ?? "",
        dryRun: Boolean(options.dryRun),
        environmentName: options.environmentName,
        lane: options.lane,
        outputJson: options.outputJson,
        planJsonPath: options.planJson,
        projectSlug: options.projectSlug ?? process.env.ZANE_PROJECT_SLUG ?? "",
      })
      const result = await executeResolveTargets(input)
      const serviceIdsCsv = result.services
        .map((service) => service.service_id)
        .join(",")
      await appendGitHubOutput("resolved_service_ids_csv", serviceIdsCsv)
      await appendGitHubOutput("target_service_ids_csv", serviceIdsCsv)
      process.stdout.write(
        `${JSON.stringify(redactResolveTargetsResponse(result))}\n`
      )
    })

  return command
}

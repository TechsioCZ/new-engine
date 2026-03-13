import { Command } from "commander"

import { scopeCommandInputSchema } from "../contracts/scope.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executeScope } from "../orchestration/scope.js"
import { defaultStackManifestPath } from "../paths.js"

function parseBooleanOption(value: string | boolean | undefined): boolean {
  if (typeof value === "boolean") {
    return value
  }

  switch ((value ?? "").trim().toLowerCase()) {
    case "true":
      return true
    case "false":
      return false
    default:
      throw new Error("Boolean option must be true or false.")
  }
}

export function createScopeCommand(): Command {
  const command = new Command("scope")

  command
    .description("Resolve CI scope, prepare needs, and downtime risk")
    .requiredOption("--lane <preview|main>")
    .option("--services-csv <csv>", "", "")
    .option("--base-sha <sha>")
    .option("--head-sha <sha>", "", "HEAD")
    .option("--output-json <path>")
    .option(
      "--nx-isolate-plugins <true|false>",
      "",
      process.env.NX_RESOLVE_AFFECTED_ISOLATE_PLUGINS ?? "true"
    )
    .option(
      "--stack-manifest-path <path>",
      "",
      process.env.STACK_MANIFEST_PATH ?? defaultStackManifestPath
    )
    .action(async (options) => {
      const input = scopeCommandInputSchema.parse({
        lane: options.lane,
        servicesCsv: options.servicesCsv,
        baseSha: options.baseSha,
        headSha: options.headSha,
        outputJson: options.outputJson,
        stackManifestPath: options.stackManifestPath,
        nxIsolatePlugins: parseBooleanOption(options.nxIsolatePlugins),
      })
      const result = await executeScope(input)
      await appendGitHubOutput("projects_csv", result.projects_csv)
      await appendGitHubOutput("services_csv", result.services_csv)
      await appendGitHubOutput("nx_status", result.nx_status)
      await appendGitHubOutput(
        "changed_files_count",
        String(result.changed_files_count)
      )
      await appendGitHubOutput("should_prepare", String(result.should_prepare))
      await appendGitHubOutput(
        "requires_preview_db",
        String(result.requires_preview_db)
      )
      await appendGitHubOutput(
        "requires_meili_keys",
        String(result.requires_meili_keys)
      )
      await appendGitHubOutput(
        "preview_db_service_ids",
        result.preview_db_service_ids
      )
      await appendGitHubOutput(
        "meili_key_service_ids",
        result.meili_key_service_ids
      )
      await appendGitHubOutput(
        "requires_downtime_approval",
        String(result.requires_downtime_approval)
      )
      await appendGitHubOutput(
        "downtime_service_ids",
        result.downtime_service_ids
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

import { Command } from "commander"
import { z } from "zod"

import { scopeCommandInputSchema } from "../contracts/scope.js"
import { appendGitHubOutput } from "../github-actions.js"
import { executeScope } from "../orchestration/scope.js"
import { defaultStackInputsPath, defaultStackManifestPath } from "../paths.js"

const commandOptionsSchema = z.object({
  baseSha: z.string().optional(),
  headSha: z.string(),
  lane: z.string(),
  nxIsolatePlugins: z.union([z.string(), z.boolean()]),
  outputJson: z.string().optional(),
  previewBaselineComplete: z.union([z.string(), z.boolean()]),
  servicesCsv: z.string(),
  stackInputsPath: z.string(),
  stackManifestPath: z.string(),
})

const parseBooleanOption = (value: string | boolean | undefined): boolean => {
  if (typeof value === "boolean") {
    return value
  }

  switch ((value ?? "").trim().toLowerCase()) {
    case "true": {
      return true
    }
    case "false": {
      return false
    }
    default: {
      throw new Error("Boolean option must be true or false.")
    }
  }
}

export const createScopeCommand = (): Command => {
  const command = new Command("scope")

  command
    .description("Resolve CI scope, prepare needs, and downtime risk")
    .requiredOption("--lane <preview|main>")
    .option("--services-csv <csv>", "", "")
    .option("--base-sha <sha>")
    .option("--head-sha <sha>", "", "HEAD")
    .option("--preview-baseline-complete <true|false>", "", "true")
    .option("--output-json <path>")
    .option(
      "--nx-isolate-plugins <true|false>",
      "",
      process.env["NX_RESOLVE_AFFECTED_ISOLATE_PLUGINS"] ?? "true",
    )
    .option(
      "--stack-manifest-path <path>",
      "",
      process.env["STACK_MANIFEST_PATH"] ?? defaultStackManifestPath,
    )
    .option(
      "--stack-inputs-path <path>",
      "",
      process.env["STACK_INPUTS_PATH"] ?? defaultStackInputsPath,
    )
    .action(async (options: unknown) => {
      const parsedOptions = commandOptionsSchema.parse(options)
      const input = scopeCommandInputSchema.parse({
        baseSha: parsedOptions.baseSha,
        headSha: parsedOptions.headSha,
        lane: parsedOptions.lane,
        nxIsolatePlugins: parseBooleanOption(parsedOptions.nxIsolatePlugins),
        outputJson: parsedOptions.outputJson,
        previewBaselineComplete: parseBooleanOption(
          parsedOptions.previewBaselineComplete,
        ),
        servicesCsv: parsedOptions.servicesCsv,
        stackInputsPath: parsedOptions.stackInputsPath,
        stackManifestPath: parsedOptions.stackManifestPath,
      })
      const result = await executeScope(input)
      await appendGitHubOutput("projects_csv", result.projects_csv)
      await appendGitHubOutput("services_csv", result.services_csv)
      await appendGitHubOutput("nx_status", result.nx_status)
      await appendGitHubOutput(
        "changed_files_count",
        String(result.changed_files_count),
      )
      await appendGitHubOutput("should_prepare", String(result.should_prepare))
      await appendGitHubOutput(
        "requires_preview_db",
        String(result.requires_preview_db),
      )
      await appendGitHubOutput(
        "preview_db_service_ids",
        result.preview_db_service_ids,
      )
      await appendGitHubOutput(
        "requires_downtime_approval",
        String(result.requires_downtime_approval),
      )
      await appendGitHubOutput(
        "downtime_service_ids",
        result.downtime_service_ids,
      )
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

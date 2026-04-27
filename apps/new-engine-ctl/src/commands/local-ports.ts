import { Command } from "commander"

import { localPortsResolveCommandInputSchema } from "../contracts/local-ports.js"
import { executeLocalPortsResolve } from "../orchestration/local-ports.js"
import { defaultLocalPortsPath, repoRoot } from "../paths.js"

export function createLocalPortsCommand(): Command {
  const command = new Command("local-ports").description(
    "Resolve local Docker Compose host ports"
  )

  command
    .command("resolve")
    .description(
      "Generate the local runtime env file with available host ports"
    )
    .option(
      "--config <path>",
      "",
      process.env.LOCAL_PORTS_CONFIG_PATH ?? defaultLocalPortsPath
    )
    .option("--env-file <path>", "", process.env.ENV_FILE ?? `${repoRoot}/.env`)
    .option("--output <path>", "", process.env.LOCAL_DEV_RUNTIME_ENV_FILE)
    .option(
      "--project-name <name>",
      "",
      process.env.PROJECT_NAME ?? "new-engine"
    )
    .option("--json", "Print JSON response", false)
    .action(async (options) => {
      const input = localPortsResolveCommandInputSchema.parse({
        configPath: options.config,
        envFilePath: options.envFile,
        outputPath: options.output,
        projectName: options.projectName,
      })
      const result = await executeLocalPortsResolve(input)

      if (options.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
        return
      }

      for (const port of result.ports) {
        const suffix = port.shifted
          ? ` (shifted from ${port.preferred_port})`
          : ""
        process.stdout.write(`${port.env_var}=${port.resolved_port}${suffix}\n`)
      }
      process.stdout.write(`Wrote ${result.output_path}\n`)
    })

  return command
}

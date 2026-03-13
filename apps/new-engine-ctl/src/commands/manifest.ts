import { Command } from "commander"

import { manifestComposeServicesCommandInputSchema } from "../contracts/manifest.js"
import { executeManifestComposeServices } from "../orchestration/manifest.js"
import { defaultStackManifestPath } from "../paths.js"

export function createManifestCommand(): Command {
  const command = new Command("manifest").description(
    "Manifest-derived local and CI utility commands"
  )

  command
    .command("compose-services")
    .description("Resolve compose services for a local phase")
    .requiredOption("--phase <resources|backend|frontend|operator>")
    .option("--default-only", "", false)
    .option(
      "--stack-manifest-path <path>",
      "",
      process.env.STACK_MANIFEST_PATH ?? defaultStackManifestPath
    )
    .action(async (options) => {
      const input = manifestComposeServicesCommandInputSchema.parse({
        phase: options.phase,
        defaultOnly: Boolean(options.defaultOnly),
        stackManifestPath: options.stackManifestPath,
      })
      const result = await executeManifestComposeServices(input)
      process.stdout.write(`${result.compose_services_shell}\n`)
    })

  return command
}

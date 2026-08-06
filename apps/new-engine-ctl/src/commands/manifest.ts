import { Command } from "commander"
import { z } from "zod"

import {
  manifestComposeServicesCommandInputSchema,
  manifestServiceSlugsCommandInputSchema,
} from "../contracts/manifest.js"
import {
  executeManifestComposeServices,
  executeManifestServiceSlugs,
} from "../orchestration/manifest.js"
import { defaultStackManifestPath } from "../paths.js"

const composeCommandOptionsSchema = z.object({
  defaultOnly: z.boolean(),
  phase: z.string(),
  stackManifestPath: z.string(),
})

const serviceSlugsCommandOptionsSchema = z.object({
  serviceIdsCsv: z.string(),
  stackManifestPath: z.string(),
})

export const createManifestCommand = (): Command => {
  const command = new Command("manifest").description(
    "Manifest-derived local and CI utility commands",
  )

  command
    .command("compose-services")
    .description("Resolve compose services for a local phase")
    .requiredOption("--phase <resources|backend|frontend|operator>")
    .option("--default-only", "", false)
    .option(
      "--stack-manifest-path <path>",
      "",
      process.env.STACK_MANIFEST_PATH ?? defaultStackManifestPath,
    )
    .action(async (options: unknown) => {
      const parsedOptions = composeCommandOptionsSchema.parse(options)
      const input = manifestComposeServicesCommandInputSchema.parse({
        defaultOnly: parsedOptions.defaultOnly,
        phase: parsedOptions.phase,
        stackManifestPath: parsedOptions.stackManifestPath,
      })
      const result = await executeManifestComposeServices(input)
      process.stdout.write(`${result.compose_services_shell}\n`)
    })

  command
    .command("service-slugs")
    .description("Resolve deployable service slugs from manifest service ids")
    .requiredOption("--service-ids-csv <csv>")
    .option(
      "--stack-manifest-path <path>",
      "",
      process.env.STACK_MANIFEST_PATH ?? defaultStackManifestPath,
    )
    .action(async (options: unknown) => {
      const parsedOptions = serviceSlugsCommandOptionsSchema.parse(options)
      const input = manifestServiceSlugsCommandInputSchema.parse({
        serviceIdsCsv: parsedOptions.serviceIdsCsv,
        stackManifestPath: parsedOptions.stackManifestPath,
      })
      const result = await executeManifestServiceSlugs(input)
      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

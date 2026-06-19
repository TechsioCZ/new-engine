import { Command } from "commander"
import { localEnvRuntimeProviderOutputTargetsCommandInputSchema } from "../contracts/local-env.js"
import { executeLocalEnvRuntimeProviderOutputTargets } from "../orchestration/local-env.js"
import { defaultStackInputsPath } from "../paths.js"

export function createLocalEnvCommand(): Command {
  const command = new Command("local-env").description(
    "Resolve local-only env aliases from repo config"
  )

  command
    .command("runtime-provider-output-targets")
    .description("Resolve local env aliases for runtime provider outputs")
    .requiredOption("--provider-id <id>")
    .requiredOption("--output-id <id>")
    .option("--service-ids-csv <csv>", "", "")
    .option("--format <json|local-env-vars>", "", "json")
    .option(
      "--stack-inputs-path <path>",
      "",
      process.env.STACK_INPUTS_PATH ?? defaultStackInputsPath
    )
    .action(async (options) => {
      const input =
        localEnvRuntimeProviderOutputTargetsCommandInputSchema.parse({
          providerId: options.providerId,
          outputId: options.outputId,
          serviceIdsCsv: options.serviceIdsCsv,
          format: options.format,
          stackInputsPath: options.stackInputsPath,
        })

      const result = await executeLocalEnvRuntimeProviderOutputTargets(input)

      if (input.format === "local-env-vars") {
        process.stdout.write(
          `${result.targets.map((target) => target.local_env_var).join("\n")}\n`
        )
        return
      }

      process.stdout.write(`${JSON.stringify(result)}\n`)
    })

  return command
}

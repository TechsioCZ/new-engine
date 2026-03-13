import { Command } from "commander"
import { ZodError } from "zod"

import { createApplyEnvOverridesCommand } from "./commands/apply-env-overrides.js"
import { createPlanCommand } from "./commands/plan.js"
import { createRenderEnvOverridesCommand } from "./commands/render-env-overrides.js"
import { createResolveEnvironmentCommand } from "./commands/resolve-environment.js"
import { createResolveTargetsCommand } from "./commands/resolve-targets.js"
import { createVerifyCommand } from "./commands/verify.js"

async function main(): Promise<void> {
  const program = new Command()
    .name("new-engine-ctl")
    .description(
      "Repo-specific orchestration CLI for CI and local deploy flows"
    )
    .showHelpAfterError()

  program.addCommand(createApplyEnvOverridesCommand())
  program.addCommand(createPlanCommand())
  program.addCommand(createRenderEnvOverridesCommand())
  program.addCommand(createResolveEnvironmentCommand())
  program.addCommand(createResolveTargetsCommand())
  program.addCommand(createVerifyCommand())
  await program.parseAsync(process.argv)
}

main().catch((error: unknown) => {
  if (error instanceof ZodError) {
    const [issue] = error.issues
    console.error(issue?.message ?? error.message)
    process.exit(1)
  }

  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

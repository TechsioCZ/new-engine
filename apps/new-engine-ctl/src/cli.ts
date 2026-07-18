import { Command } from "commander"
import { ZodError } from "zod"

import { createApplyEnvOverridesCommand } from "./commands/apply-env-overrides.js"
import { createBootstrapCommand } from "./commands/bootstrap.js"
import { createCheckWorkflowInputsCommand } from "./commands/check-workflow-inputs.js"
import { createDeployMainCommand } from "./commands/deploy-main.js"
import { createDeployPreviewCommand } from "./commands/deploy-preview.js"
import { createLocalEnvCommand } from "./commands/local-env.js"
import { createManifestCommand } from "./commands/manifest.js"
import { createMeiliApiCredentialsCommand } from "./commands/meili-api-credentials.js"
import { createPlanCommand } from "./commands/plan.js"
import { createPrepareCommand } from "./commands/prepare.js"
import { createPreviewCommitStateCommand } from "./commands/preview-commit-state.js"
import { createRenderEnvOverridesCommand } from "./commands/render-env-overrides.js"
import { createResolveEnvironmentCommand } from "./commands/resolve-environment.js"
import { createResolveTargetsCommand } from "./commands/resolve-targets.js"
import { createScopeCommand } from "./commands/scope.js"
import { createTeardownPreviewCommand } from "./commands/teardown-preview.js"
import { createVerifyCommand } from "./commands/verify.js"

async function main(): Promise<void> {
  const program = new Command()
    .name("new-engine-ctl")
    .description(
      "Repo-specific orchestration CLI for CI and local deploy flows"
    )
    .showHelpAfterError()

  program.addCommand(createCheckWorkflowInputsCommand())
  program.addCommand(createApplyEnvOverridesCommand())
  program.addCommand(createBootstrapCommand())
  program.addCommand(createDeployMainCommand())
  program.addCommand(createDeployPreviewCommand())
  program.addCommand(createLocalEnvCommand())
  program.addCommand(createManifestCommand())
  program.addCommand(createMeiliApiCredentialsCommand())
  program.addCommand(createPlanCommand())
  program.addCommand(createPrepareCommand())
  program.addCommand(createPreviewCommitStateCommand())
  program.addCommand(createRenderEnvOverridesCommand())
  program.addCommand(createResolveEnvironmentCommand())
  program.addCommand(createResolveTargetsCommand())
  program.addCommand(createScopeCommand())
  program.addCommand(createTeardownPreviewCommand())
  program.addCommand(createVerifyCommand())
  await program.parseAsync(process.argv)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  if (message === "Deployment wait interrupted.") {
    console.error(message)
    process.exit(130)
  }

  if (error instanceof ZodError) {
    const [issue] = error.issues
    console.error(issue?.message ?? error.message)
    process.exit(1)
  }

  console.error(message)
  process.exit(1)
})

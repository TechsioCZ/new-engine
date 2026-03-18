import { Command } from "commander"

import {
  checkWorkflowInputsCommandInputSchema,
  type WorkflowInputMode,
} from "../contracts/check-workflow-inputs.js"
import { maskGitHubValue } from "../github-actions.js"

type EnvRequirement = {
  name: string
  description: string
}

function requireEnv(requirement: EnvRequirement): void {
  const value = process.env[requirement.name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${requirement.name} (${requirement.description}).`
    )
  }
}

function maskEnv(name: string): void {
  maskGitHubValue(process.env[name])
}

function requireAndMaskZaneProjectSlug(): void {
  requireEnv({
    name: "ZANE_PROJECT_SLUG",
    description: "Zane project slug",
  })
  maskEnv("ZANE_PROJECT_SLUG")
}

function validateMode(mode: WorkflowInputMode): void {
  switch (mode) {
    case "preview-prepare":
      if (process.env.REQUIRES_PREVIEW_DB === "true") {
        requireEnv({
          name: "ZANE_OPERATOR_BASE_URL",
          description: "preview DB operator base URL",
        })
        requireEnv({
          name: "ZANE_OPERATOR_API_TOKEN",
          description: "preview DB operator API token",
        })
        maskEnv("ZANE_OPERATOR_BASE_URL")
        maskEnv("ZANE_OPERATOR_API_TOKEN")
      }
      return
    case "preview-deploy":
    case "preview-verify":
      requireEnv({
        name: "ZANE_OPERATOR_BASE_URL",
        description: "Zane operator base URL",
      })
      requireEnv({
        name: "ZANE_OPERATOR_API_TOKEN",
        description: "Zane operator API token",
      })
      requireAndMaskZaneProjectSlug()
      if (mode === "preview-deploy") {
        requireEnv({
          name: "ZANE_PRODUCTION_ENVIRONMENT_NAME",
          description: "production Zane environment name",
        })
      }
      maskEnv("ZANE_OPERATOR_BASE_URL")
      maskEnv("ZANE_OPERATOR_API_TOKEN")
      maskEnv("ZANE_PRODUCTION_ENVIRONMENT_NAME")
      maskEnv("PREVIEW_DB_PASSWORD")
      maskEnv("PREVIEW_RANDOM_ONCE_SECRETS_JSON")
      maskEnv("MEILI_BACKEND_KEY")
      maskEnv("MEILI_FRONTEND_KEY")
      return
    case "main-deploy":
    case "main-verify":
      requireEnv({
        name: "ZANE_OPERATOR_BASE_URL",
        description: "Zane operator base URL",
      })
      requireEnv({
        name: "ZANE_OPERATOR_API_TOKEN",
        description: "Zane operator API token",
      })
      requireAndMaskZaneProjectSlug()
      requireEnv({
        name: "ZANE_PRODUCTION_ENVIRONMENT_NAME",
        description: "production Zane environment name",
      })
      maskEnv("ZANE_OPERATOR_BASE_URL")
      maskEnv("ZANE_OPERATOR_API_TOKEN")
      maskEnv("ZANE_PRODUCTION_ENVIRONMENT_NAME")
      maskEnv("MEILI_BACKEND_KEY")
      maskEnv("MEILI_FRONTEND_KEY")
      return
    case "preview-teardown":
      requireEnv({
        name: "ZANE_OPERATOR_BASE_URL",
        description: "preview DB operator base URL",
      })
      requireEnv({
        name: "ZANE_OPERATOR_API_TOKEN",
        description: "preview DB operator API token",
      })
      requireAndMaskZaneProjectSlug()
      maskEnv("ZANE_OPERATOR_BASE_URL")
      maskEnv("ZANE_OPERATOR_API_TOKEN")
      return
  }
}

export function createCheckWorkflowInputsCommand(): Command {
  const command = new Command("check-workflow-inputs")

  command
    .description("Validate required workflow env inputs and mask known secrets")
    .requiredOption("--mode <mode>")
    .action(async (options) => {
      const input = checkWorkflowInputsCommandInputSchema.parse({
        mode: options.mode,
      })
      validateMode(input.mode)
      process.stdout.write("result=ok\n")
    })

  return command
}

import { Command } from "commander"

import { checkWorkflowInputsCommandInputSchema } from "../contracts/check-workflow-inputs.js"
import type { WorkflowInputMode } from "../contracts/check-workflow-inputs.js"
import { maskGitHubValue } from "../github-actions.js"

interface EnvRequirement {
  name: string
  description: string
}

function requireEnv(requirement: EnvRequirement): void {
  const value = process.env[requirement.name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${requirement.name} (${requirement.description}).`,
    )
  }
}

function maskEnv(name: string): void {
  maskGitHubValue(process.env[name])
}

function requireAndMaskZaneProjectSlug(): void {
  requireEnv({
    description: "Zane project slug",
    name: "ZANE_PROJECT_SLUG",
  })
  maskEnv("ZANE_PROJECT_SLUG")
}

function validateMode(mode: WorkflowInputMode): void {
  switch (mode) {
    case "preview-prepare": {
      if (process.env.REQUIRES_PREVIEW_DB === "true") {
        requireEnv({
          description: "preview DB operator base URL",
          name: "ZANE_OPERATOR_BASE_URL",
        })
        requireEnv({
          description: "preview DB operator API token",
          name: "ZANE_OPERATOR_API_TOKEN",
        })
        maskEnv("ZANE_OPERATOR_BASE_URL")
        maskEnv("ZANE_OPERATOR_API_TOKEN")
      }
      return
    }
    case "preview-deploy":
    case "preview-verify": {
      requireEnv({
        description: "Zane operator base URL",
        name: "ZANE_OPERATOR_BASE_URL",
      })
      requireEnv({
        description: "Zane operator API token",
        name: "ZANE_OPERATOR_API_TOKEN",
      })
      requireAndMaskZaneProjectSlug()
      if (mode === "preview-deploy") {
        requireEnv({
          description: "production Zane environment name",
          name: "ZANE_PRODUCTION_ENVIRONMENT_NAME",
        })
      }
      maskEnv("ZANE_OPERATOR_BASE_URL")
      maskEnv("ZANE_OPERATOR_API_TOKEN")
      maskEnv("ZANE_PRODUCTION_ENVIRONMENT_NAME")
      maskEnv("PREVIEW_DB_PASSWORD")
      maskEnv("PREVIEW_RANDOM_ONCE_SECRETS_JSON")
      maskEnv("RUNTIME_PROVIDER_OUTPUTS_JSON")
      return
    }
    case "main-deploy":
    case "main-verify": {
      requireEnv({
        description: "Zane operator base URL",
        name: "ZANE_OPERATOR_BASE_URL",
      })
      requireEnv({
        description: "Zane operator API token",
        name: "ZANE_OPERATOR_API_TOKEN",
      })
      requireAndMaskZaneProjectSlug()
      requireEnv({
        description: "production Zane environment name",
        name: "ZANE_PRODUCTION_ENVIRONMENT_NAME",
      })
      maskEnv("ZANE_OPERATOR_BASE_URL")
      maskEnv("ZANE_OPERATOR_API_TOKEN")
      maskEnv("ZANE_PRODUCTION_ENVIRONMENT_NAME")
      maskEnv("RUNTIME_PROVIDER_OUTPUTS_JSON")
      return
    }
    case "preview-teardown": {
      requireEnv({
        description: "preview DB operator base URL",
        name: "ZANE_OPERATOR_BASE_URL",
      })
      requireEnv({
        description: "preview DB operator API token",
        name: "ZANE_OPERATOR_API_TOKEN",
      })
      requireAndMaskZaneProjectSlug()
      maskEnv("ZANE_OPERATOR_BASE_URL")
      maskEnv("ZANE_OPERATOR_API_TOKEN")
      return
    }
    default: {
      const exhaustive: never = mode
      throw new Error(
        `Unsupported workflow input mode: ${JSON.stringify(exhaustive)}`,
      )
    }
  }
}

export function createCheckWorkflowInputsCommand(): Command {
  const command = new Command("check-workflow-inputs")

  command
    .description("Validate required workflow env inputs and mask known secrets")
    .requiredOption("--mode <mode>")
    .action((options) => {
      const input = checkWorkflowInputsCommandInputSchema.parse({
        mode: options.mode,
      })
      validateMode(input.mode)
      process.stdout.write("result=ok\n")
    })

  return command
}

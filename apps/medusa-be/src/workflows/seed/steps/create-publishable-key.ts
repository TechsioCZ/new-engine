import type {
  IApiKeyModuleService,
  ILockingModule,
  Logger,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { provisionPublishableKey } from "../../../utils/publishable-key"

export type CreatePublishableKeyStepInput = {
  title: string
}

const createPublishableKeyStepId = "create-publishable-key-seed-step"
export const createPublishableKeyStep = createStep(
  createPublishableKeyStepId,
  async (input: CreatePublishableKeyStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const apiKeyService = container.resolve<IApiKeyModuleService>(
      Modules.API_KEY
    )
    const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

    const result = await provisionPublishableKey({
      apiKeyService,
      lockingModule,
      title: input.title,
    })

    logger.info(
      result.created
        ? "Created publishable API key for seed workflow"
        : "Using existing publishable API key for seed workflow"
    )

    return new StepResponse({
      publishableApiKey: result.apiKey,
      result: [result.apiKey],
    })
  }
)

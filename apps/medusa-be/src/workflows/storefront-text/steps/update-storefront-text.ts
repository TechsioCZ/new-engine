import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"
import type { UpdateStorefrontTextWorkflowInput } from "../types"

export const updateStorefrontTextStep = createStep(
  "update-storefront-text",
  async (input: UpdateStorefrontTextWorkflowInput, { container }) => {
    const service = container.resolve<StorefrontTextModuleService>(
      STOREFRONT_TEXT_MODULE
    )
    const previousRecord = await service.retrieveStorefrontText(input.id)
    const updatedRecord = await service.updateStorefrontTexts({
      id: input.id,
      ...input.update,
    })

    return new StepResponse(updatedRecord, previousRecord)
  },
  async (previousRecord, { container }) => {
    if (!previousRecord) {
      return
    }

    await container
      .resolve<StorefrontTextModuleService>(STOREFRONT_TEXT_MODULE)
      .updateStorefrontTexts(previousRecord)
  }
)

import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { STOREFRONT_TEXT_MODULE } from "../../../modules/storefront-text"
import { validateStorefrontTextOverride } from "../../../modules/storefront-text/message-validation"
import type StorefrontTextModuleService from "../../../modules/storefront-text/service"
import type { UpdateStorefrontTextWorkflowInput } from "../types"

export const updateStorefrontTextStep = createStep(
  "update-storefront-text",
  async (input: UpdateStorefrontTextWorkflowInput, { container }) => {
    const service = container.resolve<StorefrontTextModuleService>(
      STOREFRONT_TEXT_MODULE
    )
    const previousRecord = await service.retrieveStorefrontText(input.id)
    let overrideToValidate: null | string = null

    if (typeof input.update.override_value === "string") {
      overrideToValidate = input.update.override_value
    } else if (
      input.update.status === "active" &&
      input.update.override_value === undefined
    ) {
      overrideToValidate = previousRecord.override_value
    }

    if (overrideToValidate !== null) {
      const validation = validateStorefrontTextOverride({
        defaultValue: previousRecord.default_value,
        locale: previousRecord.locale,
        overrideValue: overrideToValidate,
      })

      if (!validation.success) {
        throw new MedusaError(
          validation.code === "invalid_default"
            ? MedusaError.Types.UNEXPECTED_STATE
            : MedusaError.Types.INVALID_DATA,
          `${previousRecord.key}: ${validation.message}`
        )
      }
    }

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

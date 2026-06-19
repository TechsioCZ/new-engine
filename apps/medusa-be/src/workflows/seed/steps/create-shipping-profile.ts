import type {
  IFulfillmentModuleService,
  Logger,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  createShippingProfilesWorkflow,
  updateShippingProfilesWorkflow,
} from "@medusajs/medusa/core-flows"

export type CreateDefaultShippingProfileStepInput = {
  name: string
}

const CreateDefaultShippingProfileStepId =
  "create-default-shipping-profile-seed-step"
export const createDefaultShippingProfileStep = createStep(
  CreateDefaultShippingProfileStepId,
  async (input: CreateDefaultShippingProfileStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const fulfillmentModuleService =
      container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT)

    const shippingProfiles =
      await fulfillmentModuleService.listShippingProfiles({
        type: "default",
        name: input.name,
      })
    const shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null

    if (shippingProfile) {
      logger.info("Updating shipping profile name...")
      await updateShippingProfilesWorkflow(container).run({
        input: {
          selector: {
            type: "default",
            name: input.name,
          },
          update: {
            name: input.name,
          },
        },
      })
    } else {
      logger.info("Creating shipping profile...")
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: input.name,
              type: "default",
            },
          ],
        },
      })
    }

    const finalShippingProfiles =
      await fulfillmentModuleService.listShippingProfiles({
        type: "default",
      })
    const finalShippingProfile = finalShippingProfiles.length
      ? finalShippingProfiles[0]
      : null

    if (!finalShippingProfile) {
      throw new Error("Could not find default shipping profile")
    }

    return new StepResponse({
      result: [finalShippingProfile],
      shippingProfile: finalShippingProfile,
    })
  }
)

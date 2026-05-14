import { StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  computeAdjustmentsForPreviewWorkflow,
  computeDraftOrderAdjustmentsWorkflow,
  updateCartPromotionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ProductProducerLink } from "../../links/product-producer"
import { buildProducerPromotionContext } from "../utils/promotion-producer-context"

// TODO: Register refreshDraftOrderAdjustmentsWorkflow.hooks.setPromotionContext
// if Medusa confirms/exports it from @medusajs/medusa/core-flows. The workflow
// defines the hook and consumes its result for promotion computation, but it is
// not currently available through the documented public import path.
updateCartPromotionsWorkflow.hooks.setPromotionContext(
  async ({ cart }, { container }) =>
    new StepResponse(
      await buildProducerPromotionContext(
        cart,
        container,
        ProductProducerLink.entryPoint
      )
    )
)

computeDraftOrderAdjustmentsWorkflow.hooks.setPromotionContext(
  async ({ order }, { container }) =>
    new StepResponse(
      await buildProducerPromotionContext(
        order,
        container,
        ProductProducerLink.entryPoint
      )
    )
)

computeAdjustmentsForPreviewWorkflow.hooks.setPromotionContext(
  async ({ previewedOrder, order }, { container }) =>
    new StepResponse(
      await buildProducerPromotionContext(
        previewedOrder ?? order,
        container,
        ProductProducerLink.entryPoint
      )
    )
)

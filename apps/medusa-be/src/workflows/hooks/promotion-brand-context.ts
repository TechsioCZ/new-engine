import { StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  computeAdjustmentsForPreviewWorkflow,
  computeDraftOrderAdjustmentsWorkflow,
  updateCartPromotionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ProductBrandLink } from "../../links/product-brand"
import { buildBrandPromotionContext } from "../utils/promotion-brand-context"

// TODO: Register refreshDraftOrderAdjustmentsWorkflow.hooks.setPromotionContext
// if Medusa confirms/exports it from @medusajs/medusa/core-flows. The workflow
// defines the hook and consumes its result for promotion computation, but it is
// not currently available through the documented public import path.
updateCartPromotionsWorkflow.hooks.setPromotionContext(
  async ({ cart }, { container }) =>
    new StepResponse(
      await buildBrandPromotionContext(
        cart,
        container,
        ProductBrandLink.entryPoint
      )
    )
)

computeDraftOrderAdjustmentsWorkflow.hooks.setPromotionContext(
  async ({ order }, { container }) =>
    new StepResponse(
      await buildBrandPromotionContext(
        order,
        container,
        ProductBrandLink.entryPoint
      )
    )
)

computeAdjustmentsForPreviewWorkflow.hooks.setPromotionContext(
  async ({ previewedOrder, order }, { container }) =>
    new StepResponse(
      await buildBrandPromotionContext(
        previewedOrder ?? order,
        container,
        ProductBrandLink.entryPoint
      )
    )
)

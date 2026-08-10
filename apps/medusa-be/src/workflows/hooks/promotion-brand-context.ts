import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"
import {
  computeAdjustmentsForPreviewWorkflow,
  computeDraftOrderAdjustmentsWorkflow,
  updateCartPromotionsWorkflow,
} from "@medusajs/medusa/core-flows"

import { ProductBrandLink } from "../../links/product-brand"
import { buildBrandPromotionContext } from "../utils/promotion-brand-context"

const promotionContextSourceSchema = z.object({
  items: z.array(z.unknown()),
})

// Register refreshDraftOrderAdjustmentsWorkflow.hooks.setPromotionContext
// if Medusa confirms/exports it from @medusajs/medusa/core-flows. The workflow
// defines the hook and consumes its result for promotion computation, but it is
// not currently available through the documented public import path.
const getPromotionContextSource = (value: unknown) => {
  const parsed = promotionContextSourceSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

updateCartPromotionsWorkflow.hooks.setPromotionContext(
  async ({ cart }, { container }) =>
    new StepResponse(
      await buildBrandPromotionContext(
        getPromotionContextSource(cart),
        container,
        ProductBrandLink.entryPoint,
      ),
    ),
)

computeDraftOrderAdjustmentsWorkflow.hooks.setPromotionContext(
  async ({ order }, { container }) =>
    new StepResponse(
      await buildBrandPromotionContext(
        getPromotionContextSource(order),
        container,
        ProductBrandLink.entryPoint,
      ),
    ),
)

computeAdjustmentsForPreviewWorkflow.hooks.setPromotionContext(
  async ({ previewedOrder, order }, { container }) =>
    new StepResponse(
      await buildBrandPromotionContext(
        getPromotionContextSource(previewedOrder ?? order),
        container,
        ProductBrandLink.entryPoint,
      ),
    ),
)

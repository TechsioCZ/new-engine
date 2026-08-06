import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type { ShopReviewModuleService } from "../../../modules/shop-review"
import { SHOP_REVIEW_MODULE } from "../../../modules/shop-review"

const getShopReviews = async (req: MedusaRequest, res: MedusaResponse) => {
  const shopReviewService =
    req.scope.resolve<ShopReviewModuleService>(SHOP_REVIEW_MODULE)

  const result = await shopReviewService.fetchHeurekaShopReviews()

  res.setHeader("content-type", result.content_type)
  res.status(200).send(result.body)
}

export { getShopReviews as GET }

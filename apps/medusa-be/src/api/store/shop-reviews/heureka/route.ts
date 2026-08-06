import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { ShopReviewModuleService } from "../../../../modules/shop-review"
import { SHOP_REVIEW_MODULE } from "../../../../modules/shop-review"
import type { StoreHeurekaShopReviewsSchemaType } from "../validators"

const normalizeLocale = (locale: unknown): "cs" | "sk" => {
  const value = Array.isArray(locale) ? locale[0] : locale
  return value === "cs" ? "cs" : "sk"
}

const getLocaleFromRequest = (
  req: MedusaRequest<unknown, StoreHeurekaShopReviewsSchemaType>
): "cs" | "sk" => normalizeLocale(req.validatedQuery?.locale)

export async function GET(
  req: MedusaRequest<unknown, StoreHeurekaShopReviewsSchemaType>,
  res: MedusaResponse
) {
  const shopReviewService =
    req.scope.resolve<ShopReviewModuleService>(SHOP_REVIEW_MODULE)

  const result = await shopReviewService.fetchHeurekaShopReviews({
    locale: getLocaleFromRequest(req),
  })

  res.setHeader("content-type", result.content_type)
  res.status(200).send(result.body)
}

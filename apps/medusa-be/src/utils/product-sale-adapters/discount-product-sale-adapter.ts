import { AbstractProductSaleAdapter } from "./abstract-product-sale-adapter"
import { getProductRecordId } from "./helpers"
import type {
  ProductSaleAdapterAlgorithm,
  ProductSaleAdapterContext,
} from "./types"
import { ProductSaleAdapterName } from "./types"

const hasSalePriceListEligibility = (
  product: unknown,
  context?: ProductSaleAdapterContext
): boolean => {
  const productId = getProductRecordId(product)
  if (!productId) {
    return false
  }

  const eligibleProductIds = context?.eligibility?.productIds
  if (!eligibleProductIds) {
    return false
  }

  if (eligibleProductIds instanceof Set) {
    return eligibleProductIds.has(productId)
  }

  for (const eligibleProductId of eligibleProductIds) {
    if (eligibleProductId === productId) {
      return true
    }
  }

  return false
}

export class DiscountProductSaleAdapter extends AbstractProductSaleAdapter {
  override readonly name = ProductSaleAdapterName.DISCOUNT
  override readonly algo: ProductSaleAdapterAlgorithm =
    hasSalePriceListEligibility
}

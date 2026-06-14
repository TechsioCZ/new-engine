import type { HttpTypes } from "@medusajs/types"
import {
  DEFAULT_CURRENCY_CODE,
  resolveSupportedCurrencyCode,
} from "@/lib/storefront/currency"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import {
  resolveProductTopOffer,
  resolveStorefrontPrice,
} from "@/lib/storefront/product-pricing"
import type { ProductPriceState } from "./product-card.types"

export const resolvePriceState = (
  product: HttpTypes.StoreProduct,
  expectedCurrencyCode?: string | null
): ProductPriceState => {
  const calculatedPrice = product.variants?.[0]?.calculated_price
  const topOffer = resolveProductTopOffer(product)
  const price = resolveStorefrontPrice({
    calculatedAmount: calculatedPrice?.calculated_amount,
    calculatedCurrencyCode: calculatedPrice?.currency_code,
    calculatedOriginalAmount: calculatedPrice?.original_amount,
    expectedCurrencyCode,
    topOffer,
  })

  if (!price) {
    return {
      currentLabel: "Cena na vyžiadanie",
      originalLabel: null,
      currentAmount: null,
      originalAmount: null,
      currencyCode: resolveSupportedCurrencyCode(
        expectedCurrencyCode,
        DEFAULT_CURRENCY_CODE
      ),
    }
  }

  const currentLabel = formatCurrencyAmount(
    price.currentAmount,
    price.currencyCode
  )
  const originalLabel =
    typeof price.originalAmount === "number" &&
    price.originalAmount > price.currentAmount
      ? formatCurrencyAmount(price.originalAmount, price.currencyCode)
      : null

  return {
    currentLabel,
    originalLabel,
    currentAmount: price.currentAmount,
    originalAmount: price.originalAmount,
    currencyCode: price.currencyCode,
  }
}

export const resolveDiscountLabel = (
  price: ProductPriceState
): string | null => {
  if (
    typeof price.currentAmount !== "number" ||
    typeof price.originalAmount !== "number" ||
    price.originalAmount <= price.currentAmount
  ) {
    return null
  }

  const discountAmount = price.originalAmount - price.currentAmount
  return `-${formatCurrencyAmount(discountAmount, price.currencyCode)}`
}

export const getProductPriceLabel = (product: HttpTypes.StoreProduct): string =>
  resolvePriceState(product).currentLabel

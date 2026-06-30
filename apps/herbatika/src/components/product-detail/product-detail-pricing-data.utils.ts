import type { resolveProductMediaFacts } from "@/components/product-detail/utils/media-facts"
import { resolveOfferState } from "@/components/product-detail/utils/metadata-parsers"
import {
  resolveDiscountPercent,
  resolveDisplayOriginalAmount,
  resolvePriceState,
  resolveUnitPriceLabel,
  resolveVipCreditLabel,
  resolveVolumeDiscountOptions,
} from "@/components/product-detail/utils/pricing-utils"
import { asNumber } from "@/components/product-detail/utils/value-utils"
import { resolveFreeShippingThresholdAmount } from "@/lib/storefront/free-shipping"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"

export const resolveDisplayOriginalLabel = (
  productPrice: ReturnType<typeof resolvePriceState> | null,
  displayOriginalAmount: number | null,
  currentCurrencyCode: string
) =>
  productPrice && typeof displayOriginalAmount === "number"
    ? formatCurrencyAmount(displayOriginalAmount, currentCurrencyCode)
    : null

export const resolveProductVolumeDiscountOptions = (
  currentAmount: number | null,
  currentCurrencyCode: string,
  offerState: ReturnType<typeof resolveOfferState>,
  availableQuantity: number | null
) => {
  const discountOptions = resolveVolumeDiscountOptions(
    currentAmount,
    currentCurrencyCode,
    offerState.applyQuantityDiscount || offerState.applyVolumeDiscount
  )

  if (availableQuantity === null) {
    return discountOptions
  }

  return discountOptions.filter(
    (option) => option.quantity <= availableQuantity
  )
}

export const resolveProductPricingLabels = ({
  productPrice,
  regionCurrencyCode,
  offerState,
  mediaFacts,
}: {
  productPrice: ReturnType<typeof resolvePriceState> | null
  regionCurrencyCode: string
  offerState: ReturnType<typeof resolveOfferState>
  mediaFacts: ReturnType<typeof resolveProductMediaFacts>
}) => {
  const currentAmount = productPrice?.currentAmount ?? null
  const currentAmountWithoutTax = productPrice?.currentAmountWithoutTax ?? null
  const currentAmountLabel = productPrice?.currentLabel ?? "Cena na vyžiadanie"
  const currentCurrencyCode = productPrice?.currencyCode ?? regionCurrencyCode
  const displayOriginalAmount = resolveDisplayOriginalAmount(productPrice)
  const displayOriginalLabel = resolveDisplayOriginalLabel(
    productPrice,
    displayOriginalAmount,
    currentCurrencyCode
  )
  const discountPercent = resolveDiscountPercent(
    currentAmount,
    displayOriginalAmount
  )
  const vipCreditLabel = resolveVipCreditLabel(
    currentAmount,
    currentCurrencyCode,
    offerState.applyLoyaltyDiscount
  )
  const vatRate = asNumber(offerState.offerSource?.vat)
  const unitPriceLabel = resolveUnitPriceLabel({
    currentAmount,
    currentAmountWithoutTax,
    currencyCode: currentCurrencyCode,
    mediaFacts,
    unitLabel: offerState.unitLabel,
    vatRate,
  })

  return {
    currentAmount,
    currentAmountLabel,
    currentCurrencyCode,
    discountPercent,
    displayOriginalLabel,
    unitPriceLabel,
    vipCreditLabel,
  }
}

export const resolveSelectedVolumeDiscountOption = (
  volumeDiscountOptions: ReturnType<typeof resolveVolumeDiscountOptions>,
  selectedVolumeDiscountId: string | null
) =>
  volumeDiscountOptions.find(
    (option) => option.id === selectedVolumeDiscountId
  ) ??
  volumeDiscountOptions[0] ??
  null

export const resolveFreeShippingThresholdLabel = (
  currentCurrencyCode: string
) => {
  const freeShippingThresholdAmount =
    resolveFreeShippingThresholdAmount(currentCurrencyCode)

  return freeShippingThresholdAmount === null
    ? null
    : formatCurrencyAmount(freeShippingThresholdAmount, currentCurrencyCode, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
}

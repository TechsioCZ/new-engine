import type { Product } from "@/components/product-detail/product-detail.types"
import type { resolveOfferState } from "@/components/product-detail/utils/metadata-parsers"
import {
  resolveDiscountPercent,
  resolveDisplayOriginalAmount,
  resolvePriceState,
  resolveVipCreditLabel,
  resolveVolumeDiscountOptions,
} from "@/components/product-detail/utils/pricing-utils"
import { resolveFreeShippingThresholdAmount } from "@/lib/storefront/free-shipping"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { formatUnitPriceLabel } from "@/lib/storefront/unit-price"

interface ProductPricingDataLabels {
  perUnit: (price: string) => string
  title: (quantity: number) => string
}

const resolveDisplayOriginalLabel = (
  productPrice: ReturnType<typeof resolvePriceState> | null,
  displayOriginalAmount: number | null,
  currencyCode: string,
) =>
  productPrice && typeof displayOriginalAmount === "number"
    ? formatCurrencyAmount(displayOriginalAmount, currencyCode)
    : null

export const resolveProductPricingData = ({
  inventory,
  labels,
  offerState,
  priceUnavailableLabel,
  priceVariantId,
  product,
  regionCurrencyCode,
  selectedVariantId,
  selectedVolumeDiscountId,
}: {
  inventory: {
    availableQuantity: number | null
    isPurchasable: boolean
    maxPurchaseQuantity: number
  }
  labels: ProductPricingDataLabels
  offerState: ReturnType<typeof resolveOfferState>
  priceUnavailableLabel: string
  priceVariantId: string | null
  product: Product | null
  regionCurrencyCode: string
  selectedVariantId: string | null
  selectedVolumeDiscountId: string | null
}) => {
  const productPrice =
    product === null
      ? null
      : resolvePriceState(
          product,
          priceVariantId,
          regionCurrencyCode,
          priceUnavailableLabel,
        )
  const currentAmount = productPrice?.currentAmount ?? null
  const currentCurrencyCode = productPrice?.currencyCode ?? regionCurrencyCode
  const displayOriginalAmount = resolveDisplayOriginalAmount(productPrice)
  const discountOptions = resolveVolumeDiscountOptions(
    currentAmount,
    currentCurrencyCode,
    offerState.applyQuantityDiscount || offerState.applyVolumeDiscount,
    labels,
  )
  const { availableQuantity } = inventory
  const volumeDiscountOptions =
    availableQuantity === null
      ? discountOptions
      : discountOptions.filter((option) => option.quantity <= availableQuantity)
  const selectedVolumeDiscountOption =
    volumeDiscountOptions.find(
      (option) => option.id === selectedVolumeDiscountId,
    ) ??
    volumeDiscountOptions[0] ??
    null

  return {
    canAddToCart:
      selectedVariantId !== null &&
      selectedVariantId !== "" &&
      typeof currentAmount === "number" &&
      inventory.isPurchasable,
    currentAmountLabel: productPrice?.currentLabel ?? priceUnavailableLabel,
    currentCurrencyCode,
    discountPercent: resolveDiscountPercent(
      currentAmount,
      displayOriginalAmount,
    ),
    displayOriginalLabel: resolveDisplayOriginalLabel(
      productPrice,
      displayOriginalAmount,
      currentCurrencyCode,
    ),
    maxQuantity: inventory.maxPurchaseQuantity,
    selectedVolumeDiscountId: selectedVolumeDiscountOption?.id ?? null,
    selectedVolumeDiscountOption,
    unitPriceLabel: formatUnitPriceLabel(productPrice?.pricePerUnit),
    vipCreditLabel: resolveVipCreditLabel(
      currentAmount,
      currentCurrencyCode,
      offerState.applyLoyaltyDiscount,
    ),
    volumeDiscountOptions,
  }
}

export const resolveFreeShippingThresholdLabel = (
  currentCurrencyCode: string,
) => {
  const amount = resolveFreeShippingThresholdAmount(currentCurrencyCode)
  return amount === null
    ? null
    : formatCurrencyAmount(amount, currentCurrencyCode, {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      })
}

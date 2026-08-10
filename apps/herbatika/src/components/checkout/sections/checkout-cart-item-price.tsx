import type { HerbatikaCurrencyCode } from "@/lib/storefront/currency"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"

interface CheckoutCartItemPriceProps {
  currencyCode: HerbatikaCurrencyCode
  currentLineAmount: number
  originalLineAmount: number | null
}

export const CheckoutCartItemPrice = ({
  currencyCode,
  currentLineAmount,
  originalLineAmount,
}: CheckoutCartItemPriceProps) => {
  const shouldShowOriginalAmount =
    typeof originalLineAmount === "number" &&
    originalLineAmount > currentLineAmount + 0.001

  return (
    <div className="flex flex-col items-end gap-100">
      <p className="font-bold text-fg-primary text-xl leading-tight">
        {formatCurrencyAmount(currentLineAmount, currencyCode)}
      </p>
      {shouldShowOriginalAmount ? (
        <p className="font-light text-fg-secondary text-sm leading-tight line-through">
          {formatCurrencyAmount(originalLineAmount, currencyCode)}
        </p>
      ) : null}
    </div>
  )
}

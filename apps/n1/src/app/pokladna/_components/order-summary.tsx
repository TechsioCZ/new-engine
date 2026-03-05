import type { HttpTypes } from "@medusajs/types"
import { Button } from "@ui/atoms/button"
import type { Cart } from "@/types/cart"
import { formatAmount } from "@/utils/format/format-product"
import { CartItemRow } from "./cart-item-row"
import { PriceSummaryRow } from "./price-summary-row"

type OrderSummaryProps = {
  cart: Cart
  selectedShipping?: HttpTypes.StoreCartShippingOption
  errorMessage?: string
  isReady: boolean
  isCompletingCart: boolean
  onBack: () => void
  onComplete: () => void
}

export function OrderSummary({
  cart,
  selectedShipping,
  errorMessage,
  isReady,
  isCompletingCart,
  onBack,
  onComplete,
}: OrderSummaryProps) {
  const itemsSubtotal = formatAmount(cart.original_item_subtotal)
  const delivery = formatAmount(cart.shipping_total)
  const discount = formatAmount(cart.discount_total)
  const itemsTax = formatAmount(cart.item_tax_total)
  const total = formatAmount(cart.total)

  return (
    <div className="rounded border border-border-secondary bg-surface p-400 lg:sticky lg:top-4">
      <h2 className="mb-400 font-semibold text-fg-primary text-lg">
        Shrnutí objednávky
      </h2>

      <div className="mb-400 border-border-secondary border-b pb-400 [&>*+*]:mt-200">
        {cart.items?.map((item) => (
          <CartItemRow
            currencyCode={cart.currency_code}
            item={item}
            key={item.id}
          />
        ))}
      </div>

      <div className="border-border-secondary border-b pb-400 [&>*+*]:mt-200">
        <PriceSummaryRow label="Cena bez DPH" value={itemsSubtotal} />

        {cart.discount_total > 0 && (
          <PriceSummaryRow
            label="Discount"
            value={`-${discount}`}
            variant="success"
          />
        )}

        <PriceSummaryRow label="DPH" value={itemsTax} />

        {selectedShipping && (
          <PriceSummaryRow label="Doprava" value={delivery || "Zdarma"} />
        )}
      </div>

      <div className="mt-400 mb-400">
        <PriceSummaryRow label="Celkem" value={total} variant="bold" />
      </div>

      {errorMessage && (
        <div className="mb-400 text-danger">
          <p className="text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="flex gap-200">
        <Button
          className="flex-1"
          disabled={isCompletingCart}
          onClick={onBack}
          variant="secondary"
        >
          Zpět
        </Button>
        <Button
          className="flex-1"
          disabled={!isReady || isCompletingCart}
          onClick={onComplete}
        >
          {isCompletingCart ? "Zpracovávám..." : "Potvrdit objednávku"}
        </Button>
      </div>
    </div>
  )
}

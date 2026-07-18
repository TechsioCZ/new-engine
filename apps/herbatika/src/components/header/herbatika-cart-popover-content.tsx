import { Icon } from "@techsio/ui-kit/atoms/icon"

import { formatCurrencyAmount } from "@/lib/storefront/price-format"

export type CartTotalsProps = {
  cartItemsTotalLabel: string
  cartTotalLabel: string
  currencyCode: "EUR" | "CZK"
  discountAmount: number | null
  shippingAmount: number | null
  taxAmount: number
}

export function CartTotals({
  cartItemsTotalLabel,
  cartTotalLabel,
  currencyCode,
  discountAmount,
  shippingAmount,
  taxAmount,
}: CartTotalsProps) {
  return (
    <div className="space-y-150 border-border-secondary border-t pt-250">
      <div className="flex items-center justify-between gap-200">
        <span className="text-fg-secondary">Cena produktov bez DPH:</span>
        <span>{cartItemsTotalLabel}</span>
      </div>
      {shippingAmount !== null && shippingAmount > 0 ? (
        <div className="flex items-center justify-between gap-200">
          <span className="text-fg-secondary">Doprava bez DPH:</span>
          <span>{formatCurrencyAmount(shippingAmount, currencyCode)}</span>
        </div>
      ) : null}
      {taxAmount > 0 ? (
        <div className="flex items-center justify-between gap-200">
          <span className="text-fg-secondary">DPH:</span>
          <span>{formatCurrencyAmount(taxAmount, currencyCode)}</span>
        </div>
      ) : null}
      {discountAmount !== null && discountAmount > 0 ? (
        <div className="flex items-center justify-between gap-200 text-success">
          <span>Zľava:</span>
          <span>-{formatCurrencyAmount(discountAmount, currencyCode)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-200 border-border-secondary border-t pt-200 font-bold text-lg">
        <span>Spolu s DPH:</span>
        <span>{cartTotalLabel}</span>
      </div>
    </div>
  )
}

export function EmptyCartPreview() {
  return (
    <output className="flex flex-col items-center gap-200 py-400 text-center">
      <span aria-hidden="true" className="grid place-items-center text-primary">
        <Icon className="text-icon-cart" icon="token-icon-cart" />
      </span>
      <div className="space-y-50">
        <p className="font-semibold text-fg-primary">Váš košík je prázdny</p>
        <p className="text-fg-secondary text-sm">
          Produkty môžete pridať z katalógu.
        </p>
      </div>
    </output>
  )
}

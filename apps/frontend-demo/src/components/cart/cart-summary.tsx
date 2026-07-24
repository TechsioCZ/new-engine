import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Link from "next/link"

import { formatPrice } from "@/utils/price-utils"

interface CartSummaryProps {
  subtotal: number
  total: number
  tax: number
  shipping: number
  currencyCode?: string | undefined
}

export function CartSummary({
  subtotal,
  total,
  tax,
  shipping,
  currencyCode,
}: CartSummaryProps) {
  return (
    <div className="lg:sticky lg:top-cart-summary-top lg:h-fit">
      <div className="rounded-cart-summary bg-cart-summary-bg p-cart-summary-padding shadow-cart-summary">
        <h2 className="mb-cart-summary-title-margin font-cart-summary-title text-cart-summary-title">
          Souhrn objednávky
        </h2>

        <div className="space-y-cart-summary-rows-gap">
          <div className="flex justify-between text-cart-summary-text">
            <span>Mezisoučet</span>
            <span>{formatPrice(subtotal, currencyCode)}</span>
          </div>
          <div className="flex justify-between text-cart-summary-text">
            <span>Doprava</span>
            <span>
              {shipping === 0 ? "ZDARMA" : formatPrice(shipping, currencyCode)}
            </span>
          </div>
          <div className="flex justify-between text-cart-summary-text">
            <span>DPH (21%)</span>
            <span>{formatPrice(tax, currencyCode)}</span>
          </div>
        </div>

        <div className="my-cart-summary-divider border-cart-summary-divider border-t" />

        <div className="flex justify-between font-semibold text-cart-summary-text text-md">
          <span>Celkem</span>
          <span>{formatPrice(total, currencyCode)}</span>
        </div>
        <div className="mt-300 flex justify-between">
          <LinkButton as={Link} href="/products" size="md">
            Zpět k nákupu
          </LinkButton>
          <LinkButton
            as={Link}
            href="/checkout"
            //icon="token-icon-lock"
            prefetch={true}
            size="md"
          >
            Pokračovat
          </LinkButton>
        </div>
      </div>
    </div>
  )
}

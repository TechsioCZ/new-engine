"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { useTranslations } from "next-intl"

import type { HerbatikaCurrencyCode } from "@/lib/storefront/currency"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"

interface CartTotalsProps {
  cartItemsTotalLabel: string
  cartTotalLabel: string
  currencyCode: HerbatikaCurrencyCode
  discountAmount: number | null
  shippingAmount: number | null
  taxAmount: number
}

export const CartTotals = ({
  cartItemsTotalLabel,
  cartTotalLabel,
  currencyCode,
  discountAmount,
  shippingAmount,
  taxAmount,
}: CartTotalsProps) => {
  const t = useTranslations("cart")

  return (
    <div className="space-y-150 border-border-secondary border-t pt-250">
      <div className="flex items-center justify-between gap-200">
        <span className="text-fg-secondary">
          {t("products_subtotal_excl_tax")}:
        </span>
        <span>{cartItemsTotalLabel}</span>
      </div>

      {shippingAmount !== null && shippingAmount > 0 ? (
        <div className="flex items-center justify-between gap-200">
          <span className="text-fg-secondary">{t("shipping_excl_tax")}:</span>
          <span>{formatCurrencyAmount(shippingAmount, currencyCode)}</span>
        </div>
      ) : null}

      {taxAmount > 0 ? (
        <div className="flex items-center justify-between gap-200">
          <span className="text-fg-secondary">{t("tax")}:</span>
          <span>{formatCurrencyAmount(taxAmount, currencyCode)}</span>
        </div>
      ) : null}

      {discountAmount !== null && discountAmount > 0 ? (
        <div className="flex items-center justify-between gap-200 text-success">
          <span>{t("discount")}:</span>
          <span>-{formatCurrencyAmount(discountAmount, currencyCode)}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-200 border-border-secondary border-t pt-200 font-bold text-lg">
        <span>{t("total_incl_tax")}:</span>
        <span>{cartTotalLabel}</span>
      </div>
    </div>
  )
}

export const EmptyCartPreview = () => {
  const t = useTranslations("cart")

  return (
    <output className="flex flex-col items-center gap-200 py-400 text-center">
      <span aria-hidden="true" className="grid place-items-center text-primary">
        <Icon className="text-icon-cart" icon="token-icon-cart" />
      </span>
      <div className="space-y-50">
        <p className="font-semibold text-fg-primary">{t("empty_title")}</p>
        <p className="text-fg-secondary text-sm">{t("empty_description")}</p>
      </div>
    </output>
  )
}

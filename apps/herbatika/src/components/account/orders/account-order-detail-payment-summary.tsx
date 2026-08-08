import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"

import { formatOrderAmount } from "@/lib/storefront/order-format"

import { resolveOrderAmountSummary } from "./account-order-detail-amounts"

export const AccountOrderDetailPaymentSummary = ({
  order,
}: {
  order: HttpTypes.StoreOrder
}) => {
  const tAuth = useTranslations("auth")
  const tCart = useTranslations("cart")
  const amounts = resolveOrderAmountSummary(order)
  return (
    <article className="space-y-100">
      <h3 className="font-semibold">
        {tAuth("account.orders.detail.payment_summary")}
      </h3>
      <p className="text-fg-secondary text-sm">
        {tCart("products_subtotal_excl_tax")}:{" "}
        {formatOrderAmount(amounts.itemSubtotal, order.currency_code)}
      </p>
      <p className="text-fg-secondary text-sm">
        {tCart("shipping_excl_tax")}:{" "}
        {formatOrderAmount(amounts.shippingSubtotal, order.currency_code)}
      </p>
      <p className="text-fg-secondary text-sm">
        {tCart("tax")}:{" "}
        {formatOrderAmount(amounts.taxTotal, order.currency_code)}
      </p>
      <p className="font-semibold text-fg-primary text-sm">
        {tCart("total_incl_tax")}:{" "}
        {formatOrderAmount(amounts.total, order.currency_code)}
      </p>
    </article>
  )
}

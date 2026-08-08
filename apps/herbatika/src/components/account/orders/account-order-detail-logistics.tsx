import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"

import {
  resolveOrderPaymentMethodLabel,
  resolveOrderShippingMethodLabel,
  resolveOrderTrackingCode,
} from "@/lib/storefront/order-detail-format"
import {
  resolveOrderFulfillmentStatusLabel,
  resolveOrderPaymentStatusLabel,
} from "@/lib/storefront/order-format"
import type { OrderStatusTranslator } from "@/lib/storefront/order-format"

export const AccountOrderDetailLogistics = ({
  order,
}: {
  order: HttpTypes.StoreOrder
}) => {
  const t = useTranslations("auth")
  const translateStatus: OrderStatusTranslator = (group, status) =>
    t(`account.orders.status.${group}`, { status })
  const fulfillmentStatus = resolveOrderFulfillmentStatusLabel(
    order,
    translateStatus,
  )
  const paymentStatus = resolveOrderPaymentStatusLabel(order, translateStatus)
  const shippingMethod = resolveOrderShippingMethodLabel(order)
  const paymentMethod = resolveOrderPaymentMethodLabel(order)
  const trackingCode = resolveOrderTrackingCode(order)

  return (
    <div className="grid gap-300 rounded-md border border-border-secondary bg-base p-350 md:grid-cols-3">
      <article className="space-y-100">
        <h3 className="font-semibold">{t("account.orders.detail.shipping")}</h3>
        <p className="text-fg-secondary text-sm">
          {shippingMethod ?? t("account.orders.detail.shipping_unavailable")}
        </p>
        {typeof fulfillmentStatus === "string" &&
          fulfillmentStatus.length > 0 && (
            <p className="text-fg-secondary text-sm">
              {t("account.orders.detail.status", { status: fulfillmentStatus })}
            </p>
          )}
      </article>
      <article className="space-y-100">
        <h3 className="font-semibold">{t("account.orders.detail.payment")}</h3>
        <p className="text-fg-secondary text-sm">
          {paymentMethod ?? t("account.orders.detail.payment_unavailable")}
        </p>
        {typeof paymentStatus === "string" && paymentStatus.length > 0 && (
          <p className="text-fg-secondary text-sm">
            {t("account.orders.detail.status", { status: paymentStatus })}
          </p>
        )}
      </article>
      <article className="space-y-100">
        <h3 className="font-semibold">{t("account.orders.detail.tracking")}</h3>
        <p className="text-fg-secondary text-sm">
          {trackingCode ?? t("account.orders.detail.tracking_unavailable")}
        </p>
      </article>
    </div>
  )
}

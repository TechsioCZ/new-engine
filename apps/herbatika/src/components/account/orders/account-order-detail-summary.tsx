import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { useLocale, useTranslations } from "next-intl"

import NextLink from "@/components/app-link"
import { resolveOrderContactEmail } from "@/lib/storefront/order-detail-format"
import {
  formatOrderDate,
  resolveOrderDisplayId,
  resolveOrderInvoiceUrl,
  resolveOrderItemCount,
  resolveOrderProgressState,
} from "@/lib/storefront/order-format"
import type { OrderStatusTranslator } from "@/lib/storefront/order-format"

import { AccountOrderDetailAddresses } from "./account-order-detail-addresses"
import { AccountOrderDetailLogistics } from "./account-order-detail-logistics"
import { AccountOrderDetailPaymentSummary } from "./account-order-detail-payment-summary"

interface AccountOrderDetailSummaryProps {
  order: HttpTypes.StoreOrder
  customerEmail?: string | null
}

export const AccountOrderDetailSummary = ({
  order,
  customerEmail,
}: AccountOrderDetailSummaryProps) => {
  const locale = useLocale()
  const tAuth = useTranslations("auth")
  const tForm = useTranslations("form")
  const translateOrderStatus: OrderStatusTranslator = (group, status) =>
    tAuth(`account.orders.status.${group}`, { status })
  const invoiceUrl = resolveOrderInvoiceUrl(order)
  const orderProgress = resolveOrderProgressState(order, translateOrderStatus)

  return (
    <section className="space-y-400 rounded-lg border border-border-secondary bg-surface p-550">
      <header className="flex flex-wrap items-start justify-between gap-300 border-border-secondary border-b pb-300">
        <div className="space-y-100">
          <h2 className="font-semibold text-xl">
            {tAuth("account.orders.detail.order_title", {
              orderId: resolveOrderDisplayId(order),
            })}
          </h2>
          <p className="text-fg-secondary text-sm">
            {tAuth("account.orders.detail.created", {
              date: formatOrderDate(order.created_at, locale),
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-200">
          <Badge variant={orderProgress.variant}>{orderProgress.label}</Badge>
          {typeof invoiceUrl === "string" && invoiceUrl.length > 0 && (
            <LinkButton
              as={NextLink}
              href={invoiceUrl}
              rel="noreferrer"
              size="sm"
              target="_blank"
              theme="outlined"
              variant="secondary"
            >
              {tAuth("account.orders.invoice")}
            </LinkButton>
          )}
        </div>
      </header>

      <div className="grid gap-300 md:grid-cols-2">
        <AccountOrderDetailPaymentSummary order={order} />
        <article className="space-y-100">
          <h3 className="font-semibold">
            {tAuth("account.orders.detail.order_details")}
          </h3>
          <p className="text-fg-secondary text-sm">
            {tAuth("account.orders.detail.order_id", { id: order.id })}
          </p>
          <p className="text-fg-secondary text-sm">
            {tForm("email")}: {resolveOrderContactEmail(order, customerEmail)}
          </p>
          <p className="text-fg-secondary text-sm">
            {tAuth("account.orders.detail.items", {
              count: resolveOrderItemCount(order.items ?? []),
            })}
          </p>
          <p className="text-fg-secondary text-sm">
            {tAuth("account.orders.detail.updated", {
              date: formatOrderDate(order.updated_at, locale),
            })}
          </p>
        </article>
      </div>

      <AccountOrderDetailAddresses order={order} />
      <AccountOrderDetailLogistics order={order} />
    </section>
  )
}

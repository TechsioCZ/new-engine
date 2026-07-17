import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import NextLink from "next/link"
import { useLocale, useTranslations } from "next-intl"
import {
  resolveOrderAddresses,
  resolveOrderContactEmail,
  resolveOrderPaymentMethodLabel,
  resolveOrderShippingMethodLabel,
  resolveOrderTrackingCode,
} from "@/lib/storefront/order-detail-format"
import {
  formatOrderAmount,
  formatOrderDate,
  type OrderStatusTranslator,
  resolveOrderDisplayId,
  resolveOrderFulfillmentStatusLabel,
  resolveOrderInvoiceUrl,
  resolveOrderItemCount,
  resolveOrderItemTotalAmount,
  resolveOrderPaymentStatusLabel,
  resolveOrderProgressState,
  resolveOrderTotalAmount,
} from "@/lib/storefront/order-format"

type AccountOrderDetailSummaryProps = {
  order: HttpTypes.StoreOrder
  customerEmail?: string | null
}

type OrderAmountSummary = {
  itemSubtotal: number
  shippingSubtotal: number
  taxTotal: number
  total: number
}

type OrderAddress = ReturnType<typeof resolveOrderAddresses>["shipping"]

const readOrderAmount = (
  order: HttpTypes.StoreOrder,
  key: string
): number | null => {
  const value = (order as unknown as Record<string, unknown>)[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

const resolveOrderAmountSummary = (
  order: HttpTypes.StoreOrder
): OrderAmountSummary => {
  const orderItems = order.items ?? []
  const orderItemsTotal =
    readOrderAmount(order, "item_total") ??
    orderItems.reduce(
      (total, item) => total + resolveOrderItemTotalAmount(item),
      0
    )
  const orderItemTaxTotal = readOrderAmount(order, "item_tax_total") ?? 0
  const orderSubtotal =
    readOrderAmount(order, "item_subtotal") ??
    Math.max(orderItemsTotal - orderItemTaxTotal, 0)
  const orderShippingTotal = readOrderAmount(order, "shipping_total") ?? 0
  const orderShippingTaxTotal =
    readOrderAmount(order, "shipping_tax_total") ?? 0
  const orderShippingSubtotal =
    readOrderAmount(order, "shipping_subtotal") ??
    Math.max(orderShippingTotal - orderShippingTaxTotal, 0)
  const orderTaxTotal =
    readOrderAmount(order, "tax_total") ??
    Math.max(orderItemTaxTotal + orderShippingTaxTotal, 0)

  return {
    itemSubtotal: orderSubtotal,
    shippingSubtotal: orderShippingSubtotal,
    taxTotal: orderTaxTotal,
    total: resolveOrderTotalAmount(order),
  }
}

function OrderAddressBlock({
  address,
  title,
  unavailableText,
}: {
  address: OrderAddress
  title: string
  unavailableText: string
}) {
  return (
    <article className="space-y-150">
      <h3 className="font-semibold">{title}</h3>
      {address ? (
        <div className="space-y-50 text-fg-secondary text-sm">
          {address.fullName && (
            <p className="font-medium text-fg-primary">{address.fullName}</p>
          )}
          {address.company && <p>{address.company}</p>}
          {address.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : (
        <p className="text-fg-secondary text-sm">{unavailableText}</p>
      )}
    </article>
  )
}

export function AccountOrderDetailSummary({
  order,
  customerEmail,
}: AccountOrderDetailSummaryProps) {
  const locale = useLocale()
  const tAuth = useTranslations("auth")
  const tCart = useTranslations("cart")
  const tForm = useTranslations("form")
  const translateOrderStatus: OrderStatusTranslator = (group, status) =>
    tAuth(`account.orders.status.${group}`, { status })
  const orderItems = order.items ?? []
  const amountSummary = resolveOrderAmountSummary(order)
  const addresses = resolveOrderAddresses(order)
  const shippingMethod = resolveOrderShippingMethodLabel(order)
  const paymentMethod = resolveOrderPaymentMethodLabel(order)
  const trackingCode = resolveOrderTrackingCode(order)
  const invoiceUrl = resolveOrderInvoiceUrl(order)
  const resolvedEmail = resolveOrderContactEmail(order, customerEmail)
  const orderProgress = resolveOrderProgressState(order, translateOrderStatus)
  const paymentStatus = resolveOrderPaymentStatusLabel(
    order,
    translateOrderStatus
  )
  const fulfillmentStatus = resolveOrderFulfillmentStatusLabel(
    order,
    translateOrderStatus
  )

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
          {invoiceUrl && (
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
        <article className="space-y-100">
          <h3 className="font-semibold">
            {tAuth("account.orders.detail.payment_summary")}
          </h3>
          <p className="text-fg-secondary text-sm">
            {tCart("products_subtotal_excl_tax")}:{" "}
            {formatOrderAmount(
              amountSummary.itemSubtotal,
              order.currency_code
            )}
          </p>
          <p className="text-fg-secondary text-sm">
            {tCart("shipping_excl_tax")}:{" "}
            {formatOrderAmount(
              amountSummary.shippingSubtotal,
              order.currency_code
            )}
          </p>
          <p className="text-fg-secondary text-sm">
            {tCart("tax")}:{" "}
            {formatOrderAmount(amountSummary.taxTotal, order.currency_code)}
          </p>
          <p className="font-semibold text-fg-primary text-sm">
            {tCart("total_incl_tax")}:{" "}
            {formatOrderAmount(amountSummary.total, order.currency_code)}
          </p>
        </article>

        <article className="space-y-100">
          <h3 className="font-semibold">
            {tAuth("account.orders.detail.order_details")}
          </h3>
          <p className="text-fg-secondary text-sm">
            {tAuth("account.orders.detail.order_id", { id: order.id })}
          </p>
          <p className="text-fg-secondary text-sm">
            {tForm("email")}: {resolvedEmail}
          </p>
          <p className="text-fg-secondary text-sm">
            {tAuth("account.orders.detail.items", {
              count: resolveOrderItemCount(orderItems),
            })}
          </p>
          <p className="text-fg-secondary text-sm">
            {tAuth("account.orders.detail.updated", {
              date: formatOrderDate(order.updated_at, locale),
            })}
          </p>
        </article>
      </div>

      <div className="grid gap-300 rounded-md border border-border-secondary bg-base p-350 md:grid-cols-2">
        <OrderAddressBlock
          address={addresses.shipping}
          title={tAuth("account.orders.detail.shipping_address")}
          unavailableText={tAuth(
            "account.orders.detail.address_unavailable"
          )}
        />
        <OrderAddressBlock
          address={addresses.billing}
          title={tAuth("account.orders.detail.billing_address")}
          unavailableText={tAuth(
            "account.orders.detail.address_unavailable"
          )}
        />
      </div>

      <div className="grid gap-300 rounded-md border border-border-secondary bg-base p-350 md:grid-cols-3">
        <article className="space-y-100">
          <h3 className="font-semibold">
            {tAuth("account.orders.detail.shipping")}
          </h3>
          <p className="text-fg-secondary text-sm">
            {shippingMethod ??
              tAuth("account.orders.detail.shipping_unavailable")}
          </p>
          {fulfillmentStatus && (
            <p className="text-fg-secondary text-sm">
              {tAuth("account.orders.detail.status", {
                status: fulfillmentStatus,
              })}
            </p>
          )}
        </article>

        <article className="space-y-100">
          <h3 className="font-semibold">
            {tAuth("account.orders.detail.payment")}
          </h3>
          <p className="text-fg-secondary text-sm">
            {paymentMethod ??
              tAuth("account.orders.detail.payment_unavailable")}
          </p>
          {paymentStatus && (
            <p className="text-fg-secondary text-sm">
              {tAuth("account.orders.detail.status", {
                status: paymentStatus,
              })}
            </p>
          )}
        </article>

        <article className="space-y-100">
          <h3 className="font-semibold">
            {tAuth("account.orders.detail.tracking")}
          </h3>
          <p className="text-fg-secondary text-sm">
            {trackingCode ??
              tAuth("account.orders.detail.tracking_unavailable")}
          </p>
        </article>
      </div>
    </section>
  )
}

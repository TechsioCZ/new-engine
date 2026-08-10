import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { useLocale, useTranslations } from "next-intl"

import NextLink from "@/components/app-link"
import {
  formatOrderAmount,
  formatOrderDate,
  resolveOrderDisplayId,
  resolveOrderInvoiceUrl,
  resolveOrderItemCount,
  resolveOrderProgressState,
  resolveOrderTotalAmount,
} from "@/lib/storefront/order-format"
import type { OrderStatusTranslator } from "@/lib/storefront/order-format"

import { AccountOrderGroupItems } from "./account-order-group-items"

interface AccountOrderGroupProps {
  order: HttpTypes.StoreOrder
  onPrefetchOrderDetail: (orderId: string) => void
}

export const AccountOrderGroup = ({
  order,
  onPrefetchOrderDetail,
}: AccountOrderGroupProps) => {
  const locale = useLocale()
  const t = useTranslations("auth")
  const translateStatus: OrderStatusTranslator = (group, status) =>
    t(`account.orders.status.${group}`, { status })
  const detailHref = `/account/orders/${order.id}`
  const invoiceUrl = resolveOrderInvoiceUrl(order)
  const progress = resolveOrderProgressState(order, translateStatus)
  const items = order.items ?? []
  const prefetch = () => {
    onPrefetchOrderDetail(order.id)
  }
  const gridColumns = "lg:grid-cols-[minmax(0,1fr)_max-content_max-content]"
  const subgrid =
    "lg:supports-[grid-template-columns:subgrid]:grid-cols-subgrid"

  return (
    <article
      className={`overflow-hidden rounded-order-group-lg border border-order-group-border bg-order-group-surface lg:grid ${gridColumns}`}
    >
      <header
        className={`flex flex-col gap-order-group-header-gap border-order-group-border border-b bg-order-group-overlay p-order-group-3xl lg:col-span-3 lg:grid lg:items-start lg:gap-order-group-column ${gridColumns} ${subgrid}`}
      >
        <section className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-order-group-lg gap-y-order-group-sm">
            <p className="font-semibold text-order-group-fg-primary text-order-group-primary-size">
              {resolveOrderDisplayId(order)}
            </p>
            <p className="text-order-group-fg-secondary text-order-group-secondary-size">
              {formatOrderDate(order.created_at, locale)}
            </p>
            <Badge
              className="whitespace-nowrap px-150"
              size="sm"
              variant={progress.variant}
            >
              {progress.label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center">
            <p className="text-order-group-fg-secondary text-order-group-secondary-size">
              {t("account.orders.item_count", {
                count: resolveOrderItemCount(items),
              })}
            </p>
          </div>
        </section>
        <section className="leading-none lg:justify-self-end lg:text-start">
          <p className="font-medium text-order-group-fg-tertiary text-order-group-tertiary-size uppercase">
            {t("account.orders.total_amount")}
          </p>
          <p className="font-semibold">
            {formatOrderAmount(
              resolveOrderTotalAmount(order),
              order.currency_code,
            )}
          </p>
        </section>
        <div className="flex flex-wrap gap-order-group-md lg:justify-self-end">
          {invoiceUrl !== null && invoiceUrl.length > 0 && (
            <LinkButton
              as={NextLink}
              href={invoiceUrl}
              rel="noreferrer"
              size="sm"
              target="_blank"
              theme="outlined"
              variant="secondary"
            >
              {t("account.orders.view_invoice")}
            </LinkButton>
          )}
          <LinkButton
            as={NextLink}
            href={detailHref}
            onFocus={prefetch}
            onMouseEnter={prefetch}
            size="sm"
            variant="secondary"
          >
            {t("account.orders.view_order")}
          </LinkButton>
        </div>
      </header>
      <div
        className={`hidden px-order-group-3xl py-order-group-lg text-order-group-fg-tertiary text-order-group-tertiary-size uppercase tracking-wide lg:col-span-3 lg:grid lg:items-center lg:gap-order-group-column ${gridColumns} ${subgrid}`}
      >
        <p>{t("account.orders.product")}</p>
        <p className="text-start">{t("account.orders.price")}</p>
        <p className="pr-500 text-end">{t("account.orders.info")}</p>
      </div>
      <AccountOrderGroupItems
        currencyCode={order.currency_code}
        items={items}
        onPrefetch={prefetch}
        t={t}
      />
    </article>
  )
}

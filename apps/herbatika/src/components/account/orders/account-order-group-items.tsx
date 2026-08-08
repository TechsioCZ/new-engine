import type { HttpTypes } from "@medusajs/types"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import type { useTranslations } from "next-intl"
import NextImage from "next/image"

import NextLink from "@/components/app-link"
import {
  formatOrderAmount,
  resolveOrderItemQuantity,
  resolveOrderItemTotalAmount,
} from "@/lib/storefront/order-format"

type OrderItem = NonNullable<HttpTypes.StoreOrder["items"]>[number]
type AuthTranslator = ReturnType<typeof useTranslations<"auth">>
interface OrderItemProps {
  currencyCode: string | null | undefined
  item: OrderItem
  onPrefetch: () => void
  t: AuthTranslator
}

const renderProductThumbnail = ({
  item,
  t,
}: Pick<OrderItemProps, "item" | "t">) =>
  item.thumbnail !== null && item.thumbnail.length > 0 ? (
    <NextImage
      alt={item.title ?? t("account.orders.product_fallback")}
      className="shrink-0 object-cover"
      height={32}
      loading="lazy"
      src={item.thumbnail}
      width={32}
    />
  ) : null

const DesktopOrderItem = ({
  currencyCode,
  item,
  onPrefetch,
  t,
}: OrderItemProps) => (
  <li className="border-order-group-border border-t px-order-group-3xl py-order-group-3xl lg:col-span-3 lg:grid lg:account-order-table-layout lg:items-start lg:gap-order-group-column lg:supports-[grid-template-columns:subgrid]:grid-cols-subgrid">
    <div className="flex min-w-0 items-center gap-order-group-lg">
      {renderProductThumbnail({ item, t })}
      <div className="min-w-0">
        <p className="line-clamp-2 font-medium text-order-group-fg-primary text-order-group-secondary-size">
          {item.title ?? "-"}
        </p>
        {item.variant_title !== null && item.variant_title.length > 0 && (
          <p className="line-clamp-1 text-order-group-fg-secondary text-order-group-tertiary-size">
            {item.variant_title}
          </p>
        )}
      </div>
    </div>
    <div className="min-w-fit text-start lg:justify-self-start">
      <p className="font-medium text-order-group-fg-primary text-order-group-secondary-size">
        {formatOrderAmount(resolveOrderItemTotalAmount(item), currencyCode)}
      </p>
      <p className="text-order-group-fg-secondary text-order-group-secondary-size">
        {t("account.orders.quantity_value", {
          count: resolveOrderItemQuantity(item),
        })}
      </p>
    </div>
    <div className="flex items-center justify-end lg:justify-self-end">
      <LinkButton
        as={NextLink}
        href={`/p/${item.product_handle}`}
        onFocus={onPrefetch}
        onMouseEnter={onPrefetch}
        size="sm"
        theme="outlined"
        variant="secondary"
      >
        {t("account.orders.product_detail")}
      </LinkButton>
    </div>
  </li>
)

const MobileOrderItem = ({ currencyCode, item, t }: OrderItemProps) => (
  <article className="rounded-order-group-md border border-order-group-border bg-order-group-overlay p-order-group-xl">
    <div className="flex items-start gap-order-group-lg">
      {renderProductThumbnail({ item, t })}
      <div className="min-w-0 flex-1 space-y-order-group-md">
        <div className="flex items-start justify-between gap-order-group-lg">
          <div className="min-w-0">
            <p className="line-clamp-2 font-medium text-order-group-fg-primary text-order-group-secondary-size">
              {item.title ?? "-"}
            </p>
            {item.variant_title !== null && item.variant_title.length > 0 && (
              <p className="text-order-group-fg-secondary text-order-group-tertiary-size">
                {item.variant_title}
              </p>
            )}
          </div>
          <p className="shrink-0 font-semibold text-order-group-fg-primary text-order-group-secondary-size">
            {formatOrderAmount(resolveOrderItemTotalAmount(item), currencyCode)}
          </p>
        </div>
        <p className="text-order-group-fg-secondary text-order-group-tertiary-size">
          {t("account.orders.quantity_value", {
            count: resolveOrderItemQuantity(item),
          })}
        </p>
      </div>
    </div>
  </article>
)

export const AccountOrderGroupItems = ({
  currencyCode,
  items,
  onPrefetch,
  t,
}: {
  currencyCode?: string | null
  items: OrderItem[]
  onPrefetch: () => void
  t: AuthTranslator
}) => (
  <>
    {items.length > 0 ? (
      <ul className="hidden lg:col-span-3 lg:grid lg:account-order-table-layout lg:supports-[grid-template-columns:subgrid]:grid-cols-subgrid">
        {items.map((item) => (
          <DesktopOrderItem
            currencyCode={currencyCode}
            item={item}
            key={item.id}
            onPrefetch={onPrefetch}
            t={t}
          />
        ))}
      </ul>
    ) : (
      <p className="hidden border-order-group-border border-t px-order-group-3xl py-order-group-3xl text-order-group-fg-secondary text-order-group-secondary-size lg:col-span-3 lg:block">
        {t("account.orders.no_items")}
      </p>
    )}
    <div className="p-order-group-order-group-2xl lg:hidden">
      {items.length > 0 ? (
        items.map((item) => (
          <MobileOrderItem
            currencyCode={currencyCode}
            item={item}
            key={item.id}
            onPrefetch={onPrefetch}
            t={t}
          />
        ))
      ) : (
        <p className="text-order-group-fg-secondary text-order-group-secondary-size">
          {t("account.orders.no_items")}
        </p>
      )}
    </div>
  </>
)

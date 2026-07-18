import type { StoreOrder } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Image from "next/image"
import Link from "next/link"

import { formatDateString } from "@/utils/format/format-date"
import {
  getOrderStatusColor,
  getOrderStatusLabel,
} from "@/utils/format/format-order-status"
import { formatAmount } from "@/utils/format/format-product"
import { truncateText } from "@/utils/truncate-text"

export function DesktopOrderCard({ order }: { order: StoreOrder }) {
  const statusVariant = getOrderStatusColor(order.status)

  const correctWord = () => {
    const itemsCount = order.items?.length || 0
    if (itemsCount === 1) {
      return "položka"
    }
    if (itemsCount > 1 && itemsCount < 5) {
      return "položky"
    }
    return "položek"
  }

  return (
    <div className="grid grid-cols-12 gap-300 border-border-secondary border-b p-300 transition-colors hover:bg-surface">
      {/* Order number & status */}
      <div className="col-span-2 flex items-center">
        <div>
          <p className="font-medium text-fg-primary">#{order.display_id}</p>
          <Badge
            className="mt-100 inline-flex text-3xs"
            variant={statusVariant}
          >
            {getOrderStatusLabel(order.status)}
          </Badge>
        </div>
      </div>

      {/* Date */}
      <div className="col-span-2 flex items-center">
        <p className="text-fg-secondary text-sm">
          {formatDateString(order.created_at as string)}
        </p>
      </div>

      {/* Items */}
      <div className="col-span-4 flex items-center">
        <div className="flex items-center gap-200">
          {/* Stacked thumbnails */}
          <div className="-space-x-100 flex">
            {order.items?.slice(0, 3).map((item, index) => (
              <div
                className="relative size-[40px] overflow-hidden rounded-full border-2 border-base bg-surface"
                key={item.id}
                style={{ zIndex: 3 - index }}
              >
                {item.thumbnail && (
                  <Image
                    alt={item.product_title || ""}
                    className="object-cover"
                    height={40}
                    src={item.thumbnail}
                    width={40}
                  />
                )}
              </div>
            ))}
            {order.items && order.items.length > 3 && (
              <div className="relative flex size-[40px] items-center justify-center overflow-hidden rounded-full border-2 border-base bg-secondary">
                <span className="font-medium text-fg-reverse text-xs">
                  +{order.items.length - 3}
                </span>
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-fg-primary">
              {order.items?.[0] &&
                order.items.length < 2 &&
                truncateText(order.items[0].product_title || "")}
            </p>
            <p className="text-fg-tertiary text-sm">
              {order.items?.length || 0} {correctWord()}
            </p>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="col-span-2 flex items-center justify-end">
        <p className="font-semibold text-fg-primary">
          {formatAmount(order.summary.original_order_total)}
        </p>
      </div>

      {/* Action */}
      <div className="col-span-2 flex items-center justify-end">
        <LinkButton
          as={Link}
          href={`/ucet/objednavky/${order.id}`}
          prefetch
          size="sm"
          theme="solid"
          variant="primary"
        >
          Detail
        </LinkButton>
      </div>
    </div>
  )
}

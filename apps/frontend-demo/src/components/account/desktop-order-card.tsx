import type { StoreOrder } from "@medusajs/types"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import Image from "next/image"
import Link from "next/link"

import { formatPrice } from "@/lib/format-price"
import {
  formatOrderDate,
  getOrderStatusLabel,
  truncateProductTitle,
} from "@/lib/order-utils"

export function DesktopOrderCard({ order }: { order: StoreOrder }) {
  return (
    <div
      className="grid grid-cols-12 gap-orders-card border-orders-border border-b p-sm transition-colors hover:bg-orders-card-hover"
      key={order.id}
    >
      <div className="col-span-2 flex items-center">
        <div>
          <p className="font-medium text-orders-fg-primary text-orders-md">
            #{order.display_id}
          </p>
          <Badge
            className="mt-orders-overlap inline-flex"
            variant={
              order.status === "completed"
                ? "success"
                : order.status === "pending"
                  ? "warning"
                  : order.status === "canceled"
                    ? "danger"
                    : "info"
            }
          >
            {getOrderStatusLabel(order.status)}
          </Badge>
        </div>
      </div>

      <div className="col-span-2 flex items-center">
        <p className="text-orders-fg-secondary text-orders-md">
          {formatOrderDate(order.created_at as string)}
        </p>
      </div>

      <div className="col-span-4 flex items-center">
        <div className="flex items-center gap-orders-sm">
          <div className="-space-x-2 flex">
            {order.items?.slice(0, 3).map((item, index) => (
              <div
                className="relative h-fit w-10 overflow-hidden rounded-full border-2 border-base bg-orders-overlay"
                key={item.id}
                style={{ zIndex: 3 - index }}
              >
                {item.thumbnail && (
                  <Image
                    alt={item.product_title || ""}
                    className="aspect-square object-cover"
                    height={40}
                    src={item.thumbnail}
                    width={40}
                  />
                )}
              </div>
            ))}
            {order.items && order.items.length > 3 && (
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-base bg-orders-overlay">
                <span className="font-medium text-orders-fg-secondary text-orders-sm">
                  +{order.items.length - 3}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-orders-fg-primary text-orders-md">
              {order.items?.[0] &&
                order.items.length < 2 &&
                truncateProductTitle(order.items[0].product_title || "")}
            </p>
            <p className="text-fg-tertiary text-orders-sm">
              {order.items?.length || 0} položek
            </p>
          </div>
        </div>
      </div>

      <div className="col-span-2 flex items-center justify-end">
        <p className="font-semibold text-orders-fg-primary">
          {formatPrice(
            order.summary?.current_order_total || order.total || 0,
            order.currency_code
          )}
        </p>
      </div>

      <div className="col-span-2 flex items-center justify-end">
        <Link
          className="rounded-button-md bg-button-primary px-button-md-x py-button-md-y text-button-primary"
          href={{ pathname: "/account/orders/[id]", query: { id: order.id } }}
          prefetch={true}
        >
          Detail
        </Link>
      </div>
    </div>
  )
}

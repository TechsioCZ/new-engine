"use client"

import type { HttpTypes } from "@medusajs/types"
import { Badge } from "@ui/atoms/badge"
import { Button } from "@ui/atoms/button"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDateString } from "@/utils/format/format-date"
import {
  getOrderStatusColor,
  getOrderStatusLabel,
} from "@/utils/format/format-order-status"
import { formatAmount } from "@/utils/format/format-product"
import { PriceSummaryRow } from "./price-summary-row"

type CheckoutReviewProps = {
  order: HttpTypes.StoreOrder
}

export function CheckoutReview({ order }: CheckoutReviewProps) {
  const router = useRouter()

  const statusInfo = {
    label: getOrderStatusLabel(order.status),
    variant: getOrderStatusColor(order.status),
  }

  // Format amounts
  const itemsSubtotal = formatAmount(order.item_subtotal || 0)
  const itemsTax = formatAmount(order.item_tax_total || 0)
  const shippingTotal = formatAmount(order.shipping_total || 0)
  const total = formatAmount(order.total || 0)
  const primaryShippingMethod = order.shipping_methods?.[0]

  return (
    <div className="mx-auto max-w-3xl">
      {/* Order Header */}
      <div className="mb-500 rounded-lg border border-border-secondary bg-surface p-400">
        <div className="mb-300 flex items-start justify-between">
          <div>
            <h1 className="font-bold text-2xl text-fg-primary">
              Objednávka #{order.display_id}
            </h1>
            <p className="mt-100 text-fg-secondary text-sm">
              {formatDateString(order.created_at as string, {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>

        {order.email && (
          <p className="text-fg-secondary text-sm">
            Potvrzení odesláno na: <strong>{order.email}</strong>
          </p>
        )}
      </div>

      {/* Order Items */}
      <div className="mb-500 rounded-lg border border-border-secondary bg-surface p-400">
        <h2 className="mb-400 font-semibold text-fg-primary text-lg">
          Položky objednávky
        </h2>
        <div className="[&>*+*]:mt-300">
          {order.items?.map((item) => (
            <div className="flex gap-200" key={item.id}>
              {item.thumbnail && (
                <Image
                  alt={item.title}
                  className="h-16 w-16 rounded object-cover"
                  height={64}
                  src={item.thumbnail}
                  width={64}
                />
              )}
              <div className="flex flex-1 flex-col">
                <Link
                  className="font-medium text-fg-primary text-sm underline hover:no-underline"
                  href={`/produkt/${item.product_handle}?variant=${item.subtitle}`}
                >
                  {item.title}
                </Link>
                {item.variant_title && (
                  <span className="text-fg-secondary text-xs">
                    {item.variant_title}
                  </span>
                )}
                <span className="text-fg-secondary text-xs">
                  Kusů: {item.quantity}
                </span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-fg-primary text-sm">
                  {formatAmount(item.total || 0)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address */}
      {order.shipping_address && (
        <div className="mb-500 rounded-lg border border-border-secondary bg-surface p-400">
          <h2 className="mb-400 font-semibold text-fg-primary text-lg">
            Doručovací adresa
          </h2>
          <div className="text-fg-secondary text-sm">
            <p className="font-medium text-fg-primary">
              {order.shipping_address.first_name}{" "}
              {order.shipping_address.last_name}
            </p>
            {order.shipping_address.company && (
              <p>{order.shipping_address.company}</p>
            )}
            <p>{order.shipping_address.address_1}</p>
            {order.shipping_address.address_2 && (
              <p>{order.shipping_address.address_2}</p>
            )}
            <p>
              {order.shipping_address.city},{" "}
              {order.shipping_address.postal_code}
            </p>
            <p className="uppercase">{order.shipping_address.country_code}</p>
            {order.shipping_address.phone && (
              <p className="mt-200">{order.shipping_address.phone}</p>
            )}
          </div>
        </div>
      )}

      {/* Shipping Method */}
      {primaryShippingMethod && (
        <div className="mb-500 rounded-lg border border-border-secondary bg-surface p-400">
          <h2 className="mb-400 font-semibold text-fg-primary text-lg">
            Způsob dopravy
          </h2>
          <p className="text-fg-secondary text-sm">
            {primaryShippingMethod.name}
          </p>
        </div>
      )}

      {/* Price Summary */}
      <div className="rounded-lg border border-border-secondary bg-surface p-400">
        <h2 className="mb-400 font-semibold text-fg-primary text-lg">
          Souhrn ceny
        </h2>
        <div className="border-border-secondary border-b pb-400 [&>*+*]:mt-200">
          <PriceSummaryRow label="Cena bez DPH" value={itemsSubtotal} />
          <PriceSummaryRow label="DPH" value={itemsTax} />
          <PriceSummaryRow label="Doprava" value={shippingTotal} />
        </div>
        <div className="mt-400">
          <PriceSummaryRow label="Celkem" value={total} variant="bold" />
        </div>

        {/* Action Buttons */}
        <div className="mt-500 flex gap-300">
          <Button
            className="flex-1"
            onClick={() => router.push("/")}
            variant="secondary"
          >
            Zpět na hlavní stránku
          </Button>
          <Button
            className="flex-1"
            onClick={() => router.push("/orders")}
            variant="primary"
          >
            Moje objednávky
          </Button>
        </div>
      </div>
    </div>
  )
}

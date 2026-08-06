"use client"

import { Badge } from "@techsio/ui-kit/atoms/badge"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Image from "next/image"
import Link from "next/link"

import type { StoreOrder } from "@/services/order-service"
import { formatDateString } from "@/utils/format/format-date"
import {
  getOrderStatusColor,
  getOrderStatusLabel,
} from "@/utils/format/format-order-status"
import { formatAmount } from "@/utils/format/format-product"

import { PriceSummaryRow } from "./price-summary-row"

interface CheckoutReviewProps {
  order: StoreOrder
}

const OrderItems = ({ items }: { items: StoreOrder["items"] }) => (
  <div className="[&>*+*]:mt-300">
    {items?.map((item) => (
      <div className="flex gap-200" key={item.id}>
        {typeof item.thumbnail === "string" && item.thumbnail.length > 0 && (
          <Image
            alt={item.title}
            className="h-cart-thumbnail w-cart-thumbnail rounded object-cover"
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
          {(item.variant_title?.length ?? 0) > 0 && (
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
)

const ShippingAddress = ({
  address,
}: {
  address: NonNullable<StoreOrder["shipping_address"]>
}) => (
  <div className="mb-500 rounded-lg border border-border-secondary bg-surface p-400">
    <h2 className="mb-400 font-semibold text-fg-primary text-lg">
      Doručovací adresa
    </h2>
    <div className="text-fg-secondary text-sm">
      <p className="font-medium text-fg-primary">
        {address.first_name} {address.last_name}
      </p>
      {(address.company?.length ?? 0) > 0 && <p>{address.company}</p>}
      <p>{address.address_1}</p>
      {(address.address_2?.length ?? 0) > 0 && <p>{address.address_2}</p>}
      <p>
        {address.city}, {address.postal_code}
      </p>
      <p className="uppercase">{address.country_code}</p>
      {(address.phone?.length ?? 0) > 0 && (
        <p className="mt-200">{address.phone}</p>
      )}
    </div>
  </div>
)

export const CheckoutReview = ({ order }: CheckoutReviewProps) => {
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
              {formatDateString(
                typeof order.created_at === "string"
                  ? order.created_at
                  : order.created_at.toISOString(),
                {
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "long",
                  year: "numeric",
                },
              )}
            </p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>

        {(order.email?.length ?? 0) > 0 && (
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
        <OrderItems items={order.items} />
      </div>

      {/* Shipping Address */}
      {order.shipping_address !== undefined &&
        order.shipping_address !== null && (
          <ShippingAddress address={order.shipping_address} />
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
          <LinkButton as={Link} className="flex-1" href="/" variant="secondary">
            Zpět na hlavní stránku
          </LinkButton>
          <LinkButton
            as={Link}
            className="flex-1"
            href="/orders"
            variant="primary"
          >
            Moje objednávky
          </LinkButton>
        </div>
      </div>
    </div>
  )
}

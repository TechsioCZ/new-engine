"use client"

import { Badge } from "@techsio/ui-kit/atoms/badge"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useOrder } from "@/hooks/use-orders"
import { formatDateString } from "@/utils/format/format-date"
import {
  getOrderStatusColor,
  getOrderStatusLabel,
} from "@/utils/format/format-order-status"
import { OrderDetail } from "./order-detail"

function getOrderErrorMessage(error: unknown): string {
  if (!error) {
    return "Objednávka nebyla nalezena"
  }

  if (error instanceof Error) {
    return error.message || "Objednávka nebyla nalezena"
  }

  if (typeof error === "string") {
    return error
  }

  return "Objednávka nebyla nalezena"
}

export function OrderDetailClient() {
  const { id } = useParams<{ id: string }>()

  const order = useOrder({
    id,
  })

  if (order.isLoading) {
    return (
      <div className="mx-auto max-w-max-w px-400">
        <p className="text-fg-secondary">Načítám objednávku...</p>
      </div>
    )
  }

  if (!order.order) {
    return (
      <div className="mx-auto max-w-max-w px-400">
        <p className="text-fg-secondary">{getOrderErrorMessage(order.error)}</p>
        <LinkButton
          as={Link}
          className="mt-300"
          href="/ucet/profil?tab=orders"
          size="sm"
          theme="borderless"
        >
          Zpět na objednávky
        </LinkButton>
      </div>
    )
  }

  const statusVariant = getOrderStatusColor(order.order.status || "pending")

  return (
    <div className="mx-auto max-w-max-w px-400">
      <LinkButton
        as={Link}
        className="mb-400"
        href="/ucet/profil?tab=orders"
        icon="token-icon-arrow-left"
        size="current"
        theme="unstyled"
      >
        Zpět na objednávky
      </LinkButton>
      <div className="mb-500">
        <div className="flex flex-col gap-200 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-bold text-fg-primary text-xl">
              Objednávka #{order.order.display_id}
            </h1>
            <p className="text-fg-secondary">
              {formatDateString(order.order.created_at as string, {
                month: "long",
                year: "numeric",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-200">
            <Badge variant={statusVariant}>
              {getOrderStatusLabel(order.order.status)}
            </Badge>
          </div>
        </div>
      </div>

      <OrderDetail order={order.order} />
    </div>
  )
}

import type { HttpTypes } from "@medusajs/types"
import { getRecordValue } from "@techsio/std/object"

import {
  resolveOrderItemTotalAmount,
  resolveOrderTotalAmount,
} from "@/lib/storefront/order-format"

const readOrderAmount = (order: HttpTypes.StoreOrder, key: string) => {
  const value = getRecordValue(order, key)
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export const resolveOrderAmountSummary = (order: HttpTypes.StoreOrder) => {
  const itemsTotal =
    readOrderAmount(order, "item_total") ??
    (order.items ?? []).reduce(
      (total, item) => total + resolveOrderItemTotalAmount(item),
      0,
    )
  const itemTaxTotal = readOrderAmount(order, "item_tax_total") ?? 0
  const shippingTotal = readOrderAmount(order, "shipping_total") ?? 0
  const shippingTaxTotal = readOrderAmount(order, "shipping_tax_total") ?? 0

  return {
    itemSubtotal:
      readOrderAmount(order, "item_subtotal") ??
      Math.max(itemsTotal - itemTaxTotal, 0),
    shippingSubtotal:
      readOrderAmount(order, "shipping_subtotal") ??
      Math.max(shippingTotal - shippingTaxTotal, 0),
    taxTotal:
      readOrderAmount(order, "tax_total") ??
      Math.max(itemTaxTotal + shippingTaxTotal, 0),
    total: resolveOrderTotalAmount(order),
  }
}

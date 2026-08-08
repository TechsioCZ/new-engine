export const resolveOrderTotalAmount = (order: {
  item_total?: number | null
  total?: number | null
}) => {
  if (typeof order.total === "number") {
    return order.total
  }
  if (typeof order.item_total === "number") {
    return order.item_total
  }
  return 0
}

export const resolveOrderItemTotalAmount = (item: {
  quantity?: number | null
  total?: number | null
  unit_price?: number | null
}) => {
  if (typeof item.total === "number") {
    return item.total
  }
  const unitPrice = typeof item.unit_price === "number" ? item.unit_price : 0
  const quantity = typeof item.quantity === "number" ? item.quantity : 1
  return unitPrice * quantity
}

export const resolveOrderItemQuantity = (item: { quantity?: number | null }) =>
  typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 0

export const resolveOrderItemCount = (
  items?: { quantity?: number | null }[] | null,
) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 0
  }
  return items.reduce(
    (count, item) => count + resolveOrderItemQuantity(item),
    0,
  )
}

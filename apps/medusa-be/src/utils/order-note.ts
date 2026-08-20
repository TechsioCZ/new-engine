type OrderNoteSource = {
  metadata?: Record<string, unknown> | null
  shipping_address?: {
    metadata?: Record<string, unknown> | null
  } | null
}

export function resolveOrderNote(order: OrderNoteSource) {
  return (
    normalizeNote(order.metadata?.order_note) ??
    normalizeNote(order.shipping_address?.metadata?.customer_note)
  )
}

function normalizeNote(value: unknown) {
  if (typeof value !== "string") {
    return
  }

  const note = value.trim()

  return note.length > 0 ? note : undefined
}

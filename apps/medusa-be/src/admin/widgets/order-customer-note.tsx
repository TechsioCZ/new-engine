import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { sdk } from "../lib/sdk"

type OrderCustomerNote = {
  created_at: string | null
  note: string | null
  order_id: string | null
  updated_at: string | null
}

type OrderCustomerNoteResponse = {
  customer_note: OrderCustomerNote | null
}

type OrderCustomerNoteWidgetProps = Partial<DetailWidgetProps<AdminOrder>>

const QUERY_KEY_PREFIX = "order-customer-note"

function formatDateTime(value: string | null) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

const OrderCustomerNoteWidget = ({ data }: OrderCustomerNoteWidgetProps) => {
  const orderId = data?.id

  const {
    data: response,
    isLoading,
    isError,
  } = useQuery({
    queryFn: () =>
      sdk.client.fetch<OrderCustomerNoteResponse>(
        `/admin/orders/${orderId}/customer-note`
      ),
    queryKey: [QUERY_KEY_PREFIX, orderId],
    enabled: Boolean(orderId),
  })

  const customerNote = response?.customer_note
  let noteContent: ReactNode

  if (isLoading) {
    noteContent = (
      <Text className="text-ui-fg-subtle" size="small">
        Loading note...
      </Text>
    )
  } else if (isError) {
    noteContent = (
      <Text className="text-ui-fg-error" size="small">
        Failed to load note.
      </Text>
    )
  } else if (customerNote?.note) {
    noteContent = (
      <div className="rounded-md bg-ui-bg-subtle px-3 py-2">
        <Text size="small">{customerNote.note}</Text>
      </div>
    )
  } else {
    noteContent = (
      <Text className="text-ui-fg-subtle" size="small">
        No note saved.
      </Text>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-3 px-6 py-4">
        <div>
          <Text size="small" weight="plus">
            Order note
          </Text>
          <Text className="text-ui-fg-subtle" size="small">
            Note linked to the order.
          </Text>
        </div>

        {noteContent}

        <div className="grid gap-2 text-ui-fg-subtle">
          <Text size="small">
            Created: {formatDateTime(customerNote?.created_at ?? null)}
          </Text>
          <Text size="small">
            Updated: {formatDateTime(customerNote?.updated_at ?? null)}
          </Text>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: ["order.details.side.before"],
})

export default OrderCustomerNoteWidget

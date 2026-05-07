import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentSeries } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Select,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { sdk } from "../../lib/sdk"

type PacketaFulfillmentData = {
  packet_id?: number
  barcode?: string
}

type OrderFulfillment = {
  id: string
  provider_id: string
  canceled_at: string | null
  data: PacketaFulfillmentData | null
}

type AdminOrder = {
  id: string
  display_id: number
  custom_display_id?: string | null
  email: string
  created_at: string
  fulfillment_status?: string
  fulfillments?: OrderFulfillment[]
}

type OrdersResponse = {
  orders: AdminOrder[]
  count: number
  limit: number
  offset: number
}

type LabelFormat = "A6" | "A7"

const PAGE_SIZE = 50

const ORDER_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "email",
  "created_at",
  "fulfillment_status",
  "fulfillments.id",
  "fulfillments.provider_id",
  "fulfillments.canceled_at",
  "fulfillments.data",
].join(",")

const LABEL_FORMATS: Array<{ value: LabelFormat; label: string }> = [
  { value: "A6", label: "A6" },
  { value: "A7", label: "A7" },
]

function getPacketaLabels(order: AdminOrder): OrderFulfillment[] {
  return (order.fulfillments ?? []).filter(
    (fulfillment) =>
      fulfillment.provider_id === "packeta_packeta" &&
      !fulfillment.canceled_at &&
      typeof fulfillment.data?.packet_id === "number"
  )
}

function getOrderNumber(order: AdminOrder): string {
  return order.custom_display_id || `#${order.display_id}`
}

async function downloadLabels(orderIds: string[], labelFormat: LabelFormat) {
  const response = await fetch("/admin/packeta-labels", {
    body: JSON.stringify({
      order_ids: orderIds,
      label_format: labelFormat,
    }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    if (
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload
    ) {
      const message = (payload as { message?: unknown }).message
      if (typeof message === "string") {
        throw new Error(message)
      }
    }
    throw new Error("Failed to generate Packeta labels")
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `packeta-labels-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const PacketaLabelsPage = () => {
  const [offset, setOffset] = useState(0)
  const [labelFormat, setLabelFormat] = useState<LabelFormat>("A6")
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set()
  )
  const [isPrinting, setIsPrinting] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryFn: () => {
      const search = new URLSearchParams({
        fields: ORDER_FIELDS,
        limit: String(PAGE_SIZE),
        offset: String(offset),
        order: "-created_at",
      })
      return sdk.client.fetch<OrdersResponse>(`/admin/orders?${search}`)
    },
    queryKey: ["packeta-label-orders", offset],
  })

  const orders = data?.orders ?? []
  const printableOrders = useMemo(
    () => orders.filter((order) => getPacketaLabels(order).length > 0),
    [orders]
  )
  const selectedPrintableOrderIds = printableOrders
    .map((order) => order.id)
    .filter((id) => selectedOrderIds.has(id))

  const allPrintableSelected =
    printableOrders.length > 0 &&
    printableOrders.every((order) => selectedOrderIds.has(order.id))
  const somePrintableSelected =
    printableOrders.some((order) => selectedOrderIds.has(order.id)) &&
    !allPrintableSelected

  const pageIndex = Math.floor(offset / PAGE_SIZE)
  const pageCount = Math.ceil((data?.count ?? 0) / PAGE_SIZE)

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }

  const togglePage = () => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev)
      if (allPrintableSelected) {
        for (const order of printableOrders) {
          next.delete(order.id)
        }
      } else {
        for (const order of printableOrders) {
          next.add(order.id)
        }
      }
      return next
    })
  }

  const handlePrint = async () => {
    if (selectedPrintableOrderIds.length === 0) {
      return
    }

    setIsPrinting(true)
    try {
      await downloadLabels(selectedPrintableOrderIds, labelFormat)
      toast.success("Packeta labels generated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to print labels")
    } finally {
      setIsPrinting(false)
    }
  }

  if (error) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Packeta Labels</Heading>
          <Text className="text-ui-fg-subtle">
            {selectedPrintableOrderIds.length} selected
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Select
            onValueChange={(value) => setLabelFormat(value as LabelFormat)}
            value={labelFormat}
          >
            <Select.Trigger className="w-[92px]">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {LABEL_FORMATS.map((format) => (
                <Select.Item key={format.value} value={format.value}>
                  {format.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Button
            disabled={selectedPrintableOrderIds.length === 0}
            isLoading={isPrinting}
            onClick={handlePrint}
            size="small"
          >
            <DocumentSeries />
            Print labels
          </Button>
        </div>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell className="w-12">
              <Checkbox
                checked={
                  somePrintableSelected ? "indeterminate" : allPrintableSelected
                }
                disabled={printableOrders.length === 0}
                onCheckedChange={togglePage}
              />
            </Table.HeaderCell>
            <Table.HeaderCell>Order</Table.HeaderCell>
            <Table.HeaderCell>Email</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
            <Table.HeaderCell>Packeta</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {orders.map((order) => {
            const packetaLabels = getPacketaLabels(order)
            const canPrint = packetaLabels.length > 0
            return (
              <Table.Row key={order.id}>
                <Table.Cell>
                  <Checkbox
                    checked={selectedOrderIds.has(order.id)}
                    disabled={!canPrint}
                    onCheckedChange={() => toggleOrder(order.id)}
                  />
                </Table.Cell>
                <Table.Cell className="text-ui-fg-base">
                  {getOrderNumber(order)}
                </Table.Cell>
                <Table.Cell>{order.email}</Table.Cell>
                <Table.Cell>
                  {new Date(order.created_at).toLocaleDateString()}
                </Table.Cell>
                <Table.Cell>
                  {canPrint ? (
                    <div className="flex flex-wrap gap-1">
                      {packetaLabels.map((fulfillment) => (
                        <Badge key={fulfillment.id} size="2xsmall">
                          {fulfillment.data?.barcode ??
                            fulfillment.data?.packet_id}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Text className="text-ui-fg-muted">No label</Text>
                  )}
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>

      <Table.Pagination
        canNextPage={offset + PAGE_SIZE < (data?.count ?? 0)}
        canPreviousPage={offset > 0}
        count={data?.count ?? 0}
        nextPage={() => setOffset((prev) => prev + PAGE_SIZE)}
        pageCount={pageCount}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        previousPage={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
      />

      {isLoading && (
        <div className="px-6 py-4">
          <Text>Loading...</Text>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  icon: DocumentSeries,
  label: "Packeta Labels",
})

export default PacketaLabelsPage

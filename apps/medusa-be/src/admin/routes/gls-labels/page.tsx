import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentSeries } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { GLS_PROVIDER_ID } from "../../../modules/gls-client/constants"
import { sdk } from "../../lib/sdk"

interface GLSFulfillmentData {
  packet_id?: string | number
  barcode?: string
}

interface OrderFulfillment {
  id: string
  provider_id: string
  canceled_at: string | null
  data: GLSFulfillmentData | null
}

interface AdminOrder {
  id: string
  display_id: number
  custom_display_id?: string | null
  email: string
  created_at: string
  fulfillment_status?: string
  fulfillments?: OrderFulfillment[]
}

interface OrdersResponse {
  orders: AdminOrder[]
  count: number
  limit: number
  offset: number
}

const PAGE_SIZE = 50
const CONTENT_DISPOSITION_FILENAME_STAR_REGEX = /filename\*=UTF-8''([^;]+)/i
const CONTENT_DISPOSITION_FILENAME_REGEX = /filename="?([^";]+)"?/i

export const handle = {
  breadcrumb: () => "GLS Labels",
}

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

function getGLSLabels(order: AdminOrder): OrderFulfillment[] {
  return (order.fulfillments ?? []).filter(
    (fulfillment) =>
      fulfillment.provider_id === GLS_PROVIDER_ID &&
      !fulfillment.canceled_at &&
      (typeof fulfillment.data?.packet_id === "number" ||
        typeof fulfillment.data?.packet_id === "string"),
  )
}

function getOrderNumber(order: AdminOrder): string {
  const customDisplayId = order.custom_display_id?.trim()
  return customDisplayId ? customDisplayId : `#${order.display_id}`
}

function getFilenameFromContentDisposition(header: string | null): string {
  const fallback = `gls-labels-${new Date().toISOString().slice(0, 10)}.pdf`
  if (!header) {
    return fallback
  }

  const encodedMatch = CONTENT_DISPOSITION_FILENAME_STAR_REGEX.exec(header)
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1])
    } catch {
      return fallback
    }
  }

  const filenameMatch = CONTENT_DISPOSITION_FILENAME_REGEX.exec(header)
  return filenameMatch?.[1] ?? fallback
}

async function downloadLabels(orderIds: string[]) {
  const response = await fetch("/admin/gls-labels", {
    body: JSON.stringify({
      order_ids: orderIds,
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
      const { message } = payload
      if (typeof message === "string") {
        throw new TypeError(message)
      }
    }
    throw new Error("Failed to generate GLS labels")
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = getFilenameFromContentDisposition(
    response.headers.get("content-disposition"),
  )
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

const GLSLabelsPage = () => {
  const [offset, setOffset] = useState(0)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set(),
  )
  const [isPrinting, setIsPrinting] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryFn: async () => {
      const search = new URLSearchParams({
        fields: ORDER_FIELDS,
        limit: String(PAGE_SIZE),
        offset: String(offset),
        order: "-created_at",
      })
      return sdk.client.fetch<OrdersResponse>(`/admin/orders?${search}`)
    },
    queryKey: ["gls-label-orders", offset],
  })

  const orders = data?.orders ?? []
  const printableOrders = orders.filter(
    (order) => getGLSLabels(order).length > 0,
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

  const goToOffset = (nextOffset: number) => {
    setOffset(nextOffset)
    setSelectedOrderIds(new Set())
  }

  const handlePrint = async () => {
    if (selectedPrintableOrderIds.length === 0) {
      return
    }

    setIsPrinting(true)
    try {
      await downloadLabels(selectedPrintableOrderIds)
      toast.success("GLS labels generated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to print labels",
      )
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
          <Heading level="h1">GLS Labels</Heading>
          <Text className="text-ui-fg-subtle">
            {selectedPrintableOrderIds.length} selected
          </Text>
        </div>
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
            <Table.HeaderCell>GLS</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {orders.map((order) => {
            const glsLabels = getGLSLabels(order)
            const canPrint = glsLabels.length > 0
            return (
              <Table.Row key={order.id}>
                <Table.Cell>
                  <Checkbox
                    checked={selectedOrderIds.has(order.id)}
                    disabled={!canPrint}
                    onCheckedChange={() => {
                      toggleOrder(order.id)
                    }}
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
                      {glsLabels.map((fulfillment) => (
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
        nextPage={() => {
          goToOffset(offset + PAGE_SIZE)
        }}
        pageCount={pageCount}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        previousPage={() => {
          goToOffset(Math.max(0, offset - PAGE_SIZE))
        }}
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
  label: "GLS Labels",
})

export default GLSLabelsPage

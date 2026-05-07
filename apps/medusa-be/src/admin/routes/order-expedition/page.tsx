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

type CarrierKey = "ppl" | "packeta" | "other"
type TargetStatus = "completed" | "archived" | "canceled"

type CarrierOption = {
  label: string
  value: CarrierKey
}

type ResolvedCarrier = CarrierOption & {
  shipping_method_name?: string
  shipping_option_id?: string
}

type ExpeditionItem = {
  id?: string | null
  title: string
  quantity: number
  sku?: string | null
  variant?: string | null
}

type ExpeditionOrder = {
  id: string
  order_display_id: string
  customer: string
  email?: string | null
  delivery_address: string[]
  carrier: ResolvedCarrier
  payment_method: string
  payment_status?: string | null
  status?: string | null
  items: ExpeditionItem[]
}

type OrdersResponse = {
  orders: ExpeditionOrder[]
  count: number
  limit: number
  offset: number
  carrier: CarrierKey | null
}

type CarriersResponse = {
  carriers: CarrierOption[]
}

type BlockingOrder = {
  id: string
  order_display_id: string
  reason: string
}

type StatusBlockedPayload = {
  message?: string
  blocked_orders?: BlockingOrder[]
}

const PAGE_SIZE = 50
const ALL_CARRIERS = "all"

const TARGET_STATUSES: Array<{ value: TargetStatus; label: string }> = [
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
  { value: "canceled", label: "Canceled" },
]

function getOrderItemsSummary(order: ExpeditionOrder) {
  if (!order.items.length) {
    return "-"
  }

  return order.items
    .slice(0, 3)
    .map((item) => `${item.quantity}x ${item.sku || item.title}`)
    .join(", ")
}

function getCarrierLabel(order: ExpeditionOrder) {
  return order.carrier.shipping_method_name || order.carrier.label
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = (payload as { message?: unknown }).message
    if (typeof message === "string") {
      return message
    }
  }

  return fallback
}

function getBlockingOrders(payload: unknown): BlockingOrder[] {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "blocked_orders" in payload &&
    Array.isArray((payload as StatusBlockedPayload).blocked_orders)
  ) {
    return (payload as { blocked_orders: BlockingOrder[] }).blocked_orders
  }

  return []
}

async function downloadPdf(orderIds: string[]) {
  const response = await fetch("/admin/order-expedition/pdf", {
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
    throw new Error(
      getErrorMessage(payload, "Failed to generate expedition PDF")
    )
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `order-expedition-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

async function updateStatus(orderIds: string[], targetStatus: TargetStatus) {
  const response = await fetch("/admin/order-expedition/status", {
    body: JSON.stringify({
      order_ids: orderIds,
      target_status: targetStatus,
    }),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    return {
      blockedOrders: getBlockingOrders(payload),
      ok: false as const,
      message: getErrorMessage(payload, "Failed to update order status"),
    }
  }

  return {
    blockedOrders: [],
    ok: true as const,
  }
}

type OrdersTableProps = {
  allPageOrdersSelected: boolean
  isLoading: boolean
  onToggleOrder: (orderId: string) => void
  onTogglePage: () => void
  orders: ExpeditionOrder[]
  selectedOrderIds: Set<string>
  somePageOrdersSelected: boolean
}

function OrdersTable({
  allPageOrdersSelected,
  isLoading,
  onToggleOrder,
  onTogglePage,
  orders,
  selectedOrderIds,
  somePageOrdersSelected,
}: OrdersTableProps) {
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell className="w-12">
            <Checkbox
              checked={
                somePageOrdersSelected ? "indeterminate" : allPageOrdersSelected
              }
              disabled={orders.length === 0}
              onCheckedChange={onTogglePage}
            />
          </Table.HeaderCell>
          <Table.HeaderCell>Order</Table.HeaderCell>
          <Table.HeaderCell>Customer</Table.HeaderCell>
          <Table.HeaderCell>Carrier</Table.HeaderCell>
          <Table.HeaderCell>Payment</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell>Items</Table.HeaderCell>
          <Table.HeaderCell>Address</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {isLoading ? (
          <Table.Row>
            <Table.Cell>Loading...</Table.Cell>
            <Table.Cell />
            <Table.Cell />
            <Table.Cell />
            <Table.Cell />
            <Table.Cell />
            <Table.Cell />
            <Table.Cell />
          </Table.Row>
        ) : null}

        {isLoading || orders.length ? null : (
          <Table.Row>
            <Table.Cell>No orders found.</Table.Cell>
            <Table.Cell />
            <Table.Cell />
            <Table.Cell />
            <Table.Cell />
            <Table.Cell />
            <Table.Cell />
            <Table.Cell />
          </Table.Row>
        )}

        {orders.map((order) => (
          <Table.Row key={order.id}>
            <Table.Cell>
              <Checkbox
                checked={selectedOrderIds.has(order.id)}
                onCheckedChange={() => onToggleOrder(order.id)}
              />
            </Table.Cell>
            <Table.Cell className="whitespace-nowrap text-ui-fg-base">
              {order.order_display_id}
            </Table.Cell>
            <Table.Cell className="max-w-[220px]">
              <div className="flex flex-col">
                <Text className="truncate" size="small">
                  {order.customer}
                </Text>
                <Text className="truncate text-ui-fg-subtle" size="small">
                  {order.email ?? "-"}
                </Text>
              </div>
            </Table.Cell>
            <Table.Cell className="whitespace-nowrap">
              <Badge size="2xsmall">{getCarrierLabel(order)}</Badge>
            </Table.Cell>
            <Table.Cell className="whitespace-nowrap">
              <div className="flex flex-col">
                <Text size="small">{order.payment_method}</Text>
                <Text className="text-ui-fg-subtle" size="small">
                  {order.payment_status ?? "-"}
                </Text>
              </div>
            </Table.Cell>
            <Table.Cell className="whitespace-nowrap">
              {order.status ?? "-"}
            </Table.Cell>
            <Table.Cell className="max-w-[260px] truncate">
              {getOrderItemsSummary(order)}
            </Table.Cell>
            <Table.Cell className="max-w-[280px] truncate">
              {order.delivery_address.join(", ") || "-"}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

const OrderExpeditionPage = () => {
  const [carrier, setCarrier] = useState<typeof ALL_CARRIERS | CarrierKey>(
    ALL_CARRIERS
  )
  const [offset, setOffset] = useState(0)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set()
  )
  const [targetStatus, setTargetStatus] = useState<TargetStatus | "">("")
  const [isPrinting, setIsPrinting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isConfirmingStatus, setIsConfirmingStatus] = useState(false)
  const [blockingOrders, setBlockingOrders] = useState<BlockingOrder[]>([])

  const carriersQuery = useQuery({
    queryFn: () =>
      sdk.client.fetch<CarriersResponse>("/admin/order-expedition/carriers"),
    queryKey: ["order-expedition-carriers"],
  })

  const ordersQuery = useQuery({
    queryFn: () => {
      const search = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })

      if (carrier !== ALL_CARRIERS) {
        search.set("carrier", carrier)
      }

      return sdk.client.fetch<OrdersResponse>(
        `/admin/order-expedition/orders?${search}`
      )
    },
    queryKey: ["order-expedition-orders", carrier, offset],
  })

  const orders = ordersQuery.data?.orders ?? []
  const selectedOrderIdsList = useMemo(
    () => [...selectedOrderIds],
    [selectedOrderIds]
  )
  const allPageOrdersSelected =
    orders.length > 0 && orders.every((order) => selectedOrderIds.has(order.id))
  const somePageOrdersSelected =
    orders.some((order) => selectedOrderIds.has(order.id)) &&
    !allPageOrdersSelected
  const selectedCount = selectedOrderIds.size
  const count = ordersQuery.data?.count ?? 0
  const pageIndex = Math.floor(offset / PAGE_SIZE)
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)
  const targetStatusLabel =
    TARGET_STATUSES.find((status) => status.value === targetStatus)?.label ??
    targetStatus

  const handleCarrierChange = (value: string) => {
    setCarrier(value as typeof ALL_CARRIERS | CarrierKey)
    setOffset(0)
    setSelectedOrderIds(new Set())
    setIsConfirmingStatus(false)
    setBlockingOrders([])
  }

  const handleTargetStatusChange = (value: string) => {
    setTargetStatus(value as TargetStatus)
    setIsConfirmingStatus(false)
  }

  const toggleOrder = (orderId: string) => {
    setIsConfirmingStatus(false)
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
    setIsConfirmingStatus(false)
    setSelectedOrderIds((prev) => {
      const next = new Set(prev)
      if (allPageOrdersSelected) {
        for (const order of orders) {
          next.delete(order.id)
        }
      } else {
        for (const order of orders) {
          next.add(order.id)
        }
      }
      return next
    })
  }

  const handlePrint = async () => {
    if (!selectedOrderIdsList.length) {
      return
    }

    setIsPrinting(true)
    setBlockingOrders([])
    try {
      await downloadPdf(selectedOrderIdsList)
      toast.success("Order expedition PDF generated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to print PDF")
    } finally {
      setIsPrinting(false)
    }
  }

  const requestStatusUpdate = () => {
    if (!selectedOrderIdsList.length) {
      return
    }

    if (!targetStatus) {
      toast.error("Select a target status")
      return
    }

    setIsConfirmingStatus(true)
  }

  const handleStatusUpdate = async () => {
    if (!selectedOrderIdsList.length) {
      return
    }

    if (!targetStatus) {
      toast.error("Select a target status")
      return
    }

    const nextStatus = targetStatus
    setIsConfirmingStatus(false)
    setIsUpdatingStatus(true)
    setBlockingOrders([])
    try {
      const result = await updateStatus(selectedOrderIdsList, nextStatus)

      if (!result.ok) {
        setBlockingOrders(result.blockedOrders)
        toast.error(result.message)
        return
      }

      toast.success(`${selectedCount} order(s) updated`)
      setSelectedOrderIds(new Set())
      await ordersQuery.refetch()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update order status"
      )
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (carriersQuery.error) {
    throw carriersQuery.error
  }

  if (ordersQuery.error) {
    throw ordersQuery.error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Heading level="h1">Order Expedition</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {selectedCount} selected
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select onValueChange={handleCarrierChange} value={carrier}>
            <Select.Trigger className="w-[160px]">
              <Select.Value placeholder="Carrier" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL_CARRIERS}>All carriers</Select.Item>
              {(carriersQuery.data?.carriers ?? []).map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>

          <Button
            disabled={selectedCount === 0}
            isLoading={isPrinting}
            onClick={handlePrint}
            size="small"
            variant="secondary"
          >
            <DocumentSeries />
            PDF
          </Button>

          <Select onValueChange={handleTargetStatusChange} value={targetStatus}>
            <Select.Trigger className="w-[144px]">
              <Select.Value placeholder="Status" />
            </Select.Trigger>
            <Select.Content>
              {TARGET_STATUSES.map((status) => (
                <Select.Item key={status.value} value={status.value}>
                  {status.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>

          <Button
            disabled={
              selectedCount === 0 || !targetStatus || isConfirmingStatus
            }
            isLoading={isUpdatingStatus}
            onClick={requestStatusUpdate}
            size="small"
          >
            Apply status
          </Button>
        </div>
      </div>

      {isConfirmingStatus && targetStatus ? (
        <div className="flex flex-col gap-3 bg-ui-bg-subtle px-6 py-4 md:flex-row md:items-center md:justify-between">
          <Text size="small">
            Change {selectedCount} selected order(s) to {targetStatusLabel}?
          </Text>
          <div className="flex items-center gap-2">
            <Button
              disabled={isUpdatingStatus}
              onClick={() => setIsConfirmingStatus(false)}
              size="small"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              disabled={selectedCount === 0 || !targetStatus}
              isLoading={isUpdatingStatus}
              onClick={handleStatusUpdate}
              size="small"
            >
              Confirm
            </Button>
          </div>
        </div>
      ) : null}

      {blockingOrders.length ? (
        <div className="flex flex-col gap-2 bg-ui-bg-subtle px-6 py-4">
          <Text className="font-medium text-ui-fg-error">
            Some orders could not be updated.
          </Text>
          <div className="flex flex-col gap-1">
            {blockingOrders.map((order) => (
              <Text key={`${order.id}-${order.reason}`} size="small">
                {order.order_display_id}: {order.reason}
              </Text>
            ))}
          </div>
        </div>
      ) : null}

      <OrdersTable
        allPageOrdersSelected={allPageOrdersSelected}
        isLoading={ordersQuery.isLoading}
        onToggleOrder={toggleOrder}
        onTogglePage={togglePage}
        orders={orders}
        selectedOrderIds={selectedOrderIds}
        somePageOrdersSelected={somePageOrdersSelected}
      />

      <Table.Pagination
        canNextPage={offset + PAGE_SIZE < count}
        canPreviousPage={offset > 0}
        count={count}
        nextPage={() => setOffset((prev) => prev + PAGE_SIZE)}
        pageCount={pageCount}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        previousPage={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
      />
    </Container>
  )
}

export const config = defineRouteConfig({
  icon: DocumentSeries,
  label: "Order Expedition",
})

export default OrderExpeditionPage

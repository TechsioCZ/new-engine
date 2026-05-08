import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentSeries } from "@medusajs/icons"
import {
  Badge,
  Container,
  Heading,
  Select,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"
import {
  isManualOrderBusinessStatusId,
  MANUAL_ORDER_BUSINESS_STATUS_IDS,
  type ManualOrderBusinessStatusId,
  ORDER_BUSINESS_STATUSES,
  type OrderBusinessStatusSummary,
} from "../../../utils/order-business-status"
import { sdk } from "../../lib/sdk"

type OrderBusinessStatusesResponse = {
  orders: OrderBusinessStatusSummary[]
  count: number
  limit: number
  offset: number
}

type ManualStatusValue = ManualOrderBusinessStatusId | "clear"

const PAGE_SIZE = 50
const ORDER_STATUSES_QUERY_KEY = "order-business-statuses"

const MANUAL_STATUS_OPTIONS: Array<{
  label: string
  value: ManualStatusValue
}> = [
  ...MANUAL_ORDER_BUSINESS_STATUS_IDS.map((value) => ({
    label: ORDER_BUSINESS_STATUSES[value].label,
    value,
  })),
  {
    label: "Vymazat ruční stav",
    value: "clear",
  },
]

const formatDate = (date: string | null | undefined) => {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

const formatOrderNumber = (order: OrderBusinessStatusSummary) =>
  order.custom_display_id ||
  (order.display_id ? `#${order.display_id}` : order.id)

const formatTotal = (order: OrderBusinessStatusSummary) => {
  if (order.total === null || order.total === undefined) {
    return "-"
  }

  const total =
    typeof order.total === "string" ? Number(order.total) : order.total

  if (!(order.currency_code && Number.isFinite(total))) {
    return String(order.total)
  }

  return new Intl.NumberFormat("cs-CZ", {
    currency: order.currency_code.toUpperCase(),
    style: "currency",
  }).format(total)
}

const updateOrderBusinessStatus = ({
  orderId,
  status,
}: {
  orderId: string
  status: ManualOrderBusinessStatusId | null
}) =>
  sdk.client.fetch(`/admin/orders/${orderId}/business-status`, {
    body: {
      status,
    },
    method: "POST",
  })

const ManualStatusControl = ({ orderId }: { orderId: string }) => {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (value: ManualStatusValue) =>
      updateOrderBusinessStatus({
        orderId,
        status: value === "clear" ? null : value,
      }),
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nepodařilo se uložit stav objednávky"
      )
    },
    onSuccess: () => {
      toast.success("Stav objednávky uložen")
      queryClient.invalidateQueries({ queryKey: [ORDER_STATUSES_QUERY_KEY] })
    },
  })

  return (
    <div className="flex items-center justify-end gap-2">
      <Select
        disabled={mutation.isPending}
        onValueChange={(value) => {
          if (value === "clear" || isManualOrderBusinessStatusId(value)) {
            mutation.mutate(value)
          }
        }}
      >
        <Select.Trigger className="w-[210px]">
          <Select.Value placeholder="Upravit stav" />
        </Select.Trigger>
        <Select.Content>
          {MANUAL_STATUS_OPTIONS.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
      {mutation.isPending ? (
        <Text className="text-ui-fg-subtle" size="small">
          Ukládám...
        </Text>
      ) : null}
    </div>
  )
}

const OrderStatusesPage = () => {
  const [offset, setOffset] = useState(0)
  const { data, error, isLoading } = useQuery({
    queryFn: () => {
      const search = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })

      return sdk.client.fetch<OrderBusinessStatusesResponse>(
        `/admin/order-business-statuses?${search}`
      )
    },
    queryKey: [ORDER_STATUSES_QUERY_KEY, offset],
  })

  if (error) {
    throw error
  }

  const orders = data?.orders ?? []
  const pageIndex = Math.floor(offset / PAGE_SIZE)
  const pageCount = Math.ceil((data?.count ?? 0) / PAGE_SIZE)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Stavy objednávek</Heading>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Objednávka</Table.HeaderCell>
            <Table.HeaderCell>Zákazník</Table.HeaderCell>
            <Table.HeaderCell>Vytvořeno</Table.HeaderCell>
            <Table.HeaderCell>Celkem</Table.HeaderCell>
            <Table.HeaderCell>Stav objednávky</Table.HeaderCell>
            <Table.HeaderCell className="w-[1%] text-right">
              Ruční stav
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading ? (
            <Table.Row>
              <Table.Cell>Načítám...</Table.Cell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
            </Table.Row>
          ) : null}
          {isLoading || orders.length ? null : (
            <Table.Row>
              <Table.Cell>Žádné objednávky nenalezeny.</Table.Cell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
            </Table.Row>
          )}
          {orders.map((order) => (
            <Table.Row key={order.id}>
              <Table.Cell className="whitespace-nowrap">
                <Link
                  className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                  to={`/orders/${order.id}`}
                >
                  {formatOrderNumber(order)}
                </Link>
              </Table.Cell>
              <Table.Cell className="max-w-[260px] truncate">
                {order.email ?? "-"}
              </Table.Cell>
              <Table.Cell className="whitespace-nowrap">
                {formatDate(order.created_at)}
              </Table.Cell>
              <Table.Cell className="whitespace-nowrap">
                {formatTotal(order)}
              </Table.Cell>
              <Table.Cell className="whitespace-nowrap">
                <Badge color={order.business_status.tone} size="2xsmall">
                  {order.business_status.label}
                </Badge>
              </Table.Cell>
              <Table.Cell className="text-right">
                <ManualStatusControl orderId={order.id} />
              </Table.Cell>
            </Table.Row>
          ))}
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
    </Container>
  )
}

export const config = defineRouteConfig({
  icon: DocumentSeries,
  label: "Stavy objednávek",
})

export default OrderStatusesPage

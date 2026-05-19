import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentSeries } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Prompt,
  Select,
  Table,
  Text,
  Tooltip,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import {
  isManualOrderBusinessStatusId,
  isOrderBusinessStatusId,
  MANUAL_ORDER_BUSINESS_STATUS_IDS,
  type ManualOrderBusinessStatusId,
  ORDER_BUSINESS_STATUS_IDS,
  ORDER_BUSINESS_STATUSES,
  type OrderBusinessStatusId,
  type OrderBusinessStatusSummary,
} from "../../../utils/order-business-status"
import {
  getOrderExpeditionTransitionBlockReason,
  isOrderExpeditionCarrierKey,
  isOrderExpeditionTargetStatus,
  ORDER_EXPEDITION_MAX_ORDER_IDS,
  type OrderExpeditionBlockingOrder,
  type OrderExpeditionCarrierKey,
  type OrderExpeditionCarrierOption,
  type OrderExpeditionOrderDto,
  type OrderExpeditionTargetStatus,
} from "../../../utils/order-expedition"
import { formatLocaleCode } from "../../lib/format-locale-code"
import { sdk } from "../../lib/sdk"

type OrdersResponse = {
  orders: OrderExpeditionOrderDto[]
  count: number
  has_next: boolean
  count_exact: boolean
  carrier_filter_limit_reached: boolean
  scanned_count: number | null
  limit: number
  offset: number
  carrier: OrderExpeditionCarrierKey | null
  business_status: OrderBusinessStatusId | null
}

type CarriersResponse = {
  carriers: OrderExpeditionCarrierOption[]
}

type BusinessStatusesResponse = {
  orders: OrderBusinessStatusSummary[]
}

type BulkBusinessStatusResponse = {
  count: number
  skipped_count: number
  status: ManualOrderBusinessStatusId | null
  orders: OrderBusinessStatusSummary[]
  skipped: OrderExpeditionBlockingOrder[]
}

const PAGE_SIZE = 50
const ALL_CARRIERS = "all"
const ALL_BUSINESS_STATUSES = "all"
const ORDER_EXPEDITION_QUERY_KEY = "order-expedition-orders"

const TARGET_STATUSES: Array<{
  value: OrderExpeditionTargetStatus
  label: string
}> = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
  { value: "canceled", label: "Canceled" },
  { value: "requires_action", label: "Requires action" },
]

type TargetStatusOption = (typeof TARGET_STATUSES)[number] & {
  blockedOrders: OrderExpeditionBlockingOrder[]
}

type ManualStatusValue = ManualOrderBusinessStatusId | "clear"

const MANUAL_STATUS_OPTIONS: Array<{
  translationKey: string
  value: ManualStatusValue
}> = [
  ...MANUAL_ORDER_BUSINESS_STATUS_IDS.map((value) => ({
    translationKey: ORDER_BUSINESS_STATUSES[value].translation_key,
    value,
  })),
  {
    translationKey: "manualStatus.clear",
    value: "clear",
  },
]

function getOrderItemsSummary(order: OrderExpeditionOrderDto) {
  if (!order.items.length) {
    return "-"
  }

  return order.items
    .slice(0, 3)
    .map((item) => `${item.quantity}x ${item.sku ?? item.title}`)
    .join(", ")
}

function getCarrierLabel(order: OrderExpeditionOrderDto) {
  return order.carrier.shipping_method_name ?? order.carrier.label
}

function TruncatedTooltipText({
  className,
  text,
}: {
  className: string
  text: string
}) {
  return (
    <Tooltip content={text} maxWidth={520}>
      <span className={`block truncate ${className}`}>{text}</span>
    </Tooltip>
  )
}

function getBusinessStatus(order: OrderExpeditionOrderDto) {
  return order.business_status ?? ORDER_BUSINESS_STATUSES.new
}

function getManualStatusLabel(
  status: ManualOrderBusinessStatusId | null,
  t: (key: string) => string
) {
  return status === null
    ? t("manualStatus.clear")
    : t(ORDER_BUSINESS_STATUSES[status].translation_key)
}

function getBusinessStatusBulkBlockReason(
  order: OrderExpeditionOrderDto,
  status: ManualOrderBusinessStatusId | null,
  t: (key: string) => string
) {
  const currentManualStatus = order.manual_status ?? null

  if (currentManualStatus === status) {
    return status === null
      ? "Manual status is already clear"
      : `Manual status is already ${getManualStatusLabel(status, t)}`
  }

  if (status === null || status === "canceled") {
    return
  }

  const businessStatus = getBusinessStatus(order)

  if (order.status === "canceled") {
    return "Canceled orders stay canceled"
  }

  if (businessStatus.id === "delivered" || businessStatus.id === "shipped") {
    return `${t(businessStatus.translation_key)} status has higher priority`
  }

  if (businessStatus.id === "canceled" && currentManualStatus !== "canceled") {
    return "Canceled status has higher priority"
  }

  return
}

function getBulkBusinessStatusPreview(
  orders: OrderExpeditionOrderDto[],
  status: ManualOrderBusinessStatusId | null,
  t: (key: string) => string
) {
  const skipped: OrderExpeditionBlockingOrder[] = []
  const updatable: OrderExpeditionOrderDto[] = []

  for (const order of orders) {
    const reason = getBusinessStatusBulkBlockReason(order, status, t)

    if (reason) {
      skipped.push({
        id: order.id,
        order_display_id: order.order_display_id,
        reason,
      })
      continue
    }

    updatable.push(order)
  }

  return { skipped, updatable }
}

function getBulkBusinessStatusTarget(value: ManualStatusValue | "") {
  if (value === "") {
    return
  }

  return value === "clear" ? null : value
}

const formatDate = (date: string | null | undefined, locale?: string) => {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

const formatTotal = (order: OrderExpeditionOrderDto, locale?: string) => {
  if (order.total === null || order.total === undefined) {
    return "-"
  }

  const total =
    typeof order.total === "string" ? Number(order.total) : order.total

  if (!(order.currency_code && Number.isFinite(total))) {
    return String(order.total)
  }

  return new Intl.NumberFormat(locale, {
    currency: order.currency_code.toUpperCase(),
    style: "currency",
  }).format(total)
}

function mergeBusinessStatusSummary(
  order: OrderExpeditionOrderDto,
  summary: OrderBusinessStatusSummary | undefined
): OrderExpeditionOrderDto {
  if (!summary) {
    return order
  }

  return {
    ...order,
    business_status: summary.business_status,
    created_at: summary.created_at,
    currency_code: summary.currency_code,
    manual_status: summary.manual_status,
    total: summary.total,
  }
}

function getNextPageSelection(
  prev: Map<string, OrderExpeditionOrderDto>,
  orders: OrderExpeditionOrderDto[],
  allPageOrdersSelected: boolean
) {
  const next = new Map(prev)

  if (allPageOrdersSelected) {
    for (const order of orders) {
      next.delete(order.id)
    }

    return next
  }

  for (const order of orders) {
    if (!next.has(order.id) && next.size >= ORDER_EXPEDITION_MAX_ORDER_IDS) {
      continue
    }

    next.set(order.id, order)
  }

  return next
}

function getTargetStatusOptions(
  selectedOrders: OrderExpeditionOrderDto[]
): TargetStatusOption[] {
  return TARGET_STATUSES.map((status) => ({
    ...status,
    blockedOrders: selectedOrders
      .map((order) => {
        const reason = getOrderExpeditionTransitionBlockReason(
          order,
          status.value
        )

        return reason
          ? {
              id: order.id,
              order_display_id: order.order_display_id,
              reason,
            }
          : null
      })
      .filter((order): order is OrderExpeditionBlockingOrder => Boolean(order)),
  }))
}

function getStatusBlockerLabel(blockedCount: number) {
  return blockedCount === 1 ? "Blocked" : `${blockedCount} blocked`
}

function getSelectedStatusBlockedMessage(
  statusLabel: string,
  blockedOrders: OrderExpeditionBlockingOrder[]
) {
  if (blockedOrders.length === 1) {
    const [order] = blockedOrders
    return `${statusLabel} is blocked for 1 selected order: ${order.order_display_id} - ${order.reason}.`
  }

  return `${statusLabel} is blocked for ${blockedOrders.length} selected orders. Open the status menu for details.`
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

function isBlockingOrder(
  value: unknown
): value is OrderExpeditionBlockingOrder {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "order_display_id" in value &&
    typeof value.order_display_id === "string" &&
    "reason" in value &&
    typeof value.reason === "string"
  )
}

function getBlockingOrders(payload: unknown): OrderExpeditionBlockingOrder[] {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "blocked_orders" in payload &&
    Array.isArray(payload.blocked_orders)
  ) {
    return payload.blocked_orders.filter(isBlockingOrder)
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

async function updateStatus(
  orderIds: string[],
  targetStatus: OrderExpeditionTargetStatus
) {
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

const bulkUpdateOrderBusinessStatus = ({
  orderIds,
  status,
}: {
  orderIds: string[]
  status: ManualOrderBusinessStatusId | null
}) =>
  sdk.client.fetch<BulkBusinessStatusResponse>(
    "/admin/order-business-statuses/bulk",
    {
      body: {
        order_ids: orderIds,
        status,
      },
      method: "POST",
    }
  )

type OrdersTableProps = {
  allPageOrdersSelected: boolean
  intlLocale?: string
  isSelectionLimitReached: boolean
  isLoading: boolean
  onToggleOrder: (order: OrderExpeditionOrderDto) => void
  onTogglePage: () => void
  orders: OrderExpeditionOrderDto[]
  selectedOrderIds: Set<string>
  somePageOrdersSelected: boolean
}

type OrderExpeditionPaginationProps = {
  canNextPage: boolean
  canPreviousPage: boolean
  carrierFilterLimitReached: boolean
  count: number
  countExact: boolean
  nextPage: () => void
  pageCount: number
  pageIndex: number
  pageSize: number
  previousPage: () => void
  scannedCount: number | null
}

type CarrierSelectValue = typeof ALL_CARRIERS | OrderExpeditionCarrierKey
type BusinessStatusSelectValue =
  | typeof ALL_BUSINESS_STATUSES
  | OrderBusinessStatusId

function getCarrierSelectValue(value: string): CarrierSelectValue | null {
  if (value === ALL_CARRIERS) {
    return ALL_CARRIERS
  }

  return isOrderExpeditionCarrierKey(value) ? value : null
}

function getBusinessStatusSelectValue(
  value: string
): BusinessStatusSelectValue | null {
  if (value === ALL_BUSINESS_STATUSES) {
    return ALL_BUSINESS_STATUSES
  }

  return isOrderBusinessStatusId(value) ? value : null
}

function getOrderExpeditionPaginationState(
  data: OrdersResponse | undefined,
  offset: number
) {
  const count = data?.count ?? 0
  const canNextPage = data?.has_next ?? offset + PAGE_SIZE < count
  const countExact = data?.count_exact ?? true
  const pageIndex = Math.floor(offset / PAGE_SIZE)

  return {
    canNextPage,
    carrierFilterLimitReached: data?.carrier_filter_limit_reached ?? false,
    count,
    countExact,
    pageCount: countExact
      ? Math.max(Math.ceil(count / PAGE_SIZE), 1)
      : pageIndex + (canNextPage ? 2 : 1),
    pageIndex,
    scannedCount: data?.scanned_count ?? null,
  }
}

function isOrderSelectionLimitBlocked(
  orderId: string,
  selectedOrderIds: Set<string>,
  selectedCount: number
) {
  return (
    !selectedOrderIds.has(orderId) &&
    selectedCount >= ORDER_EXPEDITION_MAX_ORDER_IDS
  )
}

function shouldWarnPageSelectionLimit(
  allPageOrdersSelected: boolean,
  orders: OrderExpeditionOrderDto[],
  selectedOrderIds: Set<string>,
  selectedCount: number
) {
  if (allPageOrdersSelected) {
    return false
  }

  const remainingSlots = ORDER_EXPEDITION_MAX_ORDER_IDS - selectedCount
  const unselectedPageOrderIds = orders
    .map((order) => order.id)
    .filter((orderId) => !selectedOrderIds.has(orderId))

  return unselectedPageOrderIds.length > remainingSlots
}

function StatusBlockersTooltipContent({
  blockedOrders,
}: {
  blockedOrders: OrderExpeditionBlockingOrder[]
}) {
  const visibleOrders = blockedOrders.slice(0, 5)
  const hiddenCount = blockedOrders.length - visibleOrders.length

  return (
    <div className="flex flex-col gap-1">
      {visibleOrders.map((order) => (
        <span key={`${order.id}-${order.reason}`}>
          {order.order_display_id}: {order.reason}
        </span>
      ))}
      {hiddenCount > 0 ? <span>{hiddenCount} more blocked</span> : null}
    </div>
  )
}

function StatusSelectItem({ option }: { option: TargetStatusOption }) {
  const blockedCount = option.blockedOrders.length
  const isBlocked = blockedCount > 0
  const item = (
    <Select.Item
      className={
        isBlocked
          ? "data-[disabled]:cursor-not-allowed data-[disabled]:text-ui-fg-disabled"
          : undefined
      }
      disabled={isBlocked}
      value={option.value}
    >
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="truncate">{option.label}</span>
        {isBlocked ? (
          <span className="shrink-0 text-ui-fg-muted">
            {getStatusBlockerLabel(blockedCount)}
          </span>
        ) : null}
      </span>
    </Select.Item>
  )

  if (!isBlocked) {
    return item
  }

  return (
    <Tooltip
      content={
        <StatusBlockersTooltipContent blockedOrders={option.blockedOrders} />
      }
      maxWidth={360}
      side="right"
    >
      {item}
    </Tooltip>
  )
}

const ManualStatusControl = ({
  manualStatus,
  orderId,
}: {
  manualStatus?: ManualOrderBusinessStatusId | null
  orderId: string
}) => {
  const { t } = useTranslation("orderBusinessStatuses")
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (value: ManualStatusValue) =>
      updateOrderBusinessStatus({
        orderId,
        status: value === "clear" ? null : value,
      }),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("toast.saveError"))
    },
    onSuccess: () => {
      toast.success(t("toast.saveSuccess"))
      queryClient.invalidateQueries({ queryKey: [ORDER_EXPEDITION_QUERY_KEY] })
      queryClient.invalidateQueries({
        queryKey: ["order-business-statuses-by-ids"],
      })
    },
  })

  return (
    <div className="flex items-center justify-end gap-2">
      <Select
        defaultValue={manualStatus ?? undefined}
        disabled={mutation.isPending}
        key={manualStatus ?? "none"}
        onValueChange={(value) => {
          if (value === "clear" || isManualOrderBusinessStatusId(value)) {
            mutation.mutate(value)
          }
        }}
      >
        <Select.Trigger className="w-[180px]">
          <Select.Value placeholder={t("manualStatus.placeholder")} />
        </Select.Trigger>
        <Select.Content>
          {MANUAL_STATUS_OPTIONS.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {t(option.translationKey)}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
      {mutation.isPending ? (
        <Text className="text-ui-fg-subtle" size="small">
          {t("manualStatus.saving")}
        </Text>
      ) : null}
    </div>
  )
}

function OrdersTable({
  allPageOrdersSelected,
  intlLocale,
  isSelectionLimitReached,
  isLoading,
  onToggleOrder,
  onTogglePage,
  orders,
  selectedOrderIds,
  somePageOrdersSelected,
}: OrdersTableProps) {
  const { t } = useTranslation("orderBusinessStatuses")

  return (
    <div className="w-full overflow-x-auto">
      <Table className="min-w-[1320px]">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell className="w-12">
              <Checkbox
                checked={
                  somePageOrdersSelected
                    ? "indeterminate"
                    : allPageOrdersSelected
                }
                disabled={orders.length === 0}
                onCheckedChange={onTogglePage}
              />
            </Table.HeaderCell>
            <Table.HeaderCell>Order</Table.HeaderCell>
            <Table.HeaderCell>Customer</Table.HeaderCell>
            <Table.HeaderCell>Created</Table.HeaderCell>
            <Table.HeaderCell>Total</Table.HeaderCell>
            <Table.HeaderCell>Business status</Table.HeaderCell>
            <Table.HeaderCell>Carrier</Table.HeaderCell>
            <Table.HeaderCell>Payment</Table.HeaderCell>
            <Table.HeaderCell>Items</Table.HeaderCell>
            <Table.HeaderCell>Address</Table.HeaderCell>
            <Table.HeaderCell className="w-[1%] text-right">
              Manual status
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading ? (
            <Table.Row>
              <td
                className="px-6 py-8 text-center text-ui-fg-subtle"
                colSpan={11}
              >
                Loading...
              </td>
            </Table.Row>
          ) : null}

          {isLoading || orders.length ? null : (
            <Table.Row>
              <td
                className="px-6 py-8 text-center text-ui-fg-subtle"
                colSpan={11}
              >
                No orders found.
              </td>
            </Table.Row>
          )}

          {orders.map((order) => (
            <Table.Row key={order.id}>
              <Table.Cell>
                <Checkbox
                  checked={selectedOrderIds.has(order.id)}
                  disabled={
                    !selectedOrderIds.has(order.id) && isSelectionLimitReached
                  }
                  onCheckedChange={() => onToggleOrder(order)}
                />
              </Table.Cell>
              <Table.Cell className="whitespace-nowrap text-ui-fg-base">
                <Link
                  className="txt-compact-small-plus rounded-[4px] text-ui-fg-interactive outline-none transition-fg hover:text-ui-fg-interactive-hover focus-visible:shadow-borders-focus"
                  to={`/orders/${order.id}`}
                >
                  {order.order_display_id}
                </Link>
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
                {formatDate(order.created_at, intlLocale)}
              </Table.Cell>
              <Table.Cell className="whitespace-nowrap">
                {formatTotal(order, intlLocale)}
              </Table.Cell>
              <Table.Cell className="whitespace-nowrap">
                <Badge color={getBusinessStatus(order).tone} size="2xsmall">
                  {t(getBusinessStatus(order).translation_key)}
                </Badge>
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
              <Table.Cell>
                <TruncatedTooltipText
                  className="max-w-[75px]"
                  text={getOrderItemsSummary(order)}
                />
              </Table.Cell>
              <Table.Cell>
                <TruncatedTooltipText
                  className="max-w-[85px]"
                  text={order.delivery_address.join(", ") || "-"}
                />
              </Table.Cell>
              <Table.Cell className="text-right">
                <ManualStatusControl
                  manualStatus={order.manual_status}
                  orderId={order.id}
                />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}

function OrderExpeditionPagination({
  canNextPage,
  canPreviousPage,
  carrierFilterLimitReached,
  count,
  countExact,
  nextPage,
  pageCount,
  pageIndex,
  pageSize,
  previousPage,
  scannedCount,
}: OrderExpeditionPaginationProps) {
  if (countExact) {
    return (
      <Table.Pagination
        canNextPage={canNextPage}
        canPreviousPage={canPreviousPage}
        count={count}
        nextPage={nextPage}
        pageCount={pageCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        previousPage={previousPage}
      />
    )
  }

  return (
    <div className="flex w-full items-center justify-between gap-3 px-3 py-4 text-ui-fg-subtle">
      <div className="flex flex-col px-3 py-[5px]">
        <Text size="small">Page {pageIndex + 1}</Text>
        {carrierFilterLimitReached && scannedCount !== null ? (
          <Text className="text-ui-fg-muted" size="small">
            Carrier filter scanned first {scannedCount} orders. More matches may
            exist.
          </Text>
        ) : null}
      </div>
      <div className="flex items-center gap-x-2">
        <Button
          disabled={!canPreviousPage}
          onClick={previousPage}
          type="button"
          variant="transparent"
        >
          Prev
        </Button>
        <Button
          disabled={!canNextPage}
          onClick={nextPage}
          type="button"
          variant="transparent"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

const OrderExpeditionPage = () => {
  const { i18n, t } = useTranslation("orderBusinessStatuses")
  const [carrier, setCarrier] = useState<
    typeof ALL_CARRIERS | OrderExpeditionCarrierKey
  >(ALL_CARRIERS)
  const [businessStatus, setBusinessStatus] = useState<
    typeof ALL_BUSINESS_STATUSES | OrderBusinessStatusId
  >(ALL_BUSINESS_STATUSES)
  const [offset, setOffset] = useState(0)
  const [selectedOrdersById, setSelectedOrdersById] = useState<
    Map<string, OrderExpeditionOrderDto>
  >(new Map())
  const [targetStatus, setTargetStatus] = useState<
    OrderExpeditionTargetStatus | ""
  >("")
  const [bulkManualStatus, setBulkManualStatus] = useState<
    ManualStatusValue | ""
  >("")
  const [isBulkBusinessStatusPromptOpen, setIsBulkBusinessStatusPromptOpen] =
    useState(false)
  const [isUpdatingBusinessStatus, setIsUpdatingBusinessStatus] =
    useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [blockingOrders, setBlockingOrders] = useState<
    OrderExpeditionBlockingOrder[]
  >([])
  const intlLocale = useMemo(
    () => formatLocaleCode(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  )

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

      if (businessStatus !== ALL_BUSINESS_STATUSES) {
        search.set("business_status", businessStatus)
      }

      return sdk.client.fetch<OrdersResponse>(
        `/admin/order-expedition/orders?${search}`
      )
    },
    queryKey: [ORDER_EXPEDITION_QUERY_KEY, carrier, businessStatus, offset],
  })

  const rawOrders = useMemo(
    () => ordersQuery.data?.orders ?? [],
    [ordersQuery.data?.orders]
  )
  const rawOrderIds = useMemo(
    () => rawOrders.map((order) => order.id),
    [rawOrders]
  )
  const businessStatusesQuery = useQuery({
    enabled: rawOrderIds.length > 0,
    queryFn: () => {
      const search = new URLSearchParams({
        ids: rawOrderIds.join(","),
      })

      return sdk.client.fetch<BusinessStatusesResponse>(
        `/admin/order-business-statuses/by-ids?${search}`
      )
    },
    queryKey: ["order-business-statuses-by-ids", rawOrderIds],
  })
  const businessStatusesById = useMemo(
    () =>
      new Map(
        (businessStatusesQuery.data?.orders ?? []).map((order) => [
          order.id,
          order,
        ])
      ),
    [businessStatusesQuery.data?.orders]
  )
  const orders = useMemo(
    () =>
      rawOrders.map((order) =>
        mergeBusinessStatusSummary(order, businessStatusesById.get(order.id))
      ),
    [businessStatusesById, rawOrders]
  )

  useEffect(() => {
    if (!orders.length) {
      return
    }

    setSelectedOrdersById((prev) => {
      let changed = false
      const next = new Map(prev)

      for (const order of orders) {
        if (next.has(order.id)) {
          next.set(order.id, order)
          changed = true
        }
      }

      return changed ? next : prev
    })
  }, [orders])

  const selectedOrders = useMemo(
    () => [...selectedOrdersById.values()],
    [selectedOrdersById]
  )
  const selectedOrderIds = useMemo(
    () => new Set(selectedOrdersById.keys()),
    [selectedOrdersById]
  )
  const selectedOrderIdsList = useMemo(
    () => [...selectedOrdersById.keys()],
    [selectedOrdersById]
  )
  const allPageOrdersSelected =
    orders.length > 0 && orders.every((order) => selectedOrderIds.has(order.id))
  const somePageOrdersSelected =
    orders.some((order) => selectedOrderIds.has(order.id)) &&
    !allPageOrdersSelected
  const selectedCount = selectedOrdersById.size
  const isSelectionLimitReached =
    selectedCount >= ORDER_EXPEDITION_MAX_ORDER_IDS

  useEffect(() => {
    if (selectedCount > 0) {
      return
    }

    if (targetStatus) {
      setTargetStatus("")
    }

    if (bulkManualStatus) {
      setBulkManualStatus("")
    }

    setBlockingOrders((prev) => (prev.length ? [] : prev))
  }, [bulkManualStatus, selectedCount, targetStatus])

  const targetStatusOptions = useMemo(
    () => getTargetStatusOptions(selectedOrders),
    [selectedOrders]
  )
  const selectedTargetStatusOption = targetStatus
    ? targetStatusOptions.find((option) => option.value === targetStatus)
    : undefined
  const selectedTargetStatusBlockers =
    selectedTargetStatusOption?.blockedOrders ?? []
  const selectedStatusBlockedMessage =
    selectedTargetStatusOption && selectedTargetStatusBlockers.length > 0
      ? getSelectedStatusBlockedMessage(
          selectedTargetStatusOption.label,
          selectedTargetStatusBlockers
        )
      : null
  const bulkBusinessStatusTarget = getBulkBusinessStatusTarget(bulkManualStatus)
  const bulkBusinessStatusPreview =
    bulkBusinessStatusTarget === undefined
      ? { skipped: [], updatable: [] }
      : getBulkBusinessStatusPreview(
          selectedOrders,
          bulkBusinessStatusTarget,
          t
        )
  const bulkBusinessStatusLabel =
    bulkBusinessStatusTarget === undefined
      ? ""
      : getManualStatusLabel(bulkBusinessStatusTarget, t)
  const pagination = getOrderExpeditionPaginationState(ordersQuery.data, offset)

  const handleCarrierChange = (value: string) => {
    const nextCarrier = getCarrierSelectValue(value)

    if (!nextCarrier) {
      return
    }

    setCarrier(nextCarrier)
    setOffset(0)
    setSelectedOrdersById(new Map())
    setTargetStatus("")
    setBulkManualStatus("")
    setBlockingOrders([])
  }

  const handleBusinessStatusChange = (value: string) => {
    const nextBusinessStatus = getBusinessStatusSelectValue(value)

    if (!nextBusinessStatus) {
      return
    }

    setBusinessStatus(nextBusinessStatus)
    setOffset(0)
    setSelectedOrdersById(new Map())
    setTargetStatus("")
    setBulkManualStatus("")
    setBlockingOrders([])
  }

  const handleTargetStatusChange = (value: string) => {
    if (!isOrderExpeditionTargetStatus(value)) {
      return
    }

    const option = targetStatusOptions.find((status) => status.value === value)

    if (option?.blockedOrders.length) {
      return
    }

    setTargetStatus(value)
    setBlockingOrders([])
  }

  const handleBulkManualStatusChange = (value: string) => {
    if (value === "clear" || isManualOrderBusinessStatusId(value)) {
      setBulkManualStatus(value)
      setBlockingOrders([])
    }
  }

  const toggleOrder = (order: OrderExpeditionOrderDto) => {
    if (
      isOrderSelectionLimitBlocked(order.id, selectedOrderIds, selectedCount)
    ) {
      toast.error(
        `Select up to ${ORDER_EXPEDITION_MAX_ORDER_IDS} orders at a time`
      )
      return
    }

    setBlockingOrders([])
    setSelectedOrdersById((prev) => {
      const next = new Map(prev)
      if (next.has(order.id)) {
        next.delete(order.id)
      } else {
        next.set(order.id, order)
      }
      return next
    })
  }

  const togglePage = () => {
    if (
      shouldWarnPageSelectionLimit(
        allPageOrdersSelected,
        orders,
        selectedOrderIds,
        selectedCount
      )
    ) {
      toast.error(
        `Select up to ${ORDER_EXPEDITION_MAX_ORDER_IDS} orders at a time`
      )
    }

    setBlockingOrders([])
    setSelectedOrdersById((prev) =>
      getNextPageSelection(prev, orders, allPageOrdersSelected)
    )
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

  const handleStatusUpdate = async () => {
    if (!selectedOrderIdsList.length) {
      return
    }

    if (!targetStatus) {
      toast.error("Select a target status")
      return
    }

    if (selectedTargetStatusBlockers.length) {
      setBlockingOrders(selectedTargetStatusBlockers)
      toast.error("Selected orders no longer support that status change")
      return
    }

    const nextStatus = targetStatus
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
      setSelectedOrdersById(new Map())
      setTargetStatus("")
      await ordersQuery.refetch()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update order status"
      )
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleBusinessStatusUpdateRequest = () => {
    if (!selectedOrderIdsList.length) {
      return
    }

    if (bulkBusinessStatusTarget === undefined) {
      toast.error("Select a manual status")
      return
    }

    setBlockingOrders([])
    setIsBulkBusinessStatusPromptOpen(true)
  }

  const handleBusinessStatusUpdateConfirm = async () => {
    if (bulkBusinessStatusTarget === undefined) {
      return
    }

    const orderIdsToUpdate = bulkBusinessStatusPreview.updatable.map(
      (order) => order.id
    )

    if (!orderIdsToUpdate.length) {
      setBlockingOrders(bulkBusinessStatusPreview.skipped)
      setIsBulkBusinessStatusPromptOpen(false)
      toast.error("No selected orders can be updated")
      return
    }

    setIsUpdatingBusinessStatus(true)
    setBlockingOrders([])
    try {
      const result = await bulkUpdateOrderBusinessStatus({
        orderIds: selectedOrderIdsList,
        status: bulkBusinessStatusTarget,
      })

      setBlockingOrders(result.skipped)
      toast.success(
        `Manual status updated for ${result.count} order(s). ${result.skipped_count} skipped.`
      )
      setSelectedOrdersById(new Map())
      setBulkManualStatus("")
      setIsBulkBusinessStatusPromptOpen(false)
      await Promise.all([
        ordersQuery.refetch(),
        businessStatusesQuery.refetch(),
      ])
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update manual business status"
      )
    } finally {
      setIsUpdatingBusinessStatus(false)
    }
  }

  if (carriersQuery.error) {
    throw carriersQuery.error
  }

  if (ordersQuery.error) {
    throw ordersQuery.error
  }

  if (businessStatusesQuery.error) {
    throw businessStatusesQuery.error
  }

  return (
    <Container className="divide-y p-0">
      <Prompt
        onOpenChange={setIsBulkBusinessStatusPromptOpen}
        open={isBulkBusinessStatusPromptOpen}
        variant="confirmation"
      >
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Apply manual status</Prompt.Title>
            <Prompt.Description>
              Only manually selected orders will be updated.
            </Prompt.Description>
          </Prompt.Header>
          <div className="flex flex-col gap-3 px-6 py-4">
            <Text size="small">
              Target manual status:{" "}
              <span className="font-medium">{bulkBusinessStatusLabel}</span>
            </Text>
            <Text size="small">
              {bulkBusinessStatusPreview.updatable.length} order(s) will be
              updated. {bulkBusinessStatusPreview.skipped.length} order(s) will
              be skipped.
            </Text>
            {bulkBusinessStatusPreview.updatable.length ? (
              <div className="flex max-h-[160px] flex-col gap-1 overflow-auto rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
                {bulkBusinessStatusPreview.updatable
                  .slice(0, 10)
                  .map((order) => (
                    <Text key={order.id} size="small">
                      {order.order_display_id}: set manual status to{" "}
                      {bulkBusinessStatusLabel}
                    </Text>
                  ))}
                {bulkBusinessStatusPreview.updatable.length > 10 ? (
                  <Text className="text-ui-fg-muted" size="small">
                    {bulkBusinessStatusPreview.updatable.length - 10} more will
                    be updated
                  </Text>
                ) : null}
              </div>
            ) : null}
            {bulkBusinessStatusPreview.skipped.length ? (
              <div className="flex max-h-[160px] flex-col gap-1 overflow-auto rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
                {bulkBusinessStatusPreview.skipped.slice(0, 10).map((order) => (
                  <Text key={`${order.id}-${order.reason}`} size="small">
                    {order.order_display_id}: skipped - {order.reason}
                  </Text>
                ))}
                {bulkBusinessStatusPreview.skipped.length > 10 ? (
                  <Text className="text-ui-fg-muted" size="small">
                    {bulkBusinessStatusPreview.skipped.length - 10} more will be
                    skipped
                  </Text>
                ) : null}
              </div>
            ) : null}
          </div>
          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Prompt.Action
              disabled={
                !bulkBusinessStatusPreview.updatable.length ||
                isUpdatingBusinessStatus
              }
              onClick={handleBusinessStatusUpdateConfirm}
            >
              Apply
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>

      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Heading className="whitespace-nowrap" level="h1">
            Order Operations
          </Heading>

          <div className="flex items-center border-ui-border-base border-l pl-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select onValueChange={handleCarrierChange} value={carrier}>
                <Select.Trigger className="w-[220px]">
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

              <Select
                onValueChange={handleBusinessStatusChange}
                value={businessStatus}
              >
                <Select.Trigger className="w-[220px]">
                  <Select.Value placeholder="Business status" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={ALL_BUSINESS_STATUSES}>
                    All business statuses
                  </Select.Item>
                  {ORDER_BUSINESS_STATUS_IDS.map((status) => (
                    <Select.Item key={status} value={status}>
                      {t(ORDER_BUSINESS_STATUSES[status].translation_key)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Text className="whitespace-nowrap text-ui-fg-subtle" size="small">
              {selectedCount} selected
            </Text>

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

            <Select
              disabled={selectedCount === 0}
              onValueChange={handleBulkManualStatusChange}
              value={bulkManualStatus}
            >
              <Select.Trigger
                className="w-[180px]"
                disabled={selectedCount === 0}
              >
                <Select.Value placeholder="Manual status" />
              </Select.Trigger>
              <Select.Content>
                {MANUAL_STATUS_OPTIONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {t(option.translationKey)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>

            <Button
              disabled={selectedCount === 0 || !bulkManualStatus}
              isLoading={isUpdatingBusinessStatus}
              onClick={handleBusinessStatusUpdateRequest}
              size="small"
              variant="secondary"
            >
              Apply manual status
            </Button>

            <Select
              disabled={selectedCount === 0}
              onValueChange={handleTargetStatusChange}
              value={targetStatus}
            >
              <Select.Trigger
                className="w-[144px]"
                disabled={selectedCount === 0}
              >
                <Select.Value placeholder="Medusa status" />
              </Select.Trigger>
              <Select.Content>
                {targetStatusOptions.map((status) => (
                  <StatusSelectItem key={status.value} option={status} />
                ))}
              </Select.Content>
            </Select>

            <Button
              disabled={
                selectedCount === 0 ||
                !targetStatus ||
                selectedTargetStatusBlockers.length > 0
              }
              isLoading={isUpdatingStatus}
              onClick={handleStatusUpdate}
              size="small"
            >
              Apply Medusa status
            </Button>
          </div>
          {selectedStatusBlockedMessage ? (
            <Text className="max-w-full text-ui-fg-error" size="small">
              {selectedStatusBlockedMessage}
            </Text>
          ) : null}
        </div>
      </div>

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
        intlLocale={intlLocale}
        isLoading={ordersQuery.isLoading}
        isSelectionLimitReached={isSelectionLimitReached}
        onToggleOrder={toggleOrder}
        onTogglePage={togglePage}
        orders={orders}
        selectedOrderIds={selectedOrderIds}
        somePageOrdersSelected={somePageOrdersSelected}
      />

      <OrderExpeditionPagination
        canNextPage={pagination.canNextPage}
        canPreviousPage={offset > 0}
        carrierFilterLimitReached={pagination.carrierFilterLimitReached}
        count={pagination.count}
        countExact={pagination.countExact}
        nextPage={() => setOffset((prev) => prev + PAGE_SIZE)}
        pageCount={pagination.pageCount}
        pageIndex={pagination.pageIndex}
        pageSize={PAGE_SIZE}
        previousPage={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
        scannedCount={pagination.scannedCount}
      />
    </Container>
  )
}

export const config = defineRouteConfig({
  icon: DocumentSeries,
  label: "Order Operations",
})

export default OrderExpeditionPage

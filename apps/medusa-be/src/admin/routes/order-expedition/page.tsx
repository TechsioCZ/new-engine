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
import { useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import {
  isManualOrderBusinessStatusId,
  isOrderBusinessStatusId,
  MANUAL_ORDER_BUSINESS_STATUS_IDS,
  ORDER_BUSINESS_STATUS_IDS,
  ORDER_BUSINESS_STATUSES,
} from "../../../utils/order-business-status"
import type {
  ManualOrderBusinessStatusId,
  OrderBusinessStatusId,
  OrderBusinessStatusSummary,
} from "../../../utils/order-business-status"
import {
  getOrderExpeditionTransitionBlockReason,
  isOrderExpeditionCarrierKey,
  isOrderExpeditionTargetStatus,
  ORDER_EXPEDITION_MAX_ORDER_IDS,
} from "../../../utils/order-expedition"
import type {
  OrderExpeditionBlockingOrder,
  OrderExpeditionCarrierKey,
  OrderExpeditionCarrierOption,
  OrderExpeditionOrderDto,
  OrderExpeditionTargetStatus,
} from "../../../utils/order-expedition"
import { formatLocaleCode } from "../../lib/format-locale-code"
import { sdk } from "../../lib/sdk"

interface OrdersResponse {
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

interface CarriersResponse {
  carriers: OrderExpeditionCarrierOption[]
}

interface BusinessStatusesResponse {
  orders: OrderBusinessStatusSummary[]
}

interface BulkBusinessStatusResponse {
  count: number
  skipped_count: number
  status: ManualOrderBusinessStatusId | null
  orders: OrderBusinessStatusSummary[]
  skipped: OrderExpeditionBlockingOrder[]
}

interface OrderExpeditionFilters {
  carrier: typeof ALL_CARRIERS | OrderExpeditionCarrierKey
  businessStatus: typeof ALL_BUSINESS_STATUSES | OrderBusinessStatusId
  offset: number
}

const PAGE_SIZE = 50
const ALL_CARRIERS = "all"
const ALL_BUSINESS_STATUSES = "all"
const ORDER_EXPEDITION_QUERY_KEY = "order-expedition-orders"

export const handle = {
  breadcrumb: () => "Order Operations",
}

const TARGET_STATUSES: {
  value: OrderExpeditionTargetStatus
  label: string
}[] = [
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
  { label: "Canceled", value: "canceled" },
  { label: "Requires action", value: "requires_action" },
]

type TargetStatusOption = (typeof TARGET_STATUSES)[number] & {
  blockedOrders: OrderExpeditionBlockingOrder[]
}

type ManualStatusValue = ManualOrderBusinessStatusId | "clear"

const MANUAL_STATUS_OPTIONS: {
  translationKey: string
  value: ManualStatusValue
}[] = [
  ...MANUAL_ORDER_BUSINESS_STATUS_IDS.map((value) => ({
    translationKey: ORDER_BUSINESS_STATUSES[value].translation_key,
    value,
  })),
  {
    translationKey: "manualStatus.clear",
    value: "clear",
  },
]

const getOrderItemsSummary = (order: OrderExpeditionOrderDto) => {
  if (!order.items.length) {
    return "-"
  }

  return order.items
    .slice(0, 3)
    .map((item) => `${item.quantity}x ${item.sku ?? item.title}`)
    .join(", ")
}

const getCarrierLabel = (order: OrderExpeditionOrderDto) =>
  order.carrier.shipping_method_name ?? order.carrier.label

const TruncatedTooltipText = ({
  className,
  text,
}: {
  className: string
  text: string
}) => (
  <Tooltip content={text} maxWidth={520}>
    <span className={`block truncate ${className}`}>{text}</span>
  </Tooltip>
)

const getBusinessStatus = (order: OrderExpeditionOrderDto) =>
  order.business_status ?? ORDER_BUSINESS_STATUSES.new

const buildOrdersQueryPath = (filters: OrderExpeditionFilters): string => {
  const search = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(filters.offset),
  })

  if (filters.carrier !== ALL_CARRIERS) {
    search.set("carrier", filters.carrier)
  }

  if (filters.businessStatus !== ALL_BUSINESS_STATUSES) {
    search.set("business_status", filters.businessStatus)
  }

  return `/admin/order-expedition/orders?${search}`
}

const mergeBusinessStatusSummary = (
  order: OrderExpeditionOrderDto,
  summary: OrderBusinessStatusSummary | undefined,
): OrderExpeditionOrderDto => {
  if (!summary) {
    return order
  }

  return {
    ...order,
    business_status: summary.business_status,
    ...(summary.created_at === undefined
      ? {}
      : { created_at: summary.created_at }),
    ...(summary.currency_code === undefined
      ? {}
      : { currency_code: summary.currency_code }),
    ...(summary.manual_status === undefined
      ? {}
      : { manual_status: summary.manual_status }),
    ...(summary.total === undefined ? {} : { total: summary.total }),
  }
}

const getNextPageSelection = (
  prev: Map<string, OrderExpeditionOrderDto>,
  orders: OrderExpeditionOrderDto[],
  allPageOrdersSelected: boolean,
) => {
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

const getCarrierSelectValue = (value: string): CarrierSelectValue | null => {
  if (value === ALL_CARRIERS) {
    return ALL_CARRIERS
  }

  return isOrderExpeditionCarrierKey(value) ? value : null
}

const getBusinessStatusSelectValue = (
  value: string,
): BusinessStatusSelectValue | null => {
  if (value === ALL_BUSINESS_STATUSES) {
    return ALL_BUSINESS_STATUSES
  }

  return isOrderBusinessStatusId(value) ? value : null
}

const isOrderSelectionLimitBlocked = (
  orderId: string,
  selectedOrderIds: Set<string>,
  selectedCount: number,
) =>
  !selectedOrderIds.has(orderId) &&
  selectedCount >= ORDER_EXPEDITION_MAX_ORDER_IDS

const shouldWarnPageSelectionLimit = (
  allPageOrdersSelected: boolean,
  orders: OrderExpeditionOrderDto[],
  selectedOrderIds: Set<string>,
  selectedCount: number,
) => {
  if (allPageOrdersSelected) {
    return false
  }

  const remainingSlots = ORDER_EXPEDITION_MAX_ORDER_IDS - selectedCount
  let unselectedPageOrderCount = 0
  for (const order of orders) {
    if (!selectedOrderIds.has(order.id)) {
      unselectedPageOrderCount += 1
    }
  }

  return unselectedPageOrderCount > remainingSlots
}

const getPayloadErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const { message } = payload
    if (typeof message === "string") {
      return message
    }
  }

  return fallback
}

const isBlockingOrder = (
  value: unknown,
): value is OrderExpeditionBlockingOrder => {
  if (typeof value !== "object" || value === null) {
    return false
  }
  if (!("id" in value) || typeof value.id !== "string") {
    return false
  }
  if (
    !("order_display_id" in value) ||
    typeof value.order_display_id !== "string"
  ) {
    return false
  }

  return "reason" in value && typeof value.reason === "string"
}

const getBlockingOrders = (
  payload: unknown,
): OrderExpeditionBlockingOrder[] => {
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

const readJsonPayload = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const downloadPdf = async (orderIds: string[]) => {
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
    const payload = await readJsonPayload(response)
    throw new Error(
      getPayloadErrorMessage(payload, "Failed to generate expedition PDF"),
    )
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `order-expedition-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const updateStatus = async (
  orderIds: string[],
  targetStatus: OrderExpeditionTargetStatus,
) => {
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

  const payload = await readJsonPayload(response)

  if (!response.ok) {
    return {
      blockedOrders: getBlockingOrders(payload),
      message: getPayloadErrorMessage(payload, "Failed to update order status"),
      ok: false as const,
    }
  }

  return {
    blockedOrders: [],
    ok: true as const,
  }
}

const bulkUpdateOrderBusinessStatus = async ({
  orderIds,
  status,
}: {
  orderIds: string[]
  status: ManualOrderBusinessStatusId | null
}) =>
  await sdk.client.fetch<BulkBusinessStatusResponse>(
    "/admin/order-business-statuses/bulk",
    {
      body: {
        order_ids: orderIds,
        status,
      },
      method: "POST",
    },
  )

const useOrderExpeditionQueries = (filters: OrderExpeditionFilters) => {
  const carriersQuery = useQuery({
    queryFn: async () =>
      await sdk.client.fetch<CarriersResponse>(
        "/admin/order-expedition/carriers",
      ),
    queryKey: ["order-expedition-carriers"],
  })

  const ordersQuery = useQuery({
    queryFn: async () =>
      await sdk.client.fetch<OrdersResponse>(buildOrdersQueryPath(filters)),
    queryKey: [
      ORDER_EXPEDITION_QUERY_KEY,
      filters.carrier,
      filters.businessStatus,
      filters.offset,
    ],
  })

  const rawOrders = ordersQuery.data?.orders ?? []
  const rawOrderIds = rawOrders.map((order) => order.id)
  const businessStatusesQuery = useQuery({
    enabled: rawOrderIds.length > 0,
    queryFn: async () => {
      const search = new URLSearchParams({
        ids: rawOrderIds.join(","),
      })

      return await sdk.client.fetch<BusinessStatusesResponse>(
        `/admin/order-business-statuses/by-ids?${search}`,
      )
    },
    queryKey: ["order-business-statuses-by-ids", rawOrderIds],
  })
  const businessStatusesById = new Map(
    (businessStatusesQuery.data?.orders ?? []).map((order) => [
      order.id,
      order,
    ]),
  )
  const orders = rawOrders.map((order) =>
    mergeBusinessStatusSummary(order, businessStatusesById.get(order.id)),
  )

  return {
    businessStatusesQuery,
    carriersQuery,
    orders,
    ordersQuery,
  }
}

const useClearBulkControlsWhenSelectionEmpty = ({
  bulkManualStatus,
  selectedCount,
  setBlockingOrders,
  setBulkManualStatus,
  setTargetStatus,
  targetStatus,
}: {
  bulkManualStatus: ManualStatusValue | ""
  selectedCount: number
  targetStatus: OrderExpeditionTargetStatus | ""
  setBlockingOrders: Dispatch<SetStateAction<OrderExpeditionBlockingOrder[]>>
  setBulkManualStatus: Dispatch<SetStateAction<ManualStatusValue | "">>
  setTargetStatus: Dispatch<SetStateAction<OrderExpeditionTargetStatus | "">>
}): void => {
  useEffect(() => {
    if (selectedCount > 0) {
      return
    }
    if (targetStatus !== "") {
      setTargetStatus("")
    }
    if (bulkManualStatus !== "") {
      setBulkManualStatus("")
    }
    setBlockingOrders((previous) => (previous.length > 0 ? [] : previous))
  }, [
    bulkManualStatus,
    selectedCount,
    setBlockingOrders,
    setBulkManualStatus,
    setTargetStatus,
    targetStatus,
  ])
}

const useOrderExpeditionSelection = (
  selectedOrdersById: Map<string, OrderExpeditionOrderDto>,
  orders: OrderExpeditionOrderDto[],
) => {
  const currentOrdersById = new Map(orders.map((order) => [order.id, order]))
  const selectedOrders = [...selectedOrdersById.values()].map(
    (order) => currentOrdersById.get(order.id) ?? order,
  )
  const selectedOrderIds = new Set(selectedOrdersById.keys())
  const selectedOrderIdsList = [...selectedOrdersById.keys()]
  const allPageOrdersSelected =
    orders.length > 0 && orders.every((order) => selectedOrderIds.has(order.id))
  const somePageOrdersSelected =
    orders.some((order) => selectedOrderIds.has(order.id)) &&
    !allPageOrdersSelected
  const selectedCount = selectedOrdersById.size

  return {
    allPageOrdersSelected,
    isSelectionLimitReached: selectedCount >= ORDER_EXPEDITION_MAX_ORDER_IDS,
    selectedCount,
    selectedOrderIds,
    selectedOrderIdsList,
    selectedOrders,
    somePageOrdersSelected,
  }
}

const resetOrderExpeditionControls = (params: {
  setOffset: Dispatch<SetStateAction<number>>
  setSelectedOrdersById: Dispatch<
    SetStateAction<Map<string, OrderExpeditionOrderDto>>
  >
  setTargetStatus: Dispatch<SetStateAction<OrderExpeditionTargetStatus | "">>
  setBulkManualStatus: Dispatch<SetStateAction<ManualStatusValue | "">>
  setBlockingOrders: Dispatch<SetStateAction<OrderExpeditionBlockingOrder[]>>
}): void => {
  params.setOffset(0)
  params.setSelectedOrdersById(new Map())
  params.setTargetStatus("")
  params.setBulkManualStatus("")
  params.setBlockingOrders([])
}

const useOrderExpeditionFilterHandlers = (params: {
  setCarrier: Dispatch<
    SetStateAction<typeof ALL_CARRIERS | OrderExpeditionCarrierKey>
  >
  setBusinessStatus: Dispatch<
    SetStateAction<typeof ALL_BUSINESS_STATUSES | OrderBusinessStatusId>
  >
  setOffset: Dispatch<SetStateAction<number>>
  setSelectedOrdersById: Dispatch<
    SetStateAction<Map<string, OrderExpeditionOrderDto>>
  >
  setTargetStatus: Dispatch<SetStateAction<OrderExpeditionTargetStatus | "">>
  setBulkManualStatus: Dispatch<SetStateAction<ManualStatusValue | "">>
  setBlockingOrders: Dispatch<SetStateAction<OrderExpeditionBlockingOrder[]>>
}) => {
  const resetControls = () => {
    resetOrderExpeditionControls(params)
  }

  return {
    handleBusinessStatusChange: (value: string) => {
      const nextBusinessStatus = getBusinessStatusSelectValue(value)

      if (!nextBusinessStatus) {
        return
      }

      params.setBusinessStatus(nextBusinessStatus)
      resetControls()
    },
    handleCarrierChange: (value: string) => {
      const nextCarrier = getCarrierSelectValue(value)

      if (!nextCarrier) {
        return
      }

      params.setCarrier(nextCarrier)
      resetControls()
    },
  }
}

const useOrderExpeditionSelectionHandlers = (params: {
  allPageOrdersSelected: boolean
  orders: OrderExpeditionOrderDto[]
  selectedCount: number
  selectedOrderIds: Set<string>
  setBlockingOrders: Dispatch<SetStateAction<OrderExpeditionBlockingOrder[]>>
  setSelectedOrdersById: Dispatch<
    SetStateAction<Map<string, OrderExpeditionOrderDto>>
  >
}) => ({
  toggleOrder: (order: OrderExpeditionOrderDto) => {
    if (
      isOrderSelectionLimitBlocked(
        order.id,
        params.selectedOrderIds,
        params.selectedCount,
      )
    ) {
      toast.error(
        `Select up to ${ORDER_EXPEDITION_MAX_ORDER_IDS} orders at a time`,
      )
      return
    }

    params.setBlockingOrders([])
    params.setSelectedOrdersById((prev) => {
      const next = new Map(prev)
      if (next.has(order.id)) {
        next.delete(order.id)
      } else {
        next.set(order.id, order)
      }
      return next
    })
  },
  togglePage: () => {
    if (
      shouldWarnPageSelectionLimit(
        params.allPageOrdersSelected,
        params.orders,
        params.selectedOrderIds,
        params.selectedCount,
      )
    ) {
      toast.error(
        `Select up to ${ORDER_EXPEDITION_MAX_ORDER_IDS} orders at a time`,
      )
    }

    params.setBlockingOrders([])
    params.setSelectedOrdersById((prev) =>
      getNextPageSelection(prev, params.orders, params.allPageOrdersSelected),
    )
  },
})

const useOrderExpeditionStatusHandlers = (params: {
  selectedOrderIdsList: string[]
  selectedCount: number
  targetStatus: OrderExpeditionTargetStatus | ""
  targetStatusOptions: TargetStatusOption[]
  selectedTargetStatusBlockers: OrderExpeditionBlockingOrder[]
  setBlockingOrders: Dispatch<SetStateAction<OrderExpeditionBlockingOrder[]>>
  setIsPrinting: Dispatch<SetStateAction<boolean>>
  setIsUpdatingStatus: Dispatch<SetStateAction<boolean>>
  setSelectedOrdersById: Dispatch<
    SetStateAction<Map<string, OrderExpeditionOrderDto>>
  >
  setTargetStatus: Dispatch<SetStateAction<OrderExpeditionTargetStatus | "">>
  ordersQuery: ReturnType<typeof useOrderExpeditionQueries>["ordersQuery"]
}) => ({
  handlePrint: async () => {
    if (!params.selectedOrderIdsList.length) {
      return
    }

    params.setIsPrinting(true)
    params.setBlockingOrders([])
    try {
      await downloadPdf(params.selectedOrderIdsList)
      toast.success("Order expedition PDF generated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to print PDF",
      )
    } finally {
      params.setIsPrinting(false)
    }
  },
  handleStatusUpdate: async () => {
    if (!params.selectedOrderIdsList.length) {
      return
    }

    if (!params.targetStatus) {
      toast.error("Select a target status")
      return
    }

    if (params.selectedTargetStatusBlockers.length) {
      params.setBlockingOrders(params.selectedTargetStatusBlockers)
      toast.error("Selected orders no longer support that status change")
      return
    }

    params.setIsUpdatingStatus(true)
    params.setBlockingOrders([])
    try {
      const result = await updateStatus(
        params.selectedOrderIdsList,
        params.targetStatus,
      )

      if (!result.ok) {
        params.setBlockingOrders(result.blockedOrders)
        toast.error(result.message)
        return
      }

      toast.success(`${params.selectedCount} order(s) updated`)
      params.setSelectedOrdersById(new Map())
      params.setTargetStatus("")
      await params.ordersQuery.refetch()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update order status",
      )
    } finally {
      params.setIsUpdatingStatus(false)
    }
  },
  handleTargetStatusChange: (value: string) => {
    if (!isOrderExpeditionTargetStatus(value)) {
      return
    }

    const option = params.targetStatusOptions.find(
      (status) => status.value === value,
    )

    if ((option?.blockedOrders.length ?? 0) > 0) {
      return
    }

    params.setTargetStatus(value)
    params.setBlockingOrders([])
  },
})

const useOrderExpeditionBusinessStatusHandlers = (params: {
  bulkBusinessStatusTarget: ManualOrderBusinessStatusId | null | undefined
  bulkBusinessStatusPreview: {
    skipped: OrderExpeditionBlockingOrder[]
    updatable: OrderExpeditionOrderDto[]
  }
  selectedOrderIdsList: string[]
  setBlockingOrders: Dispatch<SetStateAction<OrderExpeditionBlockingOrder[]>>
  setBulkManualStatus: Dispatch<SetStateAction<ManualStatusValue | "">>
  setIsBulkBusinessStatusPromptOpen: Dispatch<SetStateAction<boolean>>
  setIsUpdatingBusinessStatus: Dispatch<SetStateAction<boolean>>
  setSelectedOrdersById: Dispatch<
    SetStateAction<Map<string, OrderExpeditionOrderDto>>
  >
  ordersQuery: ReturnType<typeof useOrderExpeditionQueries>["ordersQuery"]
  businessStatusesQuery: ReturnType<
    typeof useOrderExpeditionQueries
  >["businessStatusesQuery"]
}) => ({
  handleBulkManualStatusChange: (value: string) => {
    if (value === "clear" || isManualOrderBusinessStatusId(value)) {
      params.setBulkManualStatus(value)
      params.setBlockingOrders([])
    }
  },
  handleBusinessStatusUpdateConfirm: async () => {
    if (params.bulkBusinessStatusTarget === undefined) {
      return
    }

    const orderIdsToUpdate = params.bulkBusinessStatusPreview.updatable.map(
      (order) => order.id,
    )

    if (!orderIdsToUpdate.length) {
      params.setBlockingOrders(params.bulkBusinessStatusPreview.skipped)
      params.setIsBulkBusinessStatusPromptOpen(false)
      toast.error("No selected orders can be updated")
      return
    }

    params.setIsUpdatingBusinessStatus(true)
    params.setBlockingOrders([])
    try {
      const result = await bulkUpdateOrderBusinessStatus({
        orderIds: params.selectedOrderIdsList,
        status: params.bulkBusinessStatusTarget,
      })

      params.setBlockingOrders(result.skipped)
      toast.success(
        `Manual status updated for ${result.count} order(s). ${result.skipped_count} skipped.`,
      )
      params.setSelectedOrdersById(new Map())
      params.setBulkManualStatus("")
      params.setIsBulkBusinessStatusPromptOpen(false)
      await Promise.all([
        params.ordersQuery.refetch(),
        params.businessStatusesQuery.refetch(),
      ])
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update manual business status",
      )
    } finally {
      params.setIsUpdatingBusinessStatus(false)
    }
  },
  handleBusinessStatusUpdateRequest: () => {
    if (!params.selectedOrderIdsList.length) {
      return
    }

    if (params.bulkBusinessStatusTarget === undefined) {
      toast.error("Select a manual status")
      return
    }

    params.setBlockingOrders([])
    params.setIsBulkBusinessStatusPromptOpen(true)
  },
})

const throwOrderExpeditionQueryErrors = (errors: unknown[]): void => {
  for (const error of errors) {
    if (error instanceof Error) {
      throw new TypeError(error.message, { cause: error })
    }
    if (typeof error === "string") {
      throw new TypeError(error)
    }
    if (error !== null && error !== undefined) {
      throw new Error("Order expedition query failed")
    }
  }
}

const BulkBusinessStatusPrompt = ({
  bulkBusinessStatusLabel,
  bulkBusinessStatusPreview,
  isBulkBusinessStatusPromptOpen,
  isUpdatingBusinessStatus,
  onConfirm,
  onOpenChange,
}: {
  bulkBusinessStatusLabel: string
  bulkBusinessStatusPreview: {
    skipped: OrderExpeditionBlockingOrder[]
    updatable: OrderExpeditionOrderDto[]
  }
  isBulkBusinessStatusPromptOpen: boolean
  isUpdatingBusinessStatus: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) => (
  <Prompt
    onOpenChange={onOpenChange}
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
          {bulkBusinessStatusPreview.updatable.length} order(s) will be updated.{" "}
          {bulkBusinessStatusPreview.skipped.length} order(s) will be skipped.
        </Text>
        {bulkBusinessStatusPreview.updatable.length > 0 ? (
          <div className="flex max-h-[160px] flex-col gap-1 overflow-auto rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
            {bulkBusinessStatusPreview.updatable.slice(0, 10).map((order) => (
              <Text key={order.id} size="small">
                {order.order_display_id}: set manual status to{" "}
                {bulkBusinessStatusLabel}
              </Text>
            ))}
            {bulkBusinessStatusPreview.updatable.length > 10 ? (
              <Text className="text-ui-fg-muted" size="small">
                {bulkBusinessStatusPreview.updatable.length - 10} more will be
                updated
              </Text>
            ) : null}
          </div>
        ) : null}
        {bulkBusinessStatusPreview.skipped.length > 0 ? (
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
            bulkBusinessStatusPreview.updatable.length === 0 ||
            isUpdatingBusinessStatus
          }
          onClick={onConfirm}
        >
          Apply
        </Prompt.Action>
      </Prompt.Footer>
    </Prompt.Content>
  </Prompt>
)

const getManualStatusLabel = (
  status: ManualOrderBusinessStatusId | null,
  t: (key: string) => string,
) =>
  status === null
    ? t("manualStatus.clear")
    : t(ORDER_BUSINESS_STATUSES[status].translation_key)

const getBusinessStatusBulkBlockReason = (
  order: OrderExpeditionOrderDto,
  status: ManualOrderBusinessStatusId | null,
  t: (key: string) => string,
): string | undefined => {
  const currentManualStatus = order.manual_status ?? null

  if (currentManualStatus === status) {
    return status === null
      ? "Manual status is already clear"
      : `Manual status is already ${getManualStatusLabel(status, t)}`
  }

  if (status === null || status === "canceled") {
    return undefined
  }

  const businessStatus = getBusinessStatus(order)

  if (order.status === "canceled") {
    return "Canceled orders stay canceled"
  }

  if (businessStatus.id === "delivered" || businessStatus.id === "shipped") {
    return `${t(businessStatus.translation_key)} status has higher priority`
  }

  return undefined
}

const getBulkBusinessStatusPreview = (
  orders: OrderExpeditionOrderDto[],
  status: ManualOrderBusinessStatusId | null,
  t: (key: string) => string,
) => {
  const skipped: OrderExpeditionBlockingOrder[] = []
  const updatable: OrderExpeditionOrderDto[] = []

  for (const order of orders) {
    const reason = getBusinessStatusBulkBlockReason(order, status, t)

    if (reason !== undefined) {
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

const getBulkBusinessStatusTarget = (
  value: ManualStatusValue | "",
): ManualOrderBusinessStatusId | null | undefined => {
  if (value === "") {
    return undefined
  }

  return value === "clear" ? null : value
}

const formatDate = (date: string | null | undefined, locale?: string) => {
  if (date === null || date === undefined || date === "") {
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

  if (
    order.currency_code !== null &&
    order.currency_code !== undefined &&
    order.currency_code !== "" &&
    Number.isFinite(total)
  ) {
    return new Intl.NumberFormat(locale, {
      currency: order.currency_code.toUpperCase(),
      style: "currency",
    }).format(total)
  }

  return String(order.total)
}

const getTargetStatusOptions = (
  selectedOrders: OrderExpeditionOrderDto[],
): TargetStatusOption[] =>
  TARGET_STATUSES.map((status) => ({
    ...status,
    blockedOrders: selectedOrders
      .map((order) => {
        const reason = getOrderExpeditionTransitionBlockReason(
          order,
          status.value,
        )

        if (reason === undefined) {
          return null
        }

        return {
          id: order.id,
          order_display_id: order.order_display_id,
          reason,
        }
      })
      .filter((order): order is OrderExpeditionBlockingOrder => order !== null),
  }))

const getStatusBlockerLabel = (blockedCount: number) =>
  blockedCount === 1 ? "Blocked" : `${blockedCount} blocked`

const getSelectedStatusBlockedMessage = (
  statusLabel: string,
  blockedOrders: OrderExpeditionBlockingOrder[],
) => {
  const [order] = blockedOrders
  if (order) {
    return `${statusLabel} is blocked for 1 selected order: ${order.order_display_id} - ${order.reason}.`
  }

  return `${statusLabel} is blocked for ${blockedOrders.length} selected orders. Open the status menu for details.`
}

const updateOrderBusinessStatus = async ({
  orderId,
  status,
}: {
  orderId: string
  status: ManualOrderBusinessStatusId | null
}) =>
  await sdk.client.fetch(`/admin/orders/${orderId}/business-status`, {
    body: {
      status,
    },
    method: "POST",
  })

interface OrdersTableProps {
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

interface OrderExpeditionPaginationProps {
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

const getOrderExpeditionPaginationState = (
  data: OrdersResponse | undefined,
  offset: number,
) => {
  const count = data?.count ?? 0
  const canNextPage = data?.has_next ?? offset + PAGE_SIZE < count
  const countExact = data?.count_exact ?? true
  const pageIndex = Math.floor(offset / PAGE_SIZE)

  let pageCount: number
  if (countExact) {
    pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)
  } else {
    pageCount = pageIndex + 1
    if (canNextPage) {
      pageCount += 1
    }
  }

  return {
    canNextPage,
    carrierFilterLimitReached: data?.carrier_filter_limit_reached ?? false,
    count,
    countExact,
    pageCount,
    pageIndex,
    scannedCount: data?.scanned_count ?? null,
  }
}

const StatusBlockersTooltipContent = ({
  blockedOrders,
}: {
  blockedOrders: OrderExpeditionBlockingOrder[]
}) => {
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

const StatusSelectItem = ({ option }: { option: TargetStatusOption }) => {
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
    mutationFn: async (value: ManualStatusValue) =>
      await updateOrderBusinessStatus({
        orderId,
        status: value === "clear" ? null : value,
      }),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("toast.saveError"))
    },
    onSuccess: async () => {
      toast.success(t("toast.saveSuccess"))
      await queryClient.invalidateQueries({
        queryKey: [ORDER_EXPEDITION_QUERY_KEY],
      })
      await queryClient.invalidateQueries({
        queryKey: ["order-business-statuses-by-ids"],
      })
    },
  })

  return (
    <div className="flex items-center justify-end gap-2">
      <Select
        defaultValue={manualStatus ?? ""}
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

const OrdersTable = ({
  allPageOrdersSelected,
  intlLocale,
  isSelectionLimitReached,
  isLoading,
  onToggleOrder,
  onTogglePage,
  orders,
  selectedOrderIds,
  somePageOrdersSelected,
}: OrdersTableProps) => {
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

          {isLoading || orders.length > 0 ? null : (
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
                  onCheckedChange={() => {
                    onToggleOrder(order)
                  }}
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
                  {...(order.manual_status === undefined
                    ? {}
                    : { manualStatus: order.manual_status })}
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

const OrderExpeditionPagination = ({
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
}: OrderExpeditionPaginationProps) => {
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

interface OrderExpeditionToolbarProps {
  bulkManualStatus: ManualStatusValue | ""
  businessStatus: BusinessStatusSelectValue
  carrier: CarrierSelectValue
  carriers: OrderExpeditionCarrierOption[]
  handleBusinessStatusChange: (value: string) => void
  handleBusinessStatusUpdateRequest: () => void
  handleBulkManualStatusChange: (value: string) => void
  handleCarrierChange: (value: string) => void
  handlePrint: () => Promise<void>
  handleStatusUpdate: () => Promise<void>
  handleTargetStatusChange: (value: string) => void
  isPrinting: boolean
  isUpdatingBusinessStatus: boolean
  isUpdatingStatus: boolean
  selectedCount: number
  selectedStatusBlockedMessage: string | null
  selectedTargetStatusBlockers: OrderExpeditionBlockingOrder[]
  targetStatus: OrderExpeditionTargetStatus | ""
  targetStatusOptions: TargetStatusOption[]
  t: (key: string) => string
}

const OrderExpeditionToolbar = ({
  bulkManualStatus,
  businessStatus,
  carrier,
  carriers,
  handleBusinessStatusChange,
  handleBusinessStatusUpdateRequest,
  handleBulkManualStatusChange,
  handleCarrierChange,
  handlePrint,
  handleStatusUpdate,
  handleTargetStatusChange,
  isPrinting,
  isUpdatingBusinessStatus,
  isUpdatingStatus,
  selectedCount,
  selectedStatusBlockedMessage,
  selectedTargetStatusBlockers,
  targetStatus,
  targetStatusOptions,
  t,
}: OrderExpeditionToolbarProps) => (
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
              {carriers.map((option) => (
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
          onClick={() => {
            void handlePrint()
          }}
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
          <Select.Trigger className="w-[180px]" disabled={selectedCount === 0}>
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
          disabled={selectedCount === 0 || bulkManualStatus === ""}
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
          <Select.Trigger className="w-[144px]" disabled={selectedCount === 0}>
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
            targetStatus === "" ||
            selectedTargetStatusBlockers.length > 0
          }
          isLoading={isUpdatingStatus}
          onClick={() => {
            void handleStatusUpdate()
          }}
          size="small"
        >
          Apply Medusa status
        </Button>
      </div>
      {selectedStatusBlockedMessage === null ? null : (
        <Text className="max-w-full text-ui-fg-error" size="small">
          {selectedStatusBlockedMessage}
        </Text>
      )}
    </div>
  </div>
)

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
  const intlLocale = formatLocaleCode(i18n.resolvedLanguage ?? i18n.language)

  const { businessStatusesQuery, carriersQuery, orders, ordersQuery } =
    useOrderExpeditionQueries({ businessStatus, carrier, offset })
  const {
    allPageOrdersSelected,
    isSelectionLimitReached,
    selectedCount,
    selectedOrderIds,
    selectedOrderIdsList,
    selectedOrders,
    somePageOrdersSelected,
  } = useOrderExpeditionSelection(selectedOrdersById, orders)
  useClearBulkControlsWhenSelectionEmpty({
    bulkManualStatus,
    selectedCount,
    setBlockingOrders,
    setBulkManualStatus,
    setTargetStatus,
    targetStatus,
  })

  const targetStatusOptions = getTargetStatusOptions(selectedOrders)
  const selectedTargetStatusOption =
    targetStatus === ""
      ? undefined
      : targetStatusOptions.find((option) => option.value === targetStatus)
  const selectedTargetStatusBlockers =
    selectedTargetStatusOption?.blockedOrders ?? []
  const selectedStatusBlockedMessage =
    selectedTargetStatusOption === undefined ||
    selectedTargetStatusBlockers.length === 0
      ? null
      : getSelectedStatusBlockedMessage(
          selectedTargetStatusOption.label,
          selectedTargetStatusBlockers,
        )
  const bulkBusinessStatusTarget = getBulkBusinessStatusTarget(bulkManualStatus)
  const bulkBusinessStatusPreview =
    bulkBusinessStatusTarget === undefined
      ? { skipped: [], updatable: [] }
      : getBulkBusinessStatusPreview(
          selectedOrders,
          bulkBusinessStatusTarget,
          t,
        )
  const bulkBusinessStatusLabel =
    bulkBusinessStatusTarget === undefined
      ? ""
      : getManualStatusLabel(bulkBusinessStatusTarget, t)
  const pagination = getOrderExpeditionPaginationState(ordersQuery.data, offset)
  const { handleBusinessStatusChange, handleCarrierChange } =
    useOrderExpeditionFilterHandlers({
      setBlockingOrders,
      setBulkManualStatus,
      setBusinessStatus,
      setCarrier,
      setOffset,
      setSelectedOrdersById,
      setTargetStatus,
    })
  const { toggleOrder, togglePage } = useOrderExpeditionSelectionHandlers({
    allPageOrdersSelected,
    orders,
    selectedCount,
    selectedOrderIds,
    setBlockingOrders,
    setSelectedOrdersById,
  })
  const { handlePrint, handleStatusUpdate, handleTargetStatusChange } =
    useOrderExpeditionStatusHandlers({
      ordersQuery,
      selectedCount,
      selectedOrderIdsList,
      selectedTargetStatusBlockers,
      setBlockingOrders,
      setIsPrinting,
      setIsUpdatingStatus,
      setSelectedOrdersById,
      setTargetStatus,
      targetStatus,
      targetStatusOptions,
    })
  const {
    handleBulkManualStatusChange,
    handleBusinessStatusUpdateConfirm,
    handleBusinessStatusUpdateRequest,
  } = useOrderExpeditionBusinessStatusHandlers({
    bulkBusinessStatusPreview,
    bulkBusinessStatusTarget,
    businessStatusesQuery,
    ordersQuery,
    selectedOrderIdsList,
    setBlockingOrders,
    setBulkManualStatus,
    setIsBulkBusinessStatusPromptOpen,
    setIsUpdatingBusinessStatus,
    setSelectedOrdersById,
  })

  throwOrderExpeditionQueryErrors([
    carriersQuery.error,
    ordersQuery.error,
    businessStatusesQuery.error,
  ])

  return (
    <Container className="divide-y p-0">
      <BulkBusinessStatusPrompt
        bulkBusinessStatusLabel={bulkBusinessStatusLabel}
        bulkBusinessStatusPreview={bulkBusinessStatusPreview}
        isBulkBusinessStatusPromptOpen={isBulkBusinessStatusPromptOpen}
        isUpdatingBusinessStatus={isUpdatingBusinessStatus}
        onConfirm={() => {
          void handleBusinessStatusUpdateConfirm()
        }}
        onOpenChange={setIsBulkBusinessStatusPromptOpen}
      />

      <OrderExpeditionToolbar
        bulkManualStatus={bulkManualStatus}
        businessStatus={businessStatus}
        carrier={carrier}
        carriers={carriersQuery.data?.carriers ?? []}
        handleBusinessStatusChange={handleBusinessStatusChange}
        handleBusinessStatusUpdateRequest={handleBusinessStatusUpdateRequest}
        handleBulkManualStatusChange={handleBulkManualStatusChange}
        handleCarrierChange={handleCarrierChange}
        handlePrint={handlePrint}
        handleStatusUpdate={handleStatusUpdate}
        handleTargetStatusChange={handleTargetStatusChange}
        isPrinting={isPrinting}
        isUpdatingBusinessStatus={isUpdatingBusinessStatus}
        isUpdatingStatus={isUpdatingStatus}
        selectedCount={selectedCount}
        selectedStatusBlockedMessage={selectedStatusBlockedMessage}
        selectedTargetStatusBlockers={selectedTargetStatusBlockers}
        targetStatus={targetStatus}
        targetStatusOptions={targetStatusOptions}
        t={t}
      />
      {blockingOrders.length > 0 ? (
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
        nextPage={() => {
          setOffset((prev) => prev + PAGE_SIZE)
        }}
        pageCount={pagination.pageCount}
        pageIndex={pagination.pageIndex}
        pageSize={PAGE_SIZE}
        previousPage={() => {
          setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
        }}
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

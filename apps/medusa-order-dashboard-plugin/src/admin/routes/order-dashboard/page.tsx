import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  DataTable,
  Heading,
  Prompt,
  Select,
  StatusBadge,
  Tabs,
  Text,
  Tooltip,
  toast,
  useDataTable,
} from "@medusajs/ui"
import type {
  DataTableColumnDef,
  DataTableFilteringState,
  DataTablePaginationState,
  DataTableRowSelectionState,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { setOrderDashboardSidebarBadgeCount } from "../../sidebar-badge"
import {
  downloadOrderDashboardExpeditionPdf,
  downloadOrderDashboardPacketaLabels,
  getOrderDashboardSummary,
  listOrderDashboardOrders,
  listOrderDashboardPacketaEligibility,
  updateOrderDashboardManualStatus,
  updateOrderDashboardStatuses,
} from "./api"
import {
  formatLocaleCode,
  formatOrderDate,
  formatOrderTotal,
  formatPaymentMethodLabel,
  getCarrierLabel,
  getOrderDashboardTransitionBlockReason,
  isOrderDashboardBusinessStatusId,
  isOrderDashboardCarrierKey,
  isOrderDashboardTargetStatus,
} from "./format"
import { OrderFulfillmentModal } from "./fulfillment-modal"
import {
  getPacketaCarrierOrderIds,
  getPacketaLabelPreview,
  preparePacketaLabelDownload,
} from "./packeta-labels"
import {
  ORDER_DASHBOARD_BUSINESS_STATUS_IDS,
  ORDER_DASHBOARD_CARRIER_KEYS,
  ORDER_DASHBOARD_MANUAL_STATUS_IDS,
  ORDER_DASHBOARD_MAX_FULFILLMENT_IDS,
  ORDER_DASHBOARD_PAGE_SIZE,
  ORDER_DASHBOARD_QUEUE_IDS,
  ORDER_DASHBOARD_TARGET_STATUSES,
} from "./types"
import type {
  OrderDashboardBlockingOrder,
  OrderDashboardBusinessStatusGroupId,
  OrderDashboardBusinessStatusId,
  OrderDashboardLabelFormat,
  OrderDashboardManualStatusId,
  OrderDashboardOrder,
  OrderDashboardQueueId,
  OrderDashboardSummaryResponse,
  OrderDashboardTargetStatus,
} from "./types"

const ORDER_DASHBOARD_QUERY_KEY = "order-dashboard-orders"
const ORDER_DASHBOARD_SUMMARY_QUERY_KEY = "order-dashboard-summary"
const PACKETA_ELIGIBILITY_QUERY_KEY = "order-dashboard-packeta-eligibility"
const CARRIER_FILTER_ID = "carrier.value"
const BUSINESS_STATUS_GROUP_FILTER_ID = "business_status.group"
const BUSINESS_STATUS_FILTER_ID = "business_status.id"
const REQUEST_FAILED_KEY = "toast.requestFailed"
const NO_SELECTION_KEY = "toast.noSelection"

const columnHelper = createDataTableColumnHelper<OrderDashboardOrder>()
const filterHelper = createDataTableFilterHelper<OrderDashboardOrder>()

type ManualStatusValue = OrderDashboardManualStatusId | "clear"
type ManualStatusTarget = OrderDashboardManualStatusId | null
interface TargetStatusOption {
  blockedOrders: OrderDashboardBlockingOrder[]
  label: string
  value: OrderDashboardTargetStatus
}
type TranslationFunction = ReturnType<typeof useTranslation>["t"]
type StatusBadgeColor = "green" | "red" | "blue" | "orange" | "grey" | "purple"

const labelFormats: OrderDashboardLabelFormat[] = ["A6", "A7"]
const packetaLabelStartPositions = [1, 2, 3, 4] as const

type PacketaLabelStartPosition = (typeof packetaLabelStartPositions)[number]

const isOrderDashboardLabelFormat = (
  value: unknown,
): value is OrderDashboardLabelFormat => value === "A6" || value === "A7"

interface PendingPacketaLabelsDownload {
  labelFormat: OrderDashboardLabelFormat
  orderIds: string[]
}

const fulfillmentStatusColors = {
  canceled: "red",
  delivered: "green",
  fulfilled: "green",
  not_fulfilled: "red",
  partially_delivered: "orange",
  partially_fulfilled: "orange",
  partially_returned: "orange",
  partially_shipped: "orange",
  requires_action: "orange",
  returned: "green",
  shipped: "green",
} as const satisfies Record<string, StatusBadgeColor>

// This admin route coordinates table state, batch actions, modals, and detail panels.
const OrderDetailField = ({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) => (
  <div className="min-w-0">
    <Text className="text-ui-fg-muted" leading="compact" size="small">
      {label}
    </Text>
    <Text className="break-words" leading="compact" size="small" weight="plus">
      {children}
    </Text>
  </div>
)

const formatOptionLabel = (value: string) =>
  value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")

const getLanguage = (
  resolvedLanguage: string | undefined,
  language: string | undefined,
) => resolvedLanguage ?? language ?? "en"

const isKnownFulfillmentStatus = (
  status: string,
): status is keyof typeof fulfillmentStatusColors =>
  status in fulfillmentStatusColors

const getFulfillmentStatusDisplay = (
  order: OrderDashboardOrder,
  t: TranslationFunction,
) => {
  const status = order.fulfillment_status?.toLowerCase()

  if (status === undefined || status === "") {
    return {
      color: "grey" as const,
      label: order.has_active_fulfillment
        ? t("detail.activeFulfillment")
        : t("detail.noActiveFulfillment"),
    }
  }

  if (isKnownFulfillmentStatus(status)) {
    return {
      color: fulfillmentStatusColors[status],
      label: t(`fulfillmentStatus.${status}`),
    }
  }

  return {
    color: "grey" as const,
    label: formatOptionLabel(status),
  }
}

const getManualStatusTarget = (
  value: ManualStatusValue | "",
): ManualStatusTarget | undefined =>
  value === "clear" ? null : value || undefined

const getManualStatusLabel = (
  status: ManualStatusTarget,
  t: TranslationFunction,
) => (status === null ? t("manualStatus.clear") : t(`manualStatus.${status}`))

const getBulkManualStatusBlockReason = (
  order: OrderDashboardOrder,
  status: ManualStatusTarget,
  t: TranslationFunction,
) => {
  const currentManualStatus = order.manual_status ?? null

  if (currentManualStatus === status) {
    return status === null
      ? t("manualStatusBlocker.alreadyClear")
      : t("manualStatusBlocker.alreadyStatus", {
          status: getManualStatusLabel(status, t),
        })
  }

  if (status === null || status === "canceled") {
    return null
  }

  if (order.status === "canceled") {
    return t("manualStatusBlocker.canceledStayCanceled")
  }

  if (
    order.business_status.id === "delivered" ||
    order.business_status.id === "shipped"
  ) {
    return t("manualStatusBlocker.higherPriority", {
      status: t(order.business_status.translation_key),
    })
  }

  return null
}

const getBulkManualStatusPreview = (
  orders: OrderDashboardOrder[],
  status: ManualStatusTarget,
  t: TranslationFunction,
) => {
  const skipped: OrderDashboardBlockingOrder[] = []
  const updatable: OrderDashboardOrder[] = []

  for (const order of orders) {
    const reason = getBulkManualStatusBlockReason(order, status, t)

    if (reason !== null && reason !== undefined && reason !== "") {
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

const formatOrderDeliveryAddress = (address: string[]) =>
  address.filter(Boolean).join(", ") || "-"

const getCarrierFilter = (filtering: DataTableFilteringState) =>
  isOrderDashboardCarrierKey(filtering[CARRIER_FILTER_ID])
    ? filtering[CARRIER_FILTER_ID]
    : undefined

const getBusinessStatusFilter = (
  filtering: DataTableFilteringState,
): OrderDashboardBusinessStatusId | undefined => {
  const value = filtering[BUSINESS_STATUS_FILTER_ID]
  return isOrderDashboardBusinessStatusId(value) ? value : undefined
}

const isOrderDashboardBusinessStatusGroupId = (
  value: unknown,
): value is OrderDashboardBusinessStatusGroupId => value === "action_required"

const getBusinessStatusGroupFilter = (
  filtering: DataTableFilteringState,
): OrderDashboardBusinessStatusGroupId | undefined => {
  const value = filtering[BUSINESS_STATUS_GROUP_FILTER_ID]
  return isOrderDashboardBusinessStatusGroupId(value) ? value : undefined
}

const isManualStatus = (
  value: unknown,
): value is OrderDashboardManualStatusId =>
  value === "processing" ||
  value === "waiting_for_supplier" ||
  value === "canceled"

const isOrderDashboardQueueId = (
  value: unknown,
): value is OrderDashboardQueueId =>
  value === "all" ||
  value === "action_required" ||
  isOrderDashboardBusinessStatusId(value)

const omitBusinessStatusGroupFilter = (
  filtering: DataTableFilteringState,
): DataTableFilteringState =>
  Object.fromEntries(
    Object.entries(filtering).filter(
      ([filterId]) => filterId !== BUSINESS_STATUS_GROUP_FILTER_ID,
    ),
  )

const omitQueueFilters = (
  filtering: DataTableFilteringState,
): DataTableFilteringState =>
  Object.fromEntries(
    Object.entries(filtering).filter(
      ([filterId]) =>
        filterId !== BUSINESS_STATUS_FILTER_ID &&
        filterId !== BUSINESS_STATUS_GROUP_FILTER_ID,
    ),
  )

const normalizeFiltering = (filtering: DataTableFilteringState) =>
  filtering[BUSINESS_STATUS_FILTER_ID] === undefined
    ? filtering
    : omitBusinessStatusGroupFilter(filtering)

const getFilteringForQueue = (
  filtering: DataTableFilteringState,
  queueId: OrderDashboardQueueId,
) => {
  const remaining = omitQueueFilters(filtering)

  if (queueId === "all") {
    return remaining
  }

  return queueId === "action_required"
    ? { ...remaining, [BUSINESS_STATUS_GROUP_FILTER_ID]: queueId }
    : { ...remaining, [BUSINESS_STATUS_FILTER_ID]: queueId }
}

const getQueueCount = (
  queueId: OrderDashboardQueueId,
  summary?: OrderDashboardSummaryResponse,
) => {
  if (summary === undefined) {
    return null
  }

  if (queueId === "all") {
    return summary.total_count
  }

  if (queueId === "action_required") {
    return summary.action_required_count
  }

  return summary.status_counts[queueId]
}

const getQueueLabel = (
  queueId: OrderDashboardQueueId,
  t: TranslationFunction,
) => {
  if (queueId === "all" || queueId === "action_required") {
    return t(`queues.${queueId}`)
  }

  return t(`statuses.${queueId}`)
}

const getTargetStatusBlockedOrders = (
  selectedOrders: OrderDashboardOrder[],
  targetStatus: OrderDashboardTargetStatus,
  t: TranslationFunction,
): OrderDashboardBlockingOrder[] =>
  selectedOrders.flatMap((order) => {
    const reason = getOrderDashboardTransitionBlockReason(
      order,
      targetStatus,
      (key, values) => (values === undefined ? t(key) : t(key, values)),
    )

    return reason !== undefined && reason !== ""
      ? [
          {
            id: order.id,
            order_display_id: order.order_display_id,
            reason,
          },
        ]
      : []
  })

const getTargetStatusOptions = (
  selectedOrders: OrderDashboardOrder[],
  t: TranslationFunction,
): TargetStatusOption[] =>
  ORDER_DASHBOARD_TARGET_STATUSES.map((targetStatus) => ({
    blockedOrders: getTargetStatusBlockedOrders(
      selectedOrders,
      targetStatus,
      t,
    ),
    label: t(`targetStatus.${targetStatus}`),
    value: targetStatus,
  }))

const getSelectedStatusBlockedMessage = (
  statusLabel: string,
  blockedOrders: OrderDashboardBlockingOrder[],
  t: TranslationFunction,
) => {
  const [firstBlockedOrder] = blockedOrders

  if (blockedOrders.length === 1 && firstBlockedOrder !== undefined) {
    return t("targetStatusBlocker.selectedBlockedOne", {
      order: firstBlockedOrder.order_display_id,
      reason: firstBlockedOrder.reason,
      status: statusLabel,
    })
  }

  return t("targetStatusBlocker.selectedBlockedMany", {
    count: blockedOrders.length,
    status: statusLabel,
  })
}

const getFailureMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const getOptionalFailureMessage = (
  error: Error | null,
  fallback: string,
): string | null => (error === null ? null : getFailureMessage(error, fallback))

const ManualStatusControl = ({
  manualStatus,
  orderId,
}: {
  manualStatus?: OrderDashboardManualStatusId | null
  orderId: string
}) => {
  const { t } = useTranslation("orderDashboard")
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (value: ManualStatusValue) =>
      await updateOrderDashboardManualStatus({
        orderIds: [orderId],
        status: value === "clear" ? null : value,
      }),
    onError: (error) => {
      toast.error(getFailureMessage(error, t(REQUEST_FAILED_KEY)))
    },
    onSuccess: (result) => {
      if (result.count > 0) {
        toast.success(t("toast.businessStatusUpdated", { count: result.count }))
      } else {
        toast.error(result.skipped[0]?.reason ?? t("toast.manualStatusSkipped"))
      }

      void queryClient.invalidateQueries({
        queryKey: [ORDER_DASHBOARD_QUERY_KEY],
      })
      void queryClient.invalidateQueries({
        queryKey: [ORDER_DASHBOARD_SUMMARY_QUERY_KEY],
      })
    },
  })

  return (
    <Select
      disabled={mutation.isPending}
      onValueChange={(value) => {
        if (value === "clear" || isManualStatus(value)) {
          mutation.mutate(value)
        }
      }}
      value={manualStatus ?? "clear"}
    >
      <Select.Trigger className="w-[180px]">
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="clear">{t("manualStatus.none")}</Select.Item>
        {ORDER_DASHBOARD_MANUAL_STATUS_IDS.map((status) => (
          <Select.Item key={status} value={status}>
            {t(`manualStatus.${status}`)}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  )
}

const hasText = (value: string | null | undefined): value is string =>
  value !== undefined && value !== null && value !== ""

const getOrderItemKey = (item: OrderDashboardOrder["items"][number]) =>
  item.id ?? [item.title, item.sku, item.variant].filter(hasText).join("-")

const getVisibleRowSelection = (
  orders: OrderDashboardOrder[],
  selectedOrdersById: ReadonlyMap<string, OrderDashboardOrder>,
): DataTableRowSelectionState => {
  const rowSelection: DataTableRowSelectionState = {}

  for (const order of orders) {
    if (selectedOrdersById.has(order.id)) {
      rowSelection[order.id] = true
    }
  }

  return rowSelection
}

const getSelectedOrders = (
  selectedOrdersById: ReadonlyMap<string, OrderDashboardOrder>,
  visibleOrders: OrderDashboardOrder[],
): OrderDashboardOrder[] => {
  const visibleOrdersById = new Map(
    visibleOrders.map((order) => [order.id, order]),
  )

  return [...selectedOrdersById].map(
    ([orderId, selectedOrder]) =>
      visibleOrdersById.get(orderId) ?? selectedOrder,
  )
}

const OrderDashboardDetailPanel = ({
  onClose,
  order,
}: {
  onClose: () => void
  order: OrderDashboardOrder
}) => {
  const { i18n, t } = useTranslation("orderDashboard")
  const locale = formatLocaleCode(
    getLanguage(i18n.resolvedLanguage, i18n.language),
  )
  const manualStatusLabel = order.manual_status
    ? t(`manualStatus.${order.manual_status}`)
    : t("manualStatus.none")
  const fulfillmentStatus = getFulfillmentStatusDisplay(order, t)

  return (
    <div className="bg-ui-bg-subtle px-6 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Text leading="compact" size="small" weight="plus">
            {t("detail.title", { order: order.order_display_id })}
          </Text>
          <Text className="text-ui-fg-subtle" leading="compact" size="small">
            {order.customer}
            {order.email !== undefined &&
            order.email !== null &&
            order.email !== ""
              ? ` - ${order.email}`
              : ""}
          </Text>
        </div>
        <Button
          onClick={onClose}
          size="small"
          type="button"
          variant="secondary"
        >
          {t("actions.closeDetails")}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OrderDetailField label={t("detail.address")}>
          {formatOrderDeliveryAddress(order.delivery_address)}
        </OrderDetailField>
        <OrderDetailField label={t("detail.carrier")}>
          {getCarrierLabel(order)}
        </OrderDetailField>
        <OrderDetailField label={t("detail.payment")}>
          {order.payment_status ?? "-"} -{" "}
          {formatPaymentMethodLabel(order.payment_method)}
        </OrderDetailField>
        <OrderDetailField label={t("detail.total")}>
          {formatOrderTotal(order, locale)}
        </OrderDetailField>
        <OrderDetailField label={t("detail.orderStatus")}>
          {order.status ?? "-"}
        </OrderDetailField>
        <OrderDetailField label={t("detail.businessStatus")}>
          {t(order.business_status.translation_key)}
        </OrderDetailField>
        <OrderDetailField label={t("detail.manualStatus")}>
          {manualStatusLabel}
        </OrderDetailField>
        <OrderDetailField label={t("detail.fulfillment")}>
          {fulfillmentStatus.label}
        </OrderDetailField>
      </div>

      <div className="mt-4">
        <Text leading="compact" size="small" weight="plus">
          {t("detail.items")}
        </Text>
        <div className="mt-2 divide-y overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base">
          {order.items.length > 0 ? (
            order.items.map((item) => (
              <div
                className="grid gap-2 px-3 py-2 sm:grid-cols-[1fr_auto]"
                key={getOrderItemKey(item)}
              >
                <div className="min-w-0">
                  <Text leading="compact" size="small">
                    {item.title}
                  </Text>
                  {hasText(item.sku) || hasText(item.variant) ? (
                    <Text
                      className="text-ui-fg-subtle"
                      leading="compact"
                      size="small"
                    >
                      {[item.sku, item.variant].filter(Boolean).join(" - ")}
                    </Text>
                  ) : null}
                </div>
                <Text
                  className="text-ui-fg-subtle"
                  leading="compact"
                  size="small"
                >
                  {t("detail.quantity", { count: item.quantity })}
                </Text>
              </div>
            ))
          ) : (
            <Text className="px-3 py-2 text-ui-fg-subtle" size="small">
              {t("detail.noItems")}
            </Text>
          )}
        </div>
      </div>
    </div>
  )
}

const StatusBlockersTooltipContent = ({
  blockedOrders,
}: {
  blockedOrders: OrderDashboardBlockingOrder[]
}) => {
  const { t } = useTranslation("orderDashboard")
  const visibleOrders = blockedOrders.slice(0, 5)
  const hiddenCount = blockedOrders.length - visibleOrders.length

  return (
    <div className="flex flex-col gap-1">
      {visibleOrders.map((order) => (
        <Text key={`${order.id}-${order.reason}`} size="small">
          {order.order_display_id}: {order.reason}
        </Text>
      ))}
      {hiddenCount > 0 ? (
        <Text className="text-ui-fg-muted" size="small">
          {t("tableMessages.moreBlocked", { count: hiddenCount })}
        </Text>
      ) : null}
    </div>
  )
}

const StatusSelectItem = ({
  onBlockedAttempt,
  option,
}: {
  onBlockedAttempt: (blockedOrders: OrderDashboardBlockingOrder[]) => void
  option: TargetStatusOption
}) => {
  const { t } = useTranslation("orderDashboard")
  const blockedCount = option.blockedOrders.length
  const isBlocked = blockedCount > 0
  const item = (
    <Select.Item
      className={
        isBlocked
          ? "data-[disabled]:pointer-events-auto data-[disabled]:cursor-not-allowed data-[disabled]:text-ui-fg-disabled"
          : undefined
      }
      disabled={isBlocked}
      onClick={() => {
        if (isBlocked) {
          onBlockedAttempt(option.blockedOrders)
        }
      }}
      onPointerDown={(event) => {
        if (isBlocked) {
          event.preventDefault()
          onBlockedAttempt(option.blockedOrders)
        }
      }}
      value={option.value}
    >
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="truncate">{option.label}</span>
        {isBlocked ? (
          <span className="shrink-0 text-ui-fg-muted">
            {t("tableMessages.blockedCount", { count: blockedCount })}
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

const BlockingOrdersPanel = ({
  blockedOrders,
}: {
  blockedOrders: OrderDashboardBlockingOrder[]
}) => {
  const { t } = useTranslation("orderDashboard")
  const visibleOrders = blockedOrders.slice(0, 20)
  const hiddenCount = blockedOrders.length - visibleOrders.length

  return (
    <div className="flex flex-col gap-2 bg-ui-bg-subtle px-6 py-4">
      <Text
        className="text-ui-fg-error"
        leading="compact"
        size="small"
        weight="plus"
      >
        {t("table.blockedOrdersTitle")}
      </Text>
      <div className="flex flex-col gap-1">
        {visibleOrders.map((order) => (
          <Text
            key={`${order.id}-${order.reason}`}
            leading="compact"
            size="small"
          >
            {order.order_display_id}: {order.reason}
          </Text>
        ))}
        {hiddenCount > 0 ? (
          <Text className="text-ui-fg-muted" leading="compact" size="small">
            {t("tableMessages.moreBlocked", { count: hiddenCount })}
          </Text>
        ) : null}
      </div>
    </div>
  )
}

interface GetOrderDashboardColumnsOptions {
  locale: string | undefined
  onDetailOrderToggle: (
    updater: (currentOrderId: string | null) => string | null,
  ) => void
  t: TranslationFunction
}

const getOrderDashboardColumns = ({
  locale,
  onDetailOrderToggle,
  t,
}: GetOrderDashboardColumnsOptions): DataTableColumnDef<OrderDashboardOrder>[] => [
  columnHelper.select(),
  columnHelper.accessor("order_display_id", {
    cell: ({ row }) => (
      <Link
        className="txt-compact-small-plus text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
        to={`/orders/${row.original.id}`}
      >
        {row.original.order_display_id}
      </Link>
    ),
    header: t("columns.order"),
  }),
  columnHelper.accessor("created_at", {
    cell: ({ getValue }) => (
      <Text leading="compact" size="small">
        {formatOrderDate(getValue(), locale)}
      </Text>
    ),
    header: t("columns.created"),
  }),
  columnHelper.accessor("customer", {
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-y-1">
        <Text leading="compact" size="small" weight="plus">
          {row.original.customer}
        </Text>
        {row.original.email !== undefined &&
        row.original.email !== null &&
        row.original.email !== "" ? (
          <Text
            className="max-w-[220px] truncate text-ui-fg-subtle"
            leading="compact"
            size="small"
          >
            {row.original.email}
          </Text>
        ) : null}
      </div>
    ),
    header: t("columns.customer"),
  }),
  columnHelper.accessor("carrier.value", {
    cell: ({ row }) => (
      <Text leading="compact" size="small">
        {getCarrierLabel(row.original)}
      </Text>
    ),
    header: t("columns.carrier"),
  }),
  columnHelper.accessor("delivery_address", {
    cell: ({ row }) => {
      const address = formatOrderDeliveryAddress(row.original.delivery_address)

      return (
        <Text
          className="max-w-[240px] truncate text-ui-fg-subtle"
          leading="compact"
          size="small"
          title={address}
        >
          {address}
        </Text>
      )
    },
    header: t("columns.address"),
  }),
  columnHelper.accessor("business_status.id", {
    cell: ({ row }) => (
      <Badge color={row.original.business_status.tone} size="2xsmall">
        {t(row.original.business_status.translation_key)}
      </Badge>
    ),
    header: t("columns.businessStatus"),
  }),
  columnHelper.accessor("fulfillment_status", {
    cell: ({ row }) => {
      const fulfillmentStatus = getFulfillmentStatusDisplay(row.original, t)

      return (
        <StatusBadge className="text-nowrap" color={fulfillmentStatus.color}>
          {fulfillmentStatus.label}
        </StatusBadge>
      )
    },
    header: t("columns.fulfillment"),
  }),
  columnHelper.display({
    cell: ({ row }) => (
      <ManualStatusControl
        {...(row.original.manual_status === undefined
          ? {}
          : { manualStatus: row.original.manual_status })}
        orderId={row.original.id}
      />
    ),
    header: t("columns.manualStatus"),
    id: "manual_status",
  }),
  columnHelper.accessor("payment_status", {
    cell: ({ row }) => (
      <div className="flex flex-col gap-y-1">
        <Text leading="compact" size="small">
          {row.original.payment_status ?? "-"}
        </Text>
        <Text className="text-ui-fg-subtle" leading="compact" size="small">
          {formatPaymentMethodLabel(row.original.payment_method)}
        </Text>
      </div>
    ),
    header: t("columns.payment"),
  }),
  columnHelper.accessor("total", {
    align: "right",
    cell: ({ row }) => (
      <Text leading="compact" size="small" weight="plus">
        {formatOrderTotal(row.original, locale)}
      </Text>
    ),
    header: t("columns.total"),
  }),
  columnHelper.display({
    cell: ({ row }) => (
      <Button
        onClick={() => {
          onDetailOrderToggle((currentOrderId) =>
            currentOrderId === row.original.id ? null : row.original.id,
          )
        }}
        size="small"
        type="button"
        variant="transparent"
      >
        {t("actions.details")}
      </Button>
    ),
    header: t("columns.details"),
    id: "details",
  }),
]

const useOrderDashboardPage = () => {
  const { i18n, t } = useTranslation("orderDashboard")
  const queryClient = useQueryClient()
  const locale = formatLocaleCode(
    getLanguage(i18n.resolvedLanguage, i18n.language),
  )
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: ORDER_DASHBOARD_PAGE_SIZE,
  })
  const [filtering, setFiltering] = useState<DataTableFilteringState>({})
  const [selectedOrdersById, setSelectedOrdersById] = useState<
    Map<string, OrderDashboardOrder>
  >(() => new Map())
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({})
  const [targetStatus, setTargetStatus] = useState<
    OrderDashboardTargetStatus | ""
  >("")
  const [manualStatus, setManualStatus] = useState<ManualStatusValue | "">("")
  const [isManualStatusPromptOpen, setIsManualStatusPromptOpen] =
    useState(false)
  const [isFulfillmentModalOpen, setIsFulfillmentModalOpen] = useState(false)
  const [labelFormat, setLabelFormat] =
    useState<OrderDashboardLabelFormat>("A6")
  const [packetaLabelStartPosition, setPacketaLabelStartPosition] =
    useState<PacketaLabelStartPosition>(1)
  const [pendingPacketaLabelsDownload, setPendingPacketaLabelsDownload] =
    useState<PendingPacketaLabelsDownload | null>(null)
  const [
    isPacketaLabelPositionPromptOpen,
    setIsPacketaLabelPositionPromptOpen,
  ] = useState(false)
  const [isPreparingPacketaLabels, setIsPreparingPacketaLabels] =
    useState(false)
  const [blockingOrders, setBlockingOrders] = useState<
    OrderDashboardBlockingOrder[]
  >([])
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)

  const carrierFilter = getCarrierFilter(filtering)
  const businessStatusGroupFilter = getBusinessStatusGroupFilter(filtering)
  const businessStatusFilter = getBusinessStatusFilter(filtering)
  const limit = pagination.pageSize
  const offset = pagination.pageIndex * limit

  const ordersQuery = useQuery({
    queryFn: async () =>
      await listOrderDashboardOrders({
        ...(businessStatusGroupFilter === undefined
          ? {}
          : { businessStatusGroup: businessStatusGroupFilter }),
        ...(businessStatusFilter === undefined
          ? {}
          : { businessStatus: businessStatusFilter }),
        ...(carrierFilter === undefined ? {} : { carrier: carrierFilter }),
        limit,
        offset,
      }),
    queryKey: [
      ORDER_DASHBOARD_QUERY_KEY,
      carrierFilter,
      businessStatusGroupFilter,
      businessStatusFilter,
      limit,
      offset,
    ],
  })
  const summaryQuery = useQuery({
    queryFn: getOrderDashboardSummary,
    queryKey: [ORDER_DASHBOARD_SUMMARY_QUERY_KEY],
  })

  const orders = ordersQuery.data?.orders ?? []
  const selectedOrders = getSelectedOrders(selectedOrdersById, orders)
  const selectedOrderIds = [...selectedOrdersById.keys()]
  const rowSelection = getVisibleRowSelection(orders, selectedOrdersById)
  const selectedPacketaCarrierOrderIds =
    getPacketaCarrierOrderIds(selectedOrders)
  const packetaEligibilityQuery = useQuery({
    enabled: selectedPacketaCarrierOrderIds.length > 0,
    queryFn: async () =>
      await listOrderDashboardPacketaEligibility(
        selectedPacketaCarrierOrderIds,
      ),
    queryKey: [PACKETA_ELIGIBILITY_QUERY_KEY, selectedPacketaCarrierOrderIds],
  })
  const packetaLabelPreview = getPacketaLabelPreview(
    selectedOrders,
    packetaEligibilityQuery.data,
    t,
  )
  const selectedCount = selectedOrders.length
  const packetaEligibleCount = packetaLabelPreview.printableOrders.length
  const detailOrder =
    orders.find((order) => order.id === detailOrderId) ??
    (detailOrderId !== null && detailOrderId !== ""
      ? selectedOrdersById.get(detailOrderId)
      : undefined)
  const targetStatusOptions = getTargetStatusOptions(selectedOrders, t)
  const selectedTargetStatusOption = targetStatus
    ? targetStatusOptions.find((option) => option.value === targetStatus)
    : undefined
  const selectedTargetStatusBlockers =
    selectedTargetStatusOption?.blockedOrders ?? []
  const selectedStatusBlockedMessage =
    selectedTargetStatusOption !== undefined &&
    selectedTargetStatusBlockers.length > 0
      ? getSelectedStatusBlockedMessage(
          selectedTargetStatusOption.label,
          selectedTargetStatusBlockers,
          t,
        )
      : null
  const manualStatusTarget = getManualStatusTarget(manualStatus)
  const manualStatusPreview =
    manualStatusTarget === undefined
      ? { skipped: [], updatable: [] }
      : getBulkManualStatusPreview(selectedOrders, manualStatusTarget, t)
  const manualStatusLabel =
    manualStatusTarget === undefined
      ? ""
      : getManualStatusLabel(manualStatusTarget, t)
  const activeQueueId: OrderDashboardQueueId =
    businessStatusGroupFilter ?? businessStatusFilter ?? "all"
  const queueTabs = ORDER_DASHBOARD_QUEUE_IDS.map((queueId) => ({
    count: getQueueCount(queueId, summaryQuery.data),
    id: queueId,
    label: getQueueLabel(queueId, t),
  }))

  const filters = [
    filterHelper.accessor(CARRIER_FILTER_ID, {
      label: t("filters.carrier"),
      options: ORDER_DASHBOARD_CARRIER_KEYS.map((carrier) => ({
        label: carrier === "ppl" ? "PPL" : formatOptionLabel(carrier),
        value: carrier,
      })),
      type: "radio",
    }),
    filterHelper.accessor(BUSINESS_STATUS_FILTER_ID, {
      label: t("filters.businessStatus"),
      options: ORDER_DASHBOARD_BUSINESS_STATUS_IDS.map((status) => ({
        label: t(`statuses.${status}`),
        value: status,
      })),
      type: "radio",
    }),
  ]

  const columns = getOrderDashboardColumns({
    locale,
    onDetailOrderToggle: setDetailOrderId,
    t,
  })

  const clearSelection = () => {
    setSelectedOrdersById(new Map())
    setTargetStatus("")
    setManualStatus("")
    setIsManualStatusPromptOpen(false)
    setIsFulfillmentModalOpen(false)
  }

  const handleRowSelectionChange = (
    nextSelection:
      | DataTableRowSelectionState
      | ((
          currentSelection: DataTableRowSelectionState,
        ) => DataTableRowSelectionState),
  ) => {
    if (isPreparingPacketaLabels) {
      return
    }

    const resolvedSelection =
      typeof nextSelection === "function"
        ? nextSelection(rowSelection)
        : nextSelection

    const nextOrdersById = new Map(selectedOrdersById)

    for (const order of orders) {
      if (resolvedSelection[order.id] === true) {
        nextOrdersById.set(order.id, order)
      } else {
        nextOrdersById.delete(order.id)
      }
    }

    setSelectedOrdersById(nextOrdersById)
    setBlockingOrders([])

    if (nextOrdersById.size === 0) {
      setTargetStatus("")
      setManualStatus("")
      setIsManualStatusPromptOpen(false)
      setIsFulfillmentModalOpen(false)
    }
  }

  const table = useDataTable({
    columnVisibility: {
      onColumnVisibilityChange: setColumnVisibility,
      state: columnVisibility,
    },
    columns,
    data: orders,
    filtering: {
      onFilteringChange: (nextFiltering) => {
        setFiltering(normalizeFiltering(nextFiltering))
        setPagination((currentPagination) => ({
          ...currentPagination,
          pageIndex: 0,
        }))
        clearSelection()
        setBlockingOrders([])
      },
      state: filtering,
    },
    filters,
    getRowId: (order) => order.id,
    isLoading: ordersQuery.isLoading,
    pagination: {
      onPaginationChange: (nextPagination) => {
        setPagination(nextPagination)
        setBlockingOrders([])
      },
      state: pagination,
    },
    rowCount: ordersQuery.data?.count ?? 0,
    rowSelection: {
      onRowSelectionChange: handleRowSelectionChange,
      state: rowSelection,
    },
  })

  const refreshOrders = () => {
    void queryClient.invalidateQueries({
      queryKey: [ORDER_DASHBOARD_QUERY_KEY],
    })
    void queryClient.invalidateQueries({
      queryKey: [ORDER_DASHBOARD_SUMMARY_QUERY_KEY],
    })
  }

  const refreshFulfillmentData = () => {
    refreshOrders()
    void queryClient.invalidateQueries({
      queryKey: [PACKETA_ELIGIBILITY_QUERY_KEY],
      refetchType: "active",
    })
  }

  const handleFulfillmentCompleted = () => {
    refreshFulfillmentData()
    clearSelection()
    setBlockingOrders([])
    setDetailOrderId(null)
  }

  const invalidateOrders = () => {
    refreshOrders()
    clearSelection()
    setDetailOrderId(null)
  }

  const orderStatusMutation = useMutation({
    mutationFn: updateOrderDashboardStatuses,
    onError: (error) => {
      toast.error(getFailureMessage(error, t(REQUEST_FAILED_KEY)))
    },
    onSuccess: (result) => {
      toast.success(t("toast.statusUpdated", { count: result.count }))
      setTargetStatus("")
      setBlockingOrders([])
      invalidateOrders()
    },
  })

  const manualStatusMutation = useMutation({
    mutationFn: updateOrderDashboardManualStatus,
    onError: (error) => {
      toast.error(getFailureMessage(error, t(REQUEST_FAILED_KEY)))
    },
    onSuccess: (result) => {
      setBlockingOrders(result.skipped)
      if (result.count > 0) {
        toast.success(
          result.skipped_count
            ? t("toast.businessStatusUpdatedWithSkipped", {
                count: result.count,
                skippedCount: result.skipped_count,
              })
            : t("toast.businessStatusUpdated", { count: result.count }),
        )
      } else {
        toast.error(result.skipped[0]?.reason ?? t("toast.manualStatusSkipped"))
      }
      setManualStatus("")
      setIsManualStatusPromptOpen(false)
      invalidateOrders()
    },
  })

  const expeditionPdfMutation = useMutation({
    mutationFn: downloadOrderDashboardExpeditionPdf,
    onError: (error) => {
      toast.error(getFailureMessage(error, t(REQUEST_FAILED_KEY)))
    },
    onSuccess: () => {
      toast.success(t("toast.pdfReady"))
    },
  })

  const packetaLabelsMutation = useMutation({
    mutationFn: downloadOrderDashboardPacketaLabels,
    onError: (error) => {
      toast.error(getFailureMessage(error, t(REQUEST_FAILED_KEY)))
    },
    onSuccess: () => {
      toast.success(t("toast.packetaLabelsReady"))
    },
  })

  const handleOrderStatusApply = () => {
    if (selectedOrderIds.length === 0) {
      toast.error(t(NO_SELECTION_KEY))
      return
    }

    if (targetStatus === "") {
      toast.error(t("toast.missingOrderStatus"))
      return
    }

    if (selectedTargetStatusBlockers.length) {
      setBlockingOrders(selectedTargetStatusBlockers)
      toast.error(t("toast.blockedOrderStatus"))
      return
    }

    orderStatusMutation.mutate({
      orderIds: selectedOrderIds,
      targetStatus,
    })
  }

  const handleManualStatusApply = () => {
    if (selectedOrderIds.length === 0) {
      toast.error(t(NO_SELECTION_KEY))
      return
    }

    if (manualStatus === "") {
      toast.error(t("toast.missingBusinessStatus"))
      return
    }

    setBlockingOrders([])
    setIsManualStatusPromptOpen(true)
  }

  const handleManualStatusConfirm = () => {
    if (manualStatusTarget === undefined) {
      return
    }

    manualStatusMutation.mutate({
      orderIds: selectedOrderIds,
      status: manualStatusTarget,
    })
  }

  const handleExpeditionPdf = () => {
    if (selectedOrderIds.length === 0) {
      toast.error(t(NO_SELECTION_KEY))
      return
    }

    expeditionPdfMutation.mutate(selectedOrderIds)
  }

  const handlePacketaLabels = async () => {
    const selectedOrdersSnapshot = selectedOrders
    const selectedPacketaCarrierOrderIdsSnapshot = getPacketaCarrierOrderIds(
      selectedOrdersSnapshot,
    )
    const labelFormatSnapshot = labelFormat

    if (selectedOrdersSnapshot.length === 0) {
      toast.error(t(NO_SELECTION_KEY))
      return
    }

    if (selectedPacketaCarrierOrderIdsSnapshot.length === 0) {
      toast.error(t("toast.noPacketaSelection"))
      return
    }

    if (isPreparingPacketaLabels || packetaLabelsMutation.isPending) {
      return
    }

    setIsPreparingPacketaLabels(true)

    try {
      const eligibilityOrders = await listOrderDashboardPacketaEligibility(
        selectedPacketaCarrierOrderIdsSnapshot,
      )
      queryClient.setQueryData(
        [PACKETA_ELIGIBILITY_QUERY_KEY, selectedPacketaCarrierOrderIdsSnapshot],
        eligibilityOrders,
      )
      const packetaLabelPreparation = preparePacketaLabelDownload(
        selectedOrdersSnapshot,
        eligibilityOrders,
        t,
      )

      setBlockingOrders(packetaLabelPreparation.blockingOrders)

      if (packetaLabelPreparation.kind === "no-printable") {
        toast.error(t("toast.noPacketaSelection"))
        return
      }

      if (packetaLabelPreparation.kind === "too-many") {
        toast.error(
          t("toast.packetaLabelLimit", {
            count: packetaLabelPreparation.limit,
          }),
        )
        return
      }

      setPendingPacketaLabelsDownload({
        labelFormat: labelFormatSnapshot,
        orderIds: packetaLabelPreparation.orderIds,
      })
      setIsPacketaLabelPositionPromptOpen(true)
    } catch (error) {
      toast.error(getFailureMessage(error, t(REQUEST_FAILED_KEY)))
    } finally {
      setIsPreparingPacketaLabels(false)
    }
  }

  const handlePacketaLabelPositionConfirm = () => {
    if (pendingPacketaLabelsDownload === null) {
      return
    }

    packetaLabelsMutation.mutate({
      ...pendingPacketaLabelsDownload,
      labelOffset: packetaLabelStartPosition - 1,
    })
    setIsPacketaLabelPositionPromptOpen(false)
    setPendingPacketaLabelsDownload(null)
  }

  const handleFulfillmentOpen = () => {
    if (selectedOrderIds.length === 0) {
      toast.error(t(NO_SELECTION_KEY))
      return
    }

    if (selectedOrderIds.length > ORDER_DASHBOARD_MAX_FULFILLMENT_IDS) {
      toast.error(
        t("toast.fulfillmentLimit", {
          count: ORDER_DASHBOARD_MAX_FULFILLMENT_IDS,
        }),
      )
      return
    }

    setBlockingOrders([])
    setIsFulfillmentModalOpen(true)
  }

  const handleQueueChange = (value: string) => {
    if (!isOrderDashboardQueueId(value)) {
      return
    }

    setFiltering((currentFiltering) =>
      getFilteringForQueue(currentFiltering, value),
    )
    setPagination((currentPagination) => ({
      ...currentPagination,
      pageIndex: 0,
    }))
    clearSelection()
    setBlockingOrders([])
  }

  const errorMessage = getOptionalFailureMessage(
    ordersQuery.error,
    t(REQUEST_FAILED_KEY),
  )
  const pendingUnpaidCount = summaryQuery.data?.pending_unpaid_count ?? 0

  useEffect(() => {
    setOrderDashboardSidebarBadgeCount(
      summaryQuery.isLoading ? null : pendingUnpaidCount,
    )
  }, [pendingUnpaidCount, summaryQuery.isLoading])

  const renderDashboardDialogs = () => (
    <>
      <Prompt
        onOpenChange={setIsManualStatusPromptOpen}
        open={isManualStatusPromptOpen}
        variant="confirmation"
      >
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>{t("manualStatusPrompt.title")}</Prompt.Title>
            <Prompt.Description>
              {t("manualStatusPrompt.description")}
            </Prompt.Description>
          </Prompt.Header>
          <div className="flex flex-col gap-3 px-6 py-4">
            <Text leading="compact" size="small">
              {t("manualStatusPrompt.target", {
                status: manualStatusLabel,
              })}
            </Text>
            <Text leading="compact" size="small">
              {t("manualStatusPrompt.willChange", {
                skippedCount: manualStatusPreview.skipped.length,
                updatedCount: manualStatusPreview.updatable.length,
              })}
            </Text>
            {manualStatusPreview.updatable.length ? (
              <div className="flex max-h-[160px] flex-col gap-1 overflow-auto rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
                {manualStatusPreview.updatable.slice(0, 10).map((order) => (
                  <Text key={order.id} leading="compact" size="small">
                    {t("manualStatusPrompt.updated", {
                      order: order.order_display_id,
                      status: manualStatusLabel,
                    })}
                  </Text>
                ))}
                {manualStatusPreview.updatable.length > 10 ? (
                  <Text
                    className="text-ui-fg-muted"
                    leading="compact"
                    size="small"
                  >
                    {t("manualStatusPrompt.updatedMore", {
                      count: manualStatusPreview.updatable.length - 10,
                    })}
                  </Text>
                ) : null}
              </div>
            ) : null}
            {manualStatusPreview.skipped.length ? (
              <div className="flex max-h-[160px] flex-col gap-1 overflow-auto rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
                {manualStatusPreview.skipped.slice(0, 10).map((order) => (
                  <Text
                    key={`${order.id}-${order.reason}`}
                    leading="compact"
                    size="small"
                  >
                    {t("manualStatusPrompt.skipped", {
                      order: order.order_display_id,
                      reason: order.reason,
                    })}
                  </Text>
                ))}
                {manualStatusPreview.skipped.length > 10 ? (
                  <Text
                    className="text-ui-fg-muted"
                    leading="compact"
                    size="small"
                  >
                    {t("manualStatusPrompt.skippedMore", {
                      count: manualStatusPreview.skipped.length - 10,
                    })}
                  </Text>
                ) : null}
              </div>
            ) : null}
          </div>
          <Prompt.Footer>
            <Prompt.Cancel>{t("actions.cancel")}</Prompt.Cancel>
            <Prompt.Action
              disabled={
                !selectedOrderIds.length || manualStatusMutation.isPending
              }
              onClick={handleManualStatusConfirm}
            >
              {t("actions.apply")}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>

      <Prompt
        onOpenChange={(open) => {
          setIsPacketaLabelPositionPromptOpen(open)
          if (!open) {
            setPendingPacketaLabelsDownload(null)
          }
        }}
        open={isPacketaLabelPositionPromptOpen}
        variant="confirmation"
      >
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>{t("packetaLabelPositionPrompt.title")}</Prompt.Title>
            <Prompt.Description>
              {t("packetaLabelPositionPrompt.description")}
            </Prompt.Description>
          </Prompt.Header>
          <div className="flex flex-col gap-3 px-6 py-4">
            <Text className="text-ui-fg-subtle" leading="compact" size="small">
              {t("packetaLabelPositionPrompt.selected", {
                count: pendingPacketaLabelsDownload?.orderIds.length ?? 0,
              })}
            </Text>
            <div className="flex justify-center">
              <div className="grid grid-cols-2 gap-2">
                {packetaLabelStartPositions.map((position) => {
                  const isSelected = position === packetaLabelStartPosition

                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`flex h-28 w-24 items-center justify-center border text-ui-fg-base transition-colors hover:bg-ui-bg-base-hover focus-visible:shadow-borders-focus focus-visible:outline-none ${
                        isSelected
                          ? "border-ui-border-base bg-ui-bg-highlight shadow-borders-focus"
                          : "border-ui-border-base bg-ui-bg-base"
                      }`}
                      key={position}
                      onClick={() => {
                        setPacketaLabelStartPosition(position)
                      }}
                      type="button"
                    >
                      <Text size="large" weight="plus">
                        {position}
                      </Text>
                      <span className="sr-only">
                        {t("packetaLabelPositionPrompt.position", { position })}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <Prompt.Footer>
            <Prompt.Cancel>{t("actions.cancel")}</Prompt.Cancel>
            <Prompt.Action
              disabled={
                !pendingPacketaLabelsDownload || packetaLabelsMutation.isPending
              }
              onClick={handlePacketaLabelPositionConfirm}
            >
              {t("packetaLabelPositionPrompt.print")}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>

      <OrderFulfillmentModal
        onCompleted={handleFulfillmentCompleted}
        onOpenChange={setIsFulfillmentModalOpen}
        onOrdersChanged={refreshFulfillmentData}
        open={isFulfillmentModalOpen}
        selectedOrderIds={selectedOrderIds}
        selectedOrders={selectedOrders}
      />
    </>
  )

  const renderDashboardContent = () => (
    <>
      <div className="px-6 py-4">
        <Heading level="h1">{t("title")}</Heading>
      </div>

      <div className="overflow-x-auto px-6 py-3">
        <Tabs onValueChange={handleQueueChange} value={activeQueueId}>
          <Tabs.List className="min-w-max flex-nowrap gap-1">
            {queueTabs.map((queue) => (
              <Tabs.Trigger
                className="shrink-0 gap-1.5"
                key={queue.id}
                value={queue.id}
              >
                {queue.label}
                {queue.count === null ? null : (
                  <Badge size="2xsmall">{queue.count}</Badge>
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
      </div>

      <div className="bg-ui-bg-subtle px-6 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <Text leading="compact" size="small" weight="plus">
                {t("actions.selected", { count: selectedCount })}
              </Text>
              {selectedCount ? (
                <Text
                  className="text-ui-fg-subtle"
                  leading="compact"
                  size="small"
                >
                  {t("actions.packetaEligible", {
                    count: packetaEligibleCount,
                    selectedCount,
                  })}
                </Text>
              ) : null}
            </div>
            <Button
              disabled={selectedCount === 0 || expeditionPdfMutation.isPending}
              isLoading={expeditionPdfMutation.isPending}
              onClick={handleExpeditionPdf}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.expeditionPdf")}
            </Button>
            <Select
              onValueChange={(value) => {
                if (isOrderDashboardLabelFormat(value)) {
                  setLabelFormat(value)
                }
              }}
              value={labelFormat}
            >
              <Select.Trigger
                className="w-[84px]"
                disabled={
                  isPreparingPacketaLabels || packetaLabelsMutation.isPending
                }
              >
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {labelFormats.map((format) => (
                  <Select.Item key={format} value={format}>
                    {t(`labelFormats.${format.toLowerCase()}`)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <Button
              disabled={
                selectedCount === 0 ||
                isPreparingPacketaLabels ||
                packetaLabelsMutation.isPending
              }
              isLoading={
                isPreparingPacketaLabels || packetaLabelsMutation.isPending
              }
              onClick={() => {
                void handlePacketaLabels()
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.packetaLabels")}
            </Button>
            <Button
              disabled={selectedCount === 0}
              onClick={handleFulfillmentOpen}
              size="small"
              type="button"
              variant="secondary"
            >
              <Buildings />
              {t("actions.fulfillItems")}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              onValueChange={(value) => {
                if (!isOrderDashboardTargetStatus(value)) {
                  return
                }

                const option = targetStatusOptions.find(
                  (status) => status.value === value,
                )

                if (option !== undefined && option.blockedOrders.length > 0) {
                  setTargetStatus("")
                  setBlockingOrders(option.blockedOrders)
                  return
                }

                setTargetStatus(value)
                setBlockingOrders([])
              }}
              value={targetStatus}
            >
              <Select.Trigger
                className="w-[180px]"
                disabled={selectedCount === 0}
              >
                <Select.Value
                  placeholder={t("actions.targetStatusPlaceholder")}
                />
              </Select.Trigger>
              <Select.Content>
                {targetStatusOptions.map((status) => (
                  <StatusSelectItem
                    key={status.value}
                    onBlockedAttempt={setBlockingOrders}
                    option={status}
                  />
                ))}
              </Select.Content>
            </Select>
            <Button
              disabled={
                selectedCount === 0 ||
                targetStatus === "" ||
                selectedTargetStatusBlockers.length > 0 ||
                orderStatusMutation.isPending
              }
              isLoading={orderStatusMutation.isPending}
              onClick={handleOrderStatusApply}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.apply")}
            </Button>

            <Select
              onValueChange={(value) => {
                if (value === "clear" || isManualStatus(value)) {
                  setManualStatus(value)
                  setBlockingOrders([])
                }
              }}
              value={manualStatus}
            >
              <Select.Trigger className="w-[200px]">
                <Select.Value
                  placeholder={t("actions.businessStatusPlaceholder")}
                />
              </Select.Trigger>
              <Select.Content>
                {ORDER_DASHBOARD_MANUAL_STATUS_IDS.map((status) => (
                  <Select.Item key={status} value={status}>
                    {t(`manualStatus.${status}`)}
                  </Select.Item>
                ))}
                <Select.Item value="clear">
                  {t("manualStatus.clear")}
                </Select.Item>
              </Select.Content>
            </Select>
            <Button
              disabled={selectedCount === 0 || manualStatusMutation.isPending}
              isLoading={manualStatusMutation.isPending}
              onClick={handleManualStatusApply}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.applyManualStatus")}
            </Button>
          </div>
        </div>
        {selectedStatusBlockedMessage !== null &&
        selectedStatusBlockedMessage !== "" ? (
          <Text className="text-ui-fg-error" leading="compact" size="small">
            {selectedStatusBlockedMessage}
          </Text>
        ) : null}
      </div>

      {blockingOrders.length > 0 ? (
        <BlockingOrdersPanel blockedOrders={blockingOrders} />
      ) : null}

      {detailOrder === undefined ? null : (
        <OrderDashboardDetailPanel
          onClose={() => {
            setDetailOrderId(null)
          }}
          order={detailOrder}
        />
      )}

      {ordersQuery.data?.carrier_filter_limit_reached === true ? (
        <div className="bg-ui-bg-subtle px-6 py-2">
          <Text className="text-ui-fg-warning" leading="compact" size="small">
            {t("table.carrierFilterLimit", {
              count: ordersQuery.data.scanned_count ?? 0,
            })}
          </Text>
        </div>
      ) : null}

      {errorMessage === null || errorMessage === "" ? (
        <DataTable instance={table}>
          <DataTable.FilterBar alwaysShow>
            <DataTable.ColumnVisibilityMenu tooltip={t("columns.order")} />
          </DataTable.FilterBar>
          <DataTable.Table
            emptyState={{
              empty: {
                heading: t("table.empty"),
              },
              filtered: {
                heading: t("table.empty"),
              },
            }}
          />
          <DataTable.Pagination />
        </DataTable>
      ) : (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error" leading="compact" size="small">
            {errorMessage}
          </Text>
        </div>
      )}
    </>
  )

  const renderDashboard = () => (
    <Container className="divide-y p-0">
      {renderDashboardDialogs()}
      {renderDashboardContent()}
    </Container>
  )

  return renderDashboard()
}

const OrderDashboardPageContent = useOrderDashboardPage
const orderDashboardPage = () => <OrderDashboardPageContent />

export const config = defineRouteConfig({
  label: "menuItem",
  nested: "/orders",
  rank: 10,
  translationNs: "orderDashboard",
})

export default orderDashboardPage

import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Buildings,
  DocumentText,
  Eye,
  OpenRectArrowOut,
  Spinner,
  UserGroup,
  XCircle,
} from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  createDataTableColumnHelper,
  DataTable,
  type DataTableDateComparisonOperator,
  type DataTableFilteringState,
  type DataTablePaginationState,
  type DataTableRowSelectionState,
  type DataTableSortingState,
  FocusModal,
  Heading,
  IconBadge,
  IconButton,
  Input,
  Prompt,
  Select,
  StatusBadge,
  Tabs,
  Text,
  Tooltip,
  toast,
  type UseDataTableReturn,
  useDataTable,
} from "@medusajs/ui"
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router-dom"
import { setOrderDashboardSidebarBadgeCount } from "../../sidebar-badge"
import {
  downloadOrderDashboardExpeditionPdf,
  downloadOrderDashboardShippingLabels,
  getOrderDashboardBusinessStatusCatalog,
  getOrderDashboardCarriers,
  getOrderDashboardSummary,
  listOrderDashboardLabelEligibility,
  listOrderDashboardOrders,
  updateOrderDashboardManualStatus,
  updateOrderDashboardStatuses,
} from "./api"
import { OrderDashboardCreatedAtFilter } from "./created-at-filter"
import {
  formatLocaleCode,
  formatOrderDate,
  formatOrderStatusLabel,
  formatOrderTotal,
  formatPaymentMethodLabel,
  formatPaymentStatusLabel,
  getCarrierLabel,
  getOrderDashboardTransitionBlockReason,
  isOrderDashboardBusinessStatusId,
  isOrderDashboardCarrierKey,
  isOrderDashboardTargetStatus,
} from "./format"
import { OrderFulfillmentModal } from "./fulfillment-modal"
import {
  DEFAULT_ORDER_DASHBOARD_SORTING,
  getOrderDashboardOrdersQuery,
  getOrderDashboardQueueId,
  isOrderDashboardQueueId,
  ORDER_DASHBOARD_QUERY_KEY,
} from "./order-query"
import { OrderPdfExportPrompt } from "./pdf-export-prompt"
import {
  getShippingLabelCarrierSelection,
  prepareShippingLabelDownload,
  type ShippingLabelPreparation,
} from "./shipping-labels"
import {
  ORDER_DASHBOARD_MAX_FULFILLMENT_IDS,
  ORDER_DASHBOARD_PAGE_SIZE,
  ORDER_DASHBOARD_PENDING_UNPAID_QUEUE_ID,
  ORDER_DASHBOARD_QUEUE_IDS,
  ORDER_DASHBOARD_TARGET_STATUSES,
  type OrderDashboardBlockingOrder,
  type OrderDashboardBusinessStatus,
  type OrderDashboardCarrierKey,
  type OrderDashboardLabelFormat,
  type OrderDashboardManualStatusId,
  type OrderDashboardOrder,
  type OrderDashboardPdfExportMode,
  type OrderDashboardQueueId,
  type OrderDashboardSummaryResponse,
  type OrderDashboardTargetStatus,
} from "./types"

const ORDER_DASHBOARD_SUMMARY_QUERY_KEY = "order-dashboard-summary"
const ORDER_DASHBOARD_STATUS_CATALOG_QUERY_KEY =
  "order-dashboard-status-catalog"
const ORDER_DASHBOARD_CARRIERS_QUERY_KEY = "order-dashboard-carriers"
const LABEL_ELIGIBILITY_QUERY_KEY = "order-dashboard-label-eligibility"
const ORDER_DASHBOARD_SEARCH_DEBOUNCE_MS = 300
const columnHelper = createDataTableColumnHelper<OrderDashboardOrder>()

type OrderDashboardFilteringState = DataTableFilteringState<{
  created_at?: DataTableDateComparisonOperator | null
}>

type ManualStatusValue = OrderDashboardManualStatusId | "clear"
type ManualStatusTarget = OrderDashboardManualStatusId | null
type TargetStatusOption = {
  blockedOrders: OrderDashboardBlockingOrder[]
  label: string
  value: OrderDashboardTargetStatus
}
type TranslationFunction = (
  key: string,
  options?: Record<string, unknown>
) => string
type BadgeColor = "green" | "red" | "blue" | "orange" | "grey" | "purple"

const labelFormats: OrderDashboardLabelFormat[] = ["A6", "A7"]
const packetaLabelStartPositions = [1, 2, 3, 4] as const
const emptyBusinessStatusCatalog: OrderDashboardBusinessStatus[] = []
const emptyOrders: OrderDashboardOrder[] = []

type PacketaLabelStartPosition = (typeof packetaLabelStartPositions)[number]
type PendingPacketaLabelsDownload = {
  carrier: "packeta"
  labelFormat: OrderDashboardLabelFormat
  orderIds: string[]
}

type OrderDashboardTableBodyProps = {
  columnVisibility: Record<string, boolean>
  columns: readonly unknown[]
  data: OrderDashboardOrder[]
  emptyHeading: string
  instance: UseDataTableReturn<OrderDashboardOrder>
  isLoading: boolean
  pageIndex: number
  rowSelection: DataTableRowSelectionState
  sorting: DataTableSortingState
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
} as const satisfies Record<string, BadgeColor>

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This admin route coordinates table state, batch actions, and modals.
const OrderDashboardPage = () => {
  const { i18n, t } = useTranslation("orderDashboard")
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const locale = formatLocaleCode(i18n.resolvedLanguage ?? i18n.language)
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: ORDER_DASHBOARD_PAGE_SIZE,
  })
  const [carrierFilter, setCarrierFilter] = useState<
    OrderDashboardCarrierKey | "all"
  >("all")
  const [filtering, setFiltering] = useState<OrderDashboardFilteringState>({})
  const [search, setSearch] = useState("")
  const activeQueueId = getOrderDashboardQueueId(searchParams.get("queue"))
  const previousActiveQueueIdRef = useRef(activeQueueId)
  const [sorting, setSorting] = useState<DataTableSortingState>(
    DEFAULT_ORDER_DASHBOARD_SORTING
  )
  const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>(
    {}
  )
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
  const [isPdfExportPromptOpen, setIsPdfExportPromptOpen] = useState(false)
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
  const [isPreparingShippingLabels, setIsPreparingShippingLabels] =
    useState(false)
  const [blockingOrders, setBlockingOrders] = useState<
    OrderDashboardBlockingOrder[]
  >([])
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)

  const createdAtFilter = filtering.created_at ?? undefined
  const orderQuery = getOrderDashboardOrdersQuery({
    carrierFilter,
    createdAt: createdAtFilter,
    pagination,
    queueId: activeQueueId,
    search,
    sorting,
  })
  const limit = orderQuery.request.limit

  const ordersQuery = useQuery({
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      listOrderDashboardOrders(orderQuery.request, signal),
    queryKey: orderQuery.queryKey,
  })
  const summaryQuery = useQuery({
    queryFn: getOrderDashboardSummary,
    queryKey: [ORDER_DASHBOARD_SUMMARY_QUERY_KEY],
  })
  const carriersQuery = useQuery({
    queryFn: getOrderDashboardCarriers,
    queryKey: [ORDER_DASHBOARD_CARRIERS_QUERY_KEY],
  })
  const businessStatusCatalogQuery = useQuery({
    queryFn: getOrderDashboardBusinessStatusCatalog,
    queryKey: [ORDER_DASHBOARD_STATUS_CATALOG_QUERY_KEY],
  })

  const orders = ordersQuery.data?.orders ?? emptyOrders
  const businessStatusCatalog =
    businessStatusCatalogQuery.data?.statuses ?? emptyBusinessStatusCatalog
  const availableCarrierKeys = useMemo(
    () => carriersQuery.data?.carriers.map((carrier) => carrier.value) ?? [],
    [carriersQuery.data?.carriers]
  )
  const orderCount = ordersQuery.data?.count ?? 0
  const orderPageCount = Math.max(Math.ceil(orderCount / limit), 1)
  const selectedOrders = useMemo(
    () => Array.from(selectedOrdersById.values()),
    [selectedOrdersById]
  )
  const selectedOrderIds = useMemo(
    () => Array.from(selectedOrdersById.keys()),
    [selectedOrdersById]
  )
  const selectedOrderIdSet = useMemo(
    () => new Set(selectedOrderIds),
    [selectedOrderIds]
  )
  const selectedCount = selectedOrders.length
  const shippingLabelCarrierSelection = getShippingLabelCarrierSelection(
    selectedOrders,
    availableCarrierKeys
  )
  const detailOrder = orders.find((order) => order.id === detailOrderId)
  const targetStatusOptions = getTargetStatusOptions(selectedOrders, t)
  const selectedTargetStatusOption = targetStatus
    ? targetStatusOptions.find((option) => option.value === targetStatus)
    : undefined
  const selectedTargetStatusBlockers =
    selectedTargetStatusOption?.blockedOrders ?? []
  const selectedStatusBlockedMessage =
    selectedTargetStatusOption && selectedTargetStatusBlockers.length > 0
      ? getSelectedStatusBlockedMessage(
          selectedTargetStatusOption.label,
          selectedTargetStatusBlockers,
          t
        )
      : null
  const manualStatusTarget = getManualStatusTarget(manualStatus)
  const manualStatusPreview =
    manualStatusTarget === undefined
      ? { changedCount: 0, unchangedCount: 0 }
      : getBulkManualStatusPreview(selectedOrders, manualStatusTarget)
  const manualStatusLabel =
    manualStatusTarget === undefined
      ? ""
      : getManualStatusLabel(manualStatusTarget, t)
  const queueTabs = ORDER_DASHBOARD_QUEUE_IDS.map((queueId) => ({
    count: getQueueCount(queueId, summaryQuery.data),
    id: queueId,
    label: getQueueLabel(queueId, t),
  }))

  const sortableColumnLabels = useMemo(
    () => ({
      sortAscLabel: t("sorting.ascending"),
      sortDescLabel: t("sorting.descending"),
    }),
    [t]
  )

  const rowManualStatusMutation = useMutation({
    mutationFn: updateOrderDashboardManualStatus,
    onError: () => {
      toast.error(t("toast.requestFailed"))
    },
    onSuccess: (result) => {
      toast.success(
        t("toast.businessStatusProcessed", {
          changedCount: result.changed_count,
          processedCount: result.processed_count,
          unchangedCount: result.unchanged_count,
        })
      )

      queryClient.invalidateQueries({ queryKey: [ORDER_DASHBOARD_QUERY_KEY] })
      queryClient.invalidateQueries({
        queryKey: [ORDER_DASHBOARD_SUMMARY_QUERY_KEY],
      })
    },
  })
  const updateRowManualStatus = rowManualStatusMutation.mutate
  const handleRowManualStatusChange = useCallback(
    (orderId: string, value: ManualStatusValue) => {
      updateRowManualStatus({
        orderIds: [orderId],
        status: value === "clear" ? null : value,
      })
    },
    [updateRowManualStatus]
  )
  const pendingManualStatusOrderId = rowManualStatusMutation.isPending
    ? rowManualStatusMutation.variables?.orderIds[0]
    : undefined

  const columns = useMemo(
    () => [
      columnHelper.select(),
      columnHelper.accessor("order_display_id", {
        cell: ({ row }) => (
          <Link
            className="txt-compact-small-plus text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
            onClick={(event) => event.stopPropagation()}
            to={`/orders/${row.original.id}`}
          >
            {row.original.order_display_id}
          </Link>
        ),
        enableSorting: true,
        header: t("columns.order"),
        sortLabel: t("columns.order"),
        ...sortableColumnLabels,
      }),
      columnHelper.accessor("created_at", {
        cell: ({ getValue }) => (
          <Text leading="compact" size="small">
            {formatOrderDate(getValue(), locale)}
          </Text>
        ),
        enableSorting: true,
        header: t("columns.created"),
        sortLabel: t("columns.created"),
        ...sortableColumnLabels,
      }),
      columnHelper.accessor("customer", {
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <Text as="span" leading="compact" size="small" weight="plus">
              {row.original.customer}
            </Text>
            {row.original.email ? (
              <Text
                as="span"
                className="text-ui-fg-subtle"
                leading="compact"
                size="small"
              >
                {row.original.email}
              </Text>
            ) : null}
          </div>
        ),
        enableSorting: true,
        header: t("columns.customer"),
        maxSize: 240,
        minSize: 200,
        size: 220,
        sortLabel: t("columns.customer"),
        ...sortableColumnLabels,
      }),
      columnHelper.display({
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {row.original.note ? (
              <OrderAlertIcon
                color="grey"
                content={row.original.note}
                label={t("signals.customerNote")}
              >
                <DocumentText />
              </OrderAlertIcon>
            ) : null}
            {row.original.signals.returning_customer ? (
              <OrderAlertIcon
                color="blue"
                label={t("signals.returningCustomer")}
              >
                <UserGroup />
              </OrderAlertIcon>
            ) : null}
            {row.original.signals.storn_orders ? (
              <OrderAlertIcon
                color="red"
                label={t("signals.previousCancellation")}
              >
                <XCircle />
              </OrderAlertIcon>
            ) : null}
            {row.original.signals.wholesale_company_name ? (
              <OrderAlertIcon
                color="purple"
                content={t("signals.wholesaleCustomerCompany", {
                  company: row.original.signals.wholesale_company_name,
                })}
                label={t("signals.wholesaleCustomer")}
              >
                <Buildings />
              </OrderAlertIcon>
            ) : null}
          </div>
        ),
        header: t("columns.signals"),
        id: "signals",
        maxSize: 120,
        minSize: 112,
        size: 112,
      }),
      columnHelper.accessor("carrier.value", {
        cell: ({ row }) => (
          <Badge size="2xsmall">{getCarrierLabel(row.original, t)}</Badge>
        ),
        enableSorting: true,
        header: t("columns.carrier"),
        id: "carrier",
        maxSize: 180,
        minSize: 140,
        size: 160,
        sortLabel: t("columns.carrier"),
        ...sortableColumnLabels,
      }),
      columnHelper.accessor("delivery_address", {
        cell: ({ row }) => {
          const address = formatOrderDeliveryAddress(
            row.original.delivery_address
          )

          return (
            <Text
              as="span"
              className="text-ui-fg-subtle"
              leading="compact"
              size="small"
            >
              {address}
            </Text>
          )
        },
        header: t("columns.address"),
        maxSize: 280,
        minSize: 200,
        size: 240,
      }),
      columnHelper.accessor("business_status.id", {
        cell: ({ row }) => (
          <Badge color={row.original.business_status.tone} size="2xsmall">
            {t(row.original.business_status.translation_key)}
          </Badge>
        ),
        enableSorting: true,
        header: t("columns.businessStatus"),
        id: "business_status",
        sortLabel: t("columns.businessStatus"),
        ...sortableColumnLabels,
      }),
      columnHelper.accessor("fulfillment_status", {
        cell: ({ row }) => {
          const fulfillmentStatus = getFulfillmentStatusDisplay(row.original, t)

          return (
            <StatusBadge
              className="text-nowrap"
              color={fulfillmentStatus.color}
            >
              {fulfillmentStatus.label}
            </StatusBadge>
          )
        },
        enableSorting: true,
        header: t("columns.fulfillment"),
        sortLabel: t("columns.fulfillment"),
        ...sortableColumnLabels,
      }),
      columnHelper.display({
        cell: ({ row }) => (
          <ManualStatusControl
            isPending={pendingManualStatusOrderId === row.original.id}
            manualStatus={row.original.manual_status}
            onChange={handleRowManualStatusChange}
            orderId={row.original.id}
            statuses={businessStatusCatalog}
          />
        ),
        header: t("columns.manualStatus"),
        id: "manual_status",
      }),
      columnHelper.accessor("payment_status", {
        cell: ({ row }) => (
          <>
            <Text as="span" leading="compact" size="small">
              {formatPaymentStatusLabel(row.original.payment_status, t)}{" "}
            </Text>
            <br />
            <Text
              as="span"
              className="text-ui-fg-subtle"
              leading="compact"
              size="small"
            >
              {formatPaymentMethodLabel(row.original.payment_method, t)}
            </Text>
          </>
        ),
        enableSorting: true,
        header: t("columns.payment"),
        maxSize: 180,
        minSize: 140,
        size: 160,
        sortLabel: t("columns.payment"),
        ...sortableColumnLabels,
      }),
      columnHelper.accessor("total", {
        align: "right",
        cell: ({ row }) => (
          <Text
            className="w-full text-end"
            leading="compact"
            size="small"
            weight="plus"
          >
            {formatOrderTotal(row.original, locale)}
          </Text>
        ),
        enableSorting: true,
        header: t("columns.total"),
        sortLabel: t("columns.total"),
        ...sortableColumnLabels,
      }),
      columnHelper.display({
        cell: ({ row }) => (
          <Tooltip content={t("actions.details")}>
            <IconButton
              aria-label={t("actions.details")}
              onClick={(event) => {
                event.stopPropagation()
                setDetailOrderId(row.original.id)
              }}
              size="small"
              type="button"
              variant="transparent"
            >
              <Eye />
            </IconButton>
          </Tooltip>
        ),
        id: "detail",
        size: 48,
      }),
    ],
    [
      businessStatusCatalog,
      handleRowManualStatusChange,
      locale,
      pendingManualStatusOrderId,
      sortableColumnLabels,
      t,
    ]
  )

  const clearSelection = () => {
    setRowSelection((currentSelection) =>
      Object.keys(currentSelection).length ? {} : currentSelection
    )
    setSelectedOrdersById((currentSelection) =>
      currentSelection.size ? new Map() : currentSelection
    )
  }

  const resetPagination = () => {
    setPagination((currentPagination) => ({
      ...currentPagination,
      pageIndex: 0,
    }))
  }

  const clearResultScopedState = () => {
    clearSelection()
    setBlockingOrders([])
    setDetailOrderId(null)
  }

  const handleFilteringChange = (
    nextFiltering: OrderDashboardFilteringState
  ) => {
    setFiltering(nextFiltering)
    resetPagination()
    clearResultScopedState()
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    resetPagination()
    clearResultScopedState()
  }

  const handleRowSelectionChange = (
    nextSelection:
      | DataTableRowSelectionState
      | ((
          currentSelection: DataTableRowSelectionState
        ) => DataTableRowSelectionState)
  ) => {
    if (isPreparingShippingLabels) {
      return
    }

    const resolvedSelection =
      typeof nextSelection === "function"
        ? nextSelection(rowSelection)
        : nextSelection

    setRowSelection(resolvedSelection)
    setSelectedOrdersById((currentOrdersById) => {
      const nextOrdersById = new Map(currentOrdersById)

      for (const order of orders) {
        if (resolvedSelection[order.id]) {
          nextOrdersById.set(order.id, order)
        } else {
          nextOrdersById.delete(order.id)
        }
      }

      return nextOrdersById
    })
    setBlockingOrders([])
  }

  const table = useDataTable({
    columns,
    columnVisibility: {
      onColumnVisibilityChange: setColumnVisibility,
      state: columnVisibility,
    },
    data: orders,
    getRowId: (order) => order.id,
    isLoading: ordersQuery.isLoading,
    filtering: {
      onFilteringChange: handleFilteringChange,
      state: filtering,
    },
    onRowClick: (_event, row) => setDetailOrderId(row.id),
    pagination: {
      onPaginationChange: (nextPagination) => {
        setPagination(nextPagination)
        setRowSelection({})
        setBlockingOrders([])
        setDetailOrderId(null)
      },
      state: pagination,
    },
    rowCount: orderCount,
    rowSelection: {
      onRowSelectionChange: handleRowSelectionChange,
      state: rowSelection,
    },
    sorting: {
      onSortingChange: (nextSorting) => {
        // Medusa UI emits undefined when TanStack clears its single sort.
        setSorting(nextSorting ?? DEFAULT_ORDER_DASHBOARD_SORTING)
        resetPagination()
        clearResultScopedState()
      },
      state: sorting,
    },
  })

  const refreshOrders = () => {
    queryClient.invalidateQueries({ queryKey: [ORDER_DASHBOARD_QUERY_KEY] })
    queryClient.invalidateQueries({
      queryKey: [ORDER_DASHBOARD_SUMMARY_QUERY_KEY],
    })
  }

  const refreshFulfillmentData = () => {
    refreshOrders()
    queryClient.invalidateQueries({
      queryKey: [LABEL_ELIGIBILITY_QUERY_KEY],
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
    onError: () => {
      toast.error(t("toast.requestFailed"))
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
    onError: () => {
      toast.error(t("toast.requestFailed"))
    },
    onSuccess: (result) => {
      toast.success(
        t("toast.businessStatusProcessed", {
          changedCount: result.changed_count,
          processedCount: result.processed_count,
          unchangedCount: result.unchanged_count,
        })
      )
      setManualStatus("")
      setIsManualStatusPromptOpen(false)
      invalidateOrders()
    },
  })

  const expeditionPdfMutation = useMutation({
    mutationFn: downloadOrderDashboardExpeditionPdf,
    onError: () => {
      toast.error(t("toast.requestFailed"))
    },
    onSuccess: () => {
      setIsPdfExportPromptOpen(false)
      toast.success(t("toast.pdfReady"))
    },
  })

  const shippingLabelsMutation = useMutation({
    mutationFn: downloadOrderDashboardShippingLabels,
    onError: () => {
      toast.error(t("toast.requestFailed"))
    },
    onSuccess: () => {
      toast.success(t("toast.shippingLabelsReady"))
    },
  })

  const handleOrderStatusApply = () => {
    if (!selectedOrderIds.length) {
      toast.error(t("toast.noSelection"))
      return
    }

    if (!targetStatus) {
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
    if (!selectedOrderIds.length) {
      toast.error(t("toast.noSelection"))
      return
    }

    if (!manualStatus) {
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
    if (!selectedOrderIds.length) {
      toast.error(t("toast.noSelection"))
      return
    }

    if (selectedOrderIds.length === 1) {
      expeditionPdfMutation.mutate({
        mode: "combined",
        orderIds: selectedOrderIds,
      })
      return
    }

    setIsPdfExportPromptOpen(true)
  }

  const handleExpeditionPdfConfirm = (mode: OrderDashboardPdfExportMode) => {
    expeditionPdfMutation.mutate({
      mode,
      orderIds: selectedOrderIds,
    })
  }

  const handlePreparedShippingLabels = (
    labelPreparation: ShippingLabelPreparation,
    labelFormatSnapshot: OrderDashboardLabelFormat
  ) => {
    if (labelPreparation.kind === "mixed-carriers") {
      toast.error(t("toast.mixedLabelCarriers"))
      return
    }

    if (labelPreparation.kind === "unsupported-carrier") {
      toast.error(t("toast.unsupportedLabelCarrier"))
      return
    }

    setBlockingOrders(labelPreparation.blockingOrders)

    if (labelPreparation.kind === "no-printable") {
      toast.error(t("toast.noPrintableLabels"))
      return
    }

    if (labelPreparation.kind === "too-many") {
      toast.error(
        t("toast.shippingLabelLimit", {
          count: labelPreparation.limit,
        })
      )
      return
    }

    if (labelPreparation.carrier === "packeta") {
      setPendingPacketaLabelsDownload({
        carrier: labelPreparation.carrier,
        labelFormat: labelFormatSnapshot,
        orderIds: labelPreparation.orderIds,
      })
      setIsPacketaLabelPositionPromptOpen(true)
      return
    }

    shippingLabelsMutation.mutate({
      carrier: labelPreparation.carrier,
      labelFormat: labelFormatSnapshot,
      orderIds: labelPreparation.orderIds,
    })
  }

  const handleShippingLabels = async () => {
    const selectedOrdersSnapshot = selectedOrders
    const selectedOrderIdsSnapshot = selectedOrdersSnapshot.map(
      (order) => order.id
    )
    const labelFormatSnapshot = labelFormat

    if (!selectedOrdersSnapshot.length) {
      toast.error(t("toast.noSelection"))
      return
    }

    if (isPreparingShippingLabels || shippingLabelsMutation.isPending) {
      return
    }

    const carrierSelection = getShippingLabelCarrierSelection(
      selectedOrdersSnapshot,
      availableCarrierKeys
    )

    if (carrierSelection.kind === "mixed") {
      toast.error(t("toast.mixedLabelCarriers"))
      return
    }

    if (carrierSelection.kind === "unsupported") {
      toast.error(t("toast.unsupportedLabelCarrier"))
      return
    }

    if (carrierSelection.kind !== "supported") {
      toast.error(t("toast.noPrintableLabels"))
      return
    }

    setIsPreparingShippingLabels(true)

    try {
      const eligibilityOrders = await listOrderDashboardLabelEligibility(
        selectedOrderIdsSnapshot
      )
      queryClient.setQueryData(
        [LABEL_ELIGIBILITY_QUERY_KEY, selectedOrderIdsSnapshot],
        eligibilityOrders
      )
      const labelPreparation = prepareShippingLabelDownload(
        selectedOrdersSnapshot,
        eligibilityOrders,
        availableCarrierKeys,
        t
      )
      handlePreparedShippingLabels(labelPreparation, labelFormatSnapshot)
    } catch {
      toast.error(t("toast.requestFailed"))
    } finally {
      setIsPreparingShippingLabels(false)
    }
  }

  const handlePacketaLabelPositionConfirm = () => {
    if (!pendingPacketaLabelsDownload) {
      return
    }

    shippingLabelsMutation.mutate({
      ...pendingPacketaLabelsDownload,
      labelOffset: packetaLabelStartPosition - 1,
    })
    setIsPacketaLabelPositionPromptOpen(false)
    setPendingPacketaLabelsDownload(null)
  }

  const handleFulfillmentOpen = () => {
    if (!selectedOrderIds.length) {
      toast.error(t("toast.noSelection"))
      return
    }

    if (selectedOrderIds.length > ORDER_DASHBOARD_MAX_FULFILLMENT_IDS) {
      toast.error(
        t("toast.fulfillmentLimit", {
          count: ORDER_DASHBOARD_MAX_FULFILLMENT_IDS,
        })
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

    const nextSearchParams = new URLSearchParams(searchParams)

    nextSearchParams.set("queue", value)

    previousActiveQueueIdRef.current = value
    resetPagination()
    clearResultScopedState()
    setSearchParams(nextSearchParams)
  }

  const handleCarrierFilterChange = (value: string) => {
    let nextCarrierFilter: OrderDashboardCarrierKey | "all"

    if (value === "all") {
      nextCarrierFilter = value
    } else if (isOrderDashboardCarrierKey(value)) {
      nextCarrierFilter = value
    } else {
      return
    }

    setCarrierFilter(nextCarrierFilter)
    resetPagination()
    clearResultScopedState()
  }

  const errorMessage = ordersQuery.error ? t("toast.requestFailed") : null
  const pendingUnpaidCount = summaryQuery.data?.pending_unpaid_count ?? 0

  useEffect(() => {
    if (searchParams.has("queue")) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set("queue", ORDER_DASHBOARD_PENDING_UNPAID_QUEUE_ID)
    setSearchParams(nextSearchParams, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    setOrderDashboardSidebarBadgeCount(
      summaryQuery.isLoading ? null : pendingUnpaidCount
    )
  }, [pendingUnpaidCount, summaryQuery.isLoading])

  useEffect(() => {
    if (previousActiveQueueIdRef.current === activeQueueId) {
      return
    }

    previousActiveQueueIdRef.current = activeQueueId
    setPagination((currentPagination) => ({
      ...currentPagination,
      pageIndex: 0,
    }))
    setRowSelection({})
    setSelectedOrdersById(new Map())
    setBlockingOrders([])
    setDetailOrderId(null)
  }, [activeQueueId])

  useEffect(() => {
    if (detailOrderId && !detailOrder) {
      setDetailOrderId(null)
    }
  }, [detailOrder, detailOrderId])

  useEffect(() => {
    if (selectedCount > 0) {
      return
    }

    if (targetStatus) {
      setTargetStatus("")
    }

    if (manualStatus) {
      setManualStatus("")
    }

    if (isManualStatusPromptOpen) {
      setIsManualStatusPromptOpen(false)
    }

    if (isPdfExportPromptOpen) {
      setIsPdfExportPromptOpen(false)
    }

    if (isFulfillmentModalOpen) {
      setIsFulfillmentModalOpen(false)
    }
  }, [
    isFulfillmentModalOpen,
    isManualStatusPromptOpen,
    isPdfExportPromptOpen,
    manualStatus,
    selectedCount,
    targetStatus,
  ])

  // Row selection only depends on selected IDs; refreshed order objects keep the
  // same visible rows selected without retriggering this effect.
  useEffect(() => {
    const visibleSelection = getVisibleRowSelection(orders, selectedOrderIdSet)

    setRowSelection((currentSelection) =>
      isSameRowSelection(currentSelection, visibleSelection)
        ? currentSelection
        : visibleSelection
    )
  }, [orders, selectedOrderIdSet])

  useEffect(() => {
    if (!(orders.length && selectedOrderIdSet.size)) {
      return
    }

    setSelectedOrdersById((currentSelection) => {
      let hasChanged = false
      const nextSelection = new Map(currentSelection)

      for (const order of orders) {
        if (!nextSelection.has(order.id)) {
          continue
        }

        if (nextSelection.get(order.id) === order) {
          continue
        }

        nextSelection.set(order.id, order)
        hasChanged = true
      }

      return hasChanged ? nextSelection : currentSelection
    })
  }, [orders, selectedOrderIdSet])

  return (
    <Container className="flex h-[calc(100dvh-5rem)] min-h-0 flex-col divide-y overflow-hidden p-0">
      <OrderPdfExportPrompt
        isPending={expeditionPdfMutation.isPending}
        onConfirm={handleExpeditionPdfConfirm}
        onOpenChange={setIsPdfExportPromptOpen}
        open={isPdfExportPromptOpen}
        selectedCount={selectedCount}
      />

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
                changedCount: manualStatusPreview.changedCount,
                processedCount: selectedCount,
                unchangedCount: manualStatusPreview.unchangedCount,
              })}
            </Text>
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
                      onClick={() => setPacketaLabelStartPosition(position)}
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
                !pendingPacketaLabelsDownload ||
                shippingLabelsMutation.isPending
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
              {shippingLabelCarrierSelection.kind === "supported" ? (
                <Text
                  className="text-ui-fg-subtle"
                  leading="compact"
                  size="small"
                >
                  {t("actions.shippingLabelCarrier", {
                    carrier: t(
                      `carriers.${shippingLabelCarrierSelection.carrier}`
                    ),
                  })}
                </Text>
              ) : null}
            </div>
            <Button
              disabled={!selectedCount || expeditionPdfMutation.isPending}
              isLoading={expeditionPdfMutation.isPending}
              onClick={handleExpeditionPdf}
              size="small"
              type="button"
              variant="secondary"
            >
              <DocumentText />
              {t("actions.expeditionPdf")}
            </Button>
            {shippingLabelCarrierSelection.kind === "supported" &&
            shippingLabelCarrierSelection.carrier === "packeta" ? (
              <Select
                onValueChange={(value) =>
                  setLabelFormat(value as OrderDashboardLabelFormat)
                }
                value={labelFormat}
              >
                <Select.Trigger
                  className="w-[84px]"
                  disabled={
                    isPreparingShippingLabels ||
                    shippingLabelsMutation.isPending
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
            ) : null}
            {availableCarrierKeys.includes("packeta") ? (
              <Button
                disabled={
                  shippingLabelCarrierSelection.kind !== "supported" ||
                  shippingLabelCarrierSelection.carrier !== "packeta" ||
                  isPreparingShippingLabels ||
                  shippingLabelsMutation.isPending
                }
                isLoading={
                  shippingLabelCarrierSelection.kind === "supported" &&
                  shippingLabelCarrierSelection.carrier === "packeta" &&
                  (isPreparingShippingLabels ||
                    shippingLabelsMutation.isPending)
                }
                onClick={handleShippingLabels}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.packetaLabels")}
              </Button>
            ) : null}
            {availableCarrierKeys.includes("gls") ? (
              <Button
                disabled={
                  shippingLabelCarrierSelection.kind !== "supported" ||
                  shippingLabelCarrierSelection.carrier !== "gls" ||
                  isPreparingShippingLabels ||
                  shippingLabelsMutation.isPending
                }
                isLoading={
                  shippingLabelCarrierSelection.kind === "supported" &&
                  shippingLabelCarrierSelection.carrier === "gls" &&
                  (isPreparingShippingLabels ||
                    shippingLabelsMutation.isPending)
                }
                onClick={handleShippingLabels}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.glsLabels")}
              </Button>
            ) : null}
            {availableCarrierKeys.includes("ppl") ? (
              <Button
                disabled={
                  shippingLabelCarrierSelection.kind !== "supported" ||
                  shippingLabelCarrierSelection.carrier !== "ppl" ||
                  isPreparingShippingLabels ||
                  shippingLabelsMutation.isPending
                }
                isLoading={
                  shippingLabelCarrierSelection.kind === "supported" &&
                  shippingLabelCarrierSelection.carrier === "ppl" &&
                  (isPreparingShippingLabels ||
                    shippingLabelsMutation.isPending)
                }
                onClick={handleShippingLabels}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.pplLabels")}
              </Button>
            ) : null}
            <Button
              disabled={!selectedCount}
              onClick={handleFulfillmentOpen}
              size="small"
              type="button"
              variant="secondary"
            >
              <Buildings />
              {t("actions.fulfillItems")}
            </Button>
          </div>

          <div
            className={
              selectedCount ? "flex flex-wrap items-center gap-2" : "hidden"
            }
          >
            <Select
              onValueChange={(value) => {
                if (!isOrderDashboardTargetStatus(value)) {
                  return
                }

                const option = targetStatusOptions.find(
                  (status) => status.value === value
                )

                if (option?.blockedOrders.length) {
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
                className="enabled:data-[placeholder]:!text-ui-fg-base w-[180px]"
                disabled={!selectedCount}
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
                !(selectedCount && targetStatus) ||
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
              disabled={businessStatusCatalogQuery.isPending}
              onValueChange={(value) => {
                if (
                  value === "clear" ||
                  isOrderDashboardBusinessStatusId(value)
                ) {
                  setManualStatus(value)
                  setBlockingOrders([])
                }
              }}
              value={manualStatus}
            >
              <Select.Trigger className="data-[placeholder]:!text-ui-fg-base w-[200px]">
                <Select.Value
                  placeholder={t("actions.businessStatusPlaceholder")}
                />
              </Select.Trigger>
              <Select.Content>
                {businessStatusCatalog.map((status) => (
                  <Select.Item key={status.id} value={status.id}>
                    {t(status.translation_key)}
                  </Select.Item>
                ))}
                <Select.Item value="clear">
                  {t("manualStatus.clear")}
                </Select.Item>
              </Select.Content>
            </Select>
            <Button
              disabled={!selectedCount || manualStatusMutation.isPending}
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
        {selectedStatusBlockedMessage ? (
          <Text className="text-ui-fg-error" leading="compact" size="small">
            {selectedStatusBlockedMessage}
          </Text>
        ) : null}
      </div>

      {blockingOrders.length ? (
        <BlockingOrdersPanel blockedOrders={blockingOrders} />
      ) : null}

      {detailOrder ? (
        <OrderDashboardDetailModal
          onOpenChange={(open) => {
            if (!open) {
              setDetailOrderId(null)
            }
          }}
          order={detailOrder}
        />
      ) : null}

      {ordersQuery.data?.carrier_filter_limit_reached ? (
        <div className="bg-ui-bg-subtle px-6 py-2">
          <Text className="text-ui-fg-warning" leading="compact" size="small">
            {t("table.carrierFilterLimit", {
              count: ordersQuery.data.scanned_count ?? 0,
            })}
          </Text>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error" leading="compact" size="small">
            {errorMessage}
          </Text>
        </div>
      ) : (
        <DataTable instance={table}>
          <div className="flex w-full flex-nowrap items-center justify-between gap-2 overflow-x-auto border-t px-6 py-2">
            <OrderDashboardSearchInput
              onSearchChange={handleSearchChange}
              placeholder={t("filters.searchPlaceholder")}
              value={search}
            />
            <div className="flex flex-shrink-0 items-center gap-2">
              <Select
                onValueChange={handleCarrierFilterChange}
                value={carrierFilter}
              >
                <Select.Trigger className="w-[180px]">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">
                    {t("filters.allCarriers")}
                  </Select.Item>
                  {availableCarrierKeys.map((carrierKey) => (
                    <Select.Item key={carrierKey} value={carrierKey}>
                      {t(`carriers.${carrierKey}`)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <OrderDashboardCreatedAtFilter
                labels={{
                  apply: t("actions.apply"),
                  clear: t("filters.createdAtClear"),
                  customRange: t("filters.createdAtRange"),
                  end: t("filters.createdAtRangeEnd"),
                  label: t("filters.createdAt"),
                  last30Days: t("filters.createdAtLast30Days"),
                  last7Days: t("filters.createdAtLast7Days"),
                  start: t("filters.createdAtRangeStart"),
                  today: t("filters.createdAtToday"),
                  yesterday: t("filters.createdAtYesterday"),
                }}
                locale={locale}
                onChange={(value) => {
                  if (value) {
                    table.updateFilter({ id: "created_at", value })
                  } else {
                    table.removeFilter("created_at")
                  }
                }}
                value={createdAtFilter}
              />
              <DataTable.SortingMenu tooltip={t("actions.sorting")} />
              <DataTable.ColumnVisibilityMenu tooltip={t("actions.columns")} />
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            <OrderDashboardTableBody
              columns={columns}
              columnVisibility={columnVisibility}
              data={orders}
              emptyHeading={t("table.empty")}
              instance={table}
              isLoading={ordersQuery.isLoading}
              pageIndex={pagination.pageIndex}
              rowSelection={rowSelection}
              sorting={sorting}
            />
            {ordersQuery.isFetching && !ordersQuery.isLoading ? (
              <output
                aria-label={t("table.loading")}
                className="absolute inset-x-0 top-12 bottom-0 z-[2] flex items-center justify-center bg-ui-bg-base"
              >
                <Spinner className="animate-spin text-ui-fg-muted" />
              </output>
            ) : null}
          </div>
          <DataTable.Pagination
            translations={{
              next: t("pagination.next"),
              of: t("pagination.of"),
              pages: t("pagination.pages", { count: orderPageCount }),
              prev: t("pagination.prev"),
              results: t("pagination.results", { count: orderCount }),
            }}
          />
        </DataTable>
      )}
    </Container>
  )
}

function OrderDashboardSearchInput({
  onSearchChange,
  placeholder,
  value,
}: {
  onSearchChange: (value: string) => void
  placeholder: string
  value: string
}) {
  const [inputValue, setInputValue] = useState(value)
  const onSearchChangeRef = useRef(onSearchChange)

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange
  }, [onSearchChange])

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    if (inputValue === value) {
      return
    }

    const timeout = window.setTimeout(() => {
      onSearchChangeRef.current(inputValue)
    }, ORDER_DASHBOARD_SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeout)
  }, [inputValue, value])

  return (
    <Input
      className="w-[300px] max-w-full"
      onChange={(event) => setInputValue(event.target.value)}
      placeholder={placeholder}
      size="small"
      type="search"
      value={inputValue}
    />
  )
}

const ManualStatusControl = memo(function ManualStatusControlComponent({
  isPending,
  manualStatus,
  onChange,
  orderId,
  statuses,
}: {
  isPending: boolean
  manualStatus?: OrderDashboardManualStatusId | null
  onChange: (orderId: string, value: ManualStatusValue) => void
  orderId: string
  statuses: OrderDashboardBusinessStatus[]
}) {
  const { t } = useTranslation("orderDashboard")

  return (
    <Select
      disabled={isPending}
      onValueChange={(value) => {
        if (value === "clear" || isOrderDashboardBusinessStatusId(value)) {
          onChange(orderId, value)
        }
      }}
      value={manualStatus ?? "clear"}
    >
      <Select.Trigger
        className="w-[180px]"
        onClick={(event) => event.stopPropagation()}
      >
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="clear">{t("manualStatus.none")}</Select.Item>
        {statuses.map((status) => (
          <Select.Item key={status.id} value={status.id}>
            {t(status.translation_key)}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  )
})

const OrderDashboardTableBody = memo(function OrderDashboardTableBodyComponent({
  emptyHeading,
  instance,
}: OrderDashboardTableBodyProps) {
  return (
    <DataTable className="w-full min-w-0" instance={instance}>
      <DataTable.Table
        emptyState={{
          empty: { heading: emptyHeading },
          filtered: { heading: emptyHeading },
        }}
      />
    </DataTable>
  )
}, areOrderDashboardTableBodyPropsEqual)

function areOrderDashboardTableBodyPropsEqual(
  previous: OrderDashboardTableBodyProps,
  next: OrderDashboardTableBodyProps
) {
  return (
    previous.columnVisibility === next.columnVisibility &&
    previous.columns === next.columns &&
    previous.data === next.data &&
    previous.emptyHeading === next.emptyHeading &&
    previous.isLoading === next.isLoading &&
    previous.pageIndex === next.pageIndex &&
    previous.rowSelection === next.rowSelection &&
    previous.sorting === next.sorting
  )
}

function OrderDashboardDetailModal({
  onOpenChange,
  order,
}: {
  onOpenChange: (open: boolean) => void
  order: OrderDashboardOrder
}) {
  const { i18n, t } = useTranslation("orderDashboard")
  const locale = formatLocaleCode(i18n.resolvedLanguage ?? i18n.language)
  const manualStatusLabel = order.manual_status
    ? t(`statuses.${order.manual_status}`)
    : t("manualStatus.none")
  const fulfillmentStatus = getFulfillmentStatusDisplay(order, t)
  const hasCustomerAlerts = hasOrderCustomerAlerts(order)

  return (
    <FocusModal onOpenChange={onOpenChange} open>
      <FocusModal.Content className="-translate-x-1/2 -translate-y-1/2 inset-auto top-1/2 left-1/2 h-[calc(100vh-32px)] max-h-[720px] w-[calc(100vw-32px)] max-w-[960px]">
        <FocusModal.Header>
          <FocusModal.Title>
            {t("detail.title", { order: order.order_display_id })}
          </FocusModal.Title>
        </FocusModal.Header>
        <FocusModal.Description className="sr-only">
          {order.customer}
          {order.email ? ` - ${order.email}` : ""}
        </FocusModal.Description>

        <FocusModal.Body className="overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-6 py-8">
            <div className="flex flex-col gap-1">
              <Text leading="compact" weight="plus">
                {order.customer}
              </Text>
              {order.email ? (
                <Text
                  className="text-ui-fg-subtle"
                  leading="compact"
                  size="small"
                >
                  {order.email}
                </Text>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <OrderDetailField label={t("detail.address")}>
                {formatOrderDeliveryAddress(order.delivery_address)}
              </OrderDetailField>
              <OrderDetailField label={t("detail.carrier")}>
                {getCarrierLabel(order, t)}
              </OrderDetailField>
              <OrderDetailField label={t("detail.payment")}>
                {formatPaymentStatusLabel(order.payment_status, t)} -{" "}
                {formatPaymentMethodLabel(order.payment_method, t)}
              </OrderDetailField>
              <OrderDetailField label={t("detail.total")}>
                {formatOrderTotal(order, locale)}
              </OrderDetailField>
              <OrderDetailField label={t("detail.orderStatus")}>
                {formatOrderStatusLabel(order.status, t)}
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

            {hasCustomerAlerts ? (
              <div className="flex flex-col gap-2">
                <Text leading="compact" size="small" weight="plus">
                  {t("columns.signals")}
                </Text>
                <div className="flex flex-wrap gap-2">
                  {order.note ? (
                    <Badge color="grey" size="2xsmall">
                      {t("signals.customerNote")}
                    </Badge>
                  ) : null}
                  {order.signals.returning_customer ? (
                    <Badge color="blue" size="2xsmall">
                      {t("signals.returningCustomer")}
                    </Badge>
                  ) : null}
                  {order.signals.storn_orders ? (
                    <Badge color="red" size="2xsmall">
                      {t("signals.previousCancellation")}
                    </Badge>
                  ) : null}
                  {order.signals.wholesale_company_name ? (
                    <Badge color="purple" size="2xsmall">
                      {t("signals.wholesaleCustomerCompany", {
                        company: order.signals.wholesale_company_name,
                      })}
                    </Badge>
                  ) : null}
                </div>
              </div>
            ) : null}

            {order.note ? (
              <div className="flex flex-col gap-2">
                <Text leading="compact" size="small" weight="plus">
                  {t("detail.customerNote")}
                </Text>
                <div className="rounded-md bg-ui-bg-subtle px-3 py-2">
                  <Text className="whitespace-pre-wrap" size="small">
                    {order.note}
                  </Text>
                </div>
              </div>
            ) : null}

            <div>
              <Text leading="compact" size="small" weight="plus">
                {t("detail.items")}
              </Text>
              <div className="mt-2 divide-y overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base">
                {order.items.length ? (
                  order.items.map((item, index) => (
                    <div
                      className="grid gap-2 px-3 py-2 sm:grid-cols-[1fr_auto]"
                      key={item.id ?? `${item.title}-${index}`}
                    >
                      <div className="min-w-0">
                        <Text leading="compact" size="small">
                          {item.title}
                        </Text>
                        {item.sku || item.variant ? (
                          <Text
                            className="text-ui-fg-subtle"
                            leading="compact"
                            size="small"
                          >
                            {[item.sku, item.variant]
                              .filter(Boolean)
                              .join(" - ")}
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
        </FocusModal.Body>

        <FocusModal.Footer>
          <FocusModal.Close asChild>
            <Button size="small" type="button" variant="secondary">
              {t("actions.closeDetails")}
            </Button>
          </FocusModal.Close>
          <Button asChild size="small">
            <Link to={`/orders/${order.id}`}>
              {t("actions.openOrder")}
              <OpenRectArrowOut />
            </Link>
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

function OrderDetailField({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div className="min-w-0">
      <Text className="text-ui-fg-muted" leading="compact" size="small">
        {label}
      </Text>
      <Text
        className="break-words"
        leading="compact"
        size="small"
        weight="plus"
      >
        {children}
      </Text>
    </div>
  )
}

function OrderAlertIcon({
  children,
  color,
  content,
  label,
}: {
  children: ReactNode
  color: BadgeColor
  content?: string
  label: string
}) {
  return (
    <Tooltip content={content ?? label}>
      <IconBadge aria-label={label} color={color} size="base">
        {children}
      </IconBadge>
    </Tooltip>
  )
}

function hasOrderCustomerAlerts(order: OrderDashboardOrder) {
  return Boolean(
    order.note ||
      order.signals.returning_customer ||
      order.signals.storn_orders ||
      order.signals.wholesale_company_name
  )
}

function getManualStatusTarget(
  value: ManualStatusValue | ""
): ManualStatusTarget | undefined {
  if (!value) {
    return
  }

  return value === "clear" ? null : value
}

function getManualStatusLabel(
  status: ManualStatusTarget,
  t: TranslationFunction
) {
  return status === null ? t("manualStatus.clear") : t(`statuses.${status}`)
}

function getFulfillmentStatusDisplay(
  order: OrderDashboardOrder,
  t: TranslationFunction
) {
  const status = order.fulfillment_status?.toLowerCase()

  if (!status) {
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
    label: t("fallback.unknownFulfillmentStatus", { status }),
  }
}

function isKnownFulfillmentStatus(
  status: string
): status is keyof typeof fulfillmentStatusColors {
  return status in fulfillmentStatusColors
}

function getBulkManualStatusPreview(
  orders: OrderDashboardOrder[],
  status: ManualStatusTarget
) {
  const changedCount = orders.filter(
    (order) => (order.manual_status ?? null) !== status
  ).length

  return {
    changedCount,
    unchangedCount: orders.length - changedCount,
  }
}

function StatusSelectItem({
  onBlockedAttempt,
  option,
}: {
  onBlockedAttempt: (blockedOrders: OrderDashboardBlockingOrder[]) => void
  option: TargetStatusOption
}) {
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

function StatusBlockersTooltipContent({
  blockedOrders,
}: {
  blockedOrders: OrderDashboardBlockingOrder[]
}) {
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

function BlockingOrdersPanel({
  blockedOrders,
}: {
  blockedOrders: OrderDashboardBlockingOrder[]
}) {
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

function getVisibleRowSelection(
  orders: OrderDashboardOrder[],
  selectedOrderIdSet: ReadonlySet<string>
) {
  const visibleSelection: DataTableRowSelectionState = {}

  for (const order of orders) {
    if (selectedOrderIdSet.has(order.id)) {
      visibleSelection[order.id] = true
    }
  }

  return visibleSelection
}

function isSameRowSelection(
  left: DataTableRowSelectionState,
  right: DataTableRowSelectionState
) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key) => left[key] === right[key])
}

function formatOrderDeliveryAddress(address: string[]) {
  return address.filter(Boolean).join(", ") || "-"
}

function getQueueCount(
  queueId: OrderDashboardQueueId,
  summary?: OrderDashboardSummaryResponse
) {
  if (!summary) {
    return null
  }

  if (queueId === "all") {
    return summary.total_count
  }

  if (queueId === "action_required") {
    return summary.action_required_count
  }

  if (queueId === ORDER_DASHBOARD_PENDING_UNPAID_QUEUE_ID) {
    return summary.pending_unpaid_count
  }

  return summary.status_counts[queueId]
}

function getQueueLabel(queueId: OrderDashboardQueueId, t: TranslationFunction) {
  if (
    queueId === "all" ||
    queueId === "action_required" ||
    queueId === ORDER_DASHBOARD_PENDING_UNPAID_QUEUE_ID
  ) {
    return t(`queues.${queueId}`)
  }

  return t(`statuses.${queueId}`)
}

function getTargetStatusOptions(
  selectedOrders: OrderDashboardOrder[],
  t: TranslationFunction
): TargetStatusOption[] {
  return ORDER_DASHBOARD_TARGET_STATUSES.map((targetStatus) => ({
    blockedOrders: getTargetStatusBlockedOrders(
      selectedOrders,
      targetStatus,
      t
    ),
    label: t(`targetStatus.${targetStatus}`),
    value: targetStatus,
  }))
}

function getTargetStatusBlockedOrders(
  selectedOrders: OrderDashboardOrder[],
  targetStatus: OrderDashboardTargetStatus,
  t: TranslationFunction
): OrderDashboardBlockingOrder[] {
  return selectedOrders.flatMap((order) => {
    const reason = getOrderDashboardTransitionBlockReason(
      order,
      targetStatus,
      t
    )

    return reason
      ? [
          {
            id: order.id,
            order_display_id: order.order_display_id,
            reason,
          },
        ]
      : []
  })
}

function getSelectedStatusBlockedMessage(
  statusLabel: string,
  blockedOrders: OrderDashboardBlockingOrder[],
  t: TranslationFunction
) {
  if (blockedOrders.length === 1) {
    const [order] = blockedOrders
    return t("targetStatusBlocker.selectedBlockedOne", {
      order: order.order_display_id,
      reason: order.reason,
      status: statusLabel,
    })
  }

  return t("targetStatusBlocker.selectedBlockedMany", {
    count: blockedOrders.length,
    status: statusLabel,
  })
}

export const config = defineRouteConfig({
  label: "menuItem",
  nested: "/orders",
  rank: 10,
  translationNs: "orderDashboard",
})

export default OrderDashboardPage

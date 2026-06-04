import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  DataTable,
  type DataTableFilteringState,
  type DataTablePaginationState,
  type DataTableRowSelectionState,
  type DataTableSortingState,
  Heading,
  Prompt,
  Select,
  Tabs,
  Text,
  Tooltip,
  toast,
  useDataTable,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { setOrderDashboardSidebarBadgeCount } from "../../sidebar-badge"
import {
  downloadOrderDashboardExpeditionPdf,
  downloadOrderDashboardPacketaLabels,
  getOrderDashboardSummary,
  listOrderDashboardOrders,
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
  getSelectedOrders,
  isOrderDashboardBusinessStatusId,
  isOrderDashboardCarrierKey,
  isOrderDashboardTargetStatus,
  sortOrdersByTableState,
} from "./format"
import {
  ORDER_DASHBOARD_BUSINESS_STATUS_GROUP_IDS,
  ORDER_DASHBOARD_BUSINESS_STATUS_IDS,
  ORDER_DASHBOARD_CARRIER_KEYS,
  ORDER_DASHBOARD_MANUAL_STATUS_IDS,
  ORDER_DASHBOARD_MAX_PACKETA_LABEL_IDS,
  ORDER_DASHBOARD_PAGE_SIZE,
  ORDER_DASHBOARD_QUEUE_IDS,
  ORDER_DASHBOARD_TARGET_STATUSES,
  type OrderDashboardBusinessStatusGroupId,
  type OrderDashboardBusinessStatusId,
  type OrderDashboardLabelFormat,
  type OrderDashboardManualStatusId,
  type OrderDashboardOrder,
  type OrderDashboardQueueId,
  type OrderDashboardSummaryResponse,
  type OrderDashboardTargetStatus,
} from "./types"

const ORDER_DASHBOARD_QUERY_KEY = "order-dashboard-orders"
const ORDER_DASHBOARD_SUMMARY_QUERY_KEY = "order-dashboard-summary"
const CARRIER_FILTER_ID = "carrier.value"
const BUSINESS_STATUS_GROUP_FILTER_ID = "business_status.group"
const BUSINESS_STATUS_FILTER_ID = "business_status.id"

const columnHelper = createDataTableColumnHelper<OrderDashboardOrder>()
const filterHelper = createDataTableFilterHelper<OrderDashboardOrder>()

type ManualStatusValue = OrderDashboardManualStatusId | "clear"
type ManualStatusTarget = OrderDashboardManualStatusId | null
type TargetStatusOption = {
  blockedOrders: OrderDashboardBlockingOrder[]
  label: string
  value: OrderDashboardTargetStatus
}
type OrderDashboardBlockingOrder = {
  id: string
  order_display_id: string
  reason: string
}

const labelFormats: OrderDashboardLabelFormat[] = ["A6", "A7"]

const OrderDashboardPage = () => {
  const { i18n, t } = useTranslation("orderDashboard")
  const queryClient = useQueryClient()
  const locale = useMemo(
    () => formatLocaleCode(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  )
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: ORDER_DASHBOARD_PAGE_SIZE,
  })
  const [filtering, setFiltering] = useState<DataTableFilteringState>({})
  const [sorting, setSorting] = useState<DataTableSortingState | null>({
    desc: true,
    id: "created_at",
  })
  const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>(
    {}
  )
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({})
  const [targetStatus, setTargetStatus] = useState<
    OrderDashboardTargetStatus | ""
  >("")
  const [manualStatus, setManualStatus] = useState<ManualStatusValue | "">("")
  const [isManualStatusPromptOpen, setIsManualStatusPromptOpen] =
    useState(false)
  const [labelFormat, setLabelFormat] =
    useState<OrderDashboardLabelFormat>("A6")
  const [blockingOrders, setBlockingOrders] = useState<
    OrderDashboardBlockingOrder[]
  >([])

  const carrierFilter = getCarrierFilter(filtering)
  const businessStatusGroupFilter = getBusinessStatusGroupFilter(filtering)
  const businessStatusFilter = getBusinessStatusFilter(filtering)
  const limit = pagination.pageSize
  const offset = pagination.pageIndex * limit

  const ordersQuery = useQuery({
    queryFn: () =>
      listOrderDashboardOrders({
        businessStatusGroup: businessStatusGroupFilter,
        businessStatus: businessStatusFilter,
        carrier: carrierFilter,
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

  const orders = useMemo(
    () => sortOrdersByTableState(ordersQuery.data?.orders ?? [], sorting),
    [ordersQuery.data?.orders, sorting]
  )
  const selectedOrders = useMemo(
    () => getSelectedOrders(orders, rowSelection),
    [orders, rowSelection]
  )
  const selectedOrderIds = selectedOrders.map((order) => order.id)
  const selectedPacketaOrders = selectedOrders.filter(
    (order) => order.carrier.value === "packeta"
  )
  const selectedCount = selectedOrders.length
  const targetStatusOptions = useMemo(
    () => getTargetStatusOptions(selectedOrders, t),
    [selectedOrders, t]
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
  const manualStatusTarget = getManualStatusTarget(manualStatus)
  const manualStatusPreview =
    manualStatusTarget === undefined
      ? { skipped: [], updatable: [] }
      : getBulkManualStatusPreview(selectedOrders, manualStatusTarget, t)
  const manualStatusLabel =
    manualStatusTarget === undefined
      ? ""
      : getManualStatusLabel(manualStatusTarget, t)
  const onlyPacketaSelected =
    selectedCount > 0 && selectedPacketaOrders.length === selectedCount
  const activeQueueId: OrderDashboardQueueId =
    businessStatusGroupFilter ?? businessStatusFilter ?? "all"
  const queueTabs = useMemo(
    () =>
      ORDER_DASHBOARD_QUEUE_IDS.map((queueId) => ({
        count: getQueueCount(queueId, summaryQuery.data),
        id: queueId,
        label: getQueueLabel(queueId, t),
      })),
    [summaryQuery.data, t]
  )

  const filters = useMemo(
    () => [
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
    ],
    [t]
  )

  const columns = useMemo(
    () => [
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
        enableSorting: true,
        header: t("columns.order"),
        sortLabel: t("columns.order"),
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
      }),
      columnHelper.accessor("customer", {
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col gap-y-1">
            <Text leading="compact" size="small" weight="plus">
              {row.original.customer}
            </Text>
            {row.original.email ? (
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
      columnHelper.accessor("business_status.id", {
        cell: ({ row }) => (
          <Badge color={row.original.business_status.tone} size="2xsmall">
            {t(row.original.business_status.translation_key)}
          </Badge>
        ),
        header: t("columns.businessStatus"),
      }),
      columnHelper.display({
        cell: ({ row }) => (
          <ManualStatusControl
            manualStatus={row.original.manual_status}
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
        cell: ({ row }) => (
          <Text leading="compact" size="small" weight="plus">
            {formatOrderTotal(row.original, locale)}
          </Text>
        ),
        enableSorting: true,
        header: t("columns.total"),
        headerAlign: "right",
        sortLabel: t("columns.total"),
      }),
    ],
    [locale, t]
  )

  const table = useDataTable({
    columns,
    columnVisibility: {
      onColumnVisibilityChange: setColumnVisibility,
      state: columnVisibility,
    },
    data: orders,
    filters,
    filtering: {
      onFilteringChange: (nextFiltering) => {
        setFiltering(normalizeFiltering(nextFiltering))
        setRowSelection({})
        setBlockingOrders([])
      },
      state: filtering,
    },
    getRowId: (order) => order.id,
    isLoading: ordersQuery.isLoading,
    pagination: {
      onPaginationChange: (nextPagination) => {
        setPagination(nextPagination)
        setRowSelection({})
        setBlockingOrders([])
      },
      state: pagination,
    },
    rowCount: ordersQuery.data?.count ?? 0,
    rowSelection: {
      onRowSelectionChange: setRowSelection,
      state: rowSelection,
    },
    sorting: {
      onSortingChange: setSorting,
      state: sorting,
    },
  })

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: [ORDER_DASHBOARD_QUERY_KEY] })
    queryClient.invalidateQueries({
      queryKey: [ORDER_DASHBOARD_SUMMARY_QUERY_KEY],
    })
    setRowSelection({})
  }

  const orderStatusMutation = useMutation({
    mutationFn: updateOrderDashboardStatuses,
    onError: (error) => {
      toast.error(getErrorMessage(error, t("toast.requestFailed")))
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
      toast.error(getErrorMessage(error, t("toast.requestFailed")))
    },
    onSuccess: (result) => {
      setBlockingOrders(result.skipped)
      toast.success(
        result.skipped_count
          ? t("toast.businessStatusUpdatedWithSkipped", {
              count: result.count,
              skippedCount: result.skipped_count,
            })
          : t("toast.businessStatusUpdated", { count: result.count })
      )
      setManualStatus("")
      setIsManualStatusPromptOpen(false)
      invalidateOrders()
    },
  })

  const expeditionPdfMutation = useMutation({
    mutationFn: downloadOrderDashboardExpeditionPdf,
    onError: (error) => {
      toast.error(getErrorMessage(error, t("toast.requestFailed")))
    },
    onSuccess: () => {
      toast.success(t("toast.pdfReady"))
    },
  })

  const packetaLabelsMutation = useMutation({
    mutationFn: downloadOrderDashboardPacketaLabels,
    onError: (error) => {
      toast.error(getErrorMessage(error, t("toast.requestFailed")))
    },
    onSuccess: () => {
      toast.success(t("toast.packetaLabelsReady"))
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

    if (!manualStatusPreview.updatable.length) {
      setBlockingOrders(manualStatusPreview.skipped)
      setIsManualStatusPromptOpen(false)
      toast.error(t("toast.manualStatusSkipped"))
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

    expeditionPdfMutation.mutate(selectedOrderIds)
  }

  const handlePacketaLabels = () => {
    if (!onlyPacketaSelected) {
      toast.error(t("toast.noPacketaSelection"))
      return
    }

    if (selectedOrderIds.length > ORDER_DASHBOARD_MAX_PACKETA_LABEL_IDS) {
      toast.error(
        `Select up to ${ORDER_DASHBOARD_MAX_PACKETA_LABEL_IDS} orders`
      )
      return
    }

    packetaLabelsMutation.mutate({
      labelFormat,
      orderIds: selectedOrderIds,
    })
  }

  const handleQueueChange = (value: string) => {
    if (!isOrderDashboardQueueId(value)) {
      return
    }

    setFiltering((currentFiltering) =>
      getFilteringForQueue(currentFiltering, value)
    )
    setPagination((currentPagination) => ({
      ...currentPagination,
      pageIndex: 0,
    }))
    setRowSelection({})
    setBlockingOrders([])
  }

  const errorMessage = ordersQuery.error
    ? getErrorMessage(ordersQuery.error, t("toast.requestFailed"))
    : null
  const actionRequiredCount = summaryQuery.data?.action_required_count ?? 0

  useEffect(() => {
    setOrderDashboardSidebarBadgeCount(
      summaryQuery.isLoading ? null : actionRequiredCount
    )
  }, [actionRequiredCount, summaryQuery.isLoading])

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
  }, [isManualStatusPromptOpen, manualStatus, selectedCount, targetStatus])

  return (
    <Container className="divide-y p-0">
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
                  <Text className="text-ui-fg-muted" leading="compact" size="small">
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
                  <Text className="text-ui-fg-muted" leading="compact" size="small">
                    {t("manualStatusPrompt.skippedMore", {
                      count: manualStatusPreview.skipped.length - 10,
                    })}
                  </Text>
                ) : null}
              </div>
            ) : null}
          </div>
          <Prompt.Footer>
            <Prompt.Cancel>Cancel</Prompt.Cancel>
            <Prompt.Action
              disabled={
                !manualStatusPreview.updatable.length ||
                manualStatusMutation.isPending
              }
              onClick={handleManualStatusConfirm}
            >
              {t("actions.apply")}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>

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
            <Text leading="compact" size="small" weight="plus">
              {t("actions.selected", { count: selectedCount })}
            </Text>
            <Button
              disabled={!selectedCount || expeditionPdfMutation.isPending}
              isLoading={expeditionPdfMutation.isPending}
              onClick={handleExpeditionPdf}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.expeditionPdf")}
            </Button>
            <Select
              onValueChange={(value) =>
                setLabelFormat(value as OrderDashboardLabelFormat)
              }
              value={labelFormat}
            >
              <Select.Trigger className="w-[84px]">
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
              disabled={!onlyPacketaSelected || packetaLabelsMutation.isPending}
              isLoading={packetaLabelsMutation.isPending}
              onClick={handlePacketaLabels}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.packetaLabels")}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              onValueChange={(value) => {
                if (!isOrderDashboardTargetStatus(value)) {
                  return
                }

                const option = targetStatusOptions.find(
                  (status) => status.value === value
                )

                if (option?.blockedOrders.length) {
                  setBlockingOrders(option.blockedOrders)
                  return
                }

                setTargetStatus(value)
                setBlockingOrders([])
              }}
              value={targetStatus}
            >
              <Select.Trigger className="w-[180px]" disabled={!selectedCount}>
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
                !selectedCount ||
                !targetStatus ||
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
          <DataTable.FilterBar
            alwaysShow
            columnsTooltip={t("columns.order")}
            sortingTooltip={t("columns.created")}
          />
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
      )}
    </Container>
  )
}

function ManualStatusControl({
  manualStatus,
  orderId,
}: {
  manualStatus?: OrderDashboardManualStatusId | null
  orderId: string
}) {
  const { t } = useTranslation("orderDashboard")
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (value: ManualStatusValue) =>
      updateOrderDashboardManualStatus({
        orderIds: [orderId],
        status: value === "clear" ? null : value,
      }),
    onError: (error) => {
      toast.error(getErrorMessage(error, t("toast.requestFailed")))
    },
    onSuccess: (result) => {
      if (result.count > 0) {
        toast.success(t("toast.businessStatusUpdated", { count: result.count }))
      } else {
        toast.error(result.skipped[0]?.reason ?? t("toast.manualStatusSkipped"))
      }

      queryClient.invalidateQueries({ queryKey: [ORDER_DASHBOARD_QUERY_KEY] })
      queryClient.invalidateQueries({
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
  t: (key: string) => string
) {
  return status === null
    ? t("manualStatus.clear")
    : t(`manualStatus.${status}`)
}

function getBulkManualStatusBlockReason(
  order: OrderDashboardOrder,
  status: ManualStatusTarget,
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

  if (order.status === "canceled") {
    return "Canceled orders stay canceled"
  }

  if (
    order.business_status.id === "delivered" ||
    order.business_status.id === "shipped"
  ) {
    return `${t(order.business_status.translation_key)} status has higher priority`
  }

  return
}

function getBulkManualStatusPreview(
  orders: OrderDashboardOrder[],
  status: ManualStatusTarget,
  t: (key: string) => string
) {
  const skipped: OrderDashboardBlockingOrder[] = []
  const updatable: OrderDashboardOrder[] = []

  for (const order of orders) {
    const reason = getBulkManualStatusBlockReason(order, status, t)

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

function StatusSelectItem({
  onBlockedAttempt,
  option,
}: {
  onBlockedAttempt: (blockedOrders: OrderDashboardBlockingOrder[]) => void
  option: TargetStatusOption
}) {
  const blockedCount = option.blockedOrders.length
  const isBlocked = blockedCount > 0
  const item = (
    <Select.Item
      className={
        isBlocked
          ? "data-[disabled]:cursor-not-allowed data-[disabled]:text-ui-fg-disabled data-[disabled]:pointer-events-auto"
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

function StatusBlockersTooltipContent({
  blockedOrders,
}: {
  blockedOrders: OrderDashboardBlockingOrder[]
}) {
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
          {hiddenCount} more blocked
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
      <Text className="text-ui-fg-error" leading="compact" size="small" weight="plus">
        {t("table.blockedOrdersTitle")}
      </Text>
      <div className="flex flex-col gap-1">
        {visibleOrders.map((order) => (
          <Text key={`${order.id}-${order.reason}`} leading="compact" size="small">
            {order.order_display_id}: {order.reason}
          </Text>
        ))}
        {hiddenCount > 0 ? (
          <Text className="text-ui-fg-muted" leading="compact" size="small">
            {hiddenCount} more blocked
          </Text>
        ) : null}
      </div>
    </div>
  )
}

function getCarrierFilter(filtering: DataTableFilteringState) {
  const value = filtering[CARRIER_FILTER_ID]
  return isOrderDashboardCarrierKey(value) ? value : undefined
}

function getBusinessStatusFilter(
  filtering: DataTableFilteringState
): OrderDashboardBusinessStatusId | undefined {
  const value = filtering[BUSINESS_STATUS_FILTER_ID]
  return isOrderDashboardBusinessStatusId(value) ? value : undefined
}

function getBusinessStatusGroupFilter(
  filtering: DataTableFilteringState
): OrderDashboardBusinessStatusGroupId | undefined {
  const value = filtering[BUSINESS_STATUS_GROUP_FILTER_ID]
  return isOrderDashboardBusinessStatusGroupId(value) ? value : undefined
}

function isManualStatus(value: unknown): value is OrderDashboardManualStatusId {
  return (
    typeof value === "string" &&
    ORDER_DASHBOARD_MANUAL_STATUS_IDS.includes(
      value as OrderDashboardManualStatusId
    )
  )
}

function isOrderDashboardBusinessStatusGroupId(
  value: unknown
): value is OrderDashboardBusinessStatusGroupId {
  return (
    typeof value === "string" &&
    ORDER_DASHBOARD_BUSINESS_STATUS_GROUP_IDS.includes(
      value as OrderDashboardBusinessStatusGroupId
    )
  )
}

function isOrderDashboardQueueId(value: unknown): value is OrderDashboardQueueId {
  return (
    typeof value === "string" &&
    ORDER_DASHBOARD_QUEUE_IDS.includes(value as OrderDashboardQueueId)
  )
}

function normalizeFiltering(filtering: DataTableFilteringState) {
  const nextFiltering = { ...filtering }

  if (nextFiltering[BUSINESS_STATUS_FILTER_ID]) {
    delete nextFiltering[BUSINESS_STATUS_GROUP_FILTER_ID]
  }

  return nextFiltering
}

function getFilteringForQueue(
  filtering: DataTableFilteringState,
  queueId: OrderDashboardQueueId
) {
  const nextFiltering = { ...filtering }

  delete nextFiltering[BUSINESS_STATUS_GROUP_FILTER_ID]
  delete nextFiltering[BUSINESS_STATUS_FILTER_ID]

  if (queueId === "all") {
    return nextFiltering
  }

  if (queueId === "action_required") {
    nextFiltering[BUSINESS_STATUS_GROUP_FILTER_ID] = queueId
    return nextFiltering
  }

  nextFiltering[BUSINESS_STATUS_FILTER_ID] = queueId
  return nextFiltering
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

  return summary.status_counts[queueId]
}

function getQueueLabel(
  queueId: OrderDashboardQueueId,
  t: (key: string) => string
) {
  if (queueId === "all" || queueId === "action_required") {
    return t(`queues.${queueId}`)
  }

  return t(`statuses.${queueId}`)
}

function getTargetStatusOptions(
  selectedOrders: OrderDashboardOrder[],
  t: (key: string) => string
): TargetStatusOption[] {
  return ORDER_DASHBOARD_TARGET_STATUSES.map((targetStatus) => ({
    blockedOrders: getTargetStatusBlockedOrders(selectedOrders, targetStatus),
    label: t(`targetStatus.${targetStatus}`),
    value: targetStatus,
  }))
}

function getTargetStatusBlockedOrders(
  selectedOrders: OrderDashboardOrder[],
  targetStatus: OrderDashboardTargetStatus
): OrderDashboardBlockingOrder[] {
  return selectedOrders.flatMap((order) => {
    const reason = getOrderDashboardTransitionBlockReason(order, targetStatus)

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

function getStatusBlockerLabel(blockedCount: number) {
  return blockedCount === 1 ? "Blocked" : `${blockedCount} blocked`
}

function getSelectedStatusBlockedMessage(
  statusLabel: string,
  blockedOrders: OrderDashboardBlockingOrder[]
) {
  if (blockedOrders.length === 1) {
    const [order] = blockedOrders
    return `${statusLabel} is blocked for 1 selected order: ${order.order_display_id} - ${order.reason}.`
  }

  return `${statusLabel} is blocked for ${blockedOrders.length} selected orders. Open the status menu for details.`
}

function formatOptionLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export const config = defineRouteConfig({
  label: "menuItem",
  nested: "/orders",
  rank: 10,
  translationNs: "orderDashboard",
})

export default OrderDashboardPage

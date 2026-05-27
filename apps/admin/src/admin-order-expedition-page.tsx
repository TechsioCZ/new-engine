import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import type {
  OrderExpeditionBlockingOrder,
  OrderExpeditionCarrierKey,
  OrderExpeditionOrder,
  OrderExpeditionTargetStatus,
} from "./admin-types"
import { AdminPageCount, AdminPageHeader } from "./components/admin-page-header"
import { AdminPanel } from "./components/admin-panel"
import { ORDER_EXPEDITION_LIST_LIMIT } from "./order-expedition/api/constants"
import { OrderDashboardDialogs } from "./order-expedition/components/dialogs"
import { OrderDashboardPagination } from "./order-expedition/components/footer"
import { OrderDashboardMessages } from "./order-expedition/components/messages"
import { OrdersTable } from "./order-expedition/components/orders-table"
import { OrderDashboardTabs } from "./order-expedition/components/tabs"
import { OrderDashboardToolbar } from "./order-expedition/components/toolbar"
import { useOrderExpeditionData } from "./order-expedition/hooks/use-order-expedition-data"
import { useOrderExpeditionMutations } from "./order-expedition/hooks/use-order-expedition-mutations"
import {
  getNextPageSelection,
  isOrderSelectionLimitBlocked,
  ORDER_EXPEDITION_MAX_ORDER_IDS,
  shouldWarnPageSelectionLimit,
} from "./order-expedition/model/orders"
import {
  getBulkBusinessStatusPreview,
  getBulkBusinessStatusTarget,
  getManualStatusLabel,
  isManualOrderBusinessStatusId,
  type ManualStatusValue,
} from "./order-expedition/model/statuses"
import {
  getTargetStatusOptions,
  isOrderExpeditionTargetStatus,
  MEDUSA_STATUS_LABELS,
} from "./order-expedition/model/target-statuses"
import {
  ALL_CARRIERS,
  getBusinessStatusForDashboardView,
  getExpeditionViewForDashboardView,
  getListSearchParams,
  getOffsetSearchParams,
  isOrderDashboardViewId,
  isOrderExpeditionCarrierKey,
  type OrderDashboardViewId,
  readOrderDashboardView,
  readOrderExpeditionCarrier,
} from "./order-expedition/model/views"
import { showOrderExpeditionToast } from "./order-expedition/toast"
import { formatCountLabel, readOffset } from "./utils/format"

export function OrderExpeditionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const offset = readOffset(searchParams.get("offset"))
  const dashboardView = readOrderDashboardView(searchParams.get("view"))
  const carrier = readOrderExpeditionCarrier(searchParams.get("carrier"))
  const businessStatus = getBusinessStatusForDashboardView(dashboardView)
  const expeditionView = getExpeditionViewForDashboardView(dashboardView)
  const [selectedOrdersById, setSelectedOrdersById] = useState<
    Map<string, OrderExpeditionOrder>
  >(new Map())
  const [targetStatus, setTargetStatus] = useState<
    OrderExpeditionTargetStatus | ""
  >("")
  const [bulkManualStatus, setBulkManualStatus] = useState<
    ManualStatusValue | ""
  >("")
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [isMedusaStatusDialogOpen, setIsMedusaStatusDialogOpen] =
    useState(false)
  const [blockingOrders, setBlockingOrders] = useState<
    OrderExpeditionBlockingOrder[]
  >([])

  const {
    businessStatusesQuery,
    canNextPage,
    canPreviousPage,
    carrierItems,
    count,
    countExact,
    dashboardCountsByView,
    notice,
    orderErrorMessage,
    orders,
    ordersQuery,
    pageIndex,
  } = useOrderExpeditionData({
    businessStatus,
    carrier,
    dashboardView,
    expeditionView,
    offset,
  })

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
  const selectedCount = selectedOrdersById.size
  const allPageOrdersSelected =
    orders.length > 0 && orders.every((order) => selectedOrderIds.has(order.id))
  const somePageOrdersSelected =
    orders.some((order) => selectedOrderIds.has(order.id)) &&
    !allPageOrdersSelected
  const isSelectionLimitReached =
    selectedCount >= ORDER_EXPEDITION_MAX_ORDER_IDS
  const targetStatusOptions = useMemo(
    () => getTargetStatusOptions(selectedOrders),
    [selectedOrders]
  )
  const selectedTargetStatusOption = targetStatus
    ? targetStatusOptions.find((option) => option.value === targetStatus)
    : undefined
  const selectedTargetStatusBlockers =
    selectedTargetStatusOption?.blockedOrders ?? []
  const bulkBusinessStatusTarget = getBulkBusinessStatusTarget(bulkManualStatus)
  const bulkBusinessStatusPreview =
    bulkBusinessStatusTarget === undefined
      ? { skipped: [], updatable: [] }
      : getBulkBusinessStatusPreview(selectedOrders, bulkBusinessStatusTarget)
  const {
    bulkManualStatusMutation,
    manualStatusMutation,
    medusaStatusMutation,
    printMutation,
  } = useOrderExpeditionMutations({
    onBulkManualStatusSuccess: () => {
      setSelectedOrdersById(new Map())
      setBulkManualStatus("")
      setIsBulkDialogOpen(false)
    },
    onMedusaStatusSuccess: () => {
      setSelectedOrdersById(new Map())
      setTargetStatus("")
      setIsMedusaStatusDialogOpen(false)
    },
    selectedCount,
    setBlockingOrders,
    toast,
  })

  useEffect(() => {
    if (selectedCount > 0) {
      return
    }

    setTargetStatus("")
    setBulkManualStatus("")
    setIsMedusaStatusDialogOpen(false)
    setBlockingOrders([])
  }, [selectedCount])

  function setOffset(nextOffset: number) {
    setSearchParams(getOffsetSearchParams(searchParams, nextOffset))
  }

  function resetSelectionState() {
    setSelectedOrdersById(new Map())
    setTargetStatus("")
    setBulkManualStatus("")
    setIsMedusaStatusDialogOpen(false)
    setBlockingOrders([])
  }

  function updateListSearchParams({
    carrier: nextCarrier,
    view,
  }: {
    carrier?: OrderExpeditionCarrierKey | "all"
    view?: OrderDashboardViewId
  }) {
    resetSelectionState()
    setSearchParams(
      getListSearchParams(searchParams, { carrier: nextCarrier, view })
    )
  }

  function toggleOrder(order: OrderExpeditionOrder) {
    if (
      isOrderSelectionLimitBlocked(order.id, selectedOrderIds, selectedCount)
    ) {
      showOrderExpeditionToast(
        toast,
        "warning",
        `Najednou lze vybrat max. ${ORDER_EXPEDITION_MAX_ORDER_IDS} objednavek`
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

  function togglePage() {
    if (
      shouldWarnPageSelectionLimit(
        allPageOrdersSelected,
        orders,
        selectedOrderIds,
        selectedCount
      )
    ) {
      showOrderExpeditionToast(
        toast,
        "warning",
        `Najednou lze vybrat max. ${ORDER_EXPEDITION_MAX_ORDER_IDS} objednavek`
      )
    }

    setBlockingOrders([])
    setSelectedOrdersById((prev) =>
      getNextPageSelection(prev, orders, allPageOrdersSelected)
    )
  }

  function handlePrint() {
    if (!selectedOrderIdsList.length) {
      return
    }

    setBlockingOrders([])
    printMutation.mutate(selectedOrderIdsList)
  }

  function handleMedusaStatusUpdate() {
    if (!selectedOrderIdsList.length) {
      return
    }

    if (!targetStatus) {
      showOrderExpeditionToast(toast, "error", "Vyber Medusa status")
      return
    }

    if (selectedTargetStatusBlockers.length) {
      setBlockingOrders(selectedTargetStatusBlockers)
      showOrderExpeditionToast(
        toast,
        "error",
        "Vybrany status nejde pouzit pro vsechny objednavky"
      )
      return
    }

    setBlockingOrders([])
    setIsMedusaStatusDialogOpen(true)
  }

  function handleMedusaStatusConfirm() {
    if (!(selectedOrderIdsList.length && targetStatus)) {
      return
    }

    medusaStatusMutation.mutate({
      orderIds: selectedOrderIdsList,
      targetStatus,
    })
  }

  function handleBulkManualStatusConfirm() {
    if (bulkBusinessStatusTarget === undefined) {
      return
    }

    if (!bulkBusinessStatusPreview.updatable.length) {
      setBlockingOrders(bulkBusinessStatusPreview.skipped)
      setIsBulkDialogOpen(false)
      showOrderExpeditionToast(
        toast,
        "error",
        "Zadne vybrane objednavky nelze aktualizovat"
      )
      return
    }

    setBlockingOrders([])
    bulkManualStatusMutation.mutate({
      orderIds: selectedOrderIdsList,
      status: bulkBusinessStatusTarget,
    })
  }

  function handleDashboardViewChange(value: string) {
    if (!isOrderDashboardViewId(value) || value === dashboardView) {
      return
    }

    updateListSearchParams({ view: value })
  }

  function handleCarrierChange(value: string) {
    if (value === ALL_CARRIERS || isOrderExpeditionCarrierKey(value)) {
      updateListSearchParams({ carrier: value })
    }
  }

  function handleBulkManualStatusChange(value: string) {
    if (value === "clear" || isManualOrderBusinessStatusId(value)) {
      setBulkManualStatus(value)
      setBlockingOrders([])
    }
  }

  function handleTargetStatusChange(value: string) {
    if (!isOrderExpeditionTargetStatus(value)) {
      return
    }

    const option = targetStatusOptions.find((status) => status.value === value)

    if (option?.blockedOrders.length) {
      setBlockingOrders(option.blockedOrders)
      return
    }

    setTargetStatus(value)
    setBlockingOrders([])
  }

  function handleOpenBulkManualStatusDialog() {
    if (bulkBusinessStatusTarget === undefined) {
      showOrderExpeditionToast(toast, "error", "Vyber manualni status")
      return
    }

    setBlockingOrders([])
    setIsBulkDialogOpen(true)
  }

  return (
    <div className="grid gap-400">
      <AdminPageHeader eyebrow="Objednavky" title="Prehled objednavek">
        <AdminPageCount
          label="objednavek"
          value={formatCountLabel(count, countExact)}
        />
      </AdminPageHeader>

      <AdminPanel>
        <OrderDashboardTabs
          countsByView={dashboardCountsByView}
          onValueChange={handleDashboardViewChange}
          value={dashboardView}
        />
        <OrderDashboardToolbar
          bulkManualStatus={bulkManualStatus}
          bulkManualStatusPending={bulkManualStatusMutation.isPending}
          carrier={carrier}
          carrierItems={carrierItems}
          isMedusaStatusPending={medusaStatusMutation.isPending}
          isPrintPending={printMutation.isPending}
          onBulkManualStatusChange={handleBulkManualStatusChange}
          onCarrierChange={handleCarrierChange}
          onMedusaStatusChange={handleTargetStatusChange}
          onOpenBulkManualStatusDialog={handleOpenBulkManualStatusDialog}
          onPrint={handlePrint}
          onUseMedusaStatus={handleMedusaStatusUpdate}
          selectedCount={selectedCount}
          selectedTargetStatusBlockers={selectedTargetStatusBlockers}
          targetStatus={targetStatus}
          targetStatusOptions={targetStatusOptions}
        />

        <OrderDashboardMessages
          blockingOrders={blockingOrders}
          notice={notice}
        />

        <OrdersTable
          allPageOrdersSelected={allPageOrdersSelected}
          errorMessage={orderErrorMessage}
          isError={ordersQuery.isError || businessStatusesQuery.isError}
          isLoading={ordersQuery.isLoading}
          isSelectionLimitReached={isSelectionLimitReached}
          manualStatusMutationPending={manualStatusMutation.isPending}
          onManualStatusChange={(orderId, status) => {
            manualStatusMutation.mutate({ orderId, status })
          }}
          onToggleOrder={toggleOrder}
          onTogglePage={togglePage}
          orders={orders}
          selectedOrderIds={selectedOrderIds}
          somePageOrdersSelected={somePageOrdersSelected}
        />

        <div className="flex items-center justify-between gap-300 border-border-primary border-t p-400">
          <OrderDashboardPagination
            canNextPage={canNextPage}
            canPreviousPage={canPreviousPage}
            onNextPage={() => setOffset(offset + ORDER_EXPEDITION_LIST_LIMIT)}
            onPreviousPage={() =>
              setOffset(Math.max(0, offset - ORDER_EXPEDITION_LIST_LIMIT))
            }
            pageIndex={pageIndex}
          />
        </div>
      </AdminPanel>

      <OrderDashboardDialogs
        bulkManualStatusLabel={
          bulkBusinessStatusTarget === undefined
            ? ""
            : getManualStatusLabel(bulkBusinessStatusTarget)
        }
        bulkManualStatusPending={bulkManualStatusMutation.isPending}
        bulkManualStatusPreview={bulkBusinessStatusPreview}
        isBulkDialogOpen={isBulkDialogOpen}
        isMedusaStatusDialogOpen={isMedusaStatusDialogOpen}
        medusaStatusLabel={
          targetStatus ? MEDUSA_STATUS_LABELS[targetStatus] : ""
        }
        medusaStatusPending={medusaStatusMutation.isPending}
        onBulkConfirm={handleBulkManualStatusConfirm}
        onBulkDialogOpenChange={setIsBulkDialogOpen}
        onMedusaConfirm={handleMedusaStatusConfirm}
        onMedusaStatusDialogOpenChange={setIsMedusaStatusDialogOpen}
        selectedOrders={selectedOrders}
        targetStatus={targetStatus}
      />
    </div>
  )
}

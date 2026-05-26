import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  bulkUpdateOrderBusinessStatus,
  downloadOrderExpeditionPdf,
  ORDER_EXPEDITION_LIST_LIMIT,
  updateOrderBusinessStatus,
  updateOrderExpeditionStatus,
  useOrderBusinessStatusesByIds,
  useOrderExpeditionCarriers,
  useOrderExpeditionOrders,
} from "./admin-api"
import type {
  ManualOrderBusinessStatusId,
  OrderBusinessStatus,
  OrderBusinessStatusId,
  OrderBusinessStatusSummary,
  OrderBusinessStatusTone,
  OrderExpeditionBlockingOrder,
  OrderExpeditionCarrierKey,
  OrderExpeditionOrder,
  OrderExpeditionTargetStatus,
} from "./admin-types"
import { AdminPageCount, AdminPageHeader } from "./components/admin-page-header"
import { AdminPanel } from "./components/admin-panel"
import { AdminSelectField } from "./components/admin-select-field"
import { AdminState } from "./components/admin-state"
import { AdminTable } from "./components/admin-table"
import { AdminToolbarButton } from "./components/admin-toolbar-button"
import {
  formatCountLabel,
  formatDateTime,
  formatMoney,
  readOffset,
} from "./utils/format"

const ALL_CARRIERS = "all"
const ALL_BUSINESS_STATUSES = "all"
const ORDER_EXPEDITION_MAX_ORDER_IDS = 1000

const ORDER_BUSINESS_STATUS_IDS = [
  "new",
  "awaiting_payment",
  "paid",
  "processing",
  "waiting_for_supplier",
  "shipped",
  "delivered",
  "canceled",
] as const satisfies readonly OrderBusinessStatusId[]

const MANUAL_ORDER_BUSINESS_STATUS_IDS = [
  "processing",
  "waiting_for_supplier",
  "canceled",
] as const satisfies readonly ManualOrderBusinessStatusId[]

const ORDER_EXPEDITION_TARGET_STATUSES = [
  "pending",
  "completed",
  "draft",
  "archived",
  "canceled",
  "requires_action",
] as const satisfies readonly OrderExpeditionTargetStatus[]

const ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS = {
  archived: [],
  canceled: ["archived"],
  completed: ["archived"],
  draft: ["pending", "requires_action", "completed", "canceled", "archived"],
  pending: ["draft", "requires_action", "completed", "canceled"],
  requires_action: ["draft", "pending", "completed", "canceled"],
} as const satisfies Record<
  OrderExpeditionTargetStatus,
  readonly OrderExpeditionTargetStatus[]
>

const BUSINESS_STATUS_LABELS: Record<OrderBusinessStatusId, string> = {
  awaiting_payment: "Ceka na platbu",
  canceled: "Storno",
  delivered: "Doruceno",
  new: "Nova",
  paid: "Zaplaceno",
  processing: "Zpracovava se",
  shipped: "Odeslano",
  waiting_for_supplier: "Ceka na dodavatele",
}

const BUSINESS_STATUS_BADGE_VARIANTS: Record<
  OrderBusinessStatusTone,
  "danger" | "info" | "outline" | "success" | "warning"
> = {
  blue: "info",
  green: "success",
  grey: "outline",
  orange: "warning",
  purple: "info",
  red: "danger",
}

const MEDUSA_STATUS_LABELS: Record<OrderExpeditionTargetStatus, string> = {
  archived: "Archived",
  canceled: "Canceled",
  completed: "Completed",
  draft: "Draft",
  pending: "Pending",
  requires_action: "Requires action",
}

type ManualStatusValue = ManualOrderBusinessStatusId | "clear"

type TargetStatusOption = SelectItem & {
  blockedOrders: OrderExpeditionBlockingOrder[]
  value: OrderExpeditionTargetStatus
}

const MANUAL_STATUS_ITEMS: Array<SelectItem & { value: ManualStatusValue }> = [
  ...MANUAL_ORDER_BUSINESS_STATUS_IDS.map((value) => ({
    displayValue: BUSINESS_STATUS_LABELS[value],
    label: BUSINESS_STATUS_LABELS[value],
    value,
  })),
  {
    displayValue: "Vymazat manualni status",
    label: "Vymazat manualni status",
    value: "clear",
  },
]

function isManualOrderBusinessStatusId(
  value: unknown
): value is ManualOrderBusinessStatusId {
  return MANUAL_ORDER_BUSINESS_STATUS_IDS.some((status) => status === value)
}

function isOrderBusinessStatusId(
  value: unknown
): value is OrderBusinessStatusId {
  return ORDER_BUSINESS_STATUS_IDS.some((status) => status === value)
}

function isOrderExpeditionCarrierKey(
  value: unknown
): value is OrderExpeditionCarrierKey {
  return value === "ppl" || value === "packeta" || value === "other"
}

function isOrderExpeditionTargetStatus(
  value: unknown
): value is OrderExpeditionTargetStatus {
  return ORDER_EXPEDITION_TARGET_STATUSES.some((status) => status === value)
}

function isOrderExpeditionTransitionSourceStatus(
  value: string
): value is OrderExpeditionTargetStatus {
  return isOrderExpeditionTargetStatus(value)
}

function formatStatusForReason(status: string) {
  return status.replace(/_/g, " ")
}

function formatStatusSubject(status: string) {
  const formatted = formatStatusForReason(status)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function hasOrderExpeditionActiveFulfillment(order: OrderExpeditionOrder) {
  return Boolean(order.has_active_fulfillment)
}

function getOrderExpeditionTransitionBlockReason(
  order: OrderExpeditionOrder,
  targetStatus: OrderExpeditionTargetStatus
) {
  const currentStatus = order.status

  if (!currentStatus) {
    return "Order status is unknown"
  }

  if (currentStatus === targetStatus) {
    return `Order is already ${formatStatusForReason(targetStatus)}`
  }

  if (!isOrderExpeditionTransitionSourceStatus(currentStatus)) {
    return `Order status ${formatStatusForReason(currentStatus)} cannot be changed`
  }

  if (currentStatus === "archived") {
    return "Archived orders cannot be changed"
  }

  if (currentStatus === "canceled" && targetStatus !== "archived") {
    return "Canceled orders can only be archived"
  }

  if (currentStatus === "completed" && targetStatus === "canceled") {
    return "Completed orders cannot be canceled"
  }

  if (currentStatus === "completed" && targetStatus !== "archived") {
    return "Completed orders can only be archived"
  }

  if (
    targetStatus === "canceled" &&
    hasOrderExpeditionActiveFulfillment(order)
  ) {
    return "Orders with active fulfillments cannot be canceled"
  }

  const allowedTargetStatuses: readonly OrderExpeditionTargetStatus[] =
    ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS[currentStatus]

  if (!allowedTargetStatuses.includes(targetStatus)) {
    return `${formatStatusSubject(currentStatus)} orders cannot be changed to ${formatStatusForReason(targetStatus)}`
  }

  return
}

function getManualStatusLabel(status: ManualOrderBusinessStatusId | null) {
  return status === null
    ? "Vymazat manualni status"
    : BUSINESS_STATUS_LABELS[status]
}

function getBusinessStatus(order: OrderExpeditionOrder): OrderBusinessStatus {
  return order.business_status
}

function getBusinessStatusBulkBlockReason(
  order: OrderExpeditionOrder,
  status: ManualOrderBusinessStatusId | null
) {
  const currentManualStatus = order.manual_status ?? null

  if (currentManualStatus === status) {
    return status === null
      ? "Manual status is already clear"
      : `Manual status is already ${getManualStatusLabel(status)}`
  }

  if (status === null || status === "canceled") {
    return
  }

  const businessStatus = getBusinessStatus(order)

  if (order.status === "canceled") {
    return "Canceled orders stay canceled"
  }

  if (businessStatus.id === "delivered" || businessStatus.id === "shipped") {
    return `${BUSINESS_STATUS_LABELS[businessStatus.id]} status has higher priority`
  }

  return
}

function getBulkBusinessStatusPreview(
  orders: OrderExpeditionOrder[],
  status: ManualOrderBusinessStatusId | null
) {
  const skipped: OrderExpeditionBlockingOrder[] = []
  const updatable: OrderExpeditionOrder[] = []

  for (const order of orders) {
    const reason = getBusinessStatusBulkBlockReason(order, status)

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

function mergeBusinessStatusSummary(
  order: OrderExpeditionOrder,
  summary: OrderBusinessStatusSummary | undefined
): OrderExpeditionOrder {
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

function getOrderItemsSummary(order: OrderExpeditionOrder) {
  if (!order.items.length) {
    return "-"
  }

  return order.items
    .slice(0, 3)
    .map((item) => `${item.quantity}x ${item.sku ?? item.title}`)
    .join(", ")
}

function getCarrierLabel(order: OrderExpeditionOrder) {
  return order.carrier.shipping_method_name ?? order.carrier.label
}

function getNextPageSelection(
  prev: Map<string, OrderExpeditionOrder>,
  orders: OrderExpeditionOrder[],
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
  selectedOrders: OrderExpeditionOrder[]
): TargetStatusOption[] {
  return ORDER_EXPEDITION_TARGET_STATUSES.map((status) => {
    const blockedOrders = selectedOrders
      .map((order) => {
        const reason = getOrderExpeditionTransitionBlockReason(order, status)

        return reason
          ? {
              id: order.id,
              order_display_id: order.order_display_id,
              reason,
            }
          : null
      })
      .filter((order): order is OrderExpeditionBlockingOrder => Boolean(order))

    return {
      disabled: blockedOrders.length > 0,
      displayValue:
        blockedOrders.length > 0
          ? `${MEDUSA_STATUS_LABELS[status]} (${blockedOrders.length} blocked)`
          : MEDUSA_STATUS_LABELS[status],
      label:
        blockedOrders.length > 0
          ? `${MEDUSA_STATUS_LABELS[status]} (${blockedOrders.length} blocked)`
          : MEDUSA_STATUS_LABELS[status],
      blockedOrders,
      value: status,
    }
  })
}

function shouldWarnPageSelectionLimit(
  allPageOrdersSelected: boolean,
  orders: OrderExpeditionOrder[],
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

function formatLimitedNotice({
  carrierFilterLimitReached,
  countExact,
  hasNext,
  limit,
  scannedCount,
}: {
  carrierFilterLimitReached: boolean
  countExact: boolean
  hasNext: boolean
  limit: number
  scannedCount: number | null
}) {
  if (!countExact) {
    return carrierFilterLimitReached && scannedCount !== null
      ? `Filtr dopravce proskenoval prvnich ${scannedCount} objednavek. Dalsi shody mohou existovat.`
      : "Pocet neni presny; dalsi objednavky mohou byt mimo nacteny rozsah."
  }

  return hasNext ? `Zobrazuje se prvnich ${limit} objednavek.` : null
}

function showToast(
  toast: ReturnType<typeof useToast>,
  type: "error" | "success" | "warning",
  title: string,
  description?: string
) {
  toast.create({ description, title, type })
}

export function OrderExpeditionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const toast = useToast()
  const offset = readOffset(searchParams.get("offset"))
  const [carrier, setCarrier] = useState<OrderExpeditionCarrierKey | "all">(
    ALL_CARRIERS
  )
  const [businessStatus, setBusinessStatus] = useState<
    OrderBusinessStatusId | "all"
  >(ALL_BUSINESS_STATUSES)
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
  const [blockingOrders, setBlockingOrders] = useState<
    OrderExpeditionBlockingOrder[]
  >([])

  const carriersQuery = useOrderExpeditionCarriers()
  const ordersQuery = useOrderExpeditionOrders({
    businessStatus,
    carrier,
    offset,
  })
  const rawOrders = useMemo(
    () => ordersQuery.data?.orders ?? [],
    [ordersQuery.data?.orders]
  )
  const rawOrderIds = useMemo(
    () => rawOrders.map((order) => order.id),
    [rawOrders]
  )
  const businessStatusesQuery = useOrderBusinessStatusesByIds(rawOrderIds)
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
  const pageIndex = Math.floor(offset / ORDER_EXPEDITION_LIST_LIMIT)
  const count = ordersQuery.data?.count ?? 0
  const countExact = ordersQuery.data?.count_exact ?? true
  const canPreviousPage = offset > 0
  const canNextPage =
    ordersQuery.data?.has_next ?? offset + ORDER_EXPEDITION_LIST_LIMIT < count
  const notice = ordersQuery.data
    ? formatLimitedNotice({
        carrierFilterLimitReached:
          ordersQuery.data.carrier_filter_limit_reached,
        countExact: ordersQuery.data.count_exact,
        hasNext: ordersQuery.data.has_next,
        limit: ordersQuery.data.limit,
        scannedCount: ordersQuery.data.scanned_count,
      })
    : null

  const printMutation = useMutation({
    mutationFn: downloadOrderExpeditionPdf,
    onError: (error) => {
      showToast(
        toast,
        "error",
        "PDF se nepodarilo vytvorit",
        error instanceof Error ? error.message : undefined
      )
    },
    onSuccess: () => {
      showToast(toast, "success", "PDF bylo vygenerovano")
    },
  })

  const medusaStatusMutation = useMutation({
    mutationFn: updateOrderExpeditionStatus,
    onSuccess: async (result) => {
      if (!result.ok) {
        setBlockingOrders(result.blockedOrders)
        showToast(toast, "error", result.message)
        return
      }

      showToast(toast, "success", `${selectedCount} objednavek aktualizovano`)
      setSelectedOrdersById(new Map())
      setTargetStatus("")
      await queryClient.invalidateQueries({
        queryKey: ["order-expedition-orders"],
      })
    },
  })

  const manualStatusMutation = useMutation({
    mutationFn: updateOrderBusinessStatus,
    onError: (error) => {
      showToast(
        toast,
        "error",
        "Manualni status se nepodarilo ulozit",
        error instanceof Error ? error.message : undefined
      )
    },
    onSuccess: async () => {
      showToast(toast, "success", "Manualni status ulozen")
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["order-expedition-orders"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["order-business-statuses-by-ids"],
        }),
      ])
    },
  })

  const bulkManualStatusMutation = useMutation({
    mutationFn: bulkUpdateOrderBusinessStatus,
    onError: (error) => {
      showToast(
        toast,
        "error",
        "Bulk manualni status se nepodarilo ulozit",
        error instanceof Error ? error.message : undefined
      )
    },
    onSuccess: async (result) => {
      setBlockingOrders(result.skipped)
      showToast(
        toast,
        "success",
        `Manualni status ulozen pro ${result.count} objednavek`,
        `${result.skipped_count} preskoceno`
      )
      setSelectedOrdersById(new Map())
      setBulkManualStatus("")
      setIsBulkDialogOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["order-expedition-orders"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["order-business-statuses-by-ids"],
        }),
      ])
    },
  })

  useEffect(() => {
    if (selectedCount > 0) {
      return
    }

    setTargetStatus("")
    setBulkManualStatus("")
    setBlockingOrders([])
  }, [selectedCount])

  function setOffset(nextOffset: number) {
    const params = new URLSearchParams(searchParams)

    if (nextOffset > 0) {
      params.set("offset", String(nextOffset))
    } else {
      params.delete("offset")
    }

    setSearchParams(params)
  }

  function resetListState() {
    setOffset(0)
    setSelectedOrdersById(new Map())
    setTargetStatus("")
    setBulkManualStatus("")
    setBlockingOrders([])
  }

  function toggleOrder(order: OrderExpeditionOrder) {
    if (
      isOrderSelectionLimitBlocked(order.id, selectedOrderIds, selectedCount)
    ) {
      showToast(
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
      showToast(
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
      showToast(toast, "error", "Vyber Medusa status")
      return
    }

    if (selectedTargetStatusBlockers.length) {
      setBlockingOrders(selectedTargetStatusBlockers)
      showToast(
        toast,
        "error",
        "Vybrany status nejde pouzit pro vsechny objednavky"
      )
      return
    }

    setBlockingOrders([])
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
      showToast(toast, "error", "Zadne vybrane objednavky nelze aktualizovat")
      return
    }

    setBlockingOrders([])
    bulkManualStatusMutation.mutate({
      orderIds: selectedOrderIdsList,
      status: bulkBusinessStatusTarget,
    })
  }

  const carrierItems: SelectItem[] = [
    {
      displayValue: "Vsichni dopravci",
      label: "Vsichni dopravci",
      value: ALL_CARRIERS,
    },
    ...(carriersQuery.data?.carriers ?? []).map((option) => ({
      displayValue: option.label,
      label: option.label,
      value: option.value,
    })),
  ]
  const businessStatusItems: SelectItem[] = [
    {
      displayValue: "Vsechny business statusy",
      label: "Vsechny business statusy",
      value: ALL_BUSINESS_STATUSES,
    },
    ...ORDER_BUSINESS_STATUS_IDS.map((status) => ({
      displayValue: BUSINESS_STATUS_LABELS[status],
      label: BUSINESS_STATUS_LABELS[status],
      value: status,
    })),
  ]

  return (
    <div className="grid gap-400">
      <AdminPageHeader eyebrow="Objednavky" title="Expedice a rucni zasahy">
        <AdminPageCount
          label="objednavek"
          value={formatCountLabel(count, countExact)}
        />
      </AdminPageHeader>

      <AdminPanel>
        <div className="border-border-primary border-b p-400">
          <div className="flex flex-wrap items-end gap-300">
            <AdminSelectField
              className="w-48"
              items={carrierItems}
              label="Dopravce"
              onValueChange={(value) => {
                if (
                  value === ALL_CARRIERS ||
                  isOrderExpeditionCarrierKey(value)
                ) {
                  setCarrier(value)
                  resetListState()
                }
              }}
              size="sm"
              value={carrier}
            />
            <AdminSelectField
              className="w-56"
              items={businessStatusItems}
              label={<span className="whitespace-nowrap">Business status</span>}
              onValueChange={(value) => {
                if (
                  value === ALL_BUSINESS_STATUSES ||
                  isOrderBusinessStatusId(value)
                ) {
                  setBusinessStatus(value)
                  resetListState()
                }
              }}
              size="sm"
              value={businessStatus}
            />
            <span className="flex h-form-control-sm items-center text-fg-secondary text-sm">
              {selectedCount} vybrano
            </span>
            <AdminToolbarButton
              disabled={selectedCount === 0}
              isLoading={printMutation.isPending}
              onClick={handlePrint}
            >
              PDF
            </AdminToolbarButton>
            <AdminSelectField
              className="w-52"
              disabled={selectedCount === 0}
              items={MANUAL_STATUS_ITEMS}
              label={<span className="whitespace-nowrap">Manualni status</span>}
              onValueChange={(value) => {
                if (value === "clear" || isManualOrderBusinessStatusId(value)) {
                  setBulkManualStatus(value)
                  setBlockingOrders([])
                }
              }}
              size="sm"
              value={bulkManualStatus}
            />
            <AdminToolbarButton
              disabled={selectedCount === 0 || !bulkManualStatus}
              isLoading={bulkManualStatusMutation.isPending}
              onClick={() => {
                if (bulkBusinessStatusTarget === undefined) {
                  showToast(toast, "error", "Vyber manualni status")
                  return
                }
                setBlockingOrders([])
                setIsBulkDialogOpen(true)
              }}
            >
              Pouzit manualni status
            </AdminToolbarButton>
            <AdminSelectField
              className="w-44"
              disabled={selectedCount === 0}
              items={targetStatusOptions}
              label={<span className="whitespace-nowrap">Medusa status</span>}
              onValueChange={(value) => {
                if (!isOrderExpeditionTargetStatus(value)) {
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
              size="sm"
              value={targetStatus}
            />
            <AdminToolbarButton
              disabled={
                selectedCount === 0 ||
                !targetStatus ||
                selectedTargetStatusBlockers.length > 0
              }
              isLoading={medusaStatusMutation.isPending}
              onClick={handleMedusaStatusUpdate}
              theme="solid"
            >
              Pouzit Medusa status
            </AdminToolbarButton>
          </div>
        </div>

        {notice ? (
          <div className="border-border-primary border-b p-400">
            <AdminState>{notice}</AdminState>
          </div>
        ) : null}

        {blockingOrders.length ? (
          <BlockingOrders orders={blockingOrders} />
        ) : null}

        <OrdersTable
          allPageOrdersSelected={allPageOrdersSelected}
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
          <span className="text-fg-secondary text-sm">
            Strana {pageIndex + 1}
          </span>
          <div className="flex items-center gap-200">
            <AdminToolbarButton
              disabled={!canPreviousPage}
              onClick={() =>
                setOffset(Math.max(0, offset - ORDER_EXPEDITION_LIST_LIMIT))
              }
            >
              Predchozi
            </AdminToolbarButton>
            <AdminToolbarButton
              disabled={!canNextPage}
              onClick={() => setOffset(offset + ORDER_EXPEDITION_LIST_LIMIT)}
            >
              Dalsi
            </AdminToolbarButton>
          </div>
        </div>
      </AdminPanel>

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setIsBulkDialogOpen(false)}
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Zrusit
            </Button>
            <Button
              disabled={!bulkBusinessStatusPreview.updatable.length}
              isLoading={bulkManualStatusMutation.isPending}
              onClick={handleBulkManualStatusConfirm}
              size="sm"
            >
              Pouzit
            </Button>
          </>
        }
        customTrigger
        description="Aktualizovany budou jen objednavky, ktere zmena manualniho statusu neblokuje."
        onOpenChange={(details) => setIsBulkDialogOpen(details.open)}
        open={isBulkDialogOpen}
        title="Pouzit manualni status"
      >
        <BulkManualStatusPreview
          label={
            bulkBusinessStatusTarget === undefined
              ? ""
              : getManualStatusLabel(bulkBusinessStatusTarget)
          }
          preview={bulkBusinessStatusPreview}
        />
      </Dialog>
    </div>
  )
}

function BlockingOrders({
  orders,
}: {
  orders: OrderExpeditionBlockingOrder[]
}) {
  return (
    <div className="grid gap-200 border-border-primary border-b bg-fill-base p-400">
      <div className="font-medium text-danger">
        Nektere objednavky nesly aktualizovat.
      </div>
      <div className="grid gap-100 text-fg-secondary text-sm">
        {orders.map((order) => (
          <div key={`${order.id}-${order.reason}`}>
            {order.order_display_id}: {order.reason}
          </div>
        ))}
      </div>
    </div>
  )
}

function BulkManualStatusPreview({
  label,
  preview,
}: {
  label: string
  preview: {
    skipped: OrderExpeditionBlockingOrder[]
    updatable: OrderExpeditionOrder[]
  }
}) {
  return (
    <div className="grid max-h-[var(--spacing-80)] gap-300 overflow-auto text-sm">
      <div>
        Cilovy status: <span className="font-medium">{label}</span>
      </div>
      <div>
        {preview.updatable.length} objednavek se aktualizuje.{" "}
        {preview.skipped.length} objednavek bude preskoceno.
      </div>
      <PreviewList title="Bude aktualizovano">
        {preview.updatable.slice(0, 10).map((order) => (
          <div key={order.id}>
            {order.order_display_id}: {label}
          </div>
        ))}
      </PreviewList>
      {preview.skipped.length ? (
        <PreviewList title="Preskoceno">
          {preview.skipped.slice(0, 10).map((order) => (
            <div key={`${order.id}-${order.reason}`}>
              {order.order_display_id}: {order.reason}
            </div>
          ))}
        </PreviewList>
      ) : null}
    </div>
  )
}

function PreviewList({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <div className="grid gap-100 rounded-md border border-border-primary bg-fill-base p-300">
      <div className="font-medium">{title}</div>
      <div className="grid gap-100 text-fg-secondary">{children}</div>
    </div>
  )
}

function OrdersTable({
  allPageOrdersSelected,
  isLoading,
  isSelectionLimitReached,
  manualStatusMutationPending,
  onManualStatusChange,
  onToggleOrder,
  onTogglePage,
  orders,
  selectedOrderIds,
  somePageOrdersSelected,
}: {
  allPageOrdersSelected: boolean
  isLoading: boolean
  isSelectionLimitReached: boolean
  manualStatusMutationPending: boolean
  onManualStatusChange: (
    orderId: string,
    status: ManualOrderBusinessStatusId | null
  ) => void
  onToggleOrder: (order: OrderExpeditionOrder) => void
  onTogglePage: () => void
  orders: OrderExpeditionOrder[]
  selectedOrderIds: Set<string>
  somePageOrdersSelected: boolean
}) {
  if (isLoading) {
    return <AdminState isBusy>Nacitam objednavky...</AdminState>
  }

  if (!orders.length) {
    return <AdminState>Zadne objednavky neodpovidaji filtrum.</AdminState>
  }

  return (
    <AdminTable
      className="min-w-[var(--container-max-w)]"
      stickyHeader
      width="3xl"
    >
      <AdminTable.Header>
        <AdminTable.Row>
          <AdminTable.ColumnHeader className="w-12">
            <Checkbox
              checked={allPageOrdersSelected}
              indeterminate={somePageOrdersSelected}
              onChange={onTogglePage}
            />
          </AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Objednavka</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Zakaznik</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Vytvoreno</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Castka</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Business status</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Dopravce</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Platba</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Polozky</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Adresa</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Manualni status</AdminTable.ColumnHeader>
        </AdminTable.Row>
      </AdminTable.Header>
      <AdminTable.Body>
        {orders.map((order) => (
          <AdminTable.Row
            key={order.id}
            selected={selectedOrderIds.has(order.id)}
          >
            <AdminTable.Cell>
              <Checkbox
                checked={selectedOrderIds.has(order.id)}
                disabled={
                  !selectedOrderIds.has(order.id) && isSelectionLimitReached
                }
                onChange={() => onToggleOrder(order)}
              />
            </AdminTable.Cell>
            <AdminTable.Cell>
              <Link
                className="font-medium text-fg-primary hover:text-fg-secondary"
                to={`/orders/${order.id}`}
              >
                {order.order_display_id}
              </Link>
            </AdminTable.Cell>
            <AdminTable.Cell>
              <div className="grid gap-50">
                <span>{order.customer}</span>
                <span className="text-fg-secondary">{order.email ?? "-"}</span>
              </div>
            </AdminTable.Cell>
            <AdminTable.Cell>
              {formatDateTime(order.created_at)}
            </AdminTable.Cell>
            <AdminTable.Cell>
              {formatMoney(order.total, order.currency_code)}
            </AdminTable.Cell>
            <AdminTable.Cell>
              <BusinessStatusBadge status={getBusinessStatus(order)} />
            </AdminTable.Cell>
            <AdminTable.Cell>
              <Badge size="sm" variant="outline">
                {getCarrierLabel(order)}
              </Badge>
            </AdminTable.Cell>
            <AdminTable.Cell>
              <div className="grid gap-50">
                <span>{order.payment_method}</span>
                <span className="text-fg-secondary">
                  {order.payment_status ?? "-"}
                </span>
              </div>
            </AdminTable.Cell>
            <AdminTable.Cell className="max-w-48 truncate">
              {getOrderItemsSummary(order)}
            </AdminTable.Cell>
            <AdminTable.Cell className="max-w-56 truncate">
              {order.delivery_address.join(", ") || "-"}
            </AdminTable.Cell>
            <AdminTable.Cell>
              <AdminSelectField
                className="w-48"
                disabled={manualStatusMutationPending}
                items={MANUAL_STATUS_ITEMS}
                label={<span className="sr-only">Manualni status</span>}
                onValueChange={(value) => {
                  if (value === "clear") {
                    onManualStatusChange(order.id, null)
                  } else if (isManualOrderBusinessStatusId(value)) {
                    onManualStatusChange(order.id, value)
                  }
                }}
                placeholder="Manualni status"
                size="sm"
                value={order.manual_status ?? ""}
              />
            </AdminTable.Cell>
          </AdminTable.Row>
        ))}
      </AdminTable.Body>
    </AdminTable>
  )
}

function BusinessStatusBadge({ status }: { status: OrderBusinessStatus }) {
  return (
    <Badge size="sm" variant={BUSINESS_STATUS_BADGE_VARIANTS[status.tone]}>
      {BUSINESS_STATUS_LABELS[status.id]}
    </Badge>
  )
}

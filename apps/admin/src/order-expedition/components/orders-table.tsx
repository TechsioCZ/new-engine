import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"
import { Icon, type IconType } from "@techsio/ui-kit/atoms/icon"
import type {
  ManualOrderBusinessStatusId,
  OrderExpeditionIndicators,
  OrderExpeditionOrder,
} from "../../admin-types"
import { AdminTableLink } from "../../components/admin-link"
import { AdminSelectField } from "../../components/admin-select-field"
import { AdminState } from "../../components/admin-state"
import { AdminTable } from "../../components/admin-table"
import { formatDateTime, formatMoney } from "../../utils/format"
import {
  getCarrierLabel,
  getOrderIndicators,
  getOrderItemsSummary,
} from "../model/orders"
import {
  BUSINESS_STATUS_BADGE_VARIANTS,
  BUSINESS_STATUS_LABELS,
  getBusinessStatus,
  isManualOrderBusinessStatusId,
  MANUAL_STATUS_ITEMS,
} from "../model/statuses"

type OrderIndicatorConfig =
  | {
      color: "danger" | "success"
      icon: IconType
      key: keyof Pick<
        OrderExpeditionIndicators,
        "canceled" | "returning_customer"
      >
      label: string
      type: "icon"
    }
  | {
      key: keyof Pick<OrderExpeditionIndicators, "has_note" | "wholesale">
      label: string
      text: string
      type: "mark"
    }

const ORDER_INDICATORS: OrderIndicatorConfig[] = [
  {
    color: "success",
    icon: "token-icon-order-returning",
    key: "returning_customer",
    label: "Vracejici se zakaznik",
    type: "icon",
  },
  {
    color: "danger",
    icon: "token-icon-order-canceled",
    key: "canceled",
    label: "Stornovana objednavka",
    type: "icon",
  },
  {
    key: "has_note",
    label: "Poznamka u objednavky",
    text: "P",
    type: "mark",
  },
  {
    key: "wholesale",
    label: "Velkoobchodni zakaznik",
    text: "V",
    type: "mark",
  },
]

export function OrdersTable({
  allPageOrdersSelected,
  errorMessage,
  isError,
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
  errorMessage?: string
  isError: boolean
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

  if (isError) {
    return (
      <AdminState tone="error">
        {errorMessage ?? "Objednavky se nepodarilo nacist."}
      </AdminState>
    )
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
              aria-label="Vybrat objednavky na aktualni strance"
              checked={allPageOrdersSelected}
              indeterminate={somePageOrdersSelected}
              onChange={onTogglePage}
            />
          </AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Kod a datum</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Jmeno a prijmeni</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Zpusob dopravy</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Platba</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Prodejni kanal</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Stav</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader numeric>Cena</AdminTable.ColumnHeader>
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
                aria-label={`Vybrat objednavku ${order.order_display_id}`}
                checked={selectedOrderIds.has(order.id)}
                disabled={
                  !selectedOrderIds.has(order.id) && isSelectionLimitReached
                }
                onChange={() => onToggleOrder(order)}
              />
            </AdminTable.Cell>
            <AdminTable.Cell>
              <div className="grid gap-50">
                <AdminTableLink to={`/orders/${order.id}`}>
                  {order.order_display_id}
                </AdminTableLink>
                <span className="text-fg-secondary">
                  {formatDateTime(order.created_at)}
                </span>
              </div>
            </AdminTable.Cell>
            <AdminTable.Cell>
              <div className="grid gap-50">
                <span className="flex min-w-0 items-center gap-150">
                  <span className="truncate">{order.customer}</span>
                  <OrderIndicators indicators={getOrderIndicators(order)} />
                </span>
                <span className="text-fg-secondary">{order.email ?? "-"}</span>
              </div>
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
            <AdminTable.Cell>{order.sales_channel ?? "E-shop"}</AdminTable.Cell>
            <AdminTable.Cell>
              <BusinessStatusBadge status={getBusinessStatus(order)} />
            </AdminTable.Cell>
            <AdminTable.Cell numeric>
              {formatMoney(order.total, order.currency_code)}
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

function OrderIndicators({
  indicators,
}: {
  indicators: OrderExpeditionIndicators
}) {
  const activeIndicators = ORDER_INDICATORS.filter(
    (indicator) => indicators[indicator.key]
  )

  if (!activeIndicators.length) {
    return null
  }

  return (
    <span className="flex shrink-0 items-center gap-100">
      {activeIndicators.map((indicator) => {
        if (indicator.type === "mark") {
          return (
            <Badge
              key={indicator.key}
              size="sm"
              title={indicator.label}
              variant="outline"
            >
              {indicator.text}
            </Badge>
          )
        }

        return (
          <span
            aria-label={indicator.label}
            className="inline-flex"
            key={indicator.key}
            role="img"
            title={indicator.label}
          >
            <Icon color={indicator.color} icon={indicator.icon} size="sm" />
          </span>
        )
      })}
    </span>
  )
}

function BusinessStatusBadge({
  status,
}: {
  status: OrderExpeditionOrder["business_status"]
}) {
  return (
    <Badge size="sm" variant={BUSINESS_STATUS_BADGE_VARIANTS[status.tone]}>
      {BUSINESS_STATUS_LABELS[status.id]}
    </Badge>
  )
}

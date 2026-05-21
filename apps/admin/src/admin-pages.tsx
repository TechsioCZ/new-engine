import { Badge } from "@techsio/ui-kit/atoms/badge"
import type { ReactNode } from "react"
import { useActionRequiredOrders, usePendingB2BCustomers } from "./admin-api"
import type { ActionRequiredOrder, PendingB2BCustomer } from "./admin-types"

const SKELETON_ROW_IDS = [
  "skeleton-1",
  "skeleton-2",
  "skeleton-3",
  "skeleton-4",
]

export function OrdersPage() {
  const orders = useActionRequiredOrders()

  return (
    <section className="admin-page">
      <PageHeader
        eyebrow="Objednavky"
        title="Cekaji na potvrzeni"
        value={orders.data?.count}
      />
      <DataSurface
        emptyLabel="Zadne objednavky necekaji na rucni zasah."
        errorLabel="Objednavky se nepodarilo nacist."
        isError={orders.isError}
        isLoading={orders.isLoading}
        renderRow={(order) => <OrderRow key={order.id} order={order} />}
        rows={orders.data?.orders ?? []}
      />
    </section>
  )
}

export function CustomersPage() {
  const customers = usePendingB2BCustomers()

  return (
    <section className="admin-page">
      <PageHeader
        eyebrow="Zakaznici"
        title="B2B registrace ke schvaleni"
        value={customers.data?.count}
      />
      <DataSurface
        emptyLabel="Zadne B2B registrace necekaji na potvrzeni."
        errorLabel="Zakazniky se nepodarilo nacist."
        isError={customers.isError}
        isLoading={customers.isLoading}
        renderRow={(customer) => (
          <CustomerRow customer={customer} key={customer.id} />
        )}
        rows={customers.data?.customers ?? []}
      />
    </section>
  )
}

function PageHeader({
  eyebrow,
  title,
  value,
}: {
  eyebrow: string
  title: string
  value: number | undefined
}) {
  return (
    <header className="admin-page-header">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      <div className="admin-page-count">
        <span>{value ?? "-"}</span>
        <small>polozek</small>
      </div>
    </header>
  )
}

function DataSurface<TItem>({
  emptyLabel,
  errorLabel,
  isError,
  isLoading,
  renderRow,
  rows,
}: {
  emptyLabel: string
  errorLabel: string
  isError: boolean
  isLoading: boolean
  renderRow: (item: TItem) => ReactNode
  rows: TItem[]
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="admin-list">
        {SKELETON_ROW_IDS.map((id) => (
          <div className="admin-row admin-row-skeleton" key={id} />
        ))}
      </div>
    )
  }

  if (isError) {
    return <div className="admin-inline-state">{errorLabel}</div>
  }

  if (!rows.length) {
    return <div className="admin-inline-state">{emptyLabel}</div>
  }

  return <div className="admin-list">{rows.map(renderRow)}</div>
}

function OrderRow({ order }: { order: ActionRequiredOrder }) {
  return (
    <article className="admin-row">
      <div>
        <strong>{formatOrderId(order)}</strong>
        <span>{order.email ?? "Bez e-mailu"}</span>
      </div>
      <div className="admin-row-meta">
        <Badge className="admin-status-badge" size="sm" variant="warning">
          {order.payment_status ?? "nezaplaceno"}
        </Badge>
        <span>{formatMoney(order.total, order.currency_code)}</span>
      </div>
    </article>
  )
}

function CustomerRow({ customer }: { customer: PendingB2BCustomer }) {
  return (
    <article className="admin-row">
      <div>
        <strong>{formatCustomerName(customer)}</strong>
        <span>{customer.email ?? "Bez e-mailu"}</span>
      </div>
      <div className="admin-row-meta">
        <Badge className="admin-status-badge" size="sm" variant="info">
          B2B pending
        </Badge>
        <span>{customer.phone ?? "Bez telefonu"}</span>
      </div>
    </article>
  )
}

function formatOrderId(order: ActionRequiredOrder) {
  return (
    order.custom_display_id ??
    (order.display_id ? `#${order.display_id}` : order.id)
  )
}

function formatCustomerName(customer: PendingB2BCustomer) {
  const fullName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(" ")

  return customer.company_name ?? (fullName || customer.id)
}

function formatMoney(
  value: number | string | null,
  currencyCode: string | null
) {
  if (value === null) {
    return "-"
  }

  const amount = typeof value === "string" ? Number(value) : value

  if (!Number.isFinite(amount)) {
    return "-"
  }

  return new Intl.NumberFormat("cs-CZ", {
    currency: (currencyCode ?? "CZK").toUpperCase(),
    style: "currency",
  }).format(amount)
}

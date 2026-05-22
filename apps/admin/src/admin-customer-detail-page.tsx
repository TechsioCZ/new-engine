import { Badge, type BadgeProps } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom"
import {
  CUSTOMER_GROUP_LIST_LIMIT,
  CUSTOMER_ORDER_LIST_LIMIT,
  useAdminCustomerDetail,
  useAdminCustomerGroups,
  useAdminCustomerOrders,
} from "./admin-api"
import {
  B2B_APPROVAL_STATUS_METADATA_KEY,
  B2B_CUSTOMER_TYPE_METADATA_KEY,
  isPendingB2BCustomer,
} from "./admin-rules"
import type {
  AdminCustomerGroupsResponse,
  AdminCustomerOrdersResponse,
  MedusaAdminCustomer,
  MedusaAdminCustomerAddress,
  MedusaAdminCustomerGroup,
  MedusaAdminOrder,
} from "./admin-types"

type BadgeVariant = Exclude<NonNullable<BadgeProps["variant"]>, "dynamic">

export function CustomerDetailPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const orderOffset = readOffset(searchParams.get("orders_offset"))
  const groupOffset = readOffset(searchParams.get("groups_offset"))
  const customer = useAdminCustomerDetail({ id })
  const orders = useAdminCustomerOrders({ customerId: id, offset: orderOffset })
  const groups = useAdminCustomerGroups({ customerId: id, offset: groupOffset })

  if (!id) {
    return <Navigate replace to="/customers?view=b2b-pending" />
  }

  function updateOffset(key: "groups_offset" | "orders_offset", value: number) {
    const params = new URLSearchParams(searchParams)

    if (value > 0) {
      params.set(key, String(value))
    } else {
      params.delete(key)
    }

    setSearchParams(params)
  }

  if (customer.isLoading) {
    return (
      <section className="admin-page">
        <PageTitle eyebrow="Zakaznik" title="Nacitam detail" />
        <div aria-busy="true" className="admin-inline-state">
          Nacitam zakaznika...
        </div>
      </section>
    )
  }

  if (customer.isError || !customer.data?.customer) {
    return (
      <section className="admin-page">
        <PageTitle eyebrow="Zakaznik" title="Detail zakaznika" />
        <div className="admin-inline-state">
          Zakaznika se nepodarilo nacist.
        </div>
      </section>
    )
  }

  return (
    <CustomerDetail
      customer={customer.data.customer}
      groups={groups.data}
      groupsFallback={customer.data.customer.groups ?? []}
      groupsIsError={groups.isError}
      groupsIsLoading={groups.isLoading}
      onGroupOffsetChange={(offset) => updateOffset("groups_offset", offset)}
      onOrderOffsetChange={(offset) => updateOffset("orders_offset", offset)}
      orderOffset={orderOffset}
      orders={orders.data}
      ordersIsError={orders.isError}
      ordersIsLoading={orders.isLoading}
    />
  )
}

function CustomerDetail({
  customer,
  groups,
  groupsFallback,
  groupsIsError,
  groupsIsLoading,
  onGroupOffsetChange,
  onOrderOffsetChange,
  orderOffset,
  orders,
  ordersIsError,
  ordersIsLoading,
}: {
  customer: MedusaAdminCustomer
  groups: AdminCustomerGroupsResponse | undefined
  groupsFallback: MedusaAdminCustomerGroup[]
  groupsIsError: boolean
  groupsIsLoading: boolean
  onGroupOffsetChange: (offset: number) => void
  onOrderOffsetChange: (offset: number) => void
  orderOffset: number
  orders: AdminCustomerOrdersResponse | undefined
  ordersIsError: boolean
  ordersIsLoading: boolean
}) {
  const addresses = customer.addresses ?? []
  const customerGroups = groups?.customer_groups ?? groupsFallback
  const groupCount = groups?.count ?? customerGroups.length

  return (
    <section className="admin-page admin-page-wide">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Zakaznik</span>
          <h1>{formatCustomerName(customer)}</h1>
        </div>
        <div className="admin-header-actions">
          <div className="admin-status-row">
            <Badge
              size="sm"
              variant={customer.has_account ? "success" : "info"}
            >
              {customer.has_account ? "Registrovany" : "Guest"}
            </Badge>
            {isPendingB2BCustomer(customer) && (
              <Badge size="sm" variant="warning">
                B2B pending
              </Badge>
            )}
          </div>
          <Link className="admin-text-link" to="/customers?view=b2b-pending">
            Zpet na zakazniky
          </Link>
        </div>
      </header>
      <div className="admin-detail-layout">
        <div className="admin-detail-stack">
          <CustomerGeneralPanel customer={customer} />
          <CustomerOrdersPanel
            isError={ordersIsError}
            isLoading={ordersIsLoading}
            onOffsetChange={onOrderOffsetChange}
            orderOffset={orderOffset}
            orders={orders}
          />
          <CustomerGroupsPanel
            count={groupCount}
            groups={customerGroups}
            hasNext={groups?.has_next ?? false}
            hasPrevious={groups?.has_previous ?? false}
            isError={groupsIsError}
            isLoading={groupsIsLoading}
            onOffsetChange={onGroupOffsetChange}
            pageOffset={groups?.offset ?? 0}
            pageSize={groups?.limit ?? CUSTOMER_GROUP_LIST_LIMIT}
          />
        </div>
        <aside className="admin-detail-stack">
          <CustomerB2BPanel customer={customer} />
          <CustomerAddressesPanel addresses={addresses} customer={customer} />
          <CustomerMetadataPanel metadata={customer.metadata} />
        </aside>
      </div>
    </section>
  )
}

function CustomerGeneralPanel({ customer }: { customer: MedusaAdminCustomer }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Kontakt</h2>
          <span>{customer.email ?? "Bez e-mailu"}</span>
        </div>
      </div>
      <div className="admin-detail-fields">
        <DetailField label="ID" value={customer.id} />
        <DetailField label="Jmeno" value={formatPersonName(customer)} />
        <DetailField label="Email" value={customer.email} />
        <DetailField label="Telefon" value={customer.phone} />
        <DetailField label="Firma" value={customer.company_name} />
        <DetailField
          label="Vytvoreno"
          value={formatDateTime(customer.created_at)}
        />
        <DetailField
          label="Upraveno"
          value={formatDateTime(customer.updated_at)}
        />
      </div>
    </section>
  )
}

function CustomerOrdersPanel({
  isError,
  isLoading,
  onOffsetChange,
  orderOffset,
  orders,
}: {
  isError: boolean
  isLoading: boolean
  onOffsetChange: (offset: number) => void
  orderOffset: number
  orders: AdminCustomerOrdersResponse | undefined
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Objednavky</h2>
          <span>
            {formatCount(orders?.count ?? 0, "objednavka", "objednavek")}
          </span>
        </div>
      </div>
      <OrdersTable
        isError={isError}
        isLoading={isLoading}
        orders={orders?.orders ?? []}
      />
      {orders && orders.count > 0 && (
        <PanelPagination
          count={orders.count}
          hasNext={orders.has_next}
          hasPrevious={orders.has_previous}
          limit={orders.limit}
          offset={orders.offset}
          onNext={() => onOffsetChange(orderOffset + CUSTOMER_ORDER_LIST_LIMIT)}
          onPrevious={() =>
            onOffsetChange(Math.max(0, orderOffset - CUSTOMER_ORDER_LIST_LIMIT))
          }
        />
      )}
    </section>
  )
}

function OrdersTable({
  isError,
  isLoading,
  orders,
}: {
  isError: boolean
  isLoading: boolean
  orders: MedusaAdminOrder[]
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="admin-table-state">
        Nacitam objednavky...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="admin-table-state admin-table-state-error">
        Objednavky zakaznika se nepodarilo nacist.
      </div>
    )
  }

  if (!orders.length) {
    return <div className="admin-table-state">Zakaznik nema objednavky.</div>
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-data-table admin-data-table-compact">
        <thead>
          <tr>
            <th>Objednavka</th>
            <th>Vytvoreno</th>
            <th>Stav</th>
            <th>Platba</th>
            <th>Fulfillment</th>
            <th>Celkem</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="admin-table-strong">
                <Link className="admin-table-link" to={`/orders/${order.id}`}>
                  {formatOrderLabel(order)}
                </Link>
              </td>
              <td>{formatDateTime(order.created_at)}</td>
              <td>
                <StatusBadge label={order.status} />
              </td>
              <td>
                <StatusBadge label={order.payment_status} />
              </td>
              <td>
                <StatusBadge label={order.fulfillment_status} />
              </td>
              <td>
                {formatMoney(order.total ?? null, order.currency_code ?? null)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CustomerGroupsPanel({
  count,
  groups,
  hasNext,
  hasPrevious,
  isError,
  isLoading,
  onOffsetChange,
  pageOffset,
  pageSize,
}: {
  count: number
  groups: MedusaAdminCustomerGroup[]
  hasNext: boolean
  hasPrevious: boolean
  isError: boolean
  isLoading: boolean
  onOffsetChange: (offset: number) => void
  pageOffset: number
  pageSize: number
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Skupiny</h2>
          <span>{formatCount(count, "skupina", "skupin")}</span>
        </div>
      </div>
      <CustomerGroupsContent
        groups={groups}
        isError={isError}
        isLoading={isLoading}
      />
      {count > pageSize && (
        <PanelPagination
          count={count}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          limit={pageSize}
          offset={pageOffset}
          onNext={() => onOffsetChange(pageOffset + pageSize)}
          onPrevious={() => onOffsetChange(Math.max(0, pageOffset - pageSize))}
        />
      )}
    </section>
  )
}

function CustomerGroupsContent({
  groups,
  isError,
  isLoading,
}: {
  groups: MedusaAdminCustomerGroup[]
  isError: boolean
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="admin-table-state">
        Nacitam skupiny...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="admin-table-state admin-table-state-error">
        Skupiny se nepodarilo nacist.
      </div>
    )
  }

  if (!groups.length) {
    return <div className="admin-table-state">Zakaznik neni ve skupine.</div>
  }

  return (
    <div className="admin-chip-list">
      {groups.map((group) => (
        <div className="admin-chip-block" key={group.id}>
          <strong>{group.name ?? group.id}</strong>
          <span>{group.id}</span>
        </div>
      ))}
    </div>
  )
}

function CustomerB2BPanel({ customer }: { customer: MedusaAdminCustomer }) {
  const metadata = customer.metadata ?? {}
  const customerType = formatMetadataValue(
    metadata[B2B_CUSTOMER_TYPE_METADATA_KEY]
  )
  const approvalStatus = formatMetadataValue(
    metadata[B2B_APPROVAL_STATUS_METADATA_KEY]
  )

  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>B2B stav</h2>
          <span>
            {isPendingB2BCustomer(customer) ? "Ceka na potvrzeni" : "-"}
          </span>
        </div>
      </div>
      <div className="admin-detail-fields">
        <DetailField label="Typ" value={customerType} />
        <DetailField label="Schvaleni" value={approvalStatus} />
        <DetailField
          label="Default billing"
          value={customer.default_billing_address_id}
        />
        <DetailField
          label="Default shipping"
          value={customer.default_shipping_address_id}
        />
      </div>
    </section>
  )
}

function CustomerAddressesPanel({
  addresses,
  customer,
}: {
  addresses: MedusaAdminCustomerAddress[]
  customer: MedusaAdminCustomer
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Adresy</h2>
          <span>{formatCount(addresses.length, "adresa", "adres")}</span>
        </div>
      </div>
      {addresses.length ? (
        <div className="admin-chip-list">
          {addresses.map((address) => (
            <div className="admin-chip-block" key={address.id}>
              <strong>
                {address.address_name ?? formatAddressName(address)}
              </strong>
              <span>{formatAddress(address)}</span>
              <span>{formatAddressFlags(address, customer)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-table-state">Zakaznik nema ulozene adresy.</div>
      )}
    </section>
  )
}

function CustomerMetadataPanel({
  metadata,
}: {
  metadata: Record<string, unknown> | null | undefined
}) {
  const hasMetadata = metadata && Object.keys(metadata).length > 0

  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Metadata</h2>
          <span>Technicke hodnoty zakaznika.</span>
        </div>
      </div>
      {hasMetadata ? (
        <pre className="admin-json-preview">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      ) : (
        <div className="admin-table-state">Bez metadat.</div>
      )}
    </section>
  )
}

function PanelPagination({
  count,
  hasNext,
  hasPrevious,
  limit,
  offset,
  onNext,
  onPrevious,
}: {
  count: number
  hasNext: boolean
  hasPrevious: boolean
  limit: number
  offset: number
  onNext: () => void
  onPrevious: () => void
}) {
  return (
    <div className="admin-pagination admin-panel-pagination">
      <Button
        className="admin-pagination-button"
        disabled={!hasPrevious}
        onClick={onPrevious}
        size="sm"
        theme="outlined"
        type="button"
        variant="secondary"
      >
        Predchozi
      </Button>
      <span>
        {offset + 1}-{Math.min(offset + limit, count)} z {count}
      </span>
      <Button
        className="admin-pagination-button"
        disabled={!hasNext}
        onClick={onNext}
        size="sm"
        theme="outlined"
        type="button"
        variant="secondary"
      >
        Dalsi
      </Button>
    </div>
  )
}

function StatusBadge({ label }: { label: string | null | undefined }) {
  if (!label) {
    return null
  }

  return (
    <Badge size="sm" variant={getStatusBadgeVariant(label)}>
      {label.replaceAll("_", " ")}
    </Badge>
  )
}

function DetailField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="admin-detail-field">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  )
}

function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="admin-page-header">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
    </header>
  )
}

function formatCustomerName(customer: MedusaAdminCustomer) {
  return customer.company_name || formatPersonName(customer) || customer.id
}

function formatPersonName(customer: MedusaAdminCustomer) {
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ")
}

function formatAddressName(address: MedusaAdminCustomerAddress) {
  return (
    [address.first_name, address.last_name].filter(Boolean).join(" ") || "-"
  )
}

function formatAddress(address: MedusaAdminCustomerAddress) {
  return [
    address.company,
    address.address_1,
    address.address_2,
    [address.postal_code, address.city, address.province]
      .filter(Boolean)
      .join(" "),
    address.country_code?.toUpperCase(),
    address.phone,
  ]
    .filter(Boolean)
    .join(", ")
}

function formatAddressFlags(
  address: MedusaAdminCustomerAddress,
  customer: MedusaAdminCustomer
) {
  const flags = [
    address.is_default_billing ||
    customer.default_billing_address_id === address.id
      ? "default billing"
      : null,
    address.is_default_shipping ||
    customer.default_shipping_address_id === address.id
      ? "default shipping"
      : null,
  ].filter(Boolean)

  return flags.length ? flags.join(", ") : "bez default flagu"
}

function formatOrderLabel(order: MedusaAdminOrder) {
  return (
    order.custom_display_id ??
    (order.display_id ? `#${order.display_id}` : order.id)
  )
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
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

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`
}

function formatMetadataValue(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return null
}

function getStatusBadgeVariant(value: string | null | undefined): BadgeVariant {
  const normalized = (value ?? "").toLowerCase()

  if (normalized.includes("cancel") || normalized.includes("failed")) {
    return "danger"
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("not_paid") ||
    normalized.includes("not_fulfilled") ||
    normalized.includes("partially") ||
    normalized.includes("requires")
  ) {
    return "warning"
  }

  if (
    normalized.includes("paid") ||
    normalized.includes("captured") ||
    normalized.includes("complete") ||
    normalized.includes("fulfilled") ||
    normalized.includes("shipped")
  ) {
    return "success"
  }

  return "info"
}

function readOffset(value: string | null) {
  const offset = Number(value)

  if (!Number.isFinite(offset) || offset <= 0) {
    return 0
  }

  return Math.floor(offset)
}

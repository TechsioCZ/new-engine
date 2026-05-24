import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { Table } from "@techsio/ui-kit/organisms/table"
import { type ReactNode, useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  EMAIL_LOG_LIST_LIMIT,
  PRODUCT_LIST_LIMIT,
  useActionRequiredOrders,
  useAdminEmailLogDetail,
  useAdminEmailLogs,
  useAdminProducts,
  usePendingB2BCustomers,
} from "./admin-api"
import type {
  ActionRequiredOrder,
  AdminEmailLog,
  AdminEmailLogDetailResponse,
  AdminProductListItem,
  PendingB2BCustomer,
  ResendEmail,
} from "./admin-types"
import {
  AdminDetailField,
  AdminDetailFields,
} from "./components/admin-detail-field"
import { AdminPageCount, AdminPageHeader } from "./components/admin-page-header"
import { AdminPagination } from "./components/admin-pagination"
import { AdminPanelHeader } from "./components/admin-panel-header"
import { AdminSearch } from "./components/admin-search"
import { AdminState } from "./components/admin-state"
import { AdminToolbarButton } from "./components/admin-toolbar-button"

const SKELETON_ROW_IDS = [
  "skeleton-1",
  "skeleton-2",
  "skeleton-3",
  "skeleton-4",
]
const PRODUCT_TITLE_SPLIT_PATTERN = /\s+/

export function OrdersPage() {
  const orders = useActionRequiredOrders()

  return (
    <section className="admin-page">
      <PageHeader
        eyebrow="Objednavky"
        isValueExact={orders.data?.count_exact}
        title="Cekaji na potvrzeni"
        value={orders.data?.count}
      />
      <DataSurface
        emptyLabel={
          orders.data?.count_exact === false
            ? "Scan dosahl limitu; dalsi odpovidajici objednavky mohou byt mimo nacteny rozsah."
            : "Zadne objednavky necekaji na rucni zasah."
        }
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
        isValueExact={customers.data?.count_exact}
        title="B2B registrace ke schvaleni"
        value={customers.data?.count}
      />
      <DataSurface
        emptyLabel={
          customers.data?.count_exact === false
            ? "Scan dosahl limitu; dalsi B2B registrace mohou byt mimo nacteny rozsah."
            : "Zadne B2B registrace necekaji na potvrzeni."
        }
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

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get("q")?.trim() ?? ""
  const offset = readOffset(searchParams.get("offset"))
  const [searchValue, setSearchValue] = useState(q)
  const products = useAdminProducts({ offset, q: q || undefined })

  useEffect(() => {
    setSearchValue(q)
  }, [q])

  function updateProductParams(next: { offset?: number; q?: string }) {
    const params = new URLSearchParams(searchParams)

    if (typeof next.offset === "number" && next.offset > 0) {
      params.set("offset", String(next.offset))
    } else if (typeof next.offset === "number") {
      params.delete("offset")
    }

    if (typeof next.q === "string" && next.q.trim()) {
      params.set("q", next.q.trim())
    } else if (typeof next.q === "string") {
      params.delete("q")
    }

    setSearchParams(params)
  }

  function handleSearchSubmit() {
    updateProductParams({ offset: 0, q: searchValue })
  }

  function handleSearchValueChange(nextValue: string) {
    setSearchValue(nextValue)

    if (!nextValue && q) {
      updateProductParams({ offset: 0, q: "" })
    }
  }

  return (
    <section className="admin-page">
      <PageHeader
        eyebrow="Produkty"
        title="Produktovy katalog"
        value={products.data?.count}
      />
      <AdminSearch
        ariaLabel="Hledat produkty"
        onSearch={handleSearchSubmit}
        onValueChange={handleSearchValueChange}
        placeholder="Nazev nebo handle"
        value={searchValue}
      />
      <DataSurface
        emptyLabel="Zadne produkty se nepodarilo najit."
        errorLabel="Produkty se nepodarilo nacist."
        isError={products.isError}
        isLoading={products.isLoading}
        renderRow={(product) => (
          <ProductRow key={product.id} product={product} />
        )}
        rows={products.data?.products ?? []}
      />
      {products.data && (
        <AdminPagination
          ariaLabel="Strankovani produktu"
          count={products.data.count}
          offset={products.data.offset}
          pageSize={PRODUCT_LIST_LIMIT}
        />
      )}
    </section>
  )
}

export function EmailsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const offset = readOffset(searchParams.get("offset"))
  const selectedEmailLogId = searchParams.get("email")
  const emailLogs = useAdminEmailLogs({ offset })
  const emailDetail = useAdminEmailLogDetail({ id: selectedEmailLogId })

  function updateEmailParams(next: {
    offset?: number
    selectedEmailLogId?: string | null
  }) {
    const params = new URLSearchParams(searchParams)

    if (typeof next.offset === "number" && next.offset > 0) {
      params.set("offset", String(next.offset))
    } else if (typeof next.offset === "number") {
      params.delete("offset")
    }

    if (typeof next.selectedEmailLogId === "string") {
      params.set("email", next.selectedEmailLogId)
    } else if (next.selectedEmailLogId === null) {
      params.delete("email")
    }

    setSearchParams(params)
  }

  return (
    <section className="admin-page">
      <PageHeader
        eyebrow="Emails"
        title="Odeslane emaily"
        value={emailLogs.data?.count}
      />
      <div className="admin-split-layout">
        <div className="admin-panel admin-email-list-panel">
          <AdminPanelHeader
            subtitle="Historie notifikaci z backendu a Resendu."
            title="Email logy"
          />
          <EmailLogsTable
            emailLogs={emailLogs.data?.email_logs ?? []}
            isError={emailLogs.isError}
            isLoading={emailLogs.isLoading}
            onOpen={(id) => updateEmailParams({ selectedEmailLogId: id })}
            selectedEmailLogId={selectedEmailLogId}
          />
          {emailLogs.data && (
            <AdminPagination
              ariaLabel="Strankovani email logu"
              className="border-border-primary border-t px-8 py-6"
              count={emailLogs.data.count}
              offset={emailLogs.data.offset}
              pageSize={EMAIL_LOG_LIST_LIMIT}
              searchParamOverrides={{ email: null }}
            />
          )}
        </div>
        <EmailDetailPanel
          detail={emailDetail.data}
          isError={emailDetail.isError}
          isLoading={emailDetail.isLoading}
          onClose={() => updateEmailParams({ selectedEmailLogId: null })}
          selectedEmailLogId={selectedEmailLogId}
        />
      </div>
    </section>
  )
}

export function PlaceholderPage({
  eyebrow,
  title,
}: {
  eyebrow: string
  title: string
}) {
  return (
    <section className="admin-page">
      <PageHeader eyebrow={eyebrow} title={title} />
      <div className="admin-placeholder">
        <strong>Soucast naseho adminu</strong>
        <span>
          Tahle sekce zustava v nove aplikaci. Dalsi krok je napojit jeji
          konkretni Medusa Admin API workflow bez odkazu do puvodniho adminu.
        </span>
      </div>
    </section>
  )
}

function PageHeader({
  eyebrow,
  isValueExact = true,
  title,
  value,
}: {
  eyebrow: string
  isValueExact?: boolean | undefined
  title: string
  value?: number | undefined
}) {
  return (
    <AdminPageHeader eyebrow={eyebrow} title={title}>
      {typeof value === "number" && (
        <AdminPageCount
          label="polozek"
          value={formatCountLabel(value, isValueExact)}
        />
      )}
    </AdminPageHeader>
  )
}

function formatCountLabel(count: number, countExact: boolean) {
  return countExact ? String(count) : `${count}+`
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
          <Skeleton.Rectangle
            className="min-h-34 rounded-md border border-border-primary"
            key={id}
          />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <AdminState surface="panel" tone="error">
        {errorLabel}
      </AdminState>
    )
  }

  if (!rows.length) {
    return <AdminState surface="panel">{emptyLabel}</AdminState>
  }

  return <div className="admin-list">{rows.map(renderRow)}</div>
}

function OrderRow({ order }: { order: ActionRequiredOrder }) {
  return (
    <Link className="admin-row admin-row-link" to={`/orders/${order.id}`}>
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
    </Link>
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

function ProductRow({ product }: { product: AdminProductListItem }) {
  return (
    <Link
      className="admin-row admin-row-link admin-product-row"
      to={`/products/${product.id}`}
    >
      <div className="admin-product-main">
        <div className="admin-product-media">
          {product.thumbnail ? (
            <span
              className="admin-product-thumb"
              style={getProductThumbnailStyle(product.thumbnail)}
            />
          ) : (
            <span className="admin-product-thumb-fallback">
              {getProductInitials(product.title)}
            </span>
          )}
        </div>
        <div>
          <strong>{product.title}</strong>
          <span>{product.handle ? `/${product.handle}` : product.id}</span>
          {product.collection_title && (
            <span className="admin-product-subtle">
              {product.collection_title}
            </span>
          )}
        </div>
      </div>
      <div className="admin-row-meta admin-product-meta">
        <Badge
          className="admin-status-badge"
          size="sm"
          variant={product.status === "published" ? "info" : "warning"}
        >
          {product.status ?? "draft"}
        </Badge>
        <span>{formatCount(product.variant_count, "varianta", "variant")}</span>
        <span>
          {formatCount(product.sales_channel_count, "kanal", "kanalu")}
        </span>
      </div>
    </Link>
  )
}

function EmailLogsTable({
  emailLogs,
  isError,
  isLoading,
  onOpen,
  selectedEmailLogId,
}: {
  emailLogs: AdminEmailLog[]
  isError: boolean
  isLoading: boolean
  onOpen: (id: string) => void
  selectedEmailLogId: string | null
}) {
  if (isLoading) {
    return <AdminState isBusy>Nacitam emaily...</AdminState>
  }

  if (isError) {
    return (
      <AdminState tone="error">Email logy se nepodarilo nacist.</AdminState>
    )
  }

  if (!emailLogs.length) {
    return <AdminState>Zatim nejsou zalogovane emaily.</AdminState>
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-3xl" size="sm" variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Odeslano</Table.ColumnHeader>
            <Table.ColumnHeader>Komu</Table.ColumnHeader>
            <Table.ColumnHeader>Typ</Table.ColumnHeader>
            <Table.ColumnHeader>Predmet</Table.ColumnHeader>
            <Table.ColumnHeader>Objednavka</Table.ColumnHeader>
            <Table.ColumnHeader aria-label="Akce" className="w-1" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {emailLogs.map((emailLog) => (
            <Table.Row
              key={emailLog.id}
              selected={emailLog.id === selectedEmailLogId}
            >
              <Table.Cell>{formatDateTime(emailLog.sent_at)}</Table.Cell>
              <Table.Cell className="font-semibold text-fg-primary">
                {emailLog.sent_to}
              </Table.Cell>
              <Table.Cell>
                <Badge size="sm" variant="info">
                  {emailLog.type}
                </Badge>
              </Table.Cell>
              <Table.Cell className="max-w-xs truncate">
                {emailLog.subject}
              </Table.Cell>
              <Table.Cell>
                {emailLog.order_id ? (
                  <Link
                    className="admin-table-link"
                    to={`/orders/${emailLog.order_id}`}
                  >
                    {formatCompactId(emailLog.order_id)}
                  </Link>
                ) : (
                  "-"
                )}
              </Table.Cell>
              <Table.Cell className="w-1 whitespace-nowrap text-end">
                <AdminToolbarButton onClick={() => onOpen(emailLog.id)}>
                  Detail
                </AdminToolbarButton>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}

function EmailDetailPanel({
  detail,
  isError,
  isLoading,
  onClose,
  selectedEmailLogId,
}: {
  detail: AdminEmailLogDetailResponse | undefined
  isError: boolean
  isLoading: boolean
  onClose: () => void
  selectedEmailLogId: string | null
}) {
  if (!selectedEmailLogId) {
    return (
      <aside className="admin-panel admin-detail-panel admin-detail-panel-empty">
        <h2>Detail emailu</h2>
        <p>Vyber email v tabulce pro zobrazeni obsahu a Resend payloadu.</p>
      </aside>
    )
  }

  if (isLoading) {
    return (
      <aside aria-busy="true" className="admin-panel admin-detail-panel">
        <h2>Nacitam detail</h2>
        <p>Dotazuji Resend detail pro vybrany email.</p>
      </aside>
    )
  }

  if (isError || !detail) {
    return (
      <aside className="admin-panel admin-detail-panel">
        <AdminPanelHeader
          actions={
            <AdminToolbarButton onClick={onClose} theme="borderless">
              Zavrit
            </AdminToolbarButton>
          }
          subtitle="Detail se nepodarilo nacist."
          title="Detail emailu"
        />
        <AdminState surface="panel" tone="error">
          Backend vratil chybu pri nacitani detailu. List zustava dostupny.
        </AdminState>
      </aside>
    )
  }

  const resendEmail = detail.resend_email
  const htmlContent = getHtmlContent(resendEmail)
  const textContent = getTextContent(resendEmail)

  return (
    <aside className="admin-panel admin-detail-panel">
      <AdminPanelHeader
        actions={
          <AdminToolbarButton onClick={onClose} theme="borderless">
            Zavrit
          </AdminToolbarButton>
        }
        subtitle={detail.email_log.subject}
        title="Detail emailu"
      />
      <AdminDetailFields>
        <AdminDetailField label="Email ID" value={detail.email_log.email_id} />
        <AdminDetailField label="Typ" value={detail.email_log.type} />
        <AdminDetailField
          label="Od"
          value={
            typeof resendEmail?.from === "string" ? resendEmail.from : null
          }
        />
        <AdminDetailField
          label="Komu"
          value={formatRecipient(resendEmail?.to) ?? detail.email_log.sent_to}
        />
        <AdminDetailField
          label="Odeslano"
          value={formatDateTime(detail.email_log.sent_at)}
        />
        <AdminDetailField
          label="Objednavka"
          value={detail.email_log.order_id}
        />
        <AdminDetailField
          label="Zakaznik"
          value={detail.email_log.customer_id}
        />
        <AdminDetailField
          label="Posledni event"
          value={
            typeof resendEmail?.last_event === "string"
              ? resendEmail.last_event
              : null
          }
        />
      </AdminDetailFields>
      {htmlContent && (
        <div className="admin-email-preview">
          <h3>HTML</h3>
          <iframe sandbox="" srcDoc={htmlContent} title="Email HTML content" />
        </div>
      )}
      {textContent && (
        <div className="admin-email-preview">
          <h3>Text</h3>
          <pre>{textContent}</pre>
        </div>
      )}
      <div className="admin-email-preview">
        <h3>Resend payload</h3>
        <pre>{JSON.stringify(resendEmail, null, 2)}</pre>
      </div>
    </aside>
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

function getProductInitials(title: string) {
  return title
    .split(PRODUCT_TITLE_SPLIT_PATTERN)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function getProductThumbnailStyle(thumbnail: string) {
  return {
    backgroundImage: `url("${thumbnail.replaceAll('"', "%22")}")`,
  }
}

function getTextContent(resendEmail: ResendEmail | null | undefined) {
  if (typeof resendEmail?.text === "string" && resendEmail.text.trim()) {
    return resendEmail.text
  }

  return null
}

function getHtmlContent(resendEmail: ResendEmail | null | undefined) {
  if (typeof resendEmail?.html === "string" && resendEmail.html.trim()) {
    return resendEmail.html
  }

  return null
}

function formatRecipient(recipient: ResendEmail["to"]) {
  if (!recipient) {
    return null
  }

  return Array.isArray(recipient) ? recipient.join(", ") : recipient
}

function formatDateTime(value: string | null) {
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

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`
}

function formatCompactId(value: string) {
  if (value.length <= 16) {
    return value
  }

  return `${value.slice(0, 8)}...${value.slice(-5)}`
}

function readOffset(value: string | null) {
  const offset = Number(value)

  if (!Number.isFinite(offset) || offset <= 0) {
    return 0
  }

  return Math.floor(offset)
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

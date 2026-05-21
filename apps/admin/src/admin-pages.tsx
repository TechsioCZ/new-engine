import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { type FormEvent, type ReactNode, useEffect, useState } from "react"
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

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateProductParams({ offset: 0, q: searchValue })
  }

  function handleClearSearch() {
    setSearchValue("")
    updateProductParams({ offset: 0, q: "" })
  }

  return (
    <section className="admin-page">
      <PageHeader
        eyebrow="Produkty"
        title="Produktovy katalog"
        value={products.data?.count}
      />
      <div className="admin-page-toolbar">
        <form className="admin-search-form" onSubmit={handleSearchSubmit}>
          <input
            aria-label="Hledat produkty"
            className="admin-search-input"
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Nazev nebo handle"
            type="search"
            value={searchValue}
          />
          <Button
            className="admin-toolbar-button"
            size="sm"
            theme="outlined"
            type="submit"
            variant="secondary"
          >
            Hledat
          </Button>
          {q && (
            <Button
              className="admin-toolbar-button"
              onClick={handleClearSearch}
              size="sm"
              theme="borderless"
              type="button"
              variant="secondary"
            >
              Zrusit
            </Button>
          )}
        </form>
      </div>
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
      {products.data && products.data.count > 0 && (
        <div className="admin-pagination">
          <Button
            className="admin-pagination-button"
            disabled={!products.data.has_previous}
            onClick={() =>
              updateProductParams({
                offset: Math.max(0, offset - PRODUCT_LIST_LIMIT),
                q,
              })
            }
            size="sm"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            Predchozi
          </Button>
          <span>
            {products.data.offset + 1}-
            {Math.min(
              products.data.offset + products.data.limit,
              products.data.count
            )}{" "}
            z {products.data.count}
          </span>
          <Button
            className="admin-pagination-button"
            disabled={!products.data.has_next}
            onClick={() =>
              updateProductParams({
                offset: offset + PRODUCT_LIST_LIMIT,
                q,
              })
            }
            size="sm"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            Dalsi
          </Button>
        </div>
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
          <div className="admin-panel-header">
            <div>
              <h2>Email logy</h2>
              <span>Historie notifikaci z backendu a Resendu.</span>
            </div>
          </div>
          <EmailLogsTable
            emailLogs={emailLogs.data?.email_logs ?? []}
            isError={emailLogs.isError}
            isLoading={emailLogs.isLoading}
            onOpen={(id) => updateEmailParams({ selectedEmailLogId: id })}
            selectedEmailLogId={selectedEmailLogId}
          />
          {emailLogs.data && emailLogs.data.count > 0 && (
            <div className="admin-pagination admin-panel-pagination">
              <Button
                className="admin-pagination-button"
                disabled={!emailLogs.data.has_previous}
                onClick={() =>
                  updateEmailParams({
                    offset: Math.max(0, offset - EMAIL_LOG_LIST_LIMIT),
                    selectedEmailLogId: null,
                  })
                }
                size="sm"
                theme="outlined"
                type="button"
                variant="secondary"
              >
                Predchozi
              </Button>
              <span>
                {emailLogs.data.offset + 1}-
                {Math.min(
                  emailLogs.data.offset + emailLogs.data.limit,
                  emailLogs.data.count
                )}{" "}
                z {emailLogs.data.count}
              </span>
              <Button
                className="admin-pagination-button"
                disabled={!emailLogs.data.has_next}
                onClick={() =>
                  updateEmailParams({
                    offset: offset + EMAIL_LOG_LIST_LIMIT,
                    selectedEmailLogId: null,
                  })
                }
                size="sm"
                theme="outlined"
                type="button"
                variant="secondary"
              >
                Dalsi
              </Button>
            </div>
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
  title,
  value,
}: {
  eyebrow: string
  title: string
  value?: number | undefined
}) {
  return (
    <header className="admin-page-header">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {typeof value === "number" && (
        <div className="admin-page-count">
          <span>{value}</span>
          <small>polozek</small>
        </div>
      )}
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
    return (
      <div aria-busy="true" className="admin-table-state">
        Nacitam emaily...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="admin-table-state admin-table-state-error">
        Email logy se nepodarilo nacist.
      </div>
    )
  }

  if (!emailLogs.length) {
    return (
      <div className="admin-table-state">Zatim nejsou zalogovane emaily.</div>
    )
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Odeslano</th>
            <th>Komu</th>
            <th>Typ</th>
            <th>Predmet</th>
            <th>Objednavka</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {emailLogs.map((emailLog) => (
            <tr
              className={
                emailLog.id === selectedEmailLogId ? "is-selected" : undefined
              }
              key={emailLog.id}
            >
              <td>{formatDateTime(emailLog.sent_at)}</td>
              <td className="admin-table-strong">{emailLog.sent_to}</td>
              <td>
                <Badge className="admin-status-badge" size="sm" variant="info">
                  {emailLog.type}
                </Badge>
              </td>
              <td className="admin-table-truncate">{emailLog.subject}</td>
              <td>{emailLog.order_id ?? "-"}</td>
              <td className="admin-table-actions">
                <Button
                  className="admin-toolbar-button"
                  onClick={() => onOpen(emailLog.id)}
                  size="sm"
                  theme="outlined"
                  type="button"
                  variant="secondary"
                >
                  Detail
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <div className="admin-panel-header">
          <div>
            <h2>Detail emailu</h2>
            <span>Detail se nepodarilo nacist.</span>
          </div>
          <Button
            className="admin-toolbar-button"
            onClick={onClose}
            size="sm"
            theme="borderless"
            type="button"
            variant="secondary"
          >
            Zavrit
          </Button>
        </div>
        <div className="admin-inline-state">
          Backend vratil chybu pri nacitani detailu. List zustava dostupny.
        </div>
      </aside>
    )
  }

  const resendEmail = detail.resend_email
  const htmlContent = getHtmlContent(resendEmail)
  const textContent = getTextContent(resendEmail)

  return (
    <aside className="admin-panel admin-detail-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Detail emailu</h2>
          <span>{detail.email_log.subject}</span>
        </div>
        <Button
          className="admin-toolbar-button"
          onClick={onClose}
          size="sm"
          theme="borderless"
          type="button"
          variant="secondary"
        >
          Zavrit
        </Button>
      </div>
      <div className="admin-detail-fields">
        <DetailField label="Email ID" value={detail.email_log.email_id} />
        <DetailField label="Typ" value={detail.email_log.type} />
        <DetailField
          label="Od"
          value={
            typeof resendEmail?.from === "string" ? resendEmail.from : null
          }
        />
        <DetailField
          label="Komu"
          value={formatRecipient(resendEmail?.to) ?? detail.email_log.sent_to}
        />
        <DetailField
          label="Odeslano"
          value={formatDateTime(detail.email_log.sent_at)}
        />
        <DetailField label="Objednavka" value={detail.email_log.order_id} />
        <DetailField label="Zakaznik" value={detail.email_log.customer_id} />
        <DetailField
          label="Posledni event"
          value={
            typeof resendEmail?.last_event === "string"
              ? resendEmail.last_event
              : null
          }
        />
      </div>
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

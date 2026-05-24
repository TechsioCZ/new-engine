import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { Table } from "@techsio/ui-kit/organisms/table"
import { type ReactNode, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
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
import { AdminTableLink } from "./components/admin-link"
import {
  AdminList,
  AdminListMedia,
  AdminListRow,
  AdminListRowBody,
  AdminListRowMeta,
  AdminListRowText,
  AdminListRowTitle,
} from "./components/admin-list"
import {
  AdminPage,
  AdminPageCount,
  AdminPageHeader,
} from "./components/admin-page-header"
import { AdminPagination } from "./components/admin-pagination"
import { AdminPanel, AdminSplitLayout } from "./components/admin-panel"
import { AdminPanelHeader } from "./components/admin-panel-header"
import { AdminPlaceholder } from "./components/admin-placeholder"
import {
  AdminPreviewCode,
  AdminPreviewFrame,
  AdminPreviewSection,
} from "./components/admin-preview"
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
    <AdminPage>
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
    </AdminPage>
  )
}

export function CustomersPage() {
  const customers = usePendingB2BCustomers()

  return (
    <AdminPage>
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
    </AdminPage>
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
    <AdminPage>
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
    </AdminPage>
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
    <AdminPage>
      <PageHeader
        eyebrow="Emails"
        title="Odeslane emaily"
        value={emailLogs.data?.count}
      />
      <AdminSplitLayout>
        <AdminPanel as="div">
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
              className="border-border-primary border-t px-400 py-300"
              count={emailLogs.data.count}
              offset={emailLogs.data.offset}
              pageSize={EMAIL_LOG_LIST_LIMIT}
              searchParamOverrides={{ email: null }}
            />
          )}
        </AdminPanel>
        <EmailDetailPanel
          detail={emailDetail.data}
          isError={emailDetail.isError}
          isLoading={emailDetail.isLoading}
          onClose={() => updateEmailParams({ selectedEmailLogId: null })}
          selectedEmailLogId={selectedEmailLogId}
        />
      </AdminSplitLayout>
    </AdminPage>
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
    <AdminPage>
      <PageHeader eyebrow={eyebrow} title={title} />
      <AdminPlaceholder title="Soucast naseho adminu">
        Tahle sekce zustava v nove aplikaci. Dalsi krok je napojit jeji
        konkretni Medusa Admin API workflow bez odkazu do puvodniho adminu.
      </AdminPlaceholder>
    </AdminPage>
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
      <AdminList aria-busy={true}>
        {SKELETON_ROW_IDS.map((id) => (
          <Skeleton.Rectangle
            className="min-h-34 rounded-md border border-border-primary"
            key={id}
          />
        ))}
      </AdminList>
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

  return <AdminList>{rows.map(renderRow)}</AdminList>
}

function OrderRow({ order }: { order: ActionRequiredOrder }) {
  return (
    <AdminListRow to={`/orders/${order.id}`}>
      <AdminListRowBody>
        <AdminListRowTitle>{formatOrderId(order)}</AdminListRowTitle>
        <AdminListRowText>{order.email ?? "Bez e-mailu"}</AdminListRowText>
      </AdminListRowBody>
      <AdminListRowMeta>
        <Badge size="sm" variant="warning">
          {order.payment_status ?? "nezaplaceno"}
        </Badge>
        <AdminListRowText offset={false}>
          {formatMoney(order.total, order.currency_code)}
        </AdminListRowText>
      </AdminListRowMeta>
    </AdminListRow>
  )
}

function CustomerRow({ customer }: { customer: PendingB2BCustomer }) {
  return (
    <AdminListRow>
      <AdminListRowBody>
        <AdminListRowTitle>{formatCustomerName(customer)}</AdminListRowTitle>
        <AdminListRowText>{customer.email ?? "Bez e-mailu"}</AdminListRowText>
      </AdminListRowBody>
      <AdminListRowMeta>
        <Badge size="sm" variant="info">
          B2B pending
        </Badge>
        <AdminListRowText offset={false}>
          {customer.phone ?? "Bez telefonu"}
        </AdminListRowText>
      </AdminListRowMeta>
    </AdminListRow>
  )
}

function ProductRow({ product }: { product: AdminProductListItem }) {
  return (
    <AdminListRow to={`/products/${product.id}`}>
      <div className="grid min-w-0 grid-cols-[var(--spacing-23)_minmax(0,1fr)] items-center gap-300">
        <AdminListMedia
          fallback={getProductInitials(product.title)}
          src={product.thumbnail}
        />
        <AdminListRowBody>
          <AdminListRowTitle>{product.title}</AdminListRowTitle>
          <AdminListRowText>
            {product.handle ? `/${product.handle}` : product.id}
          </AdminListRowText>
          {product.collection_title && (
            <span className="mt-100 block text-fg-tertiary text-xs leading-normal">
              {product.collection_title}
            </span>
          )}
        </AdminListRowBody>
      </div>
      <AdminListRowMeta className="min-w-3xs justify-end max-admin-layout:min-w-0">
        <Badge
          size="sm"
          variant={product.status === "published" ? "info" : "warning"}
        >
          {product.status ?? "draft"}
        </Badge>
        <AdminListRowText offset={false}>
          {formatCount(product.variant_count, "varianta", "variant")}
        </AdminListRowText>
        <AdminListRowText offset={false}>
          {formatCount(product.sales_channel_count, "kanal", "kanalu")}
        </AdminListRowText>
      </AdminListRowMeta>
    </AdminListRow>
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
                  <AdminTableLink to={`/orders/${emailLog.order_id}`}>
                    {formatCompactId(emailLog.order_id)}
                  </AdminTableLink>
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
      <AdminPanel
        as="aside"
        className="flex max-h-[calc(100dvh_-_var(--spacing-65))] flex-col gap-200 overflow-y-auto p-450 max-admin-layout:max-h-none"
      >
        <h2 className="m-0 font-bold text-fg-primary text-md leading-tight">
          Detail emailu
        </h2>
        <p className="m-0 text-fg-secondary text-sm leading-normal">
          Vyber email v tabulce pro zobrazeni obsahu a Resend payloadu.
        </p>
      </AdminPanel>
    )
  }

  if (isLoading) {
    return (
      <AdminPanel
        aria-busy={true}
        as="aside"
        className="flex max-h-[calc(100dvh_-_var(--spacing-65))] flex-col gap-200 overflow-y-auto p-450 max-admin-layout:max-h-none"
      >
        <h2 className="m-0 font-bold text-fg-primary text-md leading-tight">
          Nacitam detail
        </h2>
        <p className="m-0 text-fg-secondary text-sm leading-normal">
          Dotazuji Resend detail pro vybrany email.
        </p>
      </AdminPanel>
    )
  }

  if (isError || !detail) {
    return (
      <AdminPanel
        as="aside"
        className="flex max-h-[calc(100dvh_-_var(--spacing-65))] flex-col overflow-y-auto max-admin-layout:max-h-none"
      >
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
      </AdminPanel>
    )
  }

  const resendEmail = detail.resend_email
  const htmlContent = getHtmlContent(resendEmail)
  const textContent = getTextContent(resendEmail)

  return (
    <AdminPanel
      as="aside"
      className="flex max-h-[calc(100dvh_-_var(--spacing-65))] flex-col overflow-y-auto max-admin-layout:max-h-none"
    >
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
        <AdminPreviewSection title="HTML">
          <AdminPreviewFrame
            sandbox=""
            srcDoc={htmlContent}
            title="Email HTML content"
          />
        </AdminPreviewSection>
      )}
      {textContent && (
        <AdminPreviewSection title="Text">
          <AdminPreviewCode>{textContent}</AdminPreviewCode>
        </AdminPreviewSection>
      )}
      <AdminPreviewSection title="Resend payload">
        <AdminPreviewCode>
          {JSON.stringify(resendEmail, null, 2)}
        </AdminPreviewCode>
      </AdminPreviewSection>
    </AdminPanel>
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

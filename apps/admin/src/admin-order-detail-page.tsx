import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@techsio/ui-kit/atoms/button"
import { type FormEvent, useEffect, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import {
  sendOrderEmail,
  useAdminOrderDetail,
  useOrderEmailTemplates,
} from "./admin-api"
import type {
  MedusaAdminAddress,
  MedusaAdminOrder,
  MedusaAdminOrderItem,
  OrderEmailTemplate,
} from "./admin-types"

type Feedback = {
  message: string
  tone: "error" | "success"
} | null

const TITLE_SPLIT_PATTERN = /\s+/

export function OrderDetailPage() {
  const { id } = useParams()
  const order = useAdminOrderDetail({ id })

  if (!id) {
    return <Navigate replace to="/orders?view=action-required" />
  }

  if (order.isLoading) {
    return (
      <section className="admin-page">
        <PageTitle eyebrow="Objednavka" title="Nacitam detail" />
        <div aria-busy="true" className="admin-inline-state">
          Nacitam objednavku...
        </div>
      </section>
    )
  }

  if (order.isError || !order.data?.order) {
    return (
      <section className="admin-page">
        <PageTitle eyebrow="Objednavka" title="Detail objednavky" />
        <div className="admin-inline-state">
          Objednavku se nepodarilo nacist.
        </div>
      </section>
    )
  }

  return <OrderDetail order={order.data.order} />
}

function OrderDetail({ order }: { order: MedusaAdminOrder }) {
  const orderLabel = formatOrderLabel(order)
  const items = order.items ?? []

  return (
    <section className="admin-page admin-page-wide">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Objednavka</span>
          <h1>{orderLabel}</h1>
        </div>
        <Link className="admin-text-link" to="/orders?view=action-required">
          Zpet na objednavky
        </Link>
      </header>
      <div className="admin-detail-layout">
        <div className="admin-detail-stack">
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Polozky objednavky</h2>
                <span>{formatCount(items.length, "polozka", "polozek")}</span>
              </div>
            </div>
            <OrderItemsTable
              currencyCode={order.currency_code ?? null}
              items={items}
            />
          </section>
          <section className="admin-address-grid">
            <AddressPanel address={order.shipping_address} title="Doruceni" />
            <AddressPanel address={order.billing_address} title="Fakturace" />
          </section>
        </div>
        <aside className="admin-detail-stack">
          <OrderSummaryPanel order={order} />
          <OrderEmailPanel order={order} />
          <OrderMetadataPanel metadata={order.metadata} />
        </aside>
      </div>
    </section>
  )
}

function OrderSummaryPanel({ order }: { order: MedusaAdminOrder }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Souhrn</h2>
          <span>{order.email ?? "Bez e-mailu"}</span>
        </div>
      </div>
      <div className="admin-detail-fields">
        <DetailField
          label="Vytvoreno"
          value={formatDateTime(order.created_at)}
        />
        <DetailField label="Stav" value={order.status} />
        <DetailField label="Platba" value={order.payment_status} />
        <DetailField label="Fulfillment" value={order.fulfillment_status} />
        <DetailField
          label="Celkem"
          value={formatMoney(order.total ?? null, order.currency_code ?? null)}
        />
        <DetailField
          label="Payment collections"
          value={formatPaymentCollections(order)}
        />
        <DetailField label="Fulfillments" value={formatFulfillments(order)} />
      </div>
    </section>
  )
}

function OrderEmailPanel({ order }: { order: MedusaAdminOrder }) {
  const queryClient = useQueryClient()
  const templates = useOrderEmailTemplates()
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const availableTemplates = templates.data?.templates ?? []
  const mutation = useMutation({
    mutationFn: sendOrderEmail,
    onError: (error) => {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Email se nepodarilo odeslat.",
        tone: "error",
      })
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-email-logs"] })
      setFeedback({
        message: `${response.template.label} byl odeslan.`,
        tone: "success",
      })
    },
  })

  useEffect(() => {
    const firstTemplate = availableTemplates[0]?.template

    if (!(selectedTemplate || !firstTemplate)) {
      setSelectedTemplate(firstTemplate)
    }
  }, [availableTemplates, selectedTemplate])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!(order.id && selectedTemplate)) {
      return
    }

    mutation.mutate({
      orderId: order.id,
      template: selectedTemplate,
    })
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Email zakaznikovi</h2>
          <span>{order.email ?? "Objednavka nema e-mail."}</span>
        </div>
      </div>
      <form className="admin-action-form" onSubmit={handleSubmit}>
        <OrderEmailFormContent
          feedback={feedback}
          isError={templates.isError}
          isLoading={templates.isLoading}
          isSending={mutation.isPending}
          onTemplateChange={(value) => {
            setSelectedTemplate(value)
            setFeedback(null)
          }}
          orderEmail={order.email}
          selectedTemplate={selectedTemplate}
          templates={availableTemplates}
        />
      </form>
    </section>
  )
}

function OrderEmailFormContent({
  feedback,
  isError,
  isLoading,
  isSending,
  onTemplateChange,
  orderEmail,
  selectedTemplate,
  templates,
}: {
  feedback: Feedback
  isError: boolean
  isLoading: boolean
  isSending: boolean
  onTemplateChange: (value: string) => void
  orderEmail: string | null | undefined
  selectedTemplate: string
  templates: OrderEmailTemplate[]
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="admin-table-state">
        Nacitam sablony...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="admin-table-state admin-table-state-error">
        Emailove sablony se nepodarilo nacist.
      </div>
    )
  }

  return (
    <>
      <label className="admin-field">
        <span>Sablona</span>
        <select
          disabled={!orderEmail || isSending}
          onChange={(event) => onTemplateChange(event.target.value)}
          value={selectedTemplate}
        >
          {templates.map((template) => (
            <option key={template.template} value={template.template}>
              {template.label}
            </option>
          ))}
        </select>
      </label>
      <TemplatePreview
        template={templates.find((item) => item.template === selectedTemplate)}
      />
      {feedback && (
        <div
          className={[
            "admin-feedback admin-feedback-inline",
            feedback.tone === "error" ? "admin-feedback-error" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {feedback.message}
        </div>
      )}
      <Button
        className="admin-toolbar-button"
        disabled={
          !(orderEmail && templates.length && selectedTemplate) || isSending
        }
        size="sm"
        theme="outlined"
        type="submit"
        variant="secondary"
      >
        {isSending ? "Odesilam..." : "Odeslat email"}
      </Button>
    </>
  )
}

function TemplatePreview({
  template,
}: {
  template: OrderEmailTemplate | undefined
}) {
  if (!template) {
    return null
  }

  return (
    <div className="admin-template-preview">
      <span>{template.trigger_type}</span>
      <strong>{template.subject ?? "Bez predmetu"}</strong>
    </div>
  )
}

function OrderItemsTable({
  currencyCode,
  items,
}: {
  currencyCode: string | null
  items: MedusaAdminOrderItem[]
}) {
  if (!items.length) {
    return <div className="admin-table-state">Objednavka nema polozky.</div>
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Produkt</th>
            <th>SKU</th>
            <th>Mnozstvi</th>
            <th>Cena</th>
            <th>Celkem</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="admin-order-item-product">
                  {item.thumbnail || item.product?.thumbnail ? (
                    <span
                      className="admin-product-thumb admin-order-item-thumb"
                      style={getThumbnailStyle(
                        item.thumbnail ?? item.product?.thumbnail ?? ""
                      )}
                    />
                  ) : (
                    <span className="admin-product-thumb-fallback admin-order-item-thumb">
                      {getInitials(getItemTitle(item))}
                    </span>
                  )}
                  <div>
                    {item.product_id ? (
                      <Link
                        className="admin-table-link"
                        to={`/products/${item.product_id}`}
                      >
                        {getItemTitle(item)}
                      </Link>
                    ) : (
                      <strong>{getItemTitle(item)}</strong>
                    )}
                    <span>
                      {item.variant_title ?? item.variant?.title ?? "-"}
                    </span>
                  </div>
                </div>
              </td>
              <td>{item.variant_sku ?? item.variant?.sku ?? "-"}</td>
              <td>{formatQuantity(item.quantity)}</td>
              <td>{formatMoney(item.unit_price ?? null, currencyCode)}</td>
              <td>{formatMoney(item.total ?? null, currencyCode)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AddressPanel({
  address,
  title,
}: {
  address: MedusaAdminAddress | null | undefined
  title: string
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>{title}</h2>
          <span>{formatAddressName(address)}</span>
        </div>
      </div>
      <div className="admin-detail-fields">
        <DetailField label="Firma" value={address?.company} />
        <DetailField label="Adresa" value={formatStreet(address)} />
        <DetailField label="Mesto" value={formatCity(address)} />
        <DetailField label="Zeme" value={address?.country_code} />
        <DetailField label="Telefon" value={address?.phone} />
      </div>
    </section>
  )
}

function OrderMetadataPanel({
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
          <span>Technicke hodnoty objednavky.</span>
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

function formatOrderLabel(order: MedusaAdminOrder) {
  return (
    order.custom_display_id ??
    (order.display_id ? `#${order.display_id}` : order.id)
  )
}

function getItemTitle(item: MedusaAdminOrderItem) {
  return item.title ?? item.product_title ?? item.product?.title ?? item.id
}

function formatPaymentCollections(order: MedusaAdminOrder) {
  const collections = order.payment_collections ?? []

  if (!collections.length) {
    return "-"
  }

  return collections
    .map((collection) =>
      [
        collection.status,
        formatMoney(
          collection.amount ?? null,
          collection.currency_code ?? order.currency_code ?? null
        ),
      ]
        .filter((value) => value && value !== "-")
        .join(" ")
    )
    .filter(Boolean)
    .join(", ")
}

function formatFulfillments(order: MedusaAdminOrder) {
  const fulfillments = (order.fulfillments ?? []).filter(
    (fulfillment) => !fulfillment.canceled_at
  )

  if (!fulfillments.length) {
    return "-"
  }

  return fulfillments
    .map((fulfillment) => fulfillment.provider_id ?? fulfillment.id ?? "-")
    .join(", ")
}

function formatAddressName(address: MedusaAdminAddress | null | undefined) {
  return (
    [address?.first_name, address?.last_name].filter(Boolean).join(" ") || "-"
  )
}

function formatStreet(address: MedusaAdminAddress | null | undefined) {
  return [address?.address_1, address?.address_2].filter(Boolean).join(", ")
}

function formatCity(address: MedusaAdminAddress | null | undefined) {
  return [address?.postal_code, address?.city, address?.province]
    .filter(Boolean)
    .join(" ")
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

function formatQuantity(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : value

  return Number.isFinite(amount) ? String(amount) : "-"
}

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`
}

function getThumbnailStyle(thumbnail: string) {
  return {
    backgroundImage: `url("${thumbnail.replaceAll('"', "%22")}")`,
  }
}

function getInitials(title: string) {
  return title
    .split(TITLE_SPLIT_PATTERN)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

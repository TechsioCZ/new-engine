import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Badge, type BadgeProps } from "@techsio/ui-kit/atoms/badge"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Table } from "@techsio/ui-kit/organisms/table"
import { type FormEvent, useEffect, useState } from "react"
import { Navigate, useParams } from "react-router-dom"
import {
  sendOrderEmail,
  useAdminOrderDetail,
  useOrderEmailTemplates,
} from "./admin-api"
import type {
  MedusaAdminAddress,
  MedusaAdminFulfillment,
  MedusaAdminOrder,
  MedusaAdminOrderItem,
  MedusaAdminPayment,
  MedusaAdminPaymentCollection,
  MedusaAdminRefund,
  MedusaAdminShippingMethod,
  OrderEmailTemplate,
} from "./admin-types"
import {
  AdminDetailField,
  AdminDetailFields,
} from "./components/admin-detail-field"
import {
  AdminExternalTableLink,
  AdminTableLink,
  AdminTextLink,
} from "./components/admin-link"
import {
  AdminPage,
  AdminPageHeader,
  AdminPageHeaderActions,
  AdminStatusRow,
} from "./components/admin-page-header"
import {
  AdminAddressGrid,
  AdminDetailLayout,
  AdminDetailStack,
  AdminPanel,
} from "./components/admin-panel"
import { AdminPanelHeader } from "./components/admin-panel-header"
import {
  AdminInlineList,
  AdminJsonPreview,
  AdminTemplatePreview,
} from "./components/admin-preview"
import {
  AdminSelectField,
  type AdminSelectFieldItem,
} from "./components/admin-select-field"
import { AdminState } from "./components/admin-state"
import { AdminToolbarButton } from "./components/admin-toolbar-button"

type Feedback = {
  message: string
  tone: "error" | "success"
} | null

const TITLE_SPLIT_PATTERN = /\s+/
const FULFILLMENT_TRACKING_DATA_KEYS = [
  "barcode",
  "packet_id",
  "shipment_number",
  "tracking_number",
]

type BadgeVariant = Exclude<NonNullable<BadgeProps["variant"]>, "dynamic">

export function OrderDetailPage() {
  const { id } = useParams()
  const order = useAdminOrderDetail({ id })

  if (!id) {
    return <Navigate replace to="/orders?view=action-required" />
  }

  if (order.isLoading) {
    return (
      <AdminPage>
        <AdminPageHeader eyebrow="Objednavka" title="Nacitam detail" />
        <AdminState isBusy surface="panel">
          Nacitam objednavku...
        </AdminState>
      </AdminPage>
    )
  }

  if (order.isError || !order.data?.order) {
    return (
      <AdminPage>
        <AdminPageHeader eyebrow="Objednavka" title="Detail objednavky" />
        <AdminState surface="panel" tone="error">
          Objednavku se nepodarilo nacist.
        </AdminState>
      </AdminPage>
    )
  }

  return <OrderDetail order={order.data.order} />
}

function OrderDetail({ order }: { order: MedusaAdminOrder }) {
  const orderLabel = formatOrderLabel(order)
  const items = order.items ?? []
  const activeFulfillments = getActiveFulfillments(order)

  return (
    <AdminPage width="wide">
      <AdminPageHeader eyebrow="Objednavka" title={orderLabel}>
        <AdminPageHeaderActions>
          <AdminStatusRow>
            <OrderStatusBadge label={order.status} />
            <OrderStatusBadge label={order.payment_status} />
            <OrderStatusBadge label={order.fulfillment_status} />
          </AdminStatusRow>
          <AdminTextLink to="/orders?view=action-required">
            Zpet na objednavky
          </AdminTextLink>
        </AdminPageHeaderActions>
      </AdminPageHeader>
      <AdminDetailLayout>
        <AdminDetailStack>
          <AdminPanel>
            <AdminPanelHeader
              subtitle={formatCount(items.length, "polozka", "polozek")}
              title="Polozky objednavky"
            />
            <OrderItemsTable
              currencyCode={order.currency_code ?? null}
              items={items}
            />
          </AdminPanel>
          <OrderTotalsPanel order={order} />
          <OrderShippingMethodsPanel
            currencyCode={order.currency_code ?? null}
            shippingMethods={order.shipping_methods ?? []}
          />
          <OrderPaymentsPanel order={order} />
          <OrderFulfillmentsPanel
            activeFulfillments={activeFulfillments}
            order={order}
          />
          <AdminAddressGrid>
            <AddressPanel address={order.shipping_address} title="Doruceni" />
            <AddressPanel address={order.billing_address} title="Fakturace" />
          </AdminAddressGrid>
        </AdminDetailStack>
        <AdminDetailStack as="aside">
          <OrderCustomerPanel order={order} />
          <OrderSummaryPanel order={order} />
          <OrderEmailPanel order={order} />
          <OrderMetadataPanel metadata={order.metadata} />
        </AdminDetailStack>
      </AdminDetailLayout>
    </AdminPage>
  )
}

function OrderSummaryPanel({ order }: { order: MedusaAdminOrder }) {
  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle={formatDateTime(order.created_at)}
        title="Souhrn"
      />
      <AdminDetailFields>
        <AdminDetailField label="ID" value={order.id} />
        <AdminDetailField
          label="Vytvoreno"
          value={formatDateTime(order.created_at)}
        />
        <AdminDetailField
          label="Sales channel"
          value={order.sales_channel?.name ?? order.sales_channel?.id}
        />
        <AdminDetailField label="Stav" value={order.status} />
        <AdminDetailField label="Platba" value={order.payment_status} />
        <AdminDetailField
          label="Fulfillment"
          value={order.fulfillment_status}
        />
        <AdminDetailField
          label="Zruseno"
          value={formatDateTime(order.canceled_at)}
        />
        <AdminDetailField
          label="Celkem"
          value={formatMoney(order.total ?? null, order.currency_code ?? null)}
        />
      </AdminDetailFields>
    </AdminPanel>
  )
}

function OrderStatusBadge({ label }: { label: string | null | undefined }) {
  if (!label) {
    return null
  }

  return (
    <Badge size="sm" variant={getStatusBadgeVariant(label)}>
      {formatStatusLabel(label)}
    </Badge>
  )
}

function OrderCustomerPanel({ order }: { order: MedusaAdminOrder }) {
  const customer = order.customer

  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle={order.email ?? customer?.email ?? "Bez e-mailu"}
        title="Zakaznik"
      />
      <AdminDetailFields>
        <AdminDetailField label="Jmeno" value={formatCustomerName(order)} />
        <AdminDetailField
          label="Email"
          value={order.email ?? customer?.email}
        />
        <AdminDetailField label="Telefon" value={customer?.phone} />
        <AdminDetailField label="Firma" value={customer?.company_name} />
        <AdminDetailField label="Customer ID" value={order.customer_id} />
      </AdminDetailFields>
    </AdminPanel>
  )
}

function OrderTotalsPanel({ order }: { order: MedusaAdminOrder }) {
  const rows = [
    {
      label: "Polozky",
      value: order.item_total ?? order.item_subtotal ?? null,
    },
    {
      label: "Doprava",
      value: order.shipping_total ?? order.shipping_subtotal ?? null,
    },
    {
      isDeduction: true,
      label: "Sleva",
      value: order.discount_total ?? null,
    },
    {
      label: "Dan",
      value: order.tax_total ?? null,
    },
    {
      label: "Refundovatelne",
      value: order.refundable_total ?? null,
    },
    {
      isStrong: true,
      label: "Celkem",
      value: order.total ?? order.original_total ?? null,
    },
  ]

  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle={order.currency_code?.toUpperCase() ?? "CZK"}
        title="Financni souhrn"
      />
      <div className="grid px-400 py-200">
        {rows.map((row) => (
          <div
            className={
              row.isStrong
                ? "flex items-center justify-between gap-450 border-border-secondary border-b border-dashed py-250 font-bold text-fg-primary text-sm last:border-b-0"
                : "flex items-center justify-between gap-450 border-border-secondary border-b border-dashed py-250 text-fg-secondary text-sm last:border-b-0"
            }
            key={row.label}
          >
            <span>{row.label}</span>
            <strong className="font-semibold text-fg-primary">
              {row.isDeduction
                ? formatDeductionMoney(row.value, order.currency_code ?? null)
                : formatMoney(row.value, order.currency_code ?? null)}
            </strong>
          </div>
        ))}
      </div>
    </AdminPanel>
  )
}

function OrderShippingMethodsPanel({
  currencyCode,
  shippingMethods,
}: {
  currencyCode: string | null
  shippingMethods: MedusaAdminShippingMethod[]
}) {
  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle={formatCount(shippingMethods.length, "metoda", "metod")}
        title="Doprava"
      />
      {shippingMethods.length ? (
        <div className="overflow-x-auto">
          <Table className="min-w-xl" size="sm" variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Metoda</Table.ColumnHeader>
                <Table.ColumnHeader>Provider</Table.ColumnHeader>
                <Table.ColumnHeader>Cena</Table.ColumnHeader>
                <Table.ColumnHeader>Tax</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {shippingMethods.map((method) => (
                <Table.Row key={method.id ?? method.name}>
                  <Table.Cell className="font-semibold text-fg-primary">
                    {method.name ?? method.id ?? "-"}
                  </Table.Cell>
                  <Table.Cell>{method.provider_id ?? "-"}</Table.Cell>
                  <Table.Cell>
                    {formatMoney(
                      method.total ?? method.amount ?? method.subtotal ?? null,
                      currencyCode
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {formatMoney(method.tax_total ?? null, currencyCode)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      ) : (
        <AdminState>Bez dopravni metody.</AdminState>
      )}
    </AdminPanel>
  )
}

function OrderPaymentsPanel({ order }: { order: MedusaAdminOrder }) {
  const collections = order.payment_collections ?? []

  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle={formatPaymentCollections(order)}
        title="Platby"
      />
      {collections.length ? (
        <div className="overflow-x-auto">
          <Table className="min-w-2xl" size="sm" variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Typ</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Provider</Table.ColumnHeader>
                <Table.ColumnHeader>Castka</Table.ColumnHeader>
                <Table.ColumnHeader>Datum</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {collections.flatMap((collection) =>
                toPaymentRows(collection, order.currency_code ?? null)
              )}
            </Table.Body>
          </Table>
        </div>
      ) : (
        <AdminState>Objednavka nema payment collection.</AdminState>
      )}
    </AdminPanel>
  )
}

function OrderFulfillmentsPanel({
  activeFulfillments,
  order,
}: {
  activeFulfillments: MedusaAdminFulfillment[]
  order: MedusaAdminOrder
}) {
  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle={formatFulfillments(order)}
        title="Fulfillment"
      />
      {activeFulfillments.length ? (
        <div className="overflow-x-auto">
          <Table className="min-w-2xl" size="sm" variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Fulfillment</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Provider</Table.ColumnHeader>
                <Table.ColumnHeader>Tracking</Table.ColumnHeader>
                <Table.ColumnHeader>Polozky</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {activeFulfillments.map((fulfillment) => (
                <Table.Row key={fulfillment.id ?? fulfillment.created_at}>
                  <Table.Cell className="font-semibold text-fg-primary">
                    {formatCompactId(fulfillment.id) ?? "-"}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      size="sm"
                      variant={getFulfillmentBadgeVariant(fulfillment)}
                    >
                      {formatFulfillmentStatus(fulfillment)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{fulfillment.provider_id ?? "-"}</Table.Cell>
                  <Table.Cell>
                    {formatFulfillmentTracking(fulfillment)}
                  </Table.Cell>
                  <Table.Cell>{formatFulfillmentItems(fulfillment)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      ) : (
        <AdminState>
          Zatim bez aktivniho fulfillmentu. Stav:{" "}
          {order.fulfillment_status ?? "-"}.
        </AdminState>
      )}
    </AdminPanel>
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
    <AdminPanel>
      <AdminPanelHeader
        subtitle={order.email ?? "Objednavka nema e-mail."}
        title="Email zakaznikovi"
      />
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
    </AdminPanel>
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
    return <AdminState isBusy>Nacitam sablony...</AdminState>
  }

  if (isError) {
    return (
      <AdminState tone="error">
        Emailove sablony se nepodarilo nacist.
      </AdminState>
    )
  }

  const templateItems: AdminSelectFieldItem[] = templates.map((template) => ({
    label: template.label,
    value: template.template,
  }))

  return (
    <>
      <AdminSelectField
        disabled={!(orderEmail && templates.length) || isSending}
        items={templateItems}
        label="Sablona"
        onValueChange={onTemplateChange}
        placeholder="Vyberte sablonu"
        size="md"
        value={selectedTemplate}
      />
      <TemplatePreview
        template={templates.find((item) => item.template === selectedTemplate)}
      />
      {feedback && (
        <StatusText
          align="start"
          role={feedback.tone === "error" ? "alert" : "status"}
          showIcon
          size="sm"
          status={feedback.tone}
        >
          {feedback.message}
        </StatusText>
      )}
      <AdminToolbarButton
        disabled={
          !(orderEmail && templates.length && selectedTemplate) || isSending
        }
        type="submit"
      >
        {isSending ? "Odesilam..." : "Odeslat email"}
      </AdminToolbarButton>
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
    <AdminTemplatePreview label={template.trigger_type}>
      {template.subject ?? "Bez predmetu"}
    </AdminTemplatePreview>
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
    return <AdminState>Objednavka nema polozky.</AdminState>
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-3xl" size="sm" variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Produkt</Table.ColumnHeader>
            <Table.ColumnHeader>SKU</Table.ColumnHeader>
            <Table.ColumnHeader>Mnozstvi</Table.ColumnHeader>
            <Table.ColumnHeader>Cena</Table.ColumnHeader>
            <Table.ColumnHeader>Celkem</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((item) => (
            <Table.Row key={item.id}>
              <Table.Cell>
                <div className="grid min-w-3xs grid-cols-[var(--spacing-20)_minmax(0,1fr)] items-center gap-250">
                  {item.thumbnail || item.product?.thumbnail ? (
                    <span
                      className="block size-20 rounded-md border border-border-primary bg-center bg-cover bg-surface"
                      style={getThumbnailStyle(
                        item.thumbnail ?? item.product?.thumbnail ?? ""
                      )}
                    />
                  ) : (
                    <span className="grid size-20 place-items-center rounded-md border border-border-primary bg-surface font-bold text-fg-secondary text-xs">
                      {getInitials(getItemTitle(item))}
                    </span>
                  )}
                  <div className="min-w-0">
                    {item.product_id ? (
                      <AdminTableLink to={`/products/${item.product_id}`}>
                        {getItemTitle(item)}
                      </AdminTableLink>
                    ) : (
                      <strong>{getItemTitle(item)}</strong>
                    )}
                    <span className="mt-50 block text-fg-secondary text-xs">
                      {item.variant_title ?? item.variant?.title ?? "-"}
                    </span>
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell>
                {item.variant_sku ?? item.variant?.sku ?? "-"}
              </Table.Cell>
              <Table.Cell>{formatQuantity(item.quantity)}</Table.Cell>
              <Table.Cell>
                {formatMoney(item.unit_price ?? null, currencyCode)}
              </Table.Cell>
              <Table.Cell>
                {formatMoney(item.total ?? null, currencyCode)}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
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
    <AdminPanel>
      <AdminPanelHeader subtitle={formatAddressName(address)} title={title} />
      <AdminDetailFields>
        <AdminDetailField label="Firma" value={address?.company} />
        <AdminDetailField label="Adresa" value={formatStreet(address)} />
        <AdminDetailField label="Mesto" value={formatCity(address)} />
        <AdminDetailField label="Zeme" value={address?.country_code} />
        <AdminDetailField label="Telefon" value={address?.phone} />
      </AdminDetailFields>
    </AdminPanel>
  )
}

function OrderMetadataPanel({
  metadata,
}: {
  metadata: Record<string, unknown> | null | undefined
}) {
  const hasMetadata = metadata && Object.keys(metadata).length > 0

  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle="Technicke hodnoty objednavky."
        title="Metadata"
      />
      {hasMetadata ? (
        <AdminJsonPreview>{JSON.stringify(metadata, null, 2)}</AdminJsonPreview>
      ) : (
        <AdminState>Bez metadat.</AdminState>
      )}
    </AdminPanel>
  )
}

function toPaymentRows(
  collection: MedusaAdminPaymentCollection,
  fallbackCurrencyCode: string | null
) {
  const collectionId = collection.id ?? "payment-collection"
  const collectionRow = (
    <PaymentCollectionRow
      collection={collection}
      fallbackCurrencyCode={fallbackCurrencyCode}
      key={`collection-${collectionId}`}
    />
  )
  const paymentRows = (collection.payments ?? []).flatMap((payment, index) => [
    <PaymentRow
      collection={collection}
      fallbackCurrencyCode={fallbackCurrencyCode}
      key={`payment-${payment.id ?? `${collectionId}-${index}`}`}
      payment={payment}
    />,
    ...(payment.refunds ?? []).map((refund, refundIndex) => (
      <RefundPaymentRow
        collection={collection}
        fallbackCurrencyCode={fallbackCurrencyCode}
        key={`refund-${refund.id ?? `${payment.id}-${refundIndex}`}`}
        payment={payment}
        refund={refund}
      />
    )),
  ])

  return [collectionRow, ...paymentRows]
}

function PaymentCollectionRow({
  collection,
  fallbackCurrencyCode,
}: {
  collection: MedusaAdminPaymentCollection
  fallbackCurrencyCode: string | null
}) {
  return (
    <Table.Row>
      <Table.Cell className="font-semibold text-fg-primary">
        {formatCompactId(collection.id) ?? "Collection"}
      </Table.Cell>
      <Table.Cell>
        <Badge size="sm" variant={getStatusBadgeVariant(collection.status)}>
          {formatStatusLabel(collection.status)}
        </Badge>
      </Table.Cell>
      <Table.Cell>-</Table.Cell>
      <Table.Cell>
        {formatMoney(
          collection.amount ?? null,
          collection.currency_code ?? fallbackCurrencyCode
        )}
      </Table.Cell>
      <Table.Cell>-</Table.Cell>
    </Table.Row>
  )
}

function PaymentRow({
  collection,
  fallbackCurrencyCode,
  payment,
}: {
  collection: MedusaAdminPaymentCollection
  fallbackCurrencyCode: string | null
  payment: MedusaAdminPayment
}) {
  return (
    <Table.Row>
      <Table.Cell className="ps-700">
        {formatCompactId(payment.id) ?? "Payment"}
      </Table.Cell>
      <Table.Cell>
        <Badge size="sm" variant={getPaymentBadgeVariant(payment)}>
          {formatPaymentStatus(payment)}
        </Badge>
      </Table.Cell>
      <Table.Cell>{payment.provider_id ?? "-"}</Table.Cell>
      <Table.Cell>
        {formatMoney(
          payment.amount ?? null,
          payment.currency_code ??
            collection.currency_code ??
            fallbackCurrencyCode
        )}
      </Table.Cell>
      <Table.Cell>{formatDateTime(payment.created_at)}</Table.Cell>
    </Table.Row>
  )
}

function RefundPaymentRow({
  collection,
  fallbackCurrencyCode,
  payment,
  refund,
}: {
  collection: MedusaAdminPaymentCollection
  fallbackCurrencyCode: string | null
  payment: MedusaAdminPayment
  refund: MedusaAdminRefund
}) {
  return (
    <Table.Row>
      <Table.Cell className="ps-700">
        {formatCompactId(refund.id) ?? "Refund"}
      </Table.Cell>
      <Table.Cell>
        <Badge size="sm" variant="warning">
          Refund
        </Badge>
      </Table.Cell>
      <Table.Cell>{payment.provider_id ?? "-"}</Table.Cell>
      <Table.Cell>
        {formatDeductionMoney(
          refund.amount ?? null,
          refund.currency_code ??
            payment.currency_code ??
            collection.currency_code ??
            fallbackCurrencyCode
        )}
      </Table.Cell>
      <Table.Cell>{formatDateTime(refund.created_at)}</Table.Cell>
    </Table.Row>
  )
}

function formatOrderLabel(order: MedusaAdminOrder) {
  return (
    order.custom_display_id ??
    (order.display_id ? `#${order.display_id}` : order.id)
  )
}

function formatCustomerName(order: MedusaAdminOrder) {
  const customer = order.customer
  const fullName = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(" ")

  return customer?.company_name || fullName || order.email || order.customer_id
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
  const fulfillments = getActiveFulfillments(order)

  if (!fulfillments.length) {
    return "-"
  }

  return fulfillments
    .map((fulfillment) => fulfillment.provider_id ?? fulfillment.id ?? "-")
    .join(", ")
}

function getActiveFulfillments(order: MedusaAdminOrder) {
  return (order.fulfillments ?? []).filter(
    (fulfillment) => !fulfillment.canceled_at
  )
}

function formatFulfillmentStatus(fulfillment: MedusaAdminFulfillment) {
  if (fulfillment.delivered_at) {
    return "Doruceno"
  }

  if (fulfillment.shipped_at) {
    return "Odeslano"
  }

  return fulfillment.requires_shipping ? "Ceka na odeslani" : "Ceka"
}

function formatFulfillmentItems(fulfillment: MedusaAdminFulfillment) {
  const items = fulfillment.items ?? []

  if (!items.length) {
    return "-"
  }

  return items
    .map((item) => {
      const title = item.title ?? item.line_item_id

      return title ? `${formatQuantity(item.quantity)}x ${title}` : "-"
    })
    .join(", ")
}

function formatFulfillmentTracking(fulfillment: MedusaAdminFulfillment) {
  const labels = fulfillment.labels ?? []

  if (labels.length) {
    return (
      <AdminInlineList>
        {labels.map((label, index) => {
          const labelText = label.tracking_number ?? label.id ?? "Tracking"
          const key = label.id ?? label.tracking_number ?? `tracking-${index}`

          if (label.tracking_url) {
            return (
              <AdminExternalTableLink href={label.tracking_url} key={key}>
                {labelText}
              </AdminExternalTableLink>
            )
          }

          return <span key={key}>{labelText}</span>
        })}
      </AdminInlineList>
    )
  }

  const dataTracking = getFulfillmentDataTracking(fulfillment.data)

  return dataTracking ?? "-"
}

function getFulfillmentDataTracking(
  data: Record<string, unknown> | null | undefined
) {
  if (!data) {
    return null
  }

  for (const key of FULFILLMENT_TRACKING_DATA_KEYS) {
    const value = data[key]

    if (typeof value === "string" && value.trim()) {
      return value
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }

  return null
}

function formatCompactId(value: string | null | undefined) {
  if (!value) {
    return null
  }

  if (value.length <= 16) {
    return value
  }

  return `${value.slice(0, 8)}...${value.slice(-5)}`
}

function formatStatusLabel(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "-"
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
    normalized.includes("awaiting") ||
    normalized.includes("requires")
  ) {
    return "warning"
  }

  if (
    normalized.includes("paid") ||
    normalized.includes("captured") ||
    normalized.includes("complete") ||
    normalized.includes("delivered") ||
    normalized.includes("fulfilled") ||
    normalized.includes("shipped")
  ) {
    return "success"
  }

  return "info"
}

function getPaymentBadgeVariant(payment: MedusaAdminPayment): BadgeVariant {
  return getStatusBadgeVariant(formatPaymentStatus(payment))
}

function formatPaymentStatus(payment: MedusaAdminPayment) {
  if (payment.canceled_at) {
    return "Canceled"
  }

  if (payment.captured_at) {
    return "Captured"
  }

  return "Pending"
}

function getFulfillmentBadgeVariant(
  fulfillment: MedusaAdminFulfillment
): BadgeVariant {
  return getStatusBadgeVariant(formatFulfillmentStatus(fulfillment))
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

function formatDeductionMoney(
  value: number | string | null,
  currencyCode: string | null
) {
  if (value === null) {
    return "-"
  }

  const amount = typeof value === "string" ? Number(value) : value

  if (!Number.isFinite(amount) || amount === 0) {
    return "-"
  }

  return `-${formatMoney(Math.abs(amount), currencyCode)}`
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

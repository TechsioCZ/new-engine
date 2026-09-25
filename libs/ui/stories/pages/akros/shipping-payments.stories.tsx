import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { Checkbox } from "../../../src/atoms/checkbox"
import { NumericInput } from "../../../src/atoms/numeric-input"
import { Dialog } from "../../../src/molecules/dialog"
import { FormCheckbox } from "../../../src/molecules/form-checkbox"
import { FormInput } from "../../../src/molecules/form-input"
import { FormNumericInput } from "../../../src/molecules/form-numeric-input"
import { Switch } from "../../../src/molecules/switch"
import { Tabs } from "../../../src/molecules/tabs"
import { Toaster, useToast } from "../../../src/molecules/toast"
import type { ColumnDef } from "../../../src/organisms/data-table"
import { DataTable } from "../../../src/organisms/data-table"
import { Table } from "../../../src/organisms/table"
import { SelectTemplate } from "../../../src/templates/select"
import { PageHeader, SectionCard } from "../shell"
import {
  czk,
  type PaymentConfig,
  type PaymentMethod,
  paymentConfigs,
  paymentMethodLabels,
  type ShippingMethod,
  shippingMethods,
} from "./data"
import { AkrosShell, akrosDocs } from "./shared"

const meta: Meta = {
  globals: { brand: "akros", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Shipping & payment",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "Covers the brief's **Shipping and payment**. ABRA does not define shipping",
          "methods — it only receives a text line — so the e-shop owns the definitions.",
          "Every method is fully configurable: name, availability conditions, price",
          "and limits / rules.",
          "",
          "**How it is built** — `DataTable`, `Tabs`, `Dialog` (side panel),",
          "`FormInput`, `FormNumericInput`, `SelectTemplate`, `FormCheckbox`,",
          "`Switch`, `Table`, `Toast`.",
          "",
          "**Pattern rules**",
          "- Methods are records → a table; the editor opens as a side panel so the",
          "  list stays visible for comparison.",
          "- Conditions are grouped by what they decide: *who* (customer type), *what*",
          "  (weight, parcel size), *how much* (price, free-from threshold).",
          "- Which payment goes with which shipping is a matrix, because it is a",
          "  many-to-many rule — editing it one method at a time hides conflicts.",
          "- The ABRA text line is edited next to the method and previewed exactly as",
          "  ABRA will receive it.",
          "- Enabling / disabling is a `Switch` that applies immediately and says so.",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

const audienceItems = [
  { label: "Everyone", value: "all" },
  { label: "B2C only", value: "B2C" },
  { label: "B2B only", value: "B2B" },
]

const audienceLabels = { all: "Everyone", B2C: "B2C only", B2B: "B2B only" }

function NumberField({
  id,
  label,
  helpText,
  value,
  onChange,
  step,
}: {
  id: string
  label: string
  helpText?: string
  value: number
  onChange: (value: number) => void
  step?: number
}) {
  return (
    <FormNumericInput
      helpText={helpText}
      id={id}
      label={label}
      min={0}
      onChange={onChange}
      step={step}
      value={value}
    >
      <NumericInput.Control>
        <NumericInput.Input />
        <NumericInput.TriggerContainer>
          <NumericInput.IncrementTrigger />
          <NumericInput.DecrementTrigger />
        </NumericInput.TriggerContainer>
      </NumericInput.Control>
    </FormNumericInput>
  )
}

function ShippingEditor({
  method,
  onClose,
  onSave,
}: {
  method: ShippingMethod
  onClose: () => void
  onSave: (method: ShippingMethod) => void
}) {
  const [draft, setDraft] = useState(method)
  const set = <K extends keyof ShippingMethod>(
    key: K,
    value: ShippingMethod[K]
  ) => setDraft((current) => ({ ...current, [key]: value }))

  return (
    <Dialog
      actions={
        <>
          <Button onClick={onClose} theme="outlined" variant="secondary">
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)} variant="primary">
            Save method
          </Button>
        </>
      }
      customTrigger
      description="Changes apply to new checkouts immediately. Existing orders keep what they were placed with."
      onOpenChange={(details) => {
        if (!details.open) {
          onClose()
        }
      }}
      open
      placement="right"
      size="md"
      title={`Edit ${method.name}`}
    >
      <div className="flex flex-col gap-250">
        <section className="flex flex-col gap-200">
          <h3 className="font-semibold text-sm">Name & display</h3>
          <FormInput
            id="sh-name"
            label="Name in checkout"
            onChange={(event) => set("name", event.target.value)}
            required
            value={draft.name}
          />
          <Switch
            checked={draft.pointBased}
            helpText="Checkout asks for a parcel box / pickup point and stores its ID on the order."
            onCheckedChange={(checked) => set("pointBased", checked)}
          >
            Requires a pickup point
          </Switch>
        </section>

        <section className="flex flex-col gap-200">
          <h3 className="font-semibold text-sm">Price</h3>
          <div className="grid grid-cols-1 gap-200 sm:grid-cols-2">
            <NumberField
              helpText="Kč incl. VAT"
              id="sh-price"
              label="Price"
              onChange={(value) => set("price", value)}
              value={draft.price}
            />
            <NumberField
              helpText="Order total in Kč. 0 = never free."
              id="sh-free"
              label="Free from"
              onChange={(value) => set("freeFrom", value)}
              step={100}
              value={draft.freeFrom}
            />
          </div>
        </section>

        <section className="flex flex-col gap-200">
          <h3 className="font-semibold text-sm">Availability & limits</h3>
          <SelectTemplate
            items={audienceItems}
            label="Available to"
            onValueChange={(details) => {
              const [next] = details.value
              if (next) {
                set("customers", next as ShippingMethod["customers"])
              }
            }}
            value={[draft.customers]}
          />
          <div className="grid grid-cols-1 gap-200 sm:grid-cols-2">
            <NumberField
              helpText="kg — heavier carts do not see this method"
              id="sh-weight"
              label="Max. weight"
              onChange={(value) => set("maxWeight", value)}
              value={draft.maxWeight}
            />
            <NumberField
              helpText="cm — the longest side of any product in the cart"
              id="sh-length"
              label="Max. parcel length"
              onChange={(value) => set("maxLength", value)}
              value={draft.maxLength}
            />
          </div>
        </section>

        <section className="flex flex-col gap-200">
          <h3 className="font-semibold text-sm">Allowed payments</h3>
          {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map(
            (payment) => (
              <FormCheckbox
                checked={draft.payments.includes(payment)}
                id={`sh-pay-${payment}`}
                key={payment}
                label={paymentMethodLabels[payment]}
                onCheckedChange={(checked) =>
                  set(
                    "payments",
                    checked
                      ? [...draft.payments, payment]
                      : draft.payments.filter((entry) => entry !== payment)
                  )
                }
              />
            )
          )}
        </section>

        <section className="flex flex-col gap-200">
          <h3 className="font-semibold text-sm">ABRA</h3>
          <FormInput
            helpText="ABRA receives exactly this line on the order. The pickup point ID is appended automatically."
            id="sh-abra"
            label="Text line for ABRA"
            onChange={(event) => set("abraText", event.target.value)}
            value={draft.abraText}
          />
          <p className="rounded-md border border-border-primary bg-overlay p-150 text-sm">
            {draft.abraText}
            {draft.pointBased ? " Z-11873" : ""}
          </p>
        </section>
      </div>
    </Dialog>
  )
}

function ShippingPaymentsPage({ editId }: { editId?: string }) {
  const toaster = useToast()
  const [shipping, setShipping] = useState(shippingMethods)
  const [payments, setPayments] = useState(paymentConfigs)
  const [editing, setEditing] = useState<string | undefined>(editId)

  const editingMethod = shipping.find((method) => method.id === editing)

  const toggleShipping = (id: string, enabled: boolean) => {
    setShipping((current) =>
      current.map((method) =>
        method.id === id ? { ...method, enabled } : method
      )
    )
    toaster.create({
      type: enabled ? "success" : "info",
      title: enabled ? "Shipping method enabled" : "Shipping method disabled",
      description: "Applies to new checkouts now.",
    })
  }

  const shippingColumns: ColumnDef<ShippingMethod, unknown>[] = [
    {
      accessorKey: "name",
      header: "Method",
      meta: { type: "string", width: 260 },
      cell: (info) => (
        <span className="flex flex-col gap-50">
          <span className="font-medium">{info.getValue<string>()}</span>
          <span className="text-fg-secondary text-xs">
            {info.row.original.pointBased
              ? "Pickup point"
              : "To address / on site"}{" "}
            · {audienceLabels[info.row.original.customers]}
          </span>
        </span>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      meta: { type: "number", align: "end", width: 150 },
      cell: (info) => (
        <span className="flex flex-col items-end gap-50">
          <span>
            {info.getValue<number>() === 0
              ? "Free"
              : czk.format(info.getValue<number>())}
          </span>
          {info.row.original.freeFrom > 0 && (
            <span className="text-fg-secondary text-xs">
              free from {czk.format(info.row.original.freeFrom)}
            </span>
          )}
        </span>
      ),
    },
    {
      id: "limits",
      header: "Limits",
      accessorFn: (row) => row.maxWeight,
      meta: { type: "number", width: 170 },
      cell: (info) =>
        `≤ ${info.row.original.maxWeight} kg · ≤ ${info.row.original.maxLength} cm`,
    },
    {
      accessorKey: "abraText",
      header: "ABRA line",
      meta: { type: "string", width: 240 },
    },
    {
      accessorKey: "enabled",
      header: "Active",
      meta: { type: "boolean", width: 110 },
      cell: (info) => (
        <Switch
          checked={info.getValue<boolean>()}
          onCheckedChange={(checked) =>
            toggleShipping(info.row.original.id, checked)
          }
        >
          <span className="sr-only">{`Enable ${info.row.original.name}`}</span>
        </Switch>
      ),
    },
  ]

  const paymentColumns: ColumnDef<PaymentConfig, unknown>[] = [
    {
      accessorKey: "name",
      header: "Method",
      meta: { type: "string", width: 260 },
    },
    {
      accessorKey: "fee",
      header: "Fee",
      meta: { type: "number", align: "end", width: 110 },
      cell: (info) =>
        info.getValue<number>() === 0
          ? "—"
          : czk.format(info.getValue<number>()),
    },
    {
      accessorKey: "customers",
      header: "Available to",
      meta: { type: "string", width: 140 },
      cell: (info) => audienceLabels[info.row.original.customers],
    },
    {
      accessorKey: "maxOrder",
      header: "Order limit",
      meta: { type: "number", align: "end", width: 140 },
      cell: (info) => `≤ ${czk.format(info.getValue<number>())}`,
    },
    {
      accessorKey: "abraText",
      header: "ABRA line",
      meta: { type: "string", width: 240 },
    },
    {
      accessorKey: "enabled",
      header: "Active",
      meta: { type: "boolean", width: 110 },
      cell: (info) => (
        <Switch
          checked={info.getValue<boolean>()}
          onCheckedChange={(checked) => {
            setPayments((current) =>
              current.map((entry) =>
                entry.id === info.row.original.id
                  ? { ...entry, enabled: checked }
                  : entry
              )
            )
            toaster.create({
              type: "info",
              title: checked
                ? "Payment method enabled"
                : "Payment method disabled",
            })
          }}
        >
          <span className="sr-only">{`Enable ${info.row.original.name}`}</span>
        </Switch>
      ),
    },
  ]

  return (
    <AkrosShell expanded={["settings"]} selected="shipping-payments">
      <Toaster />

      <PageHeader
        actions={
          <Button icon="icon-[mdi--plus]" size="sm" variant="primary">
            New method
          </Button>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Settings", href: "#" },
          { label: "Shipping & payment" },
        ]}
        description="ABRA only receives a text line — everything a customer sees in checkout is defined here."
        title="Shipping & payment"
      />

      <Tabs defaultValue="shipping" variant="line">
        <Tabs.List>
          <Tabs.Trigger value="shipping">Shipping</Tabs.Trigger>
          <Tabs.Trigger value="payment">Payment</Tabs.Trigger>
          <Tabs.Trigger value="matrix">Combinations</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>

        <Tabs.Content className="pt-250" value="shipping">
          <SectionCard flush>
            <DataTable
              columns={shippingColumns}
              data={shipping}
              enableSorting
              getRowId={(row) => row.id}
              getRowLabel={(row) => row.original.name}
              rowActions={[
                {
                  id: "edit",
                  label: "Edit method",
                  icon: "icon-[mdi--pencil-outline]",
                  onAction: (row) => setEditing(row.original.id),
                },
              ]}
              size="sm"
            />
          </SectionCard>
        </Tabs.Content>

        <Tabs.Content className="pt-250" value="payment">
          <SectionCard flush>
            <DataTable
              columns={paymentColumns}
              data={payments}
              enableSorting
              getRowId={(row) => row.id}
              getRowLabel={(row) => row.original.name}
              size="sm"
            />
          </SectionCard>
        </Tabs.Content>

        <Tabs.Content className="pt-250" value="matrix">
          <SectionCard
            description="Which payment is offered with which shipping. A checked box is allowed."
            flush
            title="Shipping × payment"
          >
            <Table size="sm" variant="line">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Shipping</Table.ColumnHeader>
                  {payments.map((payment) => (
                    <Table.ColumnHeader align="center" key={payment.id}>
                      {payment.name}
                    </Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {shipping.map((method) => (
                  <Table.Row key={method.id}>
                    <Table.Cell>
                      <span className="flex items-center gap-100">
                        {method.name}
                        {!method.enabled && (
                          <Badge size="sm" variant="outline">
                            Off
                          </Badge>
                        )}
                      </span>
                    </Table.Cell>
                    {payments.map((payment) => (
                      <Table.Cell align="center" key={payment.id}>
                        <Checkbox
                          aria-label={`${payment.name} with ${method.name}`}
                          checked={method.payments.includes(payment.id)}
                          onChange={(event) => {
                            const checked = event.target.checked
                            setShipping((current) =>
                              current.map((entry) =>
                                entry.id === method.id
                                  ? {
                                      ...entry,
                                      payments: checked
                                        ? [...entry.payments, payment.id]
                                        : entry.payments.filter(
                                            (p) => p !== payment.id
                                          ),
                                    }
                                  : entry
                              )
                            )
                          }}
                        />
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </SectionCard>
        </Tabs.Content>
      </Tabs>

      {editingMethod && (
        <ShippingEditor
          method={editingMethod}
          onClose={() => setEditing(undefined)}
          onSave={(next) => {
            setShipping((current) =>
              current.map((method) => (method.id === next.id ? next : method))
            )
            setEditing(undefined)
            toaster.create({ type: "success", title: `${next.name} saved` })
          }}
        />
      )}
    </AkrosShell>
  )
}

export const Default: Story = {
  name: "Shipping & payment methods",
  render: () => <ShippingPaymentsPage />,
}

export const EditShipping: Story = {
  name: "Edit a shipping method",
  parameters: {
    docs: {
      description: {
        story:
          "The Zásilkovna method open in the side panel: name, pickup-point requirement, price and free-from threshold, who can use it, weight and size limits, allowed payments and the ABRA text line.",
      },
    },
  },
  render: () => <ShippingPaymentsPage editId="sh-zasilkovna" />,
}

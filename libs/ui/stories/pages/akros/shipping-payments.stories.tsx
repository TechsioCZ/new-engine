import { expect, userEvent, waitFor, within } from "storybook/test"
import { paymentPathError } from "../page-models"
import { StatusText } from "../../../src/atoms/status-text"
import { DemoBoundary } from "../demo-boundary"
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
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],

  tags: ["autodocs"],
  title: "Pages/Akros admin/Shipping & payment",
  parameters: {
    brandLock: "akros",
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
  error,
}: {
  id: string
  label: string
  helpText?: string
  value: string
  onChange: (value: string) => void
  error?: string
  step?: number
}) {
  return (
    <FormNumericInput
      helpText={error ?? helpText}
      validateStatus={error ? "error" : "default"}
      id={id}
      label={label}
      min={0}
      onValueChange={({ value }) => onChange(value)}
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
  payments,
}: {
  method: ShippingMethod
  onClose: () => void
  onSave: (method: ShippingMethod) => boolean
  payments: PaymentConfig[]
}) {
  const [draft, setDraft] = useState({
    ...method,
    price: String(method.price),
    freeFrom: String(method.freeFrom),
    maxWeight: String(method.maxWeight),
    maxLength: String(method.maxLength),
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K]
  ) => setDraft((current) => ({ ...current, [key]: value }))
  const save = () => {
    const nextErrors: Record<string, string> = {}
    if (!draft.name.trim()) nextErrors.name = "Enter a checkout name."
    for (const [key, id, allowZero] of [
      ["price", "sh-price", true],
      ["freeFrom", "sh-free", true],
      ["maxWeight", "sh-weight", false],
      ["maxLength", "sh-length", false],
    ] as const) {
      if (
        !draft[key].trim() ||
        !Number.isFinite(Number(draft[key])) ||
        (allowZero ? Number(draft[key]) < 0 : Number(draft[key]) <= 0)
      )
        nextErrors[key] =
          `Enter a finite number ${allowZero ? "of zero or more" : "greater than zero"}.`
      if (nextErrors[key]) nextErrors[`${key}Id`] = id
    }
    const next = {
      ...draft,
      name: draft.name.trim(),
      price: Number(draft.price),
      freeFrom: Number(draft.freeFrom),
      maxWeight: Number(draft.maxWeight),
      maxLength: Number(draft.maxLength),
    }
    const pathError = paymentPathError([next], payments)
    if (pathError) nextErrors.payments = pathError
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      const key = [
        "name",
        "price",
        "freeFrom",
        "maxWeight",
        "maxLength",
        "payments",
      ].find((field) => nextErrors[field])
      const id =
        key === "name"
          ? "sh-name"
          : key === "payments"
            ? `sh-pay-${Object.keys(paymentMethodLabels)[0]}`
            : nextErrors[`${key}Id`]
      document.getElementById(id ?? "sh-name")?.focus()
      return
    }
    onSave(next)
  }

  return (
    <Dialog
      actions={
        <>
          <Button onClick={onClose} theme="outlined" variant="secondary">
            Cancel
          </Button>
          <Button onClick={save} variant="primary">
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
            helpText={errors.name}
            validateStatus={errors.name ? "error" : "default"}
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
              error={errors.price}
              id="sh-price"
              label="Price"
              onChange={(value) => set("price", value)}
              value={draft.price}
            />
            <NumberField
              helpText="Order total in Kč. 0 = never free."
              error={errors.freeFrom}
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
              error={errors.maxWeight}
              id="sh-weight"
              label="Max. weight"
              onChange={(value) => set("maxWeight", value)}
              value={draft.maxWeight}
            />
            <NumberField
              helpText="cm — the longest side of any product in the cart"
              error={errors.maxLength}
              id="sh-length"
              label="Max. parcel length"
              onChange={(value) => set("maxLength", value)}
              value={draft.maxLength}
            />
          </div>
        </section>

        <section className="flex flex-col gap-200">
          <h3 className="font-semibold text-sm">Allowed payments</h3>
          {errors.payments && (
            <StatusText id="sh-payment-error" status="error">
              {errors.payments}
            </StatusText>
          )}
          {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map(
            (payment) => (
              <FormCheckbox
                checked={draft.payments.includes(payment)}
                aria-invalid={errors.payments ? true : undefined}
                aria-describedby={
                  errors.payments ? "sh-payment-error" : undefined
                }
                aria-errormessage={
                  errors.payments ? "sh-payment-error" : undefined
                }
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

function ShippingPaymentsPage({
  editId,
  initialTab = "shipping",
}: {
  editId?: string
  initialTab?: "shipping" | "payment" | "matrix"
}) {
  const toaster = useToast()
  const [shipping, setShipping] = useState(shippingMethods)
  const [payments, setPayments] = useState(paymentConfigs)
  const [editing, setEditing] = useState<string | undefined>(editId)

  const [configError, setConfigError] = useState<string>()
  const commitConfiguration = (
    nextShipping: ShippingMethod[],
    nextPayments = payments
  ) => {
    const error = paymentPathError(nextShipping, nextPayments)
    setConfigError(error)
    if (error) return false
    setShipping(nextShipping)
    setPayments(nextPayments)
    return true
  }

  const editingMethod = shipping.find((method) => method.id === editing)

  const toggleShipping = (id: string, enabled: boolean) => {
    if (
      !commitConfiguration(
        shipping.map((method) =>
          method.id === id ? { ...method, enabled } : method
        )
      )
    )
      return
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
            if (
              !commitConfiguration(
                shipping,
                payments.map((entry) =>
                  entry.id === info.row.original.id
                    ? { ...entry, enabled: checked }
                    : entry
                )
              )
            )
              return
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
        actions={null}
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Settings", href: "#" },
          { label: "Shipping & payment" },
        ]}
        description="ABRA only receives a text line — everything a customer sees in checkout is defined here."
        title="Shipping & payment"
      />

      {configError && (
        <StatusText role="alert" status="error">
          {configError}
        </StatusText>
      )}
      <Tabs defaultValue={initialTab} variant="line">
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
            <div
              role="region"
              aria-label="Shipping and payment combinations"
              tabIndex={0}
              className="min-w-0 max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              <Table className="min-w-3xl whitespace-nowrap" size="sm" variant="line">
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
                              commitConfiguration(
                                shipping.map((entry) =>
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
            </div>
          </SectionCard>
        </Tabs.Content>
      </Tabs>

      {editingMethod && (
        <ShippingEditor
          key={editingMethod.id}
          payments={payments}
          method={editingMethod}
          onClose={() => setEditing(undefined)}
          onSave={(next) => {
            if (
              !commitConfiguration(
                shipping.map((method) =>
                  method.id === next.id ? next : method
                )
              )
            )
              return false
            setEditing(undefined)
            toaster.create({ type: "success", title: `${next.name} saved` })
            return true
          }}
        />
      )}
    </AkrosShell>
  )
}

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare default in shipping payments to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "Shipping & payment methods",
  render: () => <ShippingPaymentsPage />,
}

export const Combinations: Story = {
  name: "Shipping and payment combinations",
  parameters: {
    docs: {
      description: {
        story:
          "Keep carrier and payment names readable in a keyboard-scrollable matrix on narrow screens instead of compressing every column.",
      },
    },
  },
  render: () => <ShippingPaymentsPage initialTab="matrix" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", {
      name: "Shipping and payment combinations",
    })
    const table = within(region).getByRole("table")
    await expect(region).toHaveAttribute("tabindex", "0")
    await expect(table).toHaveClass("min-w-3xl", "whitespace-nowrap")
    await expect(region.getBoundingClientRect().right).toBeLessThanOrEqual(
      canvasElement.ownerDocument.defaultView?.innerWidth ?? 1440
    )
    if (table.getBoundingClientRect().width > region.clientWidth) {
      await expect(region.scrollWidth).toBeGreaterThan(region.clientWidth)
    }
  },
}

export const EditShipping: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const dialog = within(body.getByRole("dialog"))
    const name = dialog.getByLabelText(/Name in checkout/)
    const original = (name as HTMLInputElement).value
    await userEvent.clear(name)
    await userEvent.type(name, "   ")
    await userEvent.click(dialog.getByRole("button", { name: "Save method" }))
    await expect(name).toHaveAttribute("aria-invalid", "true")
    await expect(name).toHaveFocus()
    await userEvent.clear(name)
    await userEvent.type(name, original)
    const price = dialog.getByRole("spinbutton", { name: "Price" })
    await userEvent.clear(price)
    await userEvent.click(dialog.getByRole("button", { name: "Save method" }))
    await expect(price).toHaveAttribute("aria-invalid", "true")
    await userEvent.type(price, "79")
    await userEvent.click(dialog.getByRole("button", { name: "Save method" }))
    await waitFor(() =>
      expect(body.queryByRole("dialog")).not.toBeInTheDocument()
    )
    await expect(
      canvas.getByRole("heading", { name: "Shipping & payment" })
    ).toBeVisible()
  },
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

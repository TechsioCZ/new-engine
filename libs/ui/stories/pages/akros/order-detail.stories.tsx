import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Button } from "../../../src/atoms/button"
import { Icon } from "../../../src/atoms/icon"
import { Dialog } from "../../../src/molecules/dialog"
import { FormInput } from "../../../src/molecules/form-input"
import { Menu, type MenuItem } from "../../../src/molecules/menu"
import { RadioGroup } from "../../../src/molecules/radio-group"
import { Toaster, useToast } from "../../../src/molecules/toast"
import { Table } from "../../../src/organisms/table"
import { DetailList, PageHeader, SectionCard } from "../shell"
import {
  type AkOrder,
  akOrderLines,
  akOrders,
  czk,
  type PaymentMethod,
  paymentMethodLabels,
  unpaidOrderEvents,
} from "./data"
import {
  AbraBadge,
  AkrosShell,
  akrosDocs,
  Notice,
  OrderStateBadge,
  PaymentBadge,
  ShippingCell,
} from "./shared"

const meta: Meta = {
  globals: { brand: "akros", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Order detail",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "One order, everything an operator needs to resolve it. Covers the brief's",
          "**Orders** detail: state, payment state, the unpaid Comgate case, the chosen",
          "shipping with the ParcelBox / pickup-point ID, the transfer to ABRA, and",
          "handling an order that was not paid online.",
          "",
          "**How it is built** — `PageHeader`, `SectionCard`, `DetailList`, `Table`,",
          "`RadioGroup`, `FormInput`, `Menu`, `Dialog` (`alertdialog`), `Toast`.",
          "",
          "**Pattern rules**",
          "- The page opens with the problem, not the data: an unpaid Comgate order or",
          "  a rejected ABRA transfer is a `Notice` above everything else, with the fix",
          "  as its button.",
          "- An unpaid online order has three honest exits — send a new payment link,",
          "  switch it to another payment method, or cancel. *Mark as paid* is an",
          "  audited `alertdialog`, because it overrides the gateway.",
          "- The pickup point is its own block with the ID in full and a way to change",
          "  it; carrier IDs are data, not decoration.",
          "- ABRA receives shipping and payment as **text lines**; the ABRA block shows",
          "  exactly the lines that will be sent, so nobody has to guess.",
          "- Quantities show the indivisible sale unit, so a line of 200 screws sold per",
          "  100 reads as 2 packs.",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

const orderMenu: MenuItem[] = [
  {
    type: "action",
    value: "invoice",
    label: "Download invoice",
    icon: "icon-[mdi--file-pdf-box]",
  },
  {
    type: "action",
    value: "confirm",
    label: "Resend confirmation",
    icon: "icon-[mdi--email-sync-outline]",
  },
  {
    type: "action",
    value: "note",
    label: "Add internal note",
    icon: "icon-[mdi--note-plus-outline]",
  },
  { type: "separator", id: "danger" },
  {
    type: "action",
    value: "cancel",
    label: "Cancel order",
    icon: "icon-[mdi--close-circle-outline]",
  },
]

const alternativeMethods: { value: PaymentMethod; description: string }[] = [
  {
    value: "transfer",
    description:
      "The customer receives bank details and a QR code; the order waits for the transfer.",
  },
  {
    value: "cod",
    description:
      "The carrier collects the amount on delivery. A 39 Kč fee is added.",
  },
]

function requireOrder(id: string): AkOrder {
  const order = akOrders.find((entry) => entry.id === id)
  if (!order) {
    throw new Error(`Fixture order ${id} is missing`)
  }
  return order
}

function OrderDetailPage({ orderId }: { orderId: string }) {
  const toaster = useToast()
  const [order, setOrder] = useState<AkOrder>(() => requireOrder(orderId))
  const [switching, setSwitching] = useState(false)
  const [newMethod, setNewMethod] = useState<PaymentMethod>("transfer")
  const [markingPaid, setMarkingPaid] = useState(false)
  const [zip, setZip] = useState("")

  const unpaidOnline =
    order.paymentMethod === "comgate" &&
    (order.payment === "unpaid" || order.payment === "failed")
  const subtotal = akOrderLines.reduce(
    (sum, line) => sum + line.qty * line.unitPrice,
    0
  )

  const sendToAbra = () => {
    setOrder((current) => ({
      ...current,
      abra: "queued",
      abraError: undefined,
    }))
    toaster.create({
      type: "success",
      title: "Queued for ABRA",
      description:
        order.payment === "paid"
          ? "The order is sent with the next transfer run."
          : "Sent as unpaid — ABRA will expect payment on delivery or by invoice.",
    })
  }

  return (
    <AkrosShell selected="orders">
      <Toaster />

      <PageHeader
        actions={
          <>
            <Menu
              aria-label="Order actions"
              customTrigger={
                <Button
                  icon="icon-[mdi--dots-horizontal]"
                  size="sm"
                  theme="outlined"
                  variant="secondary"
                >
                  More
                </Button>
              }
              items={orderMenu}
              onSelect={({ value }) =>
                toaster.create({ type: "info", title: `Action: ${value}` })
              }
            />
            <Button
              disabled={order.abra === "sent" || order.abra === "queued"}
              icon="icon-[mdi--database-arrow-right-outline]"
              onClick={sendToAbra}
              size="sm"
              variant="primary"
            >
              Send to ABRA
            </Button>
          </>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Orders", href: "#" },
          { label: order.number },
        ]}
        description={`Placed ${order.placedAt} · ${order.items} items`}
        meta={
          <>
            <OrderStateBadge state={order.state} />
            <PaymentBadge state={order.payment} />
            <AbraBadge state={order.abra} />
          </>
        }
        title={`Order ${order.number}`}
      />

      {unpaidOnline && (
        <Notice
          action={
            <>
              <Button
                icon="icon-[mdi--email-sync-outline]"
                onClick={() =>
                  toaster.create({
                    type: "success",
                    title: "New payment link sent",
                    description: order.email,
                  })
                }
                size="sm"
                variant="primary"
              >
                Send new payment link
              </Button>
              <Button
                onClick={() => setSwitching(true)}
                size="sm"
                theme="outlined"
                variant="secondary"
              >
                Change payment method
              </Button>
            </>
          }
          title={
            order.payment === "failed"
              ? "Comgate payment failed"
              : "Comgate payment was not completed"
          }
          tone="danger"
        >
          Transaction {order.transactionId}. Goods are not reserved in ABRA
          until the order is paid or switched to a method that pays later.
        </Notice>
      )}

      {order.abra === "error" && (
        <Notice
          action={
            <Button
              disabled={zip.length < 5}
              icon="icon-[mdi--database-refresh-outline]"
              onClick={sendToAbra}
              size="sm"
              variant="primary"
            >
              Fix and resend
            </Button>
          }
          title="ABRA rejected this order"
          tone="warning"
        >
          <p>{order.abraError}</p>
          <div className="max-w-xs">
            <FormInput
              id="fix-zip"
              label="ZIP code"
              onChange={(event) => setZip(event.target.value)}
              placeholder="301 00"
              size="sm"
              value={zip}
            />
          </div>
        </Notice>
      )}

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-3">
        <div className="flex flex-col gap-250 xl:col-span-2">
          <SectionCard flush title="Items">
            <Table size="sm" variant="line">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Product</Table.ColumnHeader>
                  <Table.ColumnHeader>ABRA code</Table.ColumnHeader>
                  <Table.ColumnHeader align="end">Quantity</Table.ColumnHeader>
                  <Table.ColumnHeader align="end">
                    Unit price
                  </Table.ColumnHeader>
                  <Table.ColumnHeader align="end">Total</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {akOrderLines.map((line) => (
                  <Table.Row key={line.code}>
                    <Table.Cell>{line.name}</Table.Cell>
                    <Table.Cell>{line.code}</Table.Cell>
                    <Table.Cell align="end">
                      <span className="flex flex-col items-end gap-50">
                        <span>{line.qty} pcs</span>
                        {line.saleUnit > 1 && (
                          <span className="text-fg-secondary text-xs">
                            {line.qty / line.saleUnit} × pack of {line.saleUnit}
                          </span>
                        )}
                      </span>
                    </Table.Cell>
                    <Table.Cell align="end">
                      {line.unitPrice.toFixed(2)} Kč
                    </Table.Cell>
                    <Table.Cell align="end">
                      {czk.format(line.qty * line.unitPrice)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </SectionCard>

          <SectionCard
            description="What happened to this order, newest first."
            title="History"
          >
            <ol className="flex flex-col gap-200">
              {unpaidOrderEvents.map((event) => (
                <li className="flex gap-150" key={event.id}>
                  <Icon
                    className="mt-50 text-fg-secondary"
                    icon="icon-[mdi--circle-medium]"
                    size="sm"
                  />
                  <div className="flex min-w-0 flex-col gap-50">
                    <span className="flex flex-wrap items-baseline gap-150">
                      <span className="font-medium text-sm">{event.title}</span>
                      <span className="text-fg-secondary text-xs">
                        {event.at}
                      </span>
                    </span>
                    <span className="text-fg-secondary text-sm">
                      {event.detail}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-250">
          <SectionCard title="Payment">
            <DetailList
              items={[
                {
                  term: "Method",
                  value: paymentMethodLabels[order.paymentMethod],
                },
                {
                  term: "State",
                  value: <PaymentBadge state={order.payment} />,
                },
                {
                  term: "Comgate transaction",
                  value: order.transactionId ?? "—",
                },
                { term: "Amount", value: czk.format(order.total) },
              ]}
            />
            {!unpaidOnline && order.payment !== "paid" && (
              <Button
                icon="icon-[mdi--cash-check]"
                onClick={() => setMarkingPaid(true)}
                size="sm"
                theme="outlined"
                variant="secondary"
              >
                Mark as paid
              </Button>
            )}
          </SectionCard>

          <SectionCard
            actions={
              <Button
                icon="icon-[mdi--map-marker-outline]"
                size="sm"
                theme="borderless"
                variant="secondary"
              >
                Change point
              </Button>
            }
            title="Shipping"
          >
            <ShippingCell carrier={order.carrier} />
            <DetailList
              items={[
                {
                  term: "Pickup point ID",
                  value: order.pointId ?? "Delivery to address",
                },
                { term: "Pickup point", value: order.pointName ?? "—" },
                { term: "Parcel", value: "3.1 kg · 30 × 20 × 12 cm" },
                {
                  term: "Tracking",
                  value:
                    order.state === "shipped"
                      ? "Z 1287 4410 22"
                      : "Not shipped yet",
                },
              ]}
            />
          </SectionCard>

          <SectionCard title="Customer">
            <DetailList
              items={[
                { term: "Name", value: order.customer },
                { term: "Type", value: order.customerType },
                { term: "Email", value: order.email },
                { term: "Phone", value: order.phone },
              ]}
            />
            <Button
              icon="icon-[mdi--account-arrow-right-outline]"
              size="sm"
              theme="borderless"
              variant="secondary"
            >
              Open customer
            </Button>
          </SectionCard>

          <SectionCard
            description="ABRA does not know shipping or payment definitions — it receives these text lines."
            title="ABRA transfer"
          >
            <DetailList
              items={[
                {
                  term: "State",
                  value: (
                    <AbraBadge
                      document={order.abraDocument}
                      state={order.abra}
                    />
                  ),
                },
                { term: "Subtotal", value: czk.format(subtotal) },
                {
                  term: "Shipping line",
                  value: `Doprava: ${order.carrier}${order.pointId ? ` ${order.pointId}` : ""}`,
                },
                {
                  term: "Payment line",
                  value: `Platba: ${paymentMethodLabels[order.paymentMethod]}`,
                },
              ]}
            />
          </SectionCard>
        </div>
      </div>

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setSwitching(false)}
              theme="outlined"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSwitching(false)
                setOrder((current) => ({
                  ...current,
                  paymentMethod: newMethod,
                  payment: "unpaid",
                  transactionId: undefined,
                  state: "processing",
                }))
                toaster.create({
                  type: "success",
                  title: "Payment method changed",
                  description: `${paymentMethodLabels[newMethod]} — the customer has been notified. The order can now go to ABRA.`,
                })
              }}
              variant="primary"
            >
              Change method
            </Button>
          </>
        }
        customTrigger
        description="The Comgate transaction is closed and the order continues with a method that is paid later."
        onOpenChange={(details) => setSwitching(details.open)}
        open={switching}
        size="sm"
        title="Change payment method"
      >
        <RadioGroup
          onValueChange={(value) => {
            if (value) {
              setNewMethod(value as PaymentMethod)
            }
          }}
          value={newMethod}
        >
          <RadioGroup.Label>New payment method</RadioGroup.Label>
          <RadioGroup.ItemGroup>
            {alternativeMethods.map((option) => (
              <RadioGroup.Item key={option.value} value={option.value}>
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemControl />
                <RadioGroup.ItemContent>
                  <RadioGroup.ItemText>
                    {paymentMethodLabels[option.value]}
                  </RadioGroup.ItemText>
                </RadioGroup.ItemContent>
                <RadioGroup.ItemDescription>
                  {option.description}
                </RadioGroup.ItemDescription>
              </RadioGroup.Item>
            ))}
          </RadioGroup.ItemGroup>
        </RadioGroup>
      </Dialog>

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setMarkingPaid(false)}
              theme="outlined"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setMarkingPaid(false)
                setOrder((current) => ({ ...current, payment: "paid" }))
                toaster.create({
                  type: "success",
                  title: "Marked as paid",
                  description: "Recorded in the order history with your name.",
                })
              }}
              variant="warning"
            >
              Mark {czk.format(order.total)} as paid
            </Button>
          </>
        }
        customTrigger
        description="Use this only when the money arrived outside the e-shop (bank statement, cash at the counter). The change is logged with your name."
        onOpenChange={(details) => setMarkingPaid(details.open)}
        open={markingPaid}
        role="alertdialog"
        size="sm"
        title="Mark this order as paid?"
      />
    </AkrosShell>
  )
}

export const UnpaidComgate: Story = {
  name: "Unpaid Comgate order",
  parameters: {
    docs: {
      description: {
        story:
          "The customer left the Comgate gateway. Send a new payment link, or switch the order to bank transfer / cash on delivery — after the switch it can go to ABRA as unpaid.",
      },
    },
  },
  render: () => <OrderDetailPage orderId="o-10431" />,
}

export const PaidToParcelBox: Story = {
  name: "Paid, shipping to ParcelBox",
  parameters: {
    docs: {
      description: {
        story:
          "The happy path: paid through Comgate, delivered to a PPL ParcelBox whose ID is shown in full. Already in ABRA, so the transfer action is disabled.",
      },
    },
  },
  render: () => <OrderDetailPage orderId="o-10429" />,
}

export const CashOnDeliveryAbraError: Story = {
  name: "Not paid online, ABRA rejected",
  parameters: {
    docs: {
      description: {
        story:
          "A cash-on-delivery order — never paid online, which is expected. ABRA rejected it because the address has no ZIP code; enter one and resend.",
      },
    },
  },
  render: () => <OrderDetailPage orderId="o-10426" />,
}

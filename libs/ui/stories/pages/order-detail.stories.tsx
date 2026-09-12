import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon, type IconType } from "../../src/atoms/icon"
import { Image } from "../../src/atoms/image"
import { Dialog } from "../../src/molecules/dialog"
import { Menu, type MenuItem } from "../../src/molecules/menu"
import { Steps } from "../../src/molecules/steps"
import { Tabs } from "../../src/molecules/tabs"
import { Toaster, useToast } from "../../src/molecules/toast"
import { Table } from "../../src/organisms/table"
import { adminNav, currency, orderLines, orders, storefrontProducts } from "./data"
import { Brand, Frame, GlobalSearch, NavList, Panel, TopBar } from "./frame"
import { DetailList, PageHeader, SectionCard, StatusBadge } from "./shell"

const meta: Meta = {
  /*
   * Business is the brand these back-office pages are designed against: it is the
   * light-only, high-contrast blue scale. Set at meta level so every page opens in
   * it; the Brand toolbar still switches the whole set to Default or Neo.
   */
  globals: { brand: "business", mode: "light" },
  title: "Pages/E-commerce/Order detail",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "The single-record screen behind every order list: what was bought, what state",
          "the money and the goods are in, and what the operator can do about it.",
          "",
          "**Pattern rules**",
          "- Fulfilment state leads as a `Steps` strip: an operator's first question is",
          "  always “where is this order right now?”.",
          "- Line items are a plain `Table` — a record's contents are fixed, so a full",
          "  DataTable with search and paging would be chrome nobody uses.",
          "- Money totals sit in a sticky panel and are never split across tabs; the",
          "  figure a customer quotes on the phone must always be on screen.",
          "- Exactly one primary action per state (`Fulfil`, then `Mark delivered`);",
          "  everything reversible or rare collapses into a `Menu`.",
          "- Refunds are destructive and irreversible, so they confirm in an",
          "  `alertdialog` that names the amount.",
          "- The customer block links out to the CRM rather than duplicating it — one",
          "  record, one owner.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

const fulfilmentSteps = [
  { title: "Paid", description: "11 Sep, 09:42" },
  { title: "Picked", description: "11 Sep, 11:10" },
  { title: "Shipped", description: "Awaiting carrier" },
  { title: "Delivered", description: "—" },
]

const orderMenu: MenuItem[] = [
  { type: "action", value: "invoice", label: "Download invoice", icon: "icon-[mdi--file-pdf-box]" },
  { type: "action", value: "resend", label: "Resend confirmation", icon: "icon-[mdi--email-sync-outline]" },
  { type: "action", value: "note", label: "Add internal note", icon: "icon-[mdi--note-plus-outline]" },
  { type: "separator", id: "danger" },
  { type: "action", value: "refund", label: "Refund order", icon: "icon-[mdi--cash-refund]" },
  { type: "action", value: "cancel", label: "Cancel order", icon: "icon-[mdi--close-circle-outline]" },
]

const timeline: { id: string; icon: IconType; title: string; detail: string; at: string }[] = [
  { id: "ev-1", icon: "icon-[mdi--package-variant-closed]", title: "Items picked", detail: "Warehouse Prague · picked by T. Dvořák", at: "11 Sep, 11:10" },
  { id: "ev-2", icon: "icon-[mdi--email-check-outline]", title: "Confirmation sent", detail: "marta.n@example.com · opened", at: "11 Sep, 09:44" },
  { id: "ev-3", icon: "icon-[mdi--credit-card-check-outline]", title: "Payment captured", detail: "Card ending 4242 · 248 €", at: "11 Sep, 09:42" },
  { id: "ev-4", icon: "icon-[mdi--cart-outline]", title: "Order placed", detail: "Web · session from Prague, CZ", at: "11 Sep, 09:41" },
]

function OrderDetailPage() {
  const toaster = useToast()
  const [nav, setNav] = useState("sales-orders")
  const [refunding, setRefunding] = useState(false)
  const [step, setStep] = useState(2)

  const [order] = orders
  const lines = orderLines.filter((line) => line.orderId === order?.id)
  const subtotal = lines.reduce(
    (sum, line) => sum + line.qty * line.unitPrice,
    0
  )

  if (!order) {
    return null
  }

  return (
    <Frame
      left={
        <Panel label="Main navigation" side="start">
          <Brand />
          <NavList
            defaultExpanded={["sales"]}
            nav={adminNav}
            onSelect={setNav}
            selected={nav}
          />
        </Panel>
      }
      top={<TopBar center={<GlobalSearch placeholder="Search orders…" />} />}
    >
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
              onSelect={({ value }) => {
                if (value === "refund") {
                  setRefunding(true)
                  return
                }
                toaster.create({ type: "info", title: `Action: ${value}` })
              }}
            />
            <Button
              icon="icon-[mdi--truck-outline]"
              onClick={() => {
                setStep(3)
                toaster.create({
                  type: "success",
                  title: "Fulfilment created",
                  description: "Carrier label generated.",
                })
              }}
              size="sm"
              variant="primary"
            >
              Fulfil order
            </Button>
          </>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Sales", href: "#" },
          { label: "Orders", href: "#" },
          { label: order.number },
        ]}
        description={`Placed ${order.placedAt} · ${order.channel} · ${order.items} items`}
        meta={
          <>
            <StatusBadge status={order.status} />
            <Badge size="sm" variant="outline">
              Prepaid
            </Badge>
          </>
        }
        title={`Order ${order.number}`}
      />

      <SectionCard title="Fulfilment">
        <Steps count={fulfilmentSteps.length} size="sm" step={step} variant="solid">
          <Steps.List>
            {fulfilmentSteps.map((entry, index) => (
              <Steps.Item index={index} key={entry.title}>
                <Steps.Trigger>
                  <Steps.Indicator />
                  <Steps.ItemText>
                    <Steps.Title>{entry.title}</Steps.Title>
                    <Steps.Description>{entry.description}</Steps.Description>
                  </Steps.ItemText>
                </Steps.Trigger>
                <Steps.Separator />
              </Steps.Item>
            ))}
          </Steps.List>
        </Steps>
      </SectionCard>

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-3">
        <div className="flex flex-col gap-250 xl:col-span-2">
          <SectionCard flush title="Items">
            <div className="px-250 pb-250">
              <Table size="sm" variant="line">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Product</Table.ColumnHeader>
                    <Table.ColumnHeader>SKU</Table.ColumnHeader>
                    <Table.ColumnHeader align="end">Qty</Table.ColumnHeader>
                    <Table.ColumnHeader align="end">Unit</Table.ColumnHeader>
                    <Table.ColumnHeader align="end">Total</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {lines.map((line, index) => (
                    <Table.Row key={line.id}>
                      <Table.Cell>
                        <span className="flex items-center gap-150">
                          <Image
                            alt={line.product}
                            className="size-icon-control-lg rounded-md object-cover"
                            size="custom"
                            src={
                              storefrontProducts[index % storefrontProducts.length]
                                ?.image ?? ""
                            }
                          />
                          {line.product}
                        </span>
                      </Table.Cell>
                      <Table.Cell>{line.sku}</Table.Cell>
                      <Table.Cell align="end">{line.qty}</Table.Cell>
                      <Table.Cell align="end">
                        {currency.format(line.unitPrice)}
                      </Table.Cell>
                      <Table.Cell align="end">
                        {currency.format(line.qty * line.unitPrice)}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </SectionCard>

          <SectionCard flush>
            <Tabs defaultValue="timeline" variant="line">
              <Tabs.List className="px-250 pt-250">
                <Tabs.Trigger value="timeline">Timeline</Tabs.Trigger>
                <Tabs.Trigger value="notes">Internal notes</Tabs.Trigger>
                <Tabs.Trigger value="documents">Documents</Tabs.Trigger>
                <Tabs.Indicator />
              </Tabs.List>

              <Tabs.Content className="p-250" value="timeline">
                <ol className="flex flex-col gap-200">
                  {timeline.map((event) => (
                    <li className="flex gap-150" key={event.id}>
                      <span className="mt-50 flex size-icon-control-sm shrink-0 items-center justify-center rounded-full bg-overlay text-fg-secondary">
                        <Icon icon={event.icon} size="sm" />
                      </span>
                      <div className="flex min-w-0 flex-col gap-50">
                        <div className="flex flex-wrap items-baseline gap-150">
                          <span className="font-medium text-sm">{event.title}</span>
                          <span className="text-fg-secondary text-xs">
                            {event.at}
                          </span>
                        </div>
                        <p className="text-fg-secondary text-sm">{event.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Tabs.Content>

              <Tabs.Content className="p-250" value="notes">
                <p className="text-fg-secondary text-sm">
                  Nothing recorded. Internal notes are visible to the team only
                  and never reach the customer.
                </p>
              </Tabs.Content>

              <Tabs.Content className="flex flex-col gap-150 p-250" value="documents">
                {["Invoice 2026-10241.pdf", "Delivery note 10241.pdf"].map((file) => (
                  <div
                    className="flex items-center justify-between gap-150 rounded-md border border-border-primary p-150"
                    key={file}
                  >
                    <span className="flex items-center gap-150 text-sm">
                      <Icon icon="icon-[mdi--file-pdf-box]" size="md" />
                      {file}
                    </span>
                    <Button size="sm" theme="borderless" variant="secondary">
                      Download
                    </Button>
                  </div>
                ))}
              </Tabs.Content>
            </Tabs>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-250 xl:sticky xl:top-250">
          <SectionCard title="Payment">
            <dl className="flex flex-col gap-100">
              <div className="flex items-center justify-between gap-150">
                <dt className="text-fg-secondary text-sm">Subtotal</dt>
                <dd className="text-sm">{currency.format(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-150">
                <dt className="text-fg-secondary text-sm">Delivery</dt>
                <dd className="text-sm">Free</dd>
              </div>
              <div className="flex items-center justify-between gap-150">
                <dt className="text-fg-secondary text-sm">Tax (21%)</dt>
                <dd className="text-sm">{currency.format(subtotal * 0.21)}</dd>
              </div>
              <div className="flex items-center justify-between gap-150 border-border-primary border-t pt-100">
                <dt className="font-semibold text-sm">Paid</dt>
                <dd className="font-semibold text-md">
                  {currency.format(order.total)}
                </dd>
              </div>
            </dl>
            <Button
              block
              icon="icon-[mdi--cash-refund]"
              onClick={() => setRefunding(true)}
              size="sm"
              theme="outlined"
              variant="danger"
            >
              Refund
            </Button>
          </SectionCard>

          <SectionCard
            actions={
              <Button size="sm" theme="borderless" variant="secondary">
                Open in CRM
              </Button>
            }
            title="Customer"
          >
            <DetailList
              items={[
                { term: "Name", value: order.customer },
                { term: "Email", value: order.email },
                { term: "Orders", value: "34 · since 2024" },
                { term: "Tier", value: <StatusBadge status="vip" /> },
              ]}
            />
          </SectionCard>

          <SectionCard title="Addresses">
            <DetailList
              items={[
                {
                  term: "Delivery",
                  value: "Vinohradská 12, 120 00 Praha, CZ",
                },
                {
                  term: "Billing",
                  value: "Same as delivery",
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
              onClick={() => setRefunding(false)}
              theme="outlined"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setRefunding(false)
                toaster.create({
                  type: "success",
                  title: "Refund issued",
                  description: `${currency.format(order.total)} returned to the original card.`,
                })
              }}
              variant="danger"
            >
              {`Refund ${currency.format(order.total)}`}
            </Button>
          </>
        }
        customTrigger
        description={`${currency.format(order.total)} will be returned to the card ending 4242. Refunds cannot be reversed, and the fulfilment must be cancelled separately.`}
        onOpenChange={(details) => setRefunding(details.open)}
        open={refunding}
        role="alertdialog"
        size="sm"
        title="Refund this order?"
      />
    </Frame>
  )
}

export const Default: Story = {
  name: "Single record",
  render: () => <OrderDetailPage />,
}

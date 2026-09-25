import type { Meta, StoryObj } from "@storybook/react"
import { useMemo, useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { Dialog } from "../../../src/molecules/dialog"
import { Tabs } from "../../../src/molecules/tabs"
import { Toaster, useToast } from "../../../src/molecules/toast"
import type {
  ColumnDef,
  DataTableProps,
} from "../../../src/organisms/data-table"
import { DataTable } from "../../../src/organisms/data-table"
import { BulkActionBar, PageHeader, SectionCard } from "../shell"
import {
  type AkOrder,
  abraStateOptions,
  akOrders,
  carrierOptions,
  czk,
  orderStateOptions,
  paymentStateOptions,
} from "./data"
import {
  AbraBadge,
  AkrosShell,
  akrosDocs,
  OrderStateBadge,
  PaymentCell,
  ShippingCell,
} from "./shared"

const meta: Meta = {
  globals: { brand: "akros", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Orders",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "The order queue. Covers the brief's **Orders** list: see orders and their",
          "state, the payment state, spot unpaid Comgate orders, the chosen shipping",
          "with the ParcelBox / pickup-point ID, and push orders to ABRA.",
          "",
          "**How it is built** — `DataTable` (filters, sorting, pinning, selection,",
          "row actions), `Tabs` as saved views, `BulkActionBar`, `Dialog`, `Toast`.",
          "",
          "**Pattern rules**",
          "- Saved views (`Tabs`) answer the recurring questions — *unpaid online*,",
          "  *not in ABRA* — with a count, so the operator sees the backlog before",
          "  opening it. Column filters still refine inside any view.",
          "- Payment is one cell: state badge + method. An unpaid **Comgate** order",
          "  carries its own marker; it is the order most likely to need a human.",
          "- The pickup point ID is shown in full in the list — support reads it out",
          "  on the phone and the carrier API needs it verbatim.",
          "- Sending to ABRA is a bulk action. Orders that were never paid online can",
          "  still be sent, but the confirmation says so explicitly (the brief requires",
          "  handling orders that were not paid online).",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

type View = "all" | "unpaid-online" | "abra" | "to-ship"

const views: {
  value: View
  label: string
  match: (order: AkOrder) => boolean
}[] = [
  { value: "all", label: "All orders", match: () => true },
  {
    value: "unpaid-online",
    label: "Unpaid Comgate",
    match: (order) =>
      order.paymentMethod === "comgate" &&
      (order.payment === "unpaid" || order.payment === "failed"),
  },
  {
    value: "abra",
    label: "Not in ABRA",
    match: (order) =>
      order.state !== "cancelled" &&
      (order.abra === "not-sent" || order.abra === "error"),
  },
  {
    value: "to-ship",
    label: "Ready to ship",
    match: (order) => order.state === "ready" || order.state === "processing",
  },
]

/* An order goes to ABRA once; cancelled orders never do. */
const canSendToAbra = (order: AkOrder) =>
  order.state !== "cancelled" &&
  (order.abra === "not-sent" || order.abra === "error")

/* A new payment link only makes sense for an unfinished online payment. */
const canRemind = (order: AkOrder) =>
  order.paymentMethod === "comgate" &&
  (order.payment === "unpaid" || order.payment === "failed")

/* How each unpaid order will still be paid, named by its own method. */
const unpaidHow: Record<AkOrder["paymentMethod"], string> = {
  comgate: "awaiting online payment through Comgate",
  transfer: "awaiting a bank transfer",
  cod: "paid on delivery",
  invoice: "paid by invoice",
}

function unpaidSummary(orders: AkOrder[]) {
  const counts = new Map<string, number>()
  for (const order of orders) {
    const how = unpaidHow[order.paymentMethod]
    counts.set(how, (counts.get(how) ?? 0) + 1)
  }
  return [...counts].map(([how, n]) => `${n} ${how}`).join(", ")
}

function OrdersPage({ initialView = "all" }: { initialView?: View }) {
  const toaster = useToast()
  const [data, setData] = useState(akOrders)
  const [view, setView] = useState<View>(initialView)
  const [selection, setSelection] = useState<
    NonNullable<DataTableProps<AkOrder>["rowSelection"]>
  >({})
  const [confirming, setConfirming] = useState(false)

  const activeView = views.find((entry) => entry.value === view) ?? views[0]
  const rows = data.filter((order) => activeView?.match(order) ?? true)
  const selected = data.filter((order) => selection[order.id])
  /* Bulk actions use the same eligibility as the row actions. */
  const toAbra = selected.filter(canSendToAbra)
  const toRemind = selected.filter(canRemind)
  const toAbraUnpaid = toAbra.filter(
    (order) => order.payment !== "paid" && order.payment !== "refunded"
  )

  const sendToAbra = (ids: string[]) => {
    setData((current) =>
      current.map((order) =>
        ids.includes(order.id)
          ? { ...order, abra: "queued", abraError: undefined }
          : order
      )
    )
    setSelection({})
    toaster.create({
      type: "success",
      title: `${ids.length} ${ids.length === 1 ? "order" : "orders"} queued for ABRA`,
      description: "The transfer runs every 5 minutes; the state updates here.",
    })
  }

  const columns = useMemo<ColumnDef<AkOrder, unknown>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Order",
        meta: { type: "string", width: 150 },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span className="font-medium">{info.getValue<string>()}</span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.placedAt}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        meta: { type: "string", width: 220 },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span className="flex items-center gap-100">
              {info.row.original.company ?? info.getValue<string>()}
              <Badge size="sm" variant="outline">
                {info.row.original.customerType}
              </Badge>
            </span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.email}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "state",
        header: "State",
        meta: { type: "enum", options: orderStateOptions, width: 150 },
        cell: (info) => <OrderStateBadge state={info.row.original.state} />,
      },
      {
        accessorKey: "payment",
        header: "Payment",
        meta: { type: "enum", options: paymentStateOptions, width: 170 },
        cell: (info) => (
          <PaymentCell
            method={info.row.original.paymentMethod}
            state={info.row.original.payment}
          />
        ),
      },
      {
        accessorKey: "carrier",
        header: "Shipping / pickup point",
        meta: { type: "enum", options: carrierOptions, width: 280 },
        cell: (info) => (
          <ShippingCell
            carrier={info.row.original.carrier}
            pointId={info.row.original.pointId}
            pointName={info.row.original.pointName}
          />
        ),
      },
      {
        accessorKey: "total",
        header: "Total",
        meta: { type: "number", align: "end", width: 130 },
        cell: (info) => czk.format(info.getValue<number>()),
      },
      {
        accessorKey: "abra",
        header: "ABRA",
        meta: { type: "enum", options: abraStateOptions, width: 160 },
        cell: (info) => (
          <AbraBadge
            document={info.row.original.abraDocument}
            state={info.row.original.abra}
          />
        ),
      },
    ],
    []
  )

  return (
    <AkrosShell selected="orders">
      <Toaster />

      <PageHeader
        actions={
          <Button
            icon="icon-[mdi--tray-arrow-down]"
            size="sm"
            theme="outlined"
            variant="secondary"
          >
            Export
          </Button>
        }
        breadcrumb={[{ label: "Home", href: "#" }, { label: "Orders" }]}
        description="Every order from the e-shop. Payment states come from Comgate, ABRA states from the transfer job."
        title="Orders"
      />

      <Tabs
        onValueChange={(value) => {
          setView(value as View)
          setSelection({})
        }}
        value={view}
        variant="line"
      >
        <Tabs.List>
          {views.map((entry) => (
            <Tabs.Trigger key={entry.value} value={entry.value}>
              {entry.label}
              <Badge size="sm" variant="outline">
                {String(data.filter(entry.match).length)}
              </Badge>
            </Tabs.Trigger>
          ))}
          <Tabs.Indicator />
        </Tabs.List>
        {views.map((entry) => (
          <Tabs.Content
            className="flex flex-col gap-250 pt-250"
            key={entry.value}
            value={entry.value}
          >
            {entry.value === view && (
              <>
                <BulkActionBar
                  count={selected.length}
                  onClear={() => setSelection({})}
                >
                  <Button
                    disabled={toAbra.length === 0}
                    icon="icon-[mdi--database-arrow-right-outline]"
                    onClick={() => setConfirming(true)}
                    size="sm"
                    variant="primary"
                  >
                    {`Send ${toAbra.length} to ABRA`}
                  </Button>
                  <Button
                    disabled={toRemind.length === 0}
                    icon="icon-[mdi--email-sync-outline]"
                    onClick={() =>
                      toaster.create({
                        type: "info",
                        title: "Payment reminders sent",
                        description: `${toRemind.length} customers received a new Comgate link.`,
                      })
                    }
                    size="sm"
                    theme="outlined"
                    variant="secondary"
                  >
                    {`Remind ${toRemind.length} unpaid Comgate`}
                  </Button>
                </BulkActionBar>

                <SectionCard flush>
                  <DataTable
                    columnPinning={{ start: ["number"], end: [] }}
                    columns={columns}
                    data={rows}
                    enableColumnFilters
                    enableColumnPinning
                    enableGlobalFilter
                    enablePagination
                    enableRowSelection
                    enableSorting
                    getRowId={(row) => row.id}
                    getRowLabel={(row) => `Order ${row.original.number}`}
                    onRowSelectionChange={setSelection}
                    renderEmpty={() => (
                      <p className="p-350 text-center text-fg-secondary text-sm">
                        Nothing in this view — the backlog is clear.
                      </p>
                    )}
                    rowActions={[
                      {
                        id: "open",
                        label: "Open order",
                        icon: "icon-[mdi--open-in-new]",
                        onAction: (row) =>
                          toaster.create({
                            type: "info",
                            title: `Open ${row.original.number}`,
                          }),
                      },
                      {
                        id: "abra",
                        label: "Send to ABRA",
                        icon: "icon-[mdi--database-arrow-right-outline]",
                        hidden: (row) => !canSendToAbra(row.original),
                        onAction: (row) => sendToAbra([row.original.id]),
                      },
                      {
                        id: "remind",
                        label: "Send payment reminder",
                        icon: "icon-[mdi--email-sync-outline]",
                        hidden: (row) => !canRemind(row.original),
                        onAction: (row) =>
                          toaster.create({
                            type: "info",
                            title: "Payment reminder sent",
                            description: row.original.email,
                          }),
                      },
                    ]}
                    rowSelection={selection}
                    size="sm"
                    stickyHeader
                    translations={{
                      searchPlaceholder: "Order number, customer, point ID…",
                    }}
                  />
                </SectionCard>
              </>
            )}
          </Tabs.Content>
        ))}
      </Tabs>

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setConfirming(false)}
              theme="outlined"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirming(false)
                sendToAbra(toAbra.map((order) => order.id))
              }}
              variant="primary"
            >
              {`Send ${toAbra.length} to ABRA`}
            </Button>
          </>
        }
        customTrigger
        description={[
          toAbraUnpaid.length > 0
            ? `${toAbraUnpaid.length} of them are not paid yet and reach ABRA as unpaid: ${unpaidSummary(toAbraUnpaid)}.`
            : "All of them are paid. ABRA receives the shipping and payment as text lines.",
          selected.length > toAbra.length
            ? `${selected.length - toAbra.length} selected orders are skipped — already in ABRA, queued or cancelled.`
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onOpenChange={(details) => setConfirming(details.open)}
        open={confirming}
        size="sm"
        title="Send orders to ABRA?"
      />
    </AkrosShell>
  )
}

export const Default: Story = {
  name: "All orders",
  render: () => <OrdersPage />,
}

export const UnpaidComgate: Story = {
  name: "Unpaid Comgate orders",
  parameters: {
    docs: {
      description: {
        story:
          "The saved view an operator opens every morning: online orders whose Comgate payment was cancelled or failed. Select rows to send a new payment link in bulk.",
      },
    },
  },
  render: () => <OrdersPage initialView="unpaid-online" />,
}

export const NotInAbra: Story = {
  name: "Orders not yet in ABRA",
  parameters: {
    docs: {
      description: {
        story:
          "Orders that were never sent or that ABRA rejected. Select them and use **Send to ABRA** — the dialog warns when unpaid orders are part of the batch.",
      },
    },
  },
  render: () => <OrdersPage initialView="abra" />,
}

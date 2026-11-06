import { DemoBoundary } from "./demo-boundary"
import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { Table } from "../../src/organisms/table"
import type { ColumnDef } from "../../src/organisms/data-table"
import { DataTable } from "../../src/organisms/data-table"
import {
  adminNav,
  channelOptions,
  currency,
  count,
  metricCurrency,
  type Order,
  orderLines,
  orderStatusOptions,
  orders,
  formatDate,
} from "./data"
import { RevenueChart } from "./revenue-chart"
import {
  AdminShell,
  PageHeader,
  SectionCard,
  StatCard,
  StatRow,
  StatusBadge,
} from "./shell"

const meta: Meta = {
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],
  tags: ["autodocs"],
  title: "Pages/E-commerce/Orders dashboard",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "An operations screen for a high-volume shop: the numbers that decide whether",
          "anything is wrong, the trend behind them, then the work queue itself.",
          "",
          "**Pattern rules**",
          "- Read top-down: KPI tiles (is something off?) → chart (since when?) → table",
          "  (which orders?). Never open with the table.",
          "- KPI tiles carry one number and one delta. A tile with a chart inside is a",
          "  chart, and belongs in the chart section.",
          "- Order lines expand inline (`enableExpanding` + `renderExpandedRow`) instead",
          "  of navigating away — fulfilment work is a scan, not a drill-down.",
          "- The identifying column is pinned (`columnPinning`) so it survives horizontal",
          "  scrolling on wide fulfilment grids.",
          "- Status is always a badge from the shared map, so `refunded` looks the same",
          "  here as it does in the CRM.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

// Follow the filter's control floor, including the Business touch-size override.
const filterColumnWidth =
  "max(220px, calc(var(--spacing-data-table-filter-sm) + 2 * var(--padding-data-table-filter-cell-x) + 2 * var(--border-width-data-table)))"

function OrdersDashboard() {
  const [nav, setNav] = useState("sales-orders")
  const [showFilters, setShowFilters] = useState(false)
  const orderList = useRef<HTMLElement>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)

  useEffect(() => {
    const viewport = orderList.current?.querySelector<HTMLElement>(
      'section[aria-label="Scrollable records"]'
    )
    const table = viewport?.querySelector("table")
    if (!viewport || !table) return
    const measure = () =>
      setShowScrollHint(viewport.scrollWidth > viewport.clientWidth + 1)
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(table)
    measure()
    return () => observer.disconnect()
  }, [])

  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Order",
        meta: { type: "string", width: showFilters ? filterColumnWidth : 90 },
        cell: (info) => (
          <span className="font-medium">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        meta: { type: "string", width: showFilters ? filterColumnWidth : 190 },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span>{info.getValue<string>()}</span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.email}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: {
          type: "enum",
          options: orderStatusOptions,
          width: showFilters ? filterColumnWidth : 120,
        },
        cell: (info) => <StatusBadge status={info.getValue<string>()} />,
      },
      {
        accessorKey: "channel",
        header: "Channel",
        meta: {
          type: "enum",
          options: channelOptions,
          width: showFilters ? filterColumnWidth : 120,
        },
      },
      {
        accessorKey: "items",
        header: "Items",
        meta: {
          type: "int",
          align: "end",
          width: showFilters ? filterColumnWidth : 100,
        },
      },
      {
        accessorKey: "total",
        header: "Total",
        meta: {
          type: "number",
          align: "end",
          width: showFilters ? filterColumnWidth : 110,
        },
        cell: (info) => currency.format(info.getValue<number>()),
      },
      {
        accessorKey: "placedAt",
        header: "Placed",
        meta: { type: "date", width: showFilters ? filterColumnWidth : 140 },
        cell: (info) => formatDate(info.getValue<string>()),
      },
    ],
    [showFilters],
  )

  return (
    <AdminShell
      defaultExpandedNav={["sales"]}
      nav={adminNav}
      onNavChange={setNav}
      selectedNav={nav}
    >
      <PageHeader
        actions={<></>}
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Sales", href: "#" },
          { label: "Orders" },
        ]}
        description="Last 30 days across every sales channel. Figures refresh every 15 minutes."
        title="Orders"
      />

      <StatRow mobileColumns={2}>
        <StatCard
          delta="+12.4%"
          hint="vs. previous 30 days"
          icon="icon-[mdi--cash-multiple]"
          label="Revenue"
          trend="up"
          value={metricCurrency.format(327_400)}
        />
        <StatCard
          delta="+3.1%"
          hint="vs. previous 30 days"
          icon="icon-[mdi--receipt-text-outline]"
          label="Orders"
          trend="up"
          value={count.format(2418)}
        />
        <StatCard
          delta="−1.8%"
          hint="Sessions with a paid order"
          icon="icon-[mdi--cart-percent]"
          label="Conversion"
          trend="down"
          value="3.42%"
        />
        <StatCard
          delta="+4"
          hint="Awaiting fulfilment > 24 h"
          icon="icon-[mdi--clock-alert-outline]"
          label="At risk"
          trend="down"
          value="17"
        />
      </StatRow>

      <SectionCard
        description="Revenue by sales channel, April to September."
        title="Revenue by channel"
      >
        <RevenueChart height={160} />
      </SectionCard>

      <section aria-label="Order list" className="min-w-0" ref={orderList}>
        <p className="mb-100 text-fg-secondary text-xs" hidden={!showScrollHint}>
          Scroll horizontally to see all order details.
        </p>
        <DataTable
          columnPinning={{ start: ["number"], end: [] }}
          columns={columns}
          data={orders}
          enableColumnFilters={showFilters}
          enableColumnPinning
          enableExpanding
          enableGlobalFilter
          enablePagination
          enableSorting
          getRowId={(row) => row.id}
          getRowLabel={(row) => `Order ${row.original.number}`}
          tableLayout="fixed"
          toolbarActions={[
            {
              id: "filters",
              label: "Filters",
              icon: "icon-[mdi--filter-variant]",
              theme: "outlined",
              "aria-pressed": showFilters,
              onClick: () => setShowFilters((visible) => !visible),
            },
          ]}
          renderExpandedRow={(row) => {
            const lines = orderLines.filter(
              (line) => line.orderId === row.original.id,
            )

            if (lines.length === 0) {
              return (
                <p className="p-200 text-fg-secondary text-sm">
                  No line items recorded for this order.
                </p>
              )
            }

            return (
              <div className="flex flex-col gap-150 p-200">
                <p className="font-medium text-sm">Line items</p>
                <Table size="sm" variant="line">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Product</Table.ColumnHeader>
                      <Table.ColumnHeader>SKU</Table.ColumnHeader>
                      <Table.ColumnHeader align="end">Qty</Table.ColumnHeader>
                      <Table.ColumnHeader align="end">
                        Unit price
                      </Table.ColumnHeader>
                      <Table.ColumnHeader align="end">
                        Line total
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {lines.map((line) => (
                      <Table.Row key={line.id}>
                        <Table.Cell>{line.product}</Table.Cell>
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
            )
          }}
          size="sm"
          stickyHeader
          striped
          translations={{ searchPlaceholder: "Search orders, customers…" }}
        />
      </section>
    </AdminShell>
  )
}

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare default in ecommerce orders to choose a suitable presentation for real product content.",
      },
    },
  },

  render: () => <OrdersDashboard />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const actions = canvas.getByRole("columnheader", { name: "Actions" })
    await waitFor(() =>
      expect(actions.scrollWidth).toBeLessThanOrEqual(actions.clientWidth)
    )
    const viewport = canvas.getByRole("region", { name: "Scrollable records" })
    const hint = canvas.getByText("Scroll horizontally to see all order details.")
    const checkScrollHint = () =>
      waitFor(() =>
        expect(hint.hidden).toBe(viewport.scrollWidth <= viewport.clientWidth + 1)
      )
    await checkScrollHint()
    if (
      canvasElement.ownerDocument.documentElement.dataset.theme === "business" &&
      (canvasElement.ownerDocument.defaultView?.innerWidth ?? 0) >= 1280
    ) {
      await expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1)
      const items = canvas.getByRole("button", { name: "Items" })
      await expect(items.getBoundingClientRect().height).toBeLessThanOrEqual(
        Number.parseFloat(getComputedStyle(items).lineHeight) + 1
      )
    }
    const filters = canvas.getByRole("button", { name: "Filters" })
    await expect(filters).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(filters)
    await expect(canvas.getByRole("row", { name: "Column filters" })).toBeVisible()
    await checkScrollHint()
    for (const viewport of canvasElement.querySelectorAll(
      ".data-table-filter-viewport"
    )) {
      await expect(viewport.scrollWidth).toBeLessThanOrEqual(
        viewport.clientWidth + 1
      )
    }
    const actionsBounds = actions.getBoundingClientRect()
    for (const content of canvasElement.querySelectorAll(
      '[data-part="actions-cell-content"]'
    )) {
      const control = content.firstElementChild
      if (!control) {
        throw new Error("An order row is missing its expand control.")
      }
      const bounds = control.getBoundingClientRect()
      await expect(bounds.width).toBeGreaterThan(0)
      await expect(bounds.left).toBeGreaterThanOrEqual(actionsBounds.left - 1)
      await expect(bounds.right).toBeLessThanOrEqual(actionsBounds.right + 1)
    }
    await userEvent.click(filters)
    await expect(canvas.queryByRole("row", { name: "Column filters" })).toBeNull()
    await checkScrollHint()
    const search = canvas.getByRole("button", { name: "Search workspace" })
    await userEvent.click(search)
    const body = within(canvasElement.ownerDocument.body)
    const dialog = body.getByRole("dialog", { name: "Workspace search" })
    const field = within(dialog).getByRole("searchbox", {
      name: "Search workspace records",
    })
    await expect(field).toBeVisible()
    await userEvent.type(field, "Runner")
    await expect(
      within(dialog).getByRole("button", { name: "Product · Runner low" })
    ).toBeVisible()
    await userEvent.clear(field)
    await userEvent.type(field, "zz-no-match")
    await expect(within(dialog).getByRole("status")).toHaveTextContent(
      "No records match"
    )
    await userEvent.clear(field)
    await userEvent.type(field, "Runner")
    await userEvent.keyboard("{Escape}")
    await expect(body.queryByRole("dialog")).toBeNull()
    await expect(search).toHaveFocus()
    // Verify restoration above, then leave the default capture in a pointer state.
    await userEvent.click(canvas.getByRole("heading", { name: "Orders" }))
  },
}

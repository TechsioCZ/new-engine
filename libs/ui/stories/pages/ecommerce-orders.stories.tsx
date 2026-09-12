import type { Meta, StoryObj } from "@storybook/react"
import { useMemo, useState } from "react"
import { Button } from "../../src/atoms/button"
import { Chart } from "../../src/molecules/chart"
import { Table } from "../../src/organisms/table"
import type { ColumnDef } from "../../src/organisms/data-table"
import { DataTable } from "../../src/organisms/data-table"
import {
  adminNav,
  channelOptions,
  currency,
  type Order,
  orderLines,
  orderStatusOptions,
  orders,
  revenueByChannel,
} from "./data"
import {
  AdminShell,
  PageHeader,
  SectionCard,
  StatCard,
  StatRow,
  StatusBadge,
} from "./shell"

const meta: Meta = {
  /*
   * Business is the brand these back-office pages are designed against: it is the
   * light-only, high-contrast blue scale. Set at meta level so every page opens in
   * it; the Brand toolbar still switches the whole set to Default or Neo.
   */
  globals: { brand: "business", mode: "light" },
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

function OrdersDashboard() {
  const [nav, setNav] = useState("sales-orders")

  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Order",
        meta: { type: "string", width: 130 },
        cell: (info) => (
          <span className="font-medium">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        meta: { type: "string", width: 220 },
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
        accessorKey: "channel",
        header: "Channel",
        meta: { type: "enum", options: channelOptions, width: 150 },
      },
      {
        accessorKey: "items",
        header: "Items",
        meta: { type: "int", align: "end", width: 120 },
      },
      {
        accessorKey: "total",
        header: "Total",
        meta: { type: "number", align: "end", width: 150 },
        cell: (info) => currency.format(info.getValue<number>()),
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { type: "enum", options: orderStatusOptions, width: 140 },
        cell: (info) => <StatusBadge status={info.getValue<string>()} />,
      },
      {
        accessorKey: "placedAt",
        header: "Placed",
        meta: { type: "date", width: 130 },
      },
    ],
    []
  )

  return (
    <AdminShell
      defaultExpandedNav={["sales"]}
      nav={adminNav}
      onNavChange={setNav}
      selectedNav={nav}
    >
      <PageHeader
        actions={
          <>
            <Button
              icon="icon-[mdi--tray-arrow-down]"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Export
            </Button>
            <Button icon="icon-[mdi--truck-outline]" size="sm" variant="primary">
              Create fulfilment
            </Button>
          </>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Sales", href: "#" },
          { label: "Orders" },
        ]}
        description="Last 30 days across every sales channel. Figures refresh every 15 minutes."
        title="Orders"
      />

      <StatRow>
        <StatCard
          delta="+12.4%"
          hint="vs. previous 30 days"
          icon="icon-[mdi--cash-multiple]"
          label="Revenue"
          trend="up"
          value={currency.format(327_400)}
        />
        <StatCard
          delta="+3.1%"
          hint="vs. previous 30 days"
          icon="icon-[mdi--receipt-text-outline]"
          label="Orders"
          trend="up"
          value="2 418"
        />
        <StatCard
          delta="−1.8%"
          hint="Checkout completion"
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
        description="Stacked by channel — one measure, one scale, no dual axes."
        title="Revenue by channel"
      >
        <Chart
          ariaLabel="Monthly revenue by sales channel"
          data={revenueByChannel}
          formatValue={(value) => `${Number(value) / 1000}k €`}
          height={280}
          legendLabel="Channel"
          series="channel"
          type="area"
          x="month"
          y="revenue"
          yLabel="Revenue"
        />
      </SectionCard>

      <SectionCard flush>
        <DataTable
          columnPinning={{ start: ["number"], end: [] }}
          columns={columns}
          data={orders}
          enableColumnFilters
          enableColumnPinning
          enableExpanding
          enableGlobalFilter
          enablePagination
          enableSorting
          getRowId={(row) => row.id}
          getRowLabel={(row) => `Order ${row.original.number}`}
          renderExpandedRow={(row) => {
            const lines = orderLines.filter(
              (line) => line.orderId === row.original.id
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
                      <Table.ColumnHeader align="end">Line total</Table.ColumnHeader>
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
      </SectionCard>
    </AdminShell>
  )
}

export const Default: Story = {
  render: () => <OrdersDashboard />,
}

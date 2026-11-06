import { DemoBoundary } from "./demo-boundary"
import { parseDate } from "@internationalized/date"
import type { Meta, StoryObj } from "@storybook/react"
import type { ColumnFiltersState } from "@tanstack/react-table"
import { useEffect, useMemo, useRef, useState } from "react"
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test"

import { Button } from "../../src/atoms/button"
import { Input } from "../../src/atoms/input"
import { DatePicker } from "../../src/molecules/date-picker"
import { SelectTemplate } from "../../src/templates/select"
import { Table } from "../../src/organisms/table"
import type { ColumnDef } from "../../src/organisms/data-table"
import { DataTable } from "../../src/organisms/data-table"
import {
  type DataTableFilterValue,
  type NumberFilterValue,
  NUMBER_FILTER_OPERATORS,
  TEXT_FILTER_OPERATORS,
} from "../../src/organisms/data-table.fields"
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

function OrderValueFilter({
  label,
  numeric = false,
  value,
  onChange,
}: {
  label: string
  numeric?: boolean
  value: NumberFilterValue
  onChange: (value: NumberFilterValue) => void
}) {
  const operator = value.operator ?? (numeric ? "equals" : "contains")
  const needsValue = operator !== "empty" && operator !== "notEmpty"
  return (
    <fieldset className="flex min-w-0 flex-col gap-150">
      <legend className="mb-100 font-medium text-sm">{label}</legend>
      <SelectTemplate
        items={numeric ? NUMBER_FILTER_OPERATORS : TEXT_FILTER_OPERATORS}
        onValueChange={({ value: next }) =>
          onChange({ operator: next[0], value: value.value })
        }
        size="sm"
        triggerProps={{ "aria-label": `${label} condition` }}
        value={[operator]}
      />
      <Input
        aria-label={`${label} filter`}
        disabled={!needsValue}
        onChange={(event) => onChange({ ...value, operator, value: event.target.value })}
        placeholder={`Filter ${label.toLowerCase()}…`}
        size="sm"
        type={numeric ? "number" : "text"}
        value={needsValue ? (value.value ?? "") : ""}
      />
      {operator === "between" && (
        <Input
          aria-label={`${label} upper bound`}
          onChange={(event) => onChange({ ...value, operator, to: event.target.value })}
          placeholder="Up to…"
          size="sm"
          type="number"
          value={value.to ?? ""}
        />
      )}
    </fieldset>
  )
}

function OrdersDashboard() {
  const [nav, setNav] = useState("sales-orders")
  const [showFilters, setShowFilters] = useState(false)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const orderList = useRef<HTMLElement>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)
  const [showEndFade, setShowEndFade] = useState(false)
  const [scrollEdge, setScrollEdge] = useState({ top: 0, height: 0 })
  const [pinIdentity, setPinIdentity] = useState(true)
  const [showFullDates, setShowFullDates] = useState(false)
  const filterValue = <T extends DataTableFilterValue,>(id: string) =>
    (columnFilters.find((filter) => filter.id === id)?.value ?? {}) as T
  const updateFilter = (id: string, value: DataTableFilterValue) =>
    setColumnFilters((previous) => [
      ...previous.filter((filter) => filter.id !== id),
      { id, value },
    ])
  const placedDate = filterValue<{ from?: string }>("placedAt").from

  useEffect(() => {
    const viewport = orderList.current?.querySelector<HTMLElement>(
      'section[aria-label="Scrollable records"]'
    )
    const table = viewport?.querySelector("table")
    if (!viewport || !table) return
    const measure = () => {
      // The wider date column fits the complete table budget at this width.
      setShowFullDates(viewport.clientWidth >= 960)
      setShowScrollHint(viewport.scrollWidth > viewport.clientWidth + 1)
      setShowEndFade(
        viewport.scrollWidth > viewport.clientWidth + Math.abs(viewport.scrollLeft) + 1
      )
      const wrapper = orderList.current?.querySelector('[data-order-table]')
      if (wrapper) {
        const top = viewport.getBoundingClientRect().top - wrapper.getBoundingClientRect().top
        const height = viewport.clientHeight
        setScrollEdge((previous) =>
          Math.abs(previous.top - top) < 0.5 && previous.height === height
            ? previous
            : { top, height }
        )
      }
      // Keep the full Total / Placed / Actions group visible at the last
      // scroll position. Release the identity pin only if that group needs it.
      const trailing = table.querySelectorAll<HTMLElement>(
        'thead [data-leaf-column="number"], thead [data-leaf-column="total"], thead [data-leaf-column="placedAt"], thead [data-actions-column]'
      )
      const required = [...trailing].reduce(
        (sum, cell) => sum + cell.getBoundingClientRect().width,
        0
      )
      setPinIdentity(required <= viewport.clientWidth + 1)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(table)
    viewport.addEventListener("scroll", measure, { passive: true })
    measure()
    return () => {
      observer.disconnect()
      viewport.removeEventListener("scroll", measure)
    }
  }, [])

  const columns = useMemo<ColumnDef<Order, unknown>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Order",
        meta: { type: "string", width: 80 },
        cell: (info) => (
          <span className="font-medium">{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        meta: { type: "string", width: 190 },
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
          width: 120,
        },
        cell: (info) => <StatusBadge status={info.getValue<string>()} />,
      },
      {
        accessorKey: "channel",
        header: "Channel",
        meta: {
          type: "enum",
          options: channelOptions,
          width: 120,
        },
      },
      {
        accessorKey: "items",
        header: "Items",
        meta: {
          type: "int",
          align: "end",
          width: 100,
        },
      },
      {
        accessorKey: "total",
        header: "Total",
        meta: {
          type: "number",
          align: "end",
          width: 90,
        },
        cell: (info) => (
          <span className="whitespace-nowrap tabular-nums">
            {currency.format(info.getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: "placedAt",
        header: "Placed",
        meta: { type: "date", width: showFullDates ? 170 : 110 },
        cell: (info) => {
          const date = formatDate(info.getValue<string>())
          if (showFullDates) {
            return (
              <time className="whitespace-nowrap" dateTime={info.getValue<string>()}>
                {date}
              </time>
            )
          }
          const year = date.slice(-4)
          return (
            <time className="flex flex-col gap-50 whitespace-nowrap" dateTime={info.getValue<string>()}>
              <span>{date.slice(0, -5)}</span>
              <span className="text-fg-secondary text-xs">{year}</span>
            </time>
          )
        },
      },
    ],
    [showFullDates],
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
          hint={"Awaiting fulfilment >\u00a024\u00a0h"}
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
        {showFilters && (
          <section aria-label="Order filters" className="mb-150 rounded-lg border border-border-primary bg-surface p-200">
            <div className="mb-200 flex items-center justify-between gap-150">
              <h2 className="font-semibold text-sm">Order filters</h2>
              <Button onClick={() => setColumnFilters([])} size="sm" theme="borderless">
                Reset filters
              </Button>
            </div>
            <div className="grid grid-cols-1 items-start gap-200 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { id: "number", label: "Order" },
                { id: "customer", label: "Customer" },
                { id: "items", label: "Items", numeric: true },
                { id: "total", label: "Total", numeric: true },
              ].map(({ id, label, numeric }) => (
                <OrderValueFilter
                  key={id}
                  label={label}
                  numeric={numeric}
                  onChange={(value) => updateFilter(id, value)}
                  value={filterValue<NumberFilterValue>(id)}
                />
              ))}
              {[
                { id: "status", label: "Status", options: orderStatusOptions },
                { id: "channel", label: "Channel", options: channelOptions },
              ].map(({ id, label, options }) => (
                <SelectTemplate
                  items={[{ label: id === "status" ? "All statuses" : "All channels", value: "" }, ...options]}
                  key={id}
                  label={label}
                  placeholder={id === "status" ? "All statuses" : "All channels"}
                  onValueChange={({ value }) => updateFilter(id, { values: value[0] ? value : [] })}
                  size="sm"
                  value={filterValue<{ values?: string[] }>(id).values ?? []}
                />
              ))}
              <DatePicker.Root
                locale="en-GB"
                onValueChange={({ valueAsString }) => updateFilter("placedAt", { from: valueAsString, to: valueAsString })}
                size="sm"
                value={placedDate ? parseDate(placedDate) : null}
              >
                <DatePicker.Label>Placed on</DatePicker.Label>
                <DatePicker.Control>
                  <DatePicker.Segments />
                  <DatePicker.IndicatorGroup>
                    <DatePicker.ClearTrigger />
                    <DatePicker.Trigger />
                  </DatePicker.IndicatorGroup>
                </DatePicker.Control>
                <DatePicker.Positioner>
                  <DatePicker.Content>
                    <DatePicker.Calendar />
                  </DatePicker.Content>
                </DatePicker.Positioner>
              </DatePicker.Root>
            </div>
          </section>
        )}
        <p className="mb-100 text-fg-secondary text-xs" hidden={!showScrollHint}>
          Scroll horizontally to see all order details.
        </p>
        <div className="relative" data-order-table="">
        <DataTable
          columnFilters={columnFilters}
          columnPinning={{ start: pinIdentity ? ["number"] : [], end: [] }}
          columns={columns}
          data={orders}
          enableColumnPinning
          enableExpanding
          enableGlobalFilter
          enablePagination
          enableSorting
          onColumnFiltersChange={setColumnFilters}
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
        {showEndFade && (
          <span aria-hidden="true" className="pointer-events-none absolute end-0 z-30 w-200 bg-linear-to-l from-border-primary to-transparent rtl:bg-linear-to-r" style={scrollEdge} />
        )}
        </div>
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
      viewport.clientWidth >= 960
    ) {
      await expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1)
      await waitFor(() => {
        expect(getComputedStyle(canvas.getByRole("columnheader", { name: "Order" })).boxShadow)
          .toBe("none")
        expect(getComputedStyle(actions).boxShadow).toBe("none")
        const date = viewport.querySelector("tbody time")
        if (!date) throw new Error("The Orders fixture must show a placed date.")
        expect(date.getBoundingClientRect().height).toBeLessThanOrEqual(
          Number.parseFloat(getComputedStyle(date).lineHeight) + 1
        )
      })
      const items = canvas.getByRole("button", { name: "Items" })
      await expect(items.getBoundingClientRect().height).toBeLessThanOrEqual(
        Number.parseFloat(getComputedStyle(items).lineHeight) + 1
      )
    }
    const filters = canvas.getByRole("button", { name: "Filters" })
    await expect(filters).toHaveAttribute("aria-pressed", "false")
    const initialWidth = viewport.scrollWidth
    await userEvent.click(filters)
    const panel = canvas.getByRole("region", { name: "Order filters" })
    await expect(panel).toBeVisible()
    await expect(viewport.scrollWidth).toBe(initialWidth)
    if (canvasElement.ownerDocument.documentElement.dataset.theme === "business") {
      const controls = [...panel.querySelectorAll<HTMLElement>(
        'input[aria-label$="filter"], [data-scope="select"][data-part="trigger"], [data-scope="date-picker"][data-part="control"]'
      )]
      await waitFor(() => {
        const heights = controls.map((control) => control.getBoundingClientRect().height)
        expect(heights.length).toBe(11)
        expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1)
      })
    }
    const orderFilter = within(panel).getByRole("textbox", { name: "Order filter" })
    const firstOrder = orders[0]
    if (!firstOrder) throw new Error("The order fixture must contain a row.")
    await userEvent.type(orderFilter, firstOrder.number)
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('tbody tr[data-index]').length).toBe(1)
    )
    await userEvent.click(within(panel).getByRole("button", { name: "Reset filters" }))
    await expect(orderFilter).toHaveValue("")
    const day = within(panel).getByRole("spinbutton", { name: "Day" })
    // Segmented date input consumes textInput, including mobile keyboard entry.
    // userEvent.keyboard alone does not emit that browser event.
    for (const [name, digits] of [["Day", "11"], ["Month", "09"], ["Year", "2026"]] as const) {
      const segment = within(panel).getByRole("spinbutton", { name })
      segment.focus()
      for (const digit of digits) {
        fireEvent(segment, new InputEvent("textInput", {
          bubbles: true, cancelable: true, data: digit,
        }))
      }
    }
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('tbody tr[data-index]').length).toBe(2)
    )
    await userEvent.click(within(panel).getByRole("button", { name: "Reset filters" }))
    await expect(day).toHaveTextContent("dd")
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('tbody tr[data-index]').length).toBe(orders.length)
    )
    await checkScrollHint()
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
    await expect(canvas.queryByRole("region", { name: "Order filters" })).toBeNull()
    await checkScrollHint()
    viewport.scrollLeft = viewport.scrollWidth
    await waitFor(() => {
      const identity = canvas.getByRole("columnheader", { name: "Order" })
      const total = canvas.getByRole("columnheader", { name: "Total" })
      const identityStyles = getComputedStyle(identity)
      const frozen = identityStyles.insetInlineStart !== "auto"
      const boundary = frozen
        ? identity.getBoundingClientRect().right
        : viewport.getBoundingClientRect().left
      expect(total.getBoundingClientRect().left).toBeGreaterThanOrEqual(boundary - 1)
      if (frozen && viewport.scrollWidth > viewport.clientWidth + 1) {
        expect(identityStyles.boxShadow).not.toBe("none")
        expect(Number.parseFloat(getComputedStyle(viewport).scrollPaddingInlineStart))
          .toBeCloseTo(identity.getBoundingClientRect().width, 0)
      }
    })
    for (const cell of viewport.querySelectorAll('tbody tr[data-index] td:nth-child(6)')) {
      await expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth + 1)
    }
    viewport.scrollLeft = 0
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

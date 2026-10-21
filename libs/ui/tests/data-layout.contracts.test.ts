import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Chart, type ChartProps } from "../src/molecules/chart"
import {
  type ColumnDef,
  DataTable,
  type DataTableProps,
} from "../src/organisms/data-table"
import { typedFilterMatch } from "../src/organisms/data-table.fields"
import { Header } from "../src/organisms/header"

const GROUPED_FOOTER_RE = /<td[^>]*colSpan="2"[^>]*>People<\/td>/
const SELECTED_INPUT_RE = /<input[^>]*aria-label="Select row a"[^>]*>/

type Datum = { category: string; value: number; series: string }
const chartProps: ChartProps<Datum> = {
  ariaLabel: "Revenue by month",
  data: [{ category: "January", value: 42, series: "Online" }],
  x: "category",
  y: "value",
  animate: false,
}
const renderChart = (overrides: Partial<ChartProps<Datum>> = {}) =>
  renderToStaticMarkup(h(Chart<Datum>, { ...chartProps, ...overrides }))
type RecordRow = { id: string; first: string; last: string; amount: number }
const data: RecordRow[] = [
  { id: "a", first: "Ada", last: "Lovelace", amount: 42 },
  { id: "b", first: "Alan", last: "Turing", amount: 58 },
]
const columns: ColumnDef<RecordRow>[] = [
  {
    id: "identity",
    header: "Identity",
    footer: "People",
    columns: [
      { accessorKey: "first", header: "First", meta: { width: 200 } },
      { accessorKey: "last", header: "Last", meta: { width: 200 } },
    ],
  },
  {
    accessorKey: "amount",
    header: "Amount",
    footer: "100",
    meta: { width: 900 },
  },
]
const renderTable = (overrides: Partial<DataTableProps<RecordRow>> = {}) =>
  renderToStaticMarkup(
    h(DataTable<RecordRow>, {
      data,
      columns,
      getRowId: (row) => row.id,
      ...overrides,
    })
  )

describe("chart information alternatives and valid geometry", () => {
  it("keeps a captioned, formatted dataset alternative when tooltips are disabled", () => {
    const html = renderChart({
      tooltip: false,
      formatValue: (value) => `€${value}`,
    })
    expect(html).toContain("<details")
    expect(html).toContain("View chart data")
    expect(html).toContain("<caption>Revenue by month</caption>")
    expect(html).toContain("January")
    expect(html).toContain("€42")
  })
  it.each([
    { rows: [] },
    { rows: [{ category: "Bad", value: Number.NaN, series: "Online" }] },
    {
      rows: [
        { category: "Bad", value: Number.POSITIVE_INFINITY, series: "Online" },
      ],
    },
  ])("shows an empty state without an empty SVG for %j", ({ rows }) => {
    const html = renderChart({ data: rows })
    expect(html).toContain("No data to display.")
    expect(html).not.toContain("<svg")
  })
  it.each(["pie", "donut"] as const)(
    "rejects invalid %s input rather than misrepresenting composition",
    (type) => {
      for (const value of [-2, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
        const html = renderChart({
          type,
          data: [{ category: "A", value, series: "A" }],
        })
        expect(html).toContain("positive total")
        expect(html).not.toContain("<svg")
        expect(html).not.toContain("<details")
      }
    }
  )
  it("drops nonfinite cartesian rows and gives singleton lines a visible marker", () => {
    const html = renderChart({
      data: [
        ...chartProps.data,
        { category: "Broken", value: Number.NaN, series: "Online" },
      ],
    })
    expect(html).not.toContain("Broken")
    expect(html).toContain("<circle")
  })
  it("assigns fixed domain colors and matching non-color line patterns", () => {
    const rows = [
      { category: "Jan", value: 10, series: "Retail" },
      { category: "Feb", value: 20, series: "Retail" },
      { category: "Jan", value: 15, series: "Online" },
      { category: "Feb", value: 25, series: "Online" },
    ]
    const html = renderChart({
      data: rows,
      series: "series",
      seriesDomain: ["Online", "Retail"],
    })
    expect(html).toContain('stroke-dasharray="8 4"')
    const filtered = renderChart({
      data: rows.filter((row) => row.series === "Retail"),
      series: "series",
      seriesDomain: ["Online", "Retail"],
    })
    expect(filtered).toContain("var(--color-chart-series-2)")
    expect(filtered).toContain('stroke-dasharray="8 4"')
    expect(filtered).not.toContain("var(--color-chart-series-1)")
  })
  it.each(["pie", "donut"] as const)(
    "keeps numeric %s categories in their explicit color slots",
    (type) => {
      type NumericDatum = { category: number; value: number }
      const props: ChartProps<NumericDatum> = {
        type,
        ariaLabel: "Numeric categories",
        x: "category",
        y: "value",
        data: [
          { category: 1, value: 10 },
          { category: 2, value: 20 },
        ],
        seriesDomain: [1, 2],
        animate: false,
      }
      const full = renderToStaticMarkup(h(Chart<NumericDatum>, props))
      const filtered = renderToStaticMarkup(
        h(Chart<NumericDatum>, { ...props, data: props.data.slice(1) })
      )
      expect(full).toContain('fill="var(--ts-chart-2,')
      expect(filtered).toContain('fill="var(--ts-chart-2,')
      expect(filtered).not.toContain('fill="var(--ts-chart-3,')
    }
  )
  it("gives native polar legends full-opacity readable labels too", () => {
    const html = renderChart({
      type: "donut",
      data: [
        { category: "A", value: 10, series: "A" },
        { category: "B", value: 20, series: "B" },
      ],
    })
    expect(html).toContain('font-size="14"')
    expect(html).not.toContain('font-size="11"')
    expect(html).not.toContain('fill-opacity="0.68"')
  })
  it("renders full-opacity readable tick labels", () => {
    const html = renderChart()
    expect(html).toContain('font-size="14"')
    expect(html).not.toContain('fill-opacity="0.68"')
  })
})

describe("table leaf widths, row semantics and announcements", () => {
  it("puts fixed layout widths on leaves, not group headers", () => {
    const html = renderTable({
      tableLayout: "fixed",
      enableColumnResizing: true,
    })
    expect(html).toContain(
      '<colgroup><col style="width:200px"/><col style="width:200px"/><col style="width:900px"/></colgroup>'
    )
    expect(html).toContain('colSpan="2"')
    expect(html).toContain('aria-label="Resize First"')
    expect(html).not.toContain('aria-label="Resize Identity"')
    expect(html).toMatch(GROUPED_FOOTER_RE)
  })
  it("includes expanded detail rows and footers in a monotonic accessible sequence", () => {
    const html = renderTable({
      enableExpanding: true,
      expanded: { a: true },
      renderExpandedRow: () => h("p", null, "Details"),
    })
    expect(html).toContain('aria-rowcount="7"')
    const indexes = [...html.matchAll(/aria-rowindex="(\d+)"/g)].map((match) =>
      Number(match[1])
    )
    expect(indexes).toEqual([3, 4, 5, 6, 7])
  })
  it("uses unknown row totals and page copy for pageCount-only manual paging", () => {
    const html = renderTable({
      columns: columns.slice(1),
      enablePagination: true,
      manualPagination: true,
      pageCount: 3,
      pagination: { pageIndex: 2, pageSize: 10 },
    })
    expect(html).toContain('aria-rowcount="-1"')
    expect(html).toContain("Page 3 of 3")
    expect(html).not.toContain("of 30")
    expect(html).toContain('aria-rowindex="22"')
  })
  it("renders an exact empty range for a zero-page manual response", () => {
    const pageLabel = () => "Unexpected page label"
    const html = renderTable({
      data: [],
      enablePagination: true,
      manualPagination: true,
      pageCount: 0,
      translations: { pageLabel },
    })
    expect(html).toContain("0–0 of 0")
    expect(html).not.toContain("Unexpected page label")
    expect(html).not.toContain('aria-current="page"')
  })
  it("keeps known and unknown pager destinations mounted on initial loading", () => {
    const known = renderTable({
      enablePagination: true,
      manualPagination: true,
      rowCount: 30,
      loading: true,
      pagination: { pageIndex: 1, pageSize: 10 },
    })
    expect(known).toContain('aria-current="page"')
    expect(known).toContain('aria-disabled="true"')
    expect(known).toContain('aria-busy="true"')
    const unknown = renderTable({
      enablePagination: true,
      manualPagination: true,
      pageCount: -1,
      hasNextPage: true,
      loadingMore: true,
    })
    expect(unknown).toContain("Next page")
    expect(unknown).toContain('aria-disabled="true"')
  })
  it("does not publish a known count below rendered indexes during page reconciliation", () => {
    const html = renderTable({
      enablePagination: true,
      manualPagination: true,
      rowCount: 1,
      pagination: { pageIndex: 3, pageSize: 10 },
    })
    expect(html).toContain('aria-rowcount="-1"')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain("requesting an available page")
  })
  it("offers forward/back controls without fabricated numbered pages for unknown totals", () => {
    const html = renderTable({
      enablePagination: true,
      manualPagination: true,
      pageCount: -1,
    })
    expect(html).toContain("Previous page")
    expect(html).toContain("Next page")
    expect(html).toContain("Page 1")
    expect(html).not.toContain('aria-current="page"')
  })
  it("announces initial loadingMore rather than empty success and lets custom empty content own feedback", () => {
    const loading = renderTable({ data: [], loadingMore: true })
    expect(loading).toContain("Loading data")
    expect(loading).not.toContain("No records")
    const failed = renderTable({
      data: [],
      renderEmpty: () => h("p", { role: "alert" }, "Could not load records"),
    })
    expect(failed).toContain("Could not load records")
    expect(failed).not.toContain("No records")
  })
  it("leaves selected but newly-ineligible loaded rows deselectable", () => {
    const html = renderTable({
      enableRowSelection: true,
      rowSelection: { a: true },
      canSelectRow: () => false,
    })
    const checkbox = html.match(SELECTED_INPUT_RE)?.[0]
    expect(checkbox).toBeDefined()
    expect(checkbox).not.toContain(' disabled="')
    expect(checkbox).toContain("checked")
  })
})

describe("local civil-day filter boundaries", () => {
  it("does not turn DST-short and DST-long days into fixed 24-hour windows", () => {
    const originalTZ = process.env.TZ
    process.env.TZ = "Europe/Prague"
    try {
      expect(
        typedFilterMatch("datetime", "2026-03-30T00:30", {
          from: "2026-03-29",
          to: "2026-03-29",
        })
      ).toBe(false)
      expect(
        typedFilterMatch("datetime", "2026-10-25T23:30", {
          from: "2026-10-25",
          to: "2026-10-25",
        })
      ).toBe(true)
      expect(
        typedFilterMatch("datetime", "2026-10-26T00:00", {
          from: "2026-10-25",
          to: "2026-10-25",
        })
      ).toBe(false)
    } finally {
      if (originalTZ == null) {
        delete process.env.TZ
      } else {
        process.env.TZ = originalTZ
      }
    }
  })
})

describe("header hamburger passthrough", () => {
  it("uses localized accessible names and forwards consumer button attributes", () => {
    const html = renderToStaticMarkup(
      h(Header, {
        // biome-ignore lint/correctness/noChildrenProp: Header requires children in its React createElement props.
        children: h(Header.Hamburger, {
          "aria-label": "Otevřít navigaci",
          id: "menu-trigger",
          title: "Navigation",
        }),
      })
    )
    expect(html).toContain('aria-label="Otevřít navigaci"')
    expect(html).toContain('id="menu-trigger"')
    expect(html).toContain('title="Navigation"')
    expect(html).toContain('aria-expanded="false"')
  })
})

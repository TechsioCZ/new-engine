import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { Chart, type ChartProps } from "../src/molecules/chart"

const captured = vi.hoisted(() => ({ definition: undefined as unknown }))

// TanStack renders the tooltip only after pointer or keyboard focus, so these
// tests read the definition the molecule hands to the renderer instead.
vi.mock("@tanstack/charts/react", () => ({
  Chart: (props: { definition: unknown }) => {
    captured.definition = props.definition
    return null
  },
}))

type Row = { month: string; revenue: number; channel: string }

type FakePoint = {
  datum: unknown
  color: string
  x: number
  y: number
  xValue: unknown
  yValue: unknown
}

type TooltipRow = {
  label: string
  value: string
  color?: string
  active?: boolean
}
type TooltipContent = { title?: string; rows: TooltipRow[] }
type Tooltip = {
  content: (
    points: readonly FakePoint[],
    context: { primaryPoint?: FakePoint }
  ) => TooltipContent
  anchor: (
    points: readonly FakePoint[],
    context: unknown
  ) => { x: number; y: number } | null | undefined
  placement?: unknown
  offset?: number
}
type Definition = { focus?: string; tooltip: false | Tooltip }

const rows: Row[] = [
  { month: "Jan", revenue: 42_000, channel: "Online" },
  { month: "Feb", revenue: 58_000, channel: "Online" },
]

function render<TDatum = Row>(
  overrides: Partial<ChartProps<TDatum>> = {}
): Definition {
  captured.definition = undefined
  const props = {
    ariaLabel: "Revenue by month",
    animate: false,
    data: rows,
    x: "month",
    y: "revenue",
    ...overrides,
  } as unknown as ChartProps<TDatum>
  renderToStaticMarkup(h(Chart<TDatum>, props))
  return captured.definition as Definition
}

function tooltipOf(definition: Definition): Tooltip {
  if (definition.tooltip === false) {
    throw new Error("Expected a tooltip")
  }
  return definition.tooltip
}

function point(datum: unknown, overrides: Partial<FakePoint> = {}): FakePoint {
  return {
    datum,
    color: "var(--color-chart-series-1)",
    x: 100,
    y: 50,
    xValue: undefined,
    yValue: undefined,
    ...overrides,
  }
}

describe("chart tooltip content", () => {
  it("titles the tooltip with the category and names the value row by valueLabel", () => {
    const tooltip = tooltipOf(render({ valueLabel: "Tržby" }))
    const first = point(rows[0])
    const content = tooltip.content([first], { primaryPoint: first })
    expect(content.title).toBe("Jan")
    expect(content.rows).toEqual([
      {
        label: "Tržby",
        value: "42000",
        color: "var(--color-chart-series-1)",
        active: false,
      },
    ])
  })

  it("keeps plain String output for numbers when no locale is given", () => {
    const yearRows = [{ month: 2026, revenue: 42_000, channel: "A" }]
    const tooltip = tooltipOf(render({ data: yearRows }))
    const content = tooltip.content([point(yearRows[0])], {})
    expect(content.title).toBe("2026")
    expect(content.rows[0]?.value).toBe("42000")
  })

  it("does not throw on an invalid locale tag and falls back to the default output", () => {
    const tooltip = tooltipOf(render({ locale: "cs_CZ" }))
    const content = tooltip.content([point(rows[0])], {})
    expect(content.rows[0]?.value).toBe("42000")
  })

  it("falls back to yLabel and never shows the raw y field name", () => {
    const first = point(rows[0])
    const withLabel = tooltipOf(render({ yLabel: "Revenue" })).content(
      [first],
      {}
    )
    expect(withLabel.rows[0]?.label).toBe("Revenue")

    const withoutLabel = tooltipOf(render()).content([first], {})
    expect(withoutLabel.rows[0]?.label).not.toBe("revenue")
  })

  it("formats the title and values with the caller's formatters before the axis formatter", () => {
    const tooltip = tooltipOf(
      render({
        formatCategory: (value) => `Q:${String(value)}`,
        formatTooltipValue: (value) => `${value} Kč`,
        formatValue: (value) => `${value} €`,
      })
    )
    const content = tooltip.content([point(rows[0])], {})
    expect(content.title).toBe("Q:Jan")
    expect(content.rows[0]?.value).toBe("42000 Kč")
  })

  it("uses formatValue for tooltip values so the tooltip matches the axis ticks", () => {
    const tooltip = tooltipOf(render({ formatValue: (value) => `€${value}` }))
    const content = tooltip.content([point(rows[0])], {})
    expect(content.rows[0]?.value).toBe("€42000")
  })

  it("formats dates and numbers with the given locale by default", () => {
    const instant = new Date("2026-03-05T00:00:00Z")
    const dated = [{ month: instant, revenue: 1234.5, channel: "A" }]
    const tooltip = tooltipOf(render({ data: dated, locale: "cs-CZ" }))
    const content = tooltip.content([point(dated[0])], {})
    expect(content.title).toBe(
      new Intl.DateTimeFormat("cs-CZ", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(instant)
    )
    expect(content.rows[0]?.value).toBe(
      new Intl.NumberFormat("cs-CZ").format(1234.5)
    )
  })

  it("names multi-series rows by series and marks only the primary row active", () => {
    const seriesRows: Row[] = [
      { month: "Jan", revenue: 42, channel: "Online" },
      { month: "Jan", revenue: 31, channel: "Retail" },
    ]
    const tooltip = tooltipOf(
      render({
        data: seriesRows,
        series: "channel",
        seriesDomain: ["Online", "Retail"],
      })
    )
    const online = point(seriesRows[0])
    const retail = point(seriesRows[1], {
      color: "var(--color-chart-series-2)",
    })
    const content = tooltip.content([online, retail], { primaryPoint: retail })
    expect(content.rows.map((row) => row.label)).toEqual(["Online", "Retail"])
    expect(content.rows.map((row) => row.active)).toEqual([false, true])
    expect(content.rows[1]?.color).toBe("var(--color-chart-series-2)")
  })

  it("places the cartesian tooltip beside the hovered column with a zero offset", () => {
    const tooltip = tooltipOf(render())
    expect(tooltip.placement).toBe("bottom-right")
    expect(tooltip.offset).toBe(0)
  })

  it("anchors the cartesian tooltip beside a column when it cannot fit above", () => {
    const tooltip = tooltipOf(render())
    const first = point(rows[0], { x: 100, y: 50, xValue: "Jan" })
    const position = tooltip.anchor([first], {
      focus: { primary: first },
      surface: { width: 640, height: 360 },
      scales: {
        x: { bandwidth: 40, map: () => 100 },
      },
    })
    // The column band runs 100..140; the tooltip starts 12px to its right.
    expect(position?.x).toBe(152)
    expect(position?.y).toBe(50)
  })

  it("anchors a horizontal bar tooltip to the right of the bar", () => {
    const tooltip = tooltipOf(render({ type: "bar-horizontal" }))
    const first = point(rows[0], { x: 200, y: 40, yValue: "Jan" })
    const position = tooltip.anchor([first], {
      focus: { primary: first },
      surface: { width: 640, height: 360 },
      scales: {
        y: { bandwidth: 30, map: () => 20 },
      },
    })
    expect(position?.x).toBe(212)
  })

  it("uses the pointer anchor with a 16px offset for pie and donut tooltips", () => {
    const tooltip = tooltipOf(
      render({ type: "donut", valueLabel: "Tržby", legend: false })
    )
    expect(tooltip.anchor).toBe("pointer")
    expect(tooltip.placement).toEqual(["right", "left", "bottom", "top"])
    expect(tooltip.offset).toBe(16)
    const slice = point({ data: rows[0] }, { xValue: "Jan", yValue: 42_000 })
    const content = tooltip.content([slice], {})
    expect(content.title).toBe("Jan")
    expect(content.rows).toEqual([
      {
        label: "Tržby",
        value: "42000",
        color: "var(--color-chart-series-1)",
      },
    ])
  })

  it("omits the tooltip entirely when it is disabled", () => {
    expect(render({ tooltip: false }).tooltip).toBe(false)
  })
})

describe("chart tooltip focus", () => {
  it("groups focus along the category axis for multi-series cartesian charts", () => {
    expect(render({ series: "channel" }).focus).toBe("group-x")
  })

  it("groups focus along the value-category axis for horizontal bars", () => {
    expect(render({ type: "bar-horizontal", series: "channel" }).focus).toBe(
      "group-y"
    )
  })

  it("keeps the default nearest focus for single-series and polar charts", () => {
    expect(render().focus).toBeUndefined()
    expect(render({ type: "donut", series: "channel" }).focus).toBeUndefined()
  })
})

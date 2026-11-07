import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Chart } from "../src/molecules/chart"

const textPattern = /<text\b[^>]*>([^<]*)<\/text>/g

function chartLabels(dates: string[]) {
  const data = dates.map((date, value) => ({ date: new Date(date), value }))
  const markup = renderToStaticMarkup(
    createElement(Chart<(typeof data)[number]>, {
      type: "line",
      data,
      x: "date",
      y: "value",
      initialWidth: 1000,
      height: 300,
      animate: false,
      ariaLabel: "Values over time",
    })
  )
  return [...markup.matchAll(textPattern)].map((match) => match[1] ?? "")
}

describe("Chart temporal tick labels", () => {
  it("distinguishes intraday ticks rather than repeating the calendar date", () => {
    const labels = chartLabels([
      "2026-08-31T09:00:00Z",
      "2026-08-31T10:00:00Z",
      "2026-08-31T11:00:00Z",
    ])
    expect(labels).toContain("09 AM")
    expect(labels).toContain("10 AM")
    expect(labels).toContain("11 AM")
  })

  it("retains year distinctions across a multiyear domain", () => {
    const labels = chartLabels([
      "2024-01-01T00:00:00Z",
      "2025-01-01T00:00:00Z",
      "2026-01-01T00:00:00Z",
    ])
    expect(labels).toContain("2024")
    expect(labels).toContain("2025")
    expect(labels).toContain("2026")
  })
})

import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Chart } from "../src/molecules/chart"

const data = [
  { month: "Jan", revenue: 42_000, channel: "Online" },
  { month: "Jan", revenue: 31_000, channel: "Retail" },
  { month: "Jan", revenue: 18_000, channel: "Wholesale" },
]

const textPattern = /<text\b([^>]*)>([^<]*)<\/text>/g
const yPattern = /\by="([^"]+)"/

function labels(markup: string) {
  return new Map(
    [...markup.matchAll(textPattern)].map(([, attributes, text]) => {
      if (attributes === undefined || text === undefined) {
        throw new Error("Each chart label must have text and SVG attributes")
      }
      return [text, Number(attributes.match(yPattern)?.[1])] as const
    })
  )
}

describe("Chart native legend layout", () => {
  it.each(["bar", "area", "scatter", "pie", "donut"] as const)(
    "%s reserves space for the readable title before the first item",
    (type) => {
      const markup = renderToStaticMarkup(
        createElement(Chart<(typeof data)[number]>, {
          type,
          data,
          x: "channel",
          y: "revenue",
          series: "channel",
          legendLabel: "Channel",
          initialWidth: 340,
          height: 300,
          animate: false,
          ariaLabel: "Revenue by channel",
        })
      )
      const positions = labels(markup)
      expect(
        Number(positions.get("Online")) - Number(positions.get("Channel"))
      ).toBeGreaterThanOrEqual(20)
    }
  )

  it("fits short channel names on one mobile legend row without an orphan", () => {
    const markup = renderToStaticMarkup(
      createElement(Chart<(typeof data)[number]>, {
        type: "bar",
        data,
        x: "month",
        y: "revenue",
        series: "channel",
        legendLabel: "Channel",
        initialWidth: 340,
        height: 300,
        animate: false,
        ariaLabel: "Revenue by channel",
      })
    )
    const positions = labels(markup)
    expect(positions.has("Wholesale")).toBe(true)
    expect(positions.get("Wholesale")).toBe(positions.get("Online"))
    expect(positions.get("Retail")).toBe(positions.get("Online"))
  })
})

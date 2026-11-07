import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Chart, type ChartProps } from "../src/molecules/chart"

const data = [
  { month: "Jan", value: 42, channel: "Online" },
  { month: "Feb", value: 58, channel: "Online" },
  { month: "Mar", value: 76, channel: "Online" },
  { month: "Jan", value: 31, channel: "Retail" },
  { month: "Feb", value: 29, channel: "Retail" },
  { month: "Mar", value: 35, channel: "Retail" },
]

type Datum = (typeof data)[number]

const pathTag = /<path\b([^>]*)>/g
const svgAttribute = /([\w-]+)="([^"]*)"/g
const closedPathEnd = /Z$/i
const closePathCommand = /Z/i
const tableRowTag = /<tr\b/g
const arcRadius = /A([\d.]+),/g

function renderChart(props: Partial<ChartProps<Datum>> = {}) {
  return renderToStaticMarkup(
    createElement(Chart<Datum>, {
      type: "area",
      data,
      x: "month",
      y: "value",
      series: "channel",
      initialWidth: 340,
      height: 300,
      animate: false,
      ariaLabel: "Revenue by channel",
      ...props,
    })
  )
}

function paths(markup: string, prefix: string) {
  return [...markup.matchAll(pathTag)]
    .map((match) => {
      const attributeText = match[1]
      if (attributeText === undefined) {
        throw new Error("Expected SVG path attribute capture")
      }
      return new Map(
        [...attributeText.matchAll(svgAttribute)].map((attributeMatch) => {
          const [, name, value] = attributeMatch
          if (name === undefined || value === undefined) {
            throw new Error("Expected SVG attribute name and value captures")
          }
          return [name, value] as const
        })
      )
    })
    .filter((attributes) => attributes.get("data-ts-key")?.startsWith(prefix))
}

function attribute(attributes: Map<string, string>, name: string) {
  const value = attributes.get(name)
  if (value == null) {
    throw new Error(`Expected SVG attribute ${name}`)
  }
  return value
}

describe("Chart area readability", () => {
  it.each([
    { stacked: false, smooth: false },
    { stacked: false, smooth: true },
    { stacked: true, smooth: false },
    { stacked: true, smooth: true },
  ])("separates fill and upper contour for %j", ({ stacked, smooth }) => {
    const markup = renderChart({ stacked, smooth })
    const areaPaths = paths(markup, "area-y-")
    const fills = areaPaths.filter(
      (path) => !attribute(path, "data-ts-key").endsWith(":upper-contour")
    )
    const contours = areaPaths.filter((path) =>
      attribute(path, "data-ts-key").endsWith(":upper-contour")
    )
    expect(fills).toHaveLength(2)
    expect(contours).toHaveLength(2)
    for (const fill of fills) {
      const contour = contours.find(
        (path) =>
          attribute(path, "data-ts-key") ===
          `${attribute(fill, "data-ts-key")}:upper-contour`
      )
      if (contour == null) {
        throw new Error("Each area fill must have one upper contour")
      }
      expect(attribute(fill, "stroke")).toBe("none")
      expect(attribute(fill, "fill-opacity")).toBe(stacked ? "0.85" : "0.12")
      expect(attribute(fill, "d")).toMatch(closedPathEnd)
      expect(attribute(contour, "fill")).toBe("none")
      expect(attribute(contour, "stroke")).toBe(attribute(fill, "fill"))
      expect(attribute(contour, "stroke-width")).toBe("2")
      expect(attribute(contour, "d")).not.toMatch(closePathCommand)
      // Identical resolved geometry, including the accumulated stacked extent.
      expect(attribute(fill, "d").startsWith(attribute(contour, "d"))).toBe(
        true
      )
      if (smooth) {
        expect(attribute(contour, "d")).toContain("C")
      }
    }
    // Decorative contours must not create synthetic rows in the data alternative.
    expect([...markup.matchAll(tableRowTag)]).toHaveLength(data.length + 1)
  })

  it("keeps the single-series area fill and all source values", () => {
    const markup = renderChart({ data: data.slice(0, 3), series: undefined })
    const areaPaths = paths(markup, "area-y-")
    expect(areaPaths).toHaveLength(2)
    expect(
      areaPaths.filter((path) => path.get("stroke") === "none")
    ).toHaveLength(1)
    expect(areaPaths.some((path) => path.get("fill-opacity") === "0.25")).toBe(
      true
    )
    expect([...markup.matchAll(tableRowTag)]).toHaveLength(4)
  })
})

describe("Chart grouped bar readability", () => {
  it.each(["bar", "bar-horizontal"] as const)(
    "%s rounds only the data ends with a compact radius",
    (type) => {
      const barPaths = paths(renderChart({ type }), "bar-")
      expect(barPaths).toHaveLength(data.length)
      for (const path of barPaths) {
        const radii = [...attribute(path, "d").matchAll(arcRadius)].map(
          (match) => {
            const radius = match[1]
            if (radius === undefined) {
              throw new Error("Expected SVG arc radius capture")
            }
            return Number(radius)
          }
        )
        expect(radii.filter((radius) => radius === 2)).toHaveLength(2)
        expect(radii.filter((radius) => radius === 0)).toHaveLength(2)
      }
    }
  )
})

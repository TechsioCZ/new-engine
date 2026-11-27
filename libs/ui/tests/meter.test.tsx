import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Meter, type MeterProps } from "../src/atoms/meter"

const ROOT_TAG = /<div\b[^>]*role="meter"[^>]*>/

function render(props: MeterProps) {
  const html = renderToStaticMarkup(h(Meter, props))
  const root = html.match(ROOT_TAG)?.[0]
  if (!root) {
    throw new Error("Meter rendered no meter role")
  }
  const fills = [...html.matchAll(/--meter-value:([^;"]+)/g)].map((m) =>
    m[1]?.trim()
  )
  return { root, fills }
}

describe("Meter aria values", () => {
  it("exposes value, min and the default max of 100", () => {
    const { root, fills } = render({ "aria-label": "Occupancy", value: 42 })
    expect(root).toContain('aria-valuenow="42"')
    expect(root).toContain('aria-valuemin="0"')
    expect(root).toContain('aria-valuemax="100"')
    expect(root).toContain('aria-label="Occupancy"')
    expect(fills).toEqual(["42%"])
  })

  it("scales the fill against a custom max", () => {
    const { root, fills } = render({
      "aria-labelledby": "orders",
      max: 200,
      value: 50,
    })
    expect(root).toContain('aria-valuenow="50"')
    expect(root).toContain('aria-valuemax="200"')
    expect(root).toContain('aria-labelledby="orders"')
    expect(fills).toEqual(["25%"])
  })

  it("reports the sum of the segments and stacks their widths", () => {
    const { root, fills } = render({
      "aria-label": "Budget",
      max: 10_000,
      segments: [
        { value: 6200, severity: "primary" },
        { value: 1800, severity: "warning" },
      ],
    })
    expect(root).toContain('aria-valuenow="8000"')
    expect(root).toContain('aria-valuemax="10000"')
    expect(fills).toEqual(["62%", "18%"])
  })

  it("keeps the value inside the range", () => {
    expect(render({ "aria-label": "Over", value: 150 }).root).toContain(
      'aria-valuenow="100"'
    )
    const segments = render({
      "aria-label": "Over",
      segments: [
        { value: 80, severity: "primary" },
        { value: 40, severity: "danger" },
      ],
    })
    expect(segments.root).toContain('aria-valuenow="100"')
    expect(segments.fills).toEqual(["80%", "20%"])
  })
})

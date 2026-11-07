// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { type ComponentType, createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Slider } from "../src/molecules/slider"
import {
  type FacetFilterGroup,
  FacetFilterPanel,
} from "../src/templates/facet-filter-panel"
import {
  CustomFormatting,
  MinStepsBetweenThumbs,
  Origin,
  RTLSupport,
  SingleVsMultiThumb,
  ThumbAlignment,
} from "../stories/molecules/slider.stories"

const panelCss = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../src/tokens/components/templates/_facet-filter-panel.css"
  ),
  "utf8"
)

const groups: FacetFilterGroup[] = [
  {
    type: "options",
    id: "material",
    label: "Material",
    collapseAfter: 1,
    options: [
      { value: "linen", label: "Linen", count: 0 },
      { value: "wool", label: "Wool", count: 4, disabled: true },
    ],
  },
  {
    type: "range",
    id: "price",
    label: "Price",
    min: 0,
    max: 200,
    value: [25, 175],
    formatValue: (value) => `$${value}`,
  },
]

function render(node: ReactNode) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(node)
  return canvas
}

// These are markup/token contracts, not simulated layout measurements.
// Real spacing, narrow viewport overflow and focus remain browser checks.
describe("filter panel spacing", () => {
  it("keeps the empty summary focus target without adding a second content gap", () => {
    const canvas = render(<FacetFilterPanel groups={groups} title="Filters" />)
    const content = canvas.querySelector(".facet-filter-panel-content-flow")
    const summary = content?.querySelector('[role="group"][data-empty]')
    expect(summary).not.toBeNull()
    expect(summary?.getAttribute("tabindex")).toBe("-1")
    expect(summary?.hasAttribute("hidden")).toBe(false)
    expect(summary?.hasAttribute("aria-hidden")).toBe(false)
    expect(content?.classList.contains("gap-facet-filter-panel")).toBe(false)
    expect(panelCss).toContain("& > :not([data-empty]) ~ :not([data-empty])")
    expect(panelCss).toContain(
      "margin-block-start: var(--spacing-facet-filter-panel)"
    )
    expect(canvas.querySelector("h2")?.textContent).toBe("Filters")
  })

  it.each(["sm", "md", "lg"] as const)(
    "aligns embedded headings, options and ranges at %s density",
    (size) => {
      const canvas = render(
        <FacetFilterPanel groups={groups} size={size} title="Filters" />
      )
      const accordion = canvas.querySelector(
        '[data-scope="accordion"][data-part="root"]'
      )
      const trigger = accordion?.querySelector('[data-part="item-trigger"]')
      const options = accordion?.querySelector('[data-part="item-content"]')
      const range = accordion?.querySelector("section")
      expect(accordion?.classList.contains("facet-filter-panel-groups")).toBe(
        true
      )
      expect(trigger?.classList.contains(`p-accordion-title-${size}`)).toBe(
        true
      )
      expect(options?.classList.contains("px-facet-filter-panel-group")).toBe(
        true
      )
      expect(options?.classList.contains("py-facet-filter-panel-group")).toBe(
        true
      )
      expect(range?.classList.contains("p-facet-filter-panel-group")).toBe(true)
      expect(panelCss).toContain(
        `--padding-accordion-title-${size}: var(--padding-accordion-title-y-${size})\n    var(--padding-facet-filter-panel-group)`
      )
      const showMore = Array.from(canvas.querySelectorAll("button")).find(
        (button) => button.textContent === "Show 1 more"
      )
      expect(showMore?.getAttribute("aria-expanded")).toBe("false")
      expect(panelCss).toContain("--spacing-facet-filter-panel-action-inset: 0")
      expect(canvas.textContent).toContain("Linen0")
      expect(canvas.querySelector('input[value="linen"]')).not.toBeNull()
      expect(canvas.querySelector('input[value="wool"]')).toBeNull()
      expect(canvas.querySelector("output")?.textContent).toContain(
        "$25 – $175"
      )
    }
  )

  it("preserves selected summaries, pending and read-only labels", () => {
    const canvas = render(
      <FacetFilterPanel
        activeFilters={[
          { id: "linen", label: "Linen", removeLabel: "Remove Linen" },
        ]}
        groups={groups}
        pending
        pendingLabel="Updating results"
        readOnly
        selectedValues={{ material: ["linen"] }}
        title="Filters"
      />
    )
    expect(canvas.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(canvas.textContent).toContain("Updating results")
    expect(canvas.textContent).toContain("Read-only")
    expect(canvas.querySelector('[role="group"][data-empty]')).toBeNull()
    expect(canvas.querySelector('button[aria-label="Remove Linen"]')).toBeNull()
    expect(
      canvas.querySelector('input[value="linen"]')?.getAttribute("aria-checked")
    ).toBe("true")
    for (const thumb of canvas.querySelectorAll('[role="slider"]')) {
      expect(thumb.getAttribute("aria-readonly")).toBe("true")
      expect(thumb.getAttribute("aria-disabled")).toBe("true")
    }
  })
})

describe("Slider presentation boundaries", () => {
  it.each(["ltr", "rtl"] as const)(
    "uses logical vertical marker spacing in %s without changing values or names",
    (dir) => {
      const canvas = render(
        <Slider
          aria-label={["Minimum price", "Maximum price"]}
          defaultValue={[20, 80]}
          dir={dir}
          label="Price"
          markerCount={3}
          orientation="vertical"
          showMarkers
          showValueText
        />
      )
      const markers = canvas.querySelectorAll('[data-part="marker"] > span')
      expect(Array.from(markers, (marker) => marker.textContent)).toEqual([
        "0",
        "50",
        "100",
      ])
      for (const marker of markers) {
        expect(
          marker.classList.contains(
            "data-[orientation=vertical]:ps-slider-marker-text"
          )
        ).toBe(true)
        expect(
          marker.classList.contains("data-[orientation=vertical]:p-marker-text")
        ).toBe(false)
      }
      const thumbs = canvas.querySelectorAll('[role="slider"]')
      expect(
        Array.from(thumbs, (thumb) => thumb.getAttribute("aria-label"))
      ).toEqual(["Minimum price", "Maximum price"])
      expect(
        Array.from(thumbs, (thumb) => thumb.getAttribute("aria-valuenow"))
      ).toEqual(["20", "80"])
      expect(canvas.querySelector("output")?.textContent).toContain("20 – 80")
    }
  )

  it("retains horizontal edge markers, formatting and caller class overrides", () => {
    const canvas = render(
      <Slider
        aria-label={["Budget minimum", "Budget maximum"]}
        className="custom-slider gap-0"
        defaultValue={[25, 75]}
        formatValue={(value) => `$${value}`}
        label="Budget"
        markerCount={3}
        showMarkers
        showValueText
      />
    )
    const root = canvas.querySelector('[data-scope="slider"][data-part="root"]')
    expect(root?.classList.contains("custom-slider")).toBe(true)
    expect(root?.classList.contains("gap-0")).toBe(true)
    expect(canvas.querySelector('[data-edge="start"]')?.textContent).toBe("0")
    expect(canvas.querySelector('[data-edge="end"]')?.textContent).toBe("100")
    expect(canvas.querySelector("output")?.textContent).toContain("$25 – $75")
    expect(canvas.querySelectorAll('[role="slider"]')).toHaveLength(2)
  })

  it.each([
    ["single/multi", SingleVsMultiThumb],
    ["origin", Origin],
    ["alignment", ThumbAlignment],
    ["thumb separation", MinStepsBetweenThumbs],
    ["RTL", RTLSupport],
    ["custom formatting", CustomFormatting],
  ] as const)(
    "lets the %s gallery shrink below the old fixed minimum",
    (_, story) => {
      const Example = story.render as ComponentType
      const canvas = render(createElement(Example))
      const grid = canvas.querySelector(".grid")
      expect(grid?.classList.contains("w-full")).toBe(true)
      expect(grid?.classList.contains("min-w-0")).toBe(true)
      expect(canvas.querySelector(".min-w-xs")).toBeNull()
      expect(canvas.querySelectorAll('[role="slider"]').length).toBeGreaterThan(
        0
      )
    }
  )
})

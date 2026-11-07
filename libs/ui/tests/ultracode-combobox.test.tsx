import { readFileSync } from "node:fs"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  acknowledgeComboboxQuery,
  queueComboboxQuery,
} from "../src/internal/combobox-query-sync"
import { Combobox } from "../src/molecules/combobox"

const label =
  "A complete country label that must remain readable on narrow screens"
const items = [{ label, value: "country" }]
const INPUT = /<input\b[^>]*role="combobox"[^>]*>/
const CHIP = /<li\b[^>]*class="([^"]*)"[^>]*>/
const POSITIONER = /<div\b[^>]*data-part="positioner"[^>]*>/

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

describe("Combobox presentation preserves field contracts", () => {
  describe.each(["ltr", "rtl"] as const)("%s direction", (dir) => {
    it.each(["sm", "md", "lg"] as const)(
      "separates removable %s chip labels without shortening or changing values",
      (size) => {
        const html = renderToStaticMarkup(
          h(Combobox, {
            items,
            label: "Delivery countries",
            name: "countries",
            defaultValue: ["country"],
            multiple: true,
            dir,
            size,
            portalled: false,
          })
        )
        const chipClasses = html.match(CHIP)?.[1]
        expect(chipClasses).toContain("gap-combobox-selected-item")
        expect(html).toContain(`aria-label="Remove ${label}"`)
        expect(html).toContain(`>${label}</span>`)
        expect(html).toContain('name="countries"')
        expect(html).toContain('value="country"')
        expect(html).toContain(`dir="${dir}"`)
      }
    )

    it("keeps full popup option labels inside the reference-width surface", () => {
      const html = renderToStaticMarkup(
        h(Combobox, {
          items,
          label: "Country",
          dir,
          defaultOpen: true,
          portalled: false,
        })
      )
      const textClasses = html.match(
        /<span class="([^"]*)">A complete country label/
      )?.[1]
      expect(textClasses).toContain("whitespace-normal")
      expect(textClasses).toContain("wrap-anywhere")
      expect(textClasses).not.toContain("truncate")
      expect(html).toContain(`aria-label="${label}"`)
      const positioner = html.match(POSITIONER)?.[0]
      expect(positioner).toBeDefined()
      expect(positioner).toContain(`dir="${dir}"`)
      expect(html.match(INPUT)?.[0]).toContain(`dir="${dir}"`)
      expect(positioner).toContain("width:var(--reference-width)")
      expect(positioner).not.toContain("min-width:max-content")
    })
  })

  it.each([
    { readOnly: true, disabled: false },
    { readOnly: false, disabled: true },
  ])("does not expose mutation actions for %j", (state) => {
    const html = renderToStaticMarkup(
      h(Combobox, {
        items,
        label: "Saved countries",
        defaultValue: ["country"],
        multiple: true,
        ...state,
      })
    )
    expect(html).not.toContain('data-part="clear-trigger"')
    expect(html).toContain(`>${label}</span>`)
    const remove = html.match(
      /<button\b[^>]*aria-label="Remove [^"]*"[^>]*>/
    )?.[0]
    if (state.readOnly) {
      expect(remove).toBeUndefined()
      expect(html.match(INPUT)?.[0]).toContain("readonly")
    } else {
      expect(remove).toContain("disabled")
      expect(html.match(INPUT)?.[0]).toContain("disabled")
    }
  })

  it("keeps the chip gap themeable through component tokens", () => {
    const css = source("../src/tokens/components/molecules/_combobox.css")
    expect(css).toContain(
      "--spacing-combobox-selected-item: var(--spacing-100)"
    )
    expect(css).toContain(
      "--gap-combobox-selected-item: var(--spacing-combobox-selected-item)"
    )
  })
})

describe("Combobox input-synchronization fixture", () => {
  it("keeps the actions secondary and allows long parent queries to wrap", () => {
    const story = source("../stories/molecules/combobox-input.stories.tsx")
    expect(story.match(/variant="secondary"/g)).toHaveLength(5)
    expect(story).toContain(
      'className="min-w-0 wrap-anywhere text-fg-secondary text-sm"'
    )
    expect(story).toContain(
      '<output aria-label="Parent query">{query}</output>'
    )
  })

  it("preserves pending edits until acknowledged, then permits an older external replacement", () => {
    let pending: string[] = []
    for (const query of ["a", "ab", "abc"]) {
      pending = queueComboboxQuery(pending, query, "")
    }
    pending = acknowledgeComboboxQuery(pending, "a") ?? []
    expect(pending).toEqual(["ab", "abc"])
    pending = acknowledgeComboboxQuery(pending, "abc") ?? []
    expect(pending).toEqual([])
    expect(acknowledgeComboboxQuery(pending, "a")).toBeNull()
  })
})

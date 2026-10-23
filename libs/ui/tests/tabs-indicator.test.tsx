import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Tabs } from "../src/molecules/tabs"

const INDICATOR_TAG = /<div\b[^>]*data-part="indicator"[^>]*>/

describe("Tabs indicator geometry ownership", () => {
  it.each(["horizontal", "vertical"] as const)(
    "keeps Zag anatomy but not its inline geometry/transition in %s tabs",
    (orientation) => {
      const html = renderToStaticMarkup(
        h(
          Tabs,
          { defaultValue: "general", orientation, variant: "line" },
          h(
            Tabs.List,
            null,
            h(Tabs.Trigger, { value: "general" }, "General"),
            h(Tabs.Indicator)
          )
        )
      )
      const indicator = html.match(INDICATOR_TAG)?.[0]
      expect(indicator).toBeDefined()
      expect(indicator).toContain(`data-orientation="${orientation}"`)
      expect(indicator).toContain("--tabs-indicator-left:0px")
      expect(indicator).toContain("--tabs-indicator-width:0px")
      expect(indicator).toContain("tabs-indicator-position")
      expect(indicator).toContain("motion-reduce:transition-none")
      expect(indicator).not.toContain("--left:")
      expect(indicator).not.toContain("--width:")
      expect(indicator).not.toContain("transition-property:")
      expect(indicator).not.toContain("transition-duration:")
      expect(indicator).not.toContain("will-change:")
    }
  )
})

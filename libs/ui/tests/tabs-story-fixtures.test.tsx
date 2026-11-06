// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  DisabledTabs,
  FittedTabs,
  JustifyOptions,
  ScrollableAlignment,
  Sizes,
} from "../stories/molecules/tabs.stories"

function canvasFor(story: typeof FittedTabs, inset = false) {
  const render = story.render
  if (!render) {
    throw new Error("Missing Tabs story render")
  }
  const fixture = () => render({}, {} as never)
  const decorator = Array.isArray(story.decorators)
    ? story.decorators[0]
    : story.decorators
  if (inset && !decorator) {
    throw new Error("Missing Tabs example inset")
  }
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    inset && decorator ? decorator(fixture, {} as never) : fixture()
  )
  return canvas
}

// Markup contracts only; scroll state and background painting need browser checks.
describe("Tabs comparison fixtures", () => {
  it.each([
    ["fitted tabs", FittedTabs],
    ["justify options", JustifyOptions],
    ["sizes", Sizes],
    ["scrollable alignment", ScrollableAlignment],
  ] as const)("insets %s inside the capture root", (_name, story) => {
    const canvas = canvasFor(story, true)
    const surface = canvas.firstElementChild
    expect(surface?.className).toBe("w-full min-w-0 p-200")
    expect(surface?.hasAttribute("style")).toBe(false)
    expect(surface?.querySelectorAll("h3").length).toBeGreaterThan(0)
    expect(
      surface?.querySelectorAll('[role="tablist"]').length
    ).toBeGreaterThan(0)
  })

  it("gives both fitted comparisons the same container and root width constraints", () => {
    const roots = canvasFor(FittedTabs, true).querySelectorAll(
      '[data-scope="tabs"][data-part="root"]'
    )
    expect(roots).toHaveLength(2)
    for (const root of roots) {
      expect(root.parentElement?.className).toBe("w-full max-w-2xl")
      expect(root.classList.contains("w-full")).toBe(true)
      expect(root.classList.contains("w-md")).toBe(false)
      expect(
        root.querySelector('[role="tablist"]')?.classList.contains("w-full")
      ).toBe(true)
      expect(
        Array.from(
          root.querySelectorAll('[role="tab"]'),
          (tab) => tab.textContent
        )
      ).toEqual(["Overview", "Details", "Settings"])
    }
  })

  it("retains full overflow labels, both directions and selection-owned indicators", () => {
    const lists = canvasFor(ScrollableAlignment, true).querySelectorAll(
      '[role="tablist"]'
    )
    expect(lists).toHaveLength(5)
    expect(
      Array.from(lists)
        .slice(0, 4)
        .map((list) => list.getAttribute("dir"))
    ).toEqual(["ltr", "ltr", "rtl", "rtl"])
    for (const list of Array.from(lists).slice(0, 4)) {
      expect(list.parentElement?.parentElement?.className).toBe(
        "w-xs max-w-full"
      )
      expect(
        list.classList.contains("data-[orientation=horizontal]:overflow-x-auto")
      ).toBe(true)
      expect(list.classList.contains("tabs-list-overflow")).toBe(true)
      expect(
        Array.from(
          list.querySelectorAll('[role="tab"]'),
          (tab) => tab.textContent
        )
      ).toEqual(["Project overview", "Technical details", "Recent activity"])
      expect(list.querySelectorAll('[data-part="indicator"]')).toHaveLength(1)
    }
  })

  it("keeps the disabled fixture's full labels and shared native scrollport", () => {
    const list = canvasFor(DisabledTabs).querySelector('[role="tablist"]')
    expect(
      list?.classList.contains("data-[orientation=horizontal]:overflow-x-auto")
    ).toBe(true)
    expect(list?.classList.contains("tabs-list-overflow")).toBe(true)
    const tabs = Array.from(
      list?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    )
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Active Tab",
      "Disabled Tab",
      "Another Active Tab",
    ])
    expect(tabs.map((tab) => tab.disabled)).toEqual([false, true, false])
  })
})

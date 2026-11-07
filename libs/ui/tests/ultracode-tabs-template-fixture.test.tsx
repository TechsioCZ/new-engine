// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import type { TabsTemplateProps } from "../src/templates/tabs"
import meta, {
  Default,
  FirstEnabledTab,
  Playground,
  Sizes,
  Variants,
} from "../stories/templates/tabs.stories"

function elementFor(story: typeof Default) {
  const args = { ...meta.args, ...story.args } as TabsTemplateProps
  const Component = meta.component
  if (!Component) {
    throw new Error("Missing TabsTemplate story component")
  }
  return story.render ? (
    story.render(args, {} as never)
  ) : (
    <Component {...args} />
  )
}

function canvasFor(story: typeof Default) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(elementFor(story))
  return canvas
}

// Fixture markup contracts only; native panel geometry belongs to Sizes.play.
describe("TabsTemplate presentation fixtures", () => {
  it.each([
    ["default", Default, 1],
    ["playground", Playground, 1],
    ["sizes", Sizes, 3],
    ["variants", Variants, 4],
  ] as const)(
    "keeps %s panel padding owned by Tabs rather than a second content inset",
    (_name, story, count) => {
      const panels = Array.from(
        canvasFor(story).querySelectorAll('[role="tabpanel"]')
      ).filter((panel) => !panel.hasAttribute("hidden"))
      expect(panels).toHaveLength(count)
      for (const panel of panels) {
        const content = panel.firstElementChild
        expect(content?.tagName).toBe("DIV")
        expect(content?.className).toBe("")
        expect(content?.hasAttribute("style")).toBe(false)
        const heading = content?.querySelector("h3")
        expect(heading?.textContent).toBe("Overview")
        expect(heading?.classList.contains("text-lg")).toBe(true)
        expect(heading?.classList.contains("font-semibold")).toBe(true)
        expect(heading?.classList.contains("mb-200")).toBe(true)
        const body = content?.querySelector("p")
        expect(body?.classList.contains("text-fg-muted")).toBe(true)
        expect(body?.textContent).toBe(
          "This is the overview tab content. It contains general information about the product or feature."
        )
      }
    }
  )

  it("keeps all size labels visible and connected to their own tablists", () => {
    const canvas = canvasFor(Sizes)
    const sections = canvas.querySelectorAll("section")
    expect(sections).toHaveLength(3)
    for (const [index, size] of ["sm", "md", "lg"].entries()) {
      const section = sections[index]
      if (!section) {
        throw new Error(`Missing ${size} TabsTemplate size section`)
      }
      const heading = section.querySelector("h3")
      const list = section.querySelector('[role="tablist"]')
      expect(heading?.id).toBe(`tabs-size-${size}`)
      expect(heading?.textContent).toBe(
        ["Small (sm)", "Medium (md)", "Large (lg)"][index]
      )
      expect(list?.getAttribute("aria-labelledby")).toBe(heading?.id)
      expect(
        Array.from(
          section.querySelectorAll('[role="tab"]'),
          (tab) => tab.textContent
        )
      ).toEqual(["Overview", "Details", "Reviews"])
    }
  })

  it("retains the complete disabled Playground label without changing its activation state", () => {
    const canvas = canvasFor(Playground)
    const tabs = Array.from(
      canvas.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    )
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Overview",
      "Details",
      "Reviews",
      "Disabled",
    ])
    expect(tabs.map((tab) => tab.disabled)).toEqual([false, false, false, true])
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
      "false",
      "false",
    ])
  })

  it("keeps Overview unavailable and selects the associated Details panel in FirstEnabledTab", async () => {
    const canvas = document.createElement("div")
    document.body.append(canvas)
    const root = createRoot(canvas)
    try {
      // Tabs registers mounted panels in an effect before exposing aria-controls.
      await act(async () => root.render(elementFor(FirstEnabledTab)))
      const tabs = Array.from(
        canvas.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      )
      expect(tabs.map((tab) => tab.textContent)).toEqual([
        "Overview",
        "Details",
        "Reviews",
      ])
      expect(tabs.map((tab) => tab.disabled)).toEqual([true, false, false])
      expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual([
        "false",
        "true",
        "false",
      ])
      const panels = canvas.querySelectorAll('[role="tabpanel"]:not([hidden])')
      expect(panels).toHaveLength(1)
      const panel = panels[0]
      const detailsTab = tabs[1]
      if (!(panel && detailsTab)) {
        throw new Error("Missing FirstEnabledTab Details tab or active panel")
      }
      expect(panel.id).toBeTruthy()
      expect(panel.id).toBe(detailsTab.getAttribute("aria-controls"))
      expect(panel.getAttribute("aria-labelledby")).toBe(detailsTab.id)
      expect(panel.querySelector("h3")?.textContent).toBe("Details")
      expect(panel.querySelector("p")?.textContent).toBe(
        "Here you'll find detailed specifications and technical information."
      )
    } finally {
      await act(async () => root.unmount())
      canvas.remove()
    }
  })
})

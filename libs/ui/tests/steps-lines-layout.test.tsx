// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Lines } from "../stories/molecules/steps.stories"

function renderLines() {
  if (!Lines.render) {
    throw new Error("Steps Lines must retain its composition")
  }
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    Lines.render({} as never, {} as never)
  )
  return canvas
}

// SSR contracts, not simulated geometry: the browser spec measures real overflow.
describe("Steps Lines intrinsic layout", () => {
  it("bounds the story host before resolving percentage widths", () => {
    // A fixed w-5xl child makes centered Storybook's auto-minimum flex item
    // 1024px + 32px padding wide; max-w-full cannot cap that intrinsic parent.
    expect(Lines.parameters?.layout).toBe("fullscreen")
    const canvas = renderLines()
    const surface = canvas.firstElementChild
    const container = surface?.firstElementChild
    for (const element of [surface, container]) {
      expect(element?.classList.contains("w-full")).toBe(true)
      expect(element?.classList.contains("min-w-0")).toBe(true)
      expect(element?.classList.contains("w-5xl")).toBe(false)
    }
    expect(surface?.classList.contains("p-200")).toBe(true)
    expect(container?.classList.contains("max-w-5xl")).toBe(true)
    expect(container?.firstElementChild?.getAttribute("data-part")).toBe("root")
  })

  it("keeps every label, flow separator, panel and navigation control", () => {
    const canvas = renderLines()
    const items = canvas.querySelectorAll('[data-part="item"]')
    expect(items).toHaveLength(3)
    expect(canvas.querySelectorAll('[data-part="indicator"]')).toHaveLength(0)
    expect(canvas.querySelectorAll('[data-part="description"]')).toHaveLength(0)
    const titles = ["Brief", "Inputs", "Review"]
    for (const [index, item] of Array.from(items).entries()) {
      expect(item.querySelector('[data-part="trigger"]')?.textContent).toBe(
        titles[index]
      )
      const separator = item.querySelector('[data-part="separator"]')
      expect(separator).toBe(item.firstElementChild)
      expect(separator?.classList.contains("data-last:block")).toBe(true)
      expect(
        separator?.classList.contains("data-[orientation=horizontal]:w-full")
      ).toBe(true)
    }
    expect(
      Array.from(
        canvas.querySelectorAll('[data-part="content"]'),
        (panel) => panel.textContent
      )
    ).toEqual(titles.map((title) => `${title} panel content.`))
    expect(
      canvas.querySelector('[data-part="content"]:not([hidden])')?.textContent
    ).toBe("Inputs panel content.")
    expect(
      canvas.querySelector('[data-part="trigger"][aria-current="step"]')
        ?.textContent
    ).toBe("Inputs")
    expect(
      canvas.querySelector('[data-part="completed-content"]')?.textContent
    ).toBe(
      "All steps are complete. This content lives outside the indexed step panels."
    )
    expect(
      canvas.querySelector('[data-part="prev-trigger"]')?.textContent
    ).toBe("Back")
    expect(
      canvas.querySelector('[data-part="next-trigger"]')?.textContent
    ).toBe("Continue")
  })
})

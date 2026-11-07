// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"
import { MultipleVisibleSlides } from "../stories/molecules/carousel-regressions.stories"

function renderFixture() {
  const canvas = document.createElement("div")
  if (!MultipleVisibleSlides.render) {
    throw new Error("The multiple-visible story must retain its composition")
  }
  canvas.innerHTML = renderToStaticMarkup(
    MultipleVisibleSlides.render({} as never, {} as never)
  )
  document.body.append(canvas)
  return canvas
}

function exposeFirstPage(canvas: HTMLElement) {
  const slides = canvas.querySelectorAll('[data-part="item"]')
  for (const slide of Array.from(slides).slice(0, 2)) {
    slide.removeAttribute("aria-hidden")
    slide.removeAttribute("inert")
  }
}

async function play(canvas: HTMLElement) {
  if (!MultipleVisibleSlides.play) {
    throw new Error("The multiple-visible story must retain its assertions")
  }
  await MultipleVisibleSlides.play({ canvasElement: canvas } as never)
}

afterEach(() => {
  document.body.replaceChildren()
})

describe("Carousel multiple-visible story lifecycle", () => {
  it("retains all editors and controls while viewport visibility is unmeasured", () => {
    const canvas = renderFixture()
    const slides = canvas.querySelectorAll('[data-part="item"]')
    expect(slides).toHaveLength(4)
    for (const [index, slide] of Array.from(slides).entries()) {
      expect(slide.getAttribute("aria-hidden")).toBe("true")
      expect(slide.hasAttribute("inert")).toBe(true)
      expect(
        slide.querySelector<HTMLInputElement>(
          `input[aria-label="Caption ${index + 1}"]`
        )?.value
      ).toBe("Caption")
    }
    expect(canvas.querySelectorAll('[data-part="indicator"]')).toHaveLength(3)
    expect(
      canvas
        .querySelector('[data-part="prev-trigger"]')
        ?.hasAttribute("disabled")
    ).toBe(true)
    expect(
      canvas
        .querySelector('[data-part="next-trigger"]')
        ?.hasAttribute("disabled")
    ).toBe(false)
  })

  it("waits for accessibility at mount and after same-count keyed replacement", async () => {
    const canvas = renderFixture()
    const original = canvas.querySelector('[aria-label="Caption 1"]')
    let replaced = false
    let replacementReady: ReturnType<typeof setTimeout> | undefined
    // Simulate the observer/commit boundary only; this is a story-play test, not layout coverage.
    canvas.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest("button")
      if (button?.textContent === "Replace all slide IDs") {
        for (const slide of canvas.querySelectorAll('[data-part="item"]')) {
          const replacement = slide.cloneNode(true) as HTMLElement
          replacement.setAttribute("aria-hidden", "true")
          replacement.setAttribute("inert", "")
          slide.replaceWith(replacement)
        }
        replaced = true
        replacementReady = setTimeout(() => exposeFirstPage(canvas), 20)
      }
      if (button?.textContent === "Open slide 2") {
        const status = canvas.querySelector('[role="status"]')
        if (!status) {
          throw new Error("Missing local action status")
        }
        status.textContent = "Opened slide 2 locally."
      }
    })
    const ready = setTimeout(() => exposeFirstPage(canvas), 20)
    try {
      await play(canvas)
      expect(replaced).toBe(true)
      expect(canvas.querySelector('[aria-label="Caption 1"]')).not.toBe(
        original
      )
      expect(canvas.querySelector('[role="status"]')?.textContent).toBe(
        "Opened slide 2 locally."
      )
    } finally {
      clearTimeout(ready)
      clearTimeout(replacementReady)
    }
  })

  it.each(["aria-hidden", "inert"])(
    "does not accept a hidden slide missing %s",
    async (attribute) => {
      const canvas = renderFixture()
      exposeFirstPage(canvas)
      const hiddenSlide = canvas.querySelectorAll('[data-part="item"]')[2]
      if (!hiddenSlide) {
        throw new Error("Missing off-screen slide")
      }
      hiddenSlide.removeAttribute(attribute)
      await expect(play(canvas)).rejects.toThrow()
    }
  )
})

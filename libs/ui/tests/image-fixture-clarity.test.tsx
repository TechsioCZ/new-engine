// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  AspectAndFit,
  PrimitiveRefs,
  Sizes,
} from "../stories/atoms/image.stories"

function fixture(story: typeof AspectAndFit) {
  if (!story.render) {
    throw new Error("The image story must retain its composition")
  }
  return story.render({} as never, {} as never)
}

function markup(story: typeof AspectAndFit) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(fixture(story))
  return canvas
}

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe("Image fixture clarity", () => {
  it("varies only object fit between equally framed landscape slots", () => {
    const images = Array.from(markup(AspectAndFit).querySelectorAll("img"))
    expect(images).toHaveLength(2)
    const commonClasses = images.map((image, index) => {
      expect(
        image.classList.contains(
          index === 0 ? "object-cover" : "object-contain"
        )
      ).toBe(true)
      for (const token of [
        "aspect-wide",
        "w-full",
        "rounded-lg",
        "border",
        "border-border-primary",
        "bg-fill-secondary",
      ]) {
        expect(image.classList.contains(token)).toBe(true)
      }
      expect(image.alt).toBe("Sunlit mountain peaks beneath a blue sky")
      return Array.from(image.classList).filter(
        (token) => token !== "object-cover" && token !== "object-contain"
      )
    })
    expect(commonClasses[0]).toEqual(commonClasses[1])
    expect(images[0]?.getAttribute("src")).toBe(images[1]?.getAttribute("src"))
  })

  it("uses readable size captions without changing thumbnail sizing or alignment", () => {
    const figures = Array.from(markup(Sizes).querySelectorAll("figure"))
    expect(figures).toHaveLength(3)
    for (const [index, size] of ["sm", "md", "lg"].entries()) {
      const figure = figures[index]
      const caption = figure?.querySelector("figcaption")
      expect(caption?.textContent?.trim()).toBe(size)
      for (const token of [
        "w-400",
        "shrink-0",
        "text-base",
        "text-fg-primary",
      ]) {
        expect(caption?.classList.contains(token)).toBe(true)
      }
      expect(figure?.classList.contains("items-center")).toBe(true)
      const image = figure?.querySelector("img")
      expect(image?.classList.contains(`size-image-${size}`)).toBe(true)
      expect(image?.getAttribute("width")).toBe("960")
      expect(image?.getAttribute("height")).toBe("640")
      expect(image?.alt).toBe("Sunlit mountain peaks beneath a blue sky")
    }
  })

  it("labels the full live DOM-ref output and preserves the Orders link and adapter targets", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const canvas = document.createElement("div")
    document.body.append(canvas)
    const root = createRoot(canvas)
    try {
      await act(async () => root.render(fixture(PrimitiveRefs)))
      const output = canvas.querySelector("output")
      const label = canvas.querySelector("label")
      expect(label?.textContent).toBe("DOM ref targets (in display order)")
      expect(label?.htmlFor).toBe(output?.id)
      expect(output?.dataset.testid).toBe("primitive-ref-targets")
      expect(output?.textContent).toBe("A,BUTTON,SPAN,IMG,IMG")
      const link = canvas.querySelector("a")
      expect(link?.textContent).toBe("Orders")
      expect(link?.getAttribute("href")).toBe("#orders")
      const click = new MouseEvent("click", { bubbles: true, cancelable: true })
      await act(() => link?.dispatchEvent(click))
      expect(click.defaultPrevented).toBe(true)
      expect(canvas.querySelector("button")?.textContent).toBe("Adapter button")
      expect(canvas.querySelector("span")?.textContent).toBe("Ready")
      const images = Array.from(canvas.querySelectorAll("img"))
      expect(images.map((image) => image.alt)).toEqual([
        "Ref target",
        "Fallback ref target",
      ])
      expect(images.map((image) => image.dataset.frameworkImage)).toEqual([
        "true",
        "true",
      ])
      await act(() => images[1]?.dispatchEvent(new Event("error")))
      expect(
        canvas
          .querySelector("[data-image-fallback]")
          ?.getAttribute("aria-label")
      ).toBe("Fallback ref target")
      expect(canvas.querySelectorAll("img")[1]).toBe(images[1])
      expect(output?.textContent).toBe("A,BUTTON,SPAN,IMG,IMG")
    } finally {
      await act(async () => root.unmount())
    }
  })
})

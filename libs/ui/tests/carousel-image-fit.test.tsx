// @vitest-environment happy-dom
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ObjectFitDemo } from "../stories/molecules/carousel.stories"

function renderImageFits() {
  if (!ObjectFitDemo.render) {
    throw new Error("The image-fit story must retain its composition")
  }
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    ObjectFitDemo.render({} as never, {} as never)
  )
  return canvas
}

describe("Carousel image-fit comparison", () => {
  it("frames every square viewport, including the natural-height none image", () => {
    const canvas = renderImageFits()
    const regions = canvas.querySelectorAll('[role="region"]')
    expect(regions).toHaveLength(4)
    const none = canvas.querySelector('[aria-label="none image fit"]')
    const noneViewport = none?.querySelector('[data-part="item-group"]')
    expect(noneViewport?.classList.contains("bg-fill-highlight")).toBe(true)
    for (const region of regions) {
      const viewport = region.querySelector('[data-part="item-group"]')
      expect(viewport?.classList.contains("aspect-square")).toBe(true)
      expect(viewport?.classList.contains("bg-fill-highlight")).toBe(true)
    }
  })

  it("keeps the demonstrated fitting contracts instead of stretching none", () => {
    const canvas = renderImageFits()
    for (const fit of ["cover", "contain", "fill", "none"]) {
      const region = canvas.querySelector(`[aria-label="${fit} image fit"]`)
      const slide = region?.querySelector('[data-part="item"]')
      expect(slide).not.toBeNull()
      expect(slide?.classList.contains("items-center")).toBe(true)
      expect(slide?.classList.contains("justify-center")).toBe(true)
      expect(slide?.classList.contains("*:size-full")).toBe(fit !== "none")
      if (fit !== "none") {
        expect(slide?.classList.contains(`*:object-${fit}`)).toBe(true)
      }
    }
  })
})

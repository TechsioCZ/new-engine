// @vitest-environment happy-dom
import { strictEqual } from "node:assert/strict"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { CarouselTemplate } from "../src/templates/carousel"
import carouselMeta, {
  AspectRatioDemo,
} from "../stories/molecules/carousel.stories"
import { IndependentCollections } from "../stories/molecules/carousel-regressions.stories"
import templateMeta, { MediaSizes } from "../stories/templates/carousel.stories"

function markup(element: ReactNode) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(element)
  return canvas
}

const expectInsetSurface = (canvas: HTMLElement) => {
  // Story-owned padding survives capture harnesses that remove body padding.
  // Ignore React's image preload links before the actual story wrapper.
  const surface = canvas.querySelector(":scope > div.p-200")
  strictEqual(surface?.classList.contains("w-full"), true)
  strictEqual(surface?.classList.contains("min-w-0"), true)
  strictEqual(surface?.classList.contains("p-200"), true)
  const content = surface?.firstElementChild
  strictEqual(content?.classList.contains("mx-auto"), true)
  strictEqual(content?.classList.contains("max-w-lg"), true)
  strictEqual(content?.classList.contains("min-w-0"), true)
}

describe("Carousel review regressions", () => {
  it("keeps every aspect-ratio label and viewport inside a story-owned gutter", () => {
    const decorators = carouselMeta.decorators
    const decorator =
      typeof decorators === "function" ? decorators : decorators?.[0]
    const render = AspectRatioDemo.render
    if (!(decorator && render)) {
      throw new Error(
        "The carousel comparison must retain its decorator and render"
      )
    }
    const canvas = markup(
      decorator(() => render({} as never, {} as never), {} as never)
    )
    expect(carouselMeta.parameters?.layout).toBe("fullscreen")
    expectInsetSurface(canvas)
    expect(
      Array.from(canvas.querySelectorAll("h3"), (label) => label.textContent)
    ).toEqual(["square", "landscape", "portrait", "wide"])
    for (const ratio of ["square", "landscape", "portrait", "wide"]) {
      const region = canvas.querySelector(`[aria-label="${ratio} image"]`)
      expect(region?.querySelectorAll('[data-part="item"]')).toHaveLength(1)
      expect(region?.querySelector("img")?.alt).toBe(
        "Sunlit mountain peaks above a valley in the Alps"
      )
    }
  })

  it("insets all template media sizes without dropping labels or navigation", () => {
    const decorators = templateMeta.decorators
    const decorator =
      typeof decorators === "function" ? decorators : decorators?.[0]
    const render = MediaSizes.render
    if (!(decorator && render)) {
      throw new Error(
        "The template size comparison must retain its composition"
      )
    }
    const canvas = markup(
      decorator(
        () => render(templateMeta.args as never, {} as never),
        {} as never
      )
    )
    expect(templateMeta.parameters?.layout).toBe("fullscreen")
    expectInsetSurface(canvas)
    expect(
      Array.from(canvas.querySelectorAll("h2"), (label) => label.textContent)
    ).toEqual(["Small (sm)", "Medium (md)", "Large (lg)"])
    for (const size of ["sm", "md", "lg"]) {
      const region = canvas.querySelector(
        `[aria-label="Featured destinations ${size}"]`
      )
      expect(region?.querySelectorAll('[data-part="item"]')).toHaveLength(3)
      expect(region?.querySelector('[data-part="prev-trigger"]')).not.toBeNull()
      expect(region?.querySelector('[data-part="next-trigger"]')).not.toBeNull()
      expect(
        region?.querySelector('[data-part="indicator-group"]')
      ).not.toBeNull()
    }
  })

  it("insets the complete vertical template including its side rail", () => {
    const decorators = templateMeta.decorators
    const decorator =
      typeof decorators === "function" ? decorators : decorators?.[0]
    if (!decorator) {
      throw new Error("The template must retain its inset decorator")
    }
    const canvas = markup(
      decorator(
        () => (
          <CarouselTemplate
            {...templateMeta.args}
            aria-label="Vertical destinations"
            aspectRatio="square"
            dir="rtl"
            orientation="vertical"
            slides={templateMeta.args?.slides ?? []}
          />
        ),
        {} as never
      )
    )
    expectInsetSurface(canvas)
    const region = canvas.querySelector('[aria-label="Vertical destinations"]')
    expect(region?.getAttribute("dir")).toBe("rtl")
    expect(region?.querySelector('[data-part="item-group"]')).not.toBeNull()
    const rail = region?.querySelector('[data-part="control"]')
    expect(rail?.getAttribute("data-carousel-layout")).toBe("side")
    expect(rail?.querySelector('[data-part="prev-trigger"]')).not.toBeNull()
    expect(rail?.querySelector('[data-part="next-trigger"]')).not.toBeNull()
  })

  it("reserves focus-ring clearance above both independent collection rails", () => {
    const render = IndependentCollections.render
    if (!render) {
      throw new Error("Independent collections must retain their composition")
    }
    const canvas = markup(render({} as never, {} as never))
    const collections = canvas.querySelectorAll(
      '[data-testid="collection-example"]'
    )
    expect(collections).toHaveLength(2)
    for (const [index, collection] of Array.from(collections).entries()) {
      const controls = collection.querySelector('[data-part="control"]')
      expect(controls?.classList.contains("mt-200")).toBe(true)
      expect(controls?.classList.contains("absolute")).toBe(false)
      expect(
        collection
          .querySelector('[data-part="root"]')
          ?.getAttribute("aria-label")
      ).toBe(
        index === 0 ? "First editable collection" : "Second editable collection"
      )
      expect(collection.querySelectorAll('[data-part="item"]')).toHaveLength(4)
      expect(
        collection.querySelectorAll('input[aria-label^="Caption"]')
      ).toHaveLength(4)
      expect(
        collection.querySelectorAll('textarea[aria-label^="Notes"]')
      ).toHaveLength(4)
      expect(
        collection.querySelectorAll('[contenteditable="true"]')
      ).toHaveLength(4)
      expect(
        collection.querySelectorAll('input[aria-label^="Rating"]')
      ).toHaveLength(4)
    }
  })
})

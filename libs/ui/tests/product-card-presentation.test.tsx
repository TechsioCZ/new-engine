// @vitest-environment happy-dom
import { act, type ReactElement } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import meta, {
  ActionLayouts,
  Badges,
  BadgesWithCustomColors,
  ComplexCard,
  CustomComposition,
  CustomRowSpan,
  LayoutVariants,
  MinimalCard,
  NativeMediaFallback,
  Playground,
  StockStates,
} from "../stories/molecules/product-card.stories"

type Fixture = { render?: unknown; args?: unknown }

function storyElement(story: Fixture) {
  const render = story.render as (
    args: unknown,
    context: unknown
  ) => ReactElement
  return render(story.args ?? {}, {})
}

function canvas(story: Fixture) {
  const element = document.createElement("div")
  element.innerHTML = renderToStaticMarkup(storyElement(story))
  return element
}

describe("ProductCard story presentation contracts", () => {
  it.each<[string, Fixture]>([
    ["Playground", Playground],
    ["Badges", Badges],
    ["BadgesWithCustomColors", BadgesWithCustomColors],
    ["StockStates", StockStates],
    ["LayoutVariants", LayoutVariants],
    ["CustomComposition", CustomComposition],
    ["MinimalCard", MinimalCard],
    ["ComplexCard", ComplexCard],
    ["ActionLayouts", ActionLayouts],
    ["NativeMediaFallback", NativeMediaFallback],
  ])(
    "bounds %s column cards without relying on conflicting max-widths",
    (_, story) => {
      const cards = canvas(story).querySelectorAll('[data-layout="column"]')
      expect(cards.length).toBeGreaterThan(0)
      for (const card of cards) {
        // A fixed token width plus the existing 100% max fits mobile and cannot
        // stretch to the canvas when max-w-product-card-max wins the cascade.
        expect(card.classList.contains("w-sm")).toBe(true)
        expect(card.classList.contains("max-w-full")).toBe(true)
      }
    }
  )

  it("keeps row-span buying details in the top row beside the image", () => {
    const details = canvas(CustomRowSpan).querySelector(".col-2")
    if (!details) {
      throw new Error("Missing row-span buying details")
    }
    expect(details.classList.contains("row-span-3")).toBe(true)
    expect(details.classList.contains("self-start")).toBe(true)
    expect(details.classList.contains("row-3")).toBe(false)
    expect(details.classList.contains("place-self-end")).toBe(false)
  })

  it.each<[string, Fixture, string]>([
    ["ComplexCard", ComplexCard, "(512 reviews)"],
    ["CustomComposition", CustomComposition, "(245 reviews)"],
  ])(
    "aligns %s review metadata to the compact star row, not its score block",
    (_, story, text) => {
      const element = canvas(story)
      const review = [...element.querySelectorAll("span")].find(
        (span) => span.textContent === text
      )
      if (!review) {
        throw new Error("Missing review count")
      }
      expect(review.classList.contains("min-h-rating-target")).toBe(true)
      expect(review.parentElement?.classList.contains("items-start")).toBe(true)
      const stars = element.querySelectorAll(
        '[role="img"][aria-description="Average rating"] > [data-part="item"]'
      )
      expect(stars).toHaveLength(5)
      for (const star of stars) {
        expect(star.classList.contains("text-rating-sm")).toBe(true)
      }
    }
  )

  it("insets the demo content inside the captured story root", () => {
    const decorators = meta.decorators
    const decorator = Array.isArray(decorators) ? decorators[0] : decorators
    if (!decorator) {
      throw new Error("Missing local ProductCard demo decorator")
    }
    const element = document.createElement("div")
    element.innerHTML = renderToStaticMarkup(
      decorator(() => <p>Preview</p>, {} as never)
    )
    expect(element.querySelector(".p-200 > p")?.textContent).toBe("Preview")
  })

  it("announces a local stock notification rather than viewing details or adding a cart item", async () => {
    const host = document.createElement("div")
    document.body.append(host)
    const root = createRoot(host)
    const decorators = meta.decorators
    const decorator = Array.isArray(decorators) ? decorators[0] : decorators
    if (!decorator) {
      throw new Error("Missing local ProductCard demo decorator")
    }
    try {
      await act(async () =>
        root.render(decorator(() => storyElement(StockStates), {} as never))
      )
      const notify = [...host.querySelectorAll("button")].find((button) =>
        button.textContent?.includes("Notify Me")
      )
      if (!notify) {
        throw new Error("Missing stock notification action")
      }
      expect(
        notify.querySelector(".token-icon-product-card-notify")
      ).not.toBeNull()
      await act(async () => notify.click())
      expect(host.querySelector('[role="status"]')?.textContent).toBe(
        "Stock notification requested in this local preview only."
      )
    } finally {
      await act(async () => root.unmount())
      host.remove()
    }
  })
})

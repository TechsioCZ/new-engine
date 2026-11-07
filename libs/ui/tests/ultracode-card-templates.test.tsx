// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { act, createRef, type ReactElement } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { ProductCardTemplate } from "../src/templates/product-card"
import akrosMeta, {
  AvailabilityStates,
  LongContent,
  PriceStates,
} from "../stories/templates/akros-product-card.stories"
import galleryMeta, { AutoplayOnly } from "../stories/templates/gallery.stories"

type Fixture = { args?: object; render?: unknown }

function canvas(element: ReactElement) {
  const host = document.createElement("div")
  host.innerHTML = renderToStaticMarkup(element)
  return host
}

function storyCanvas(story: Fixture, defaults: object) {
  if (typeof story.render !== "function") {
    throw new Error("Missing bounded story composition")
  }
  const render = story.render as (args: object, context: object) => ReactElement
  return canvas(render({ ...defaults, ...story.args }, {}))
}

describe("card template presentation regressions", () => {
  it("lets a short title use its natural height while preserving sale-price baselines", () => {
    const host = canvas(
      <ProductCardTemplate
        currentPriceLabel="Aktuální cena"
        name="Montážní sada M8"
        originalPrice="299 Kč"
        originalPriceLabel="Původní cena"
        price="249 Kč"
        showActions={false}
      />
    )
    const heading = host.querySelector("h3")
    if (!heading) {
      throw new Error("Missing product heading")
    }
    expect(heading.classList.contains("min-h-0")).toBe(true)
    expect(heading.classList.contains("min-h-product-card-name")).toBe(false)
    const prices = host.querySelector("del")?.parentElement
    if (!prices) {
      throw new Error("Missing sale-price container")
    }
    expect(heading.nextElementSibling).toBe(prices)
    expect(prices.classList.contains("items-baseline")).toBe(true)
    expect(prices.textContent).toContain("Původní cena: 299 Kč")
    expect(prices.textContent).toContain("Aktuální cena: 249 Kč")
  })

  it.each(["ltr", "rtl"] as const)(
    "pins even a zero review count to the logical trailing edge in %s",
    (dir) => {
      const host = canvas(
        <div dir={dir}>
          <ProductCardTemplate
            name="Runner"
            rating={{ value: 4.8, count: 5, reviewCount: 0 }}
          />
        </div>
      )
      const reviewCounts = [...host.querySelectorAll("span")].filter(
        (element) => element.textContent === "(0)"
      )
      expect(reviewCounts).toHaveLength(1)
      const reviews = reviewCounts[0]
      if (!reviews) {
        throw new Error("Missing zero review count")
      }
      expect(reviews.classList.contains("shrink-0")).toBe(true)
      const reviewRow = reviews.parentElement
      if (!reviewRow) {
        throw new Error("Missing review-count row")
      }
      expect(reviewRow.classList.contains("justify-between")).toBe(true)
      expect(reviewRow.classList.contains("items-end")).toBe(true)
      const stars = host.querySelector(
        '[role="img"][aria-label="4.8 out of 5"]'
      )
      expect(stars).not.toBeNull()
      if (!stars) {
        throw new Error("Missing aggregate rating")
      }
      // Each rating item also gives its decorative glyph the same data-part.
      const items = stars.querySelectorAll(':scope > [data-part="item"]')
      expect(items).toHaveLength(5)
      for (const item of items) {
        expect(item.classList.contains("text-rating-sm")).toBe(true)
        const glyph = item.querySelector('[aria-hidden="true"]')
        expect(glyph).not.toBeNull()
        expect(glyph?.classList.contains("text-rating-sm")).toBe(true)
      }
      expect(host.querySelector('[role="radiogroup"]')).toBeNull()
      expect(host.querySelector('[tabindex="0"]')).toBeNull()
      expect(host.querySelector('input[type="hidden"]')).toBeNull()
    }
  )

  it.each([undefined, "in-stock", "limited-stock", "out-of-stock"] as const)(
    "uses the stock-action icon without changing the caller's label for %s",
    (status) => {
      const host = canvas(
        <ProductCardTemplate
          cartButtonText="Caller action"
          onAddToCart={vi.fn()}
          stock={status ? { status, label: "Caller stock label" } : undefined}
        />
      )
      const button = host.querySelector("button")
      if (!button) {
        throw new Error("Missing caller stock-action button")
      }
      expect(button.textContent).toBe("Caller action")
      const notify = status === "out-of-stock"
      expect(
        button.querySelector(".token-icon-product-card-notify") !== null
      ).toBe(notify)
      expect(button.querySelector(".token-icon-cart-button") !== null).toBe(
        !notify
      )
      if (status) {
        expect(
          host.querySelector(`[data-stock="${status}"]`)?.textContent
        ).toBe("Caller stock label")
      }
    }
  )

  it("retains the linked heading's ref, caller overrides and action callbacks", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const host = document.createElement("div")
    document.body.append(host)
    const root = createRoot(host)
    const linkRef = createRef<HTMLAnchorElement>()
    const notify = vi.fn()
    const details = vi.fn()
    const wishlist = vi.fn()
    try {
      await act(() =>
        root.render(
          <ProductCardTemplate
            cartButtonText="Notify Me"
            className="w-full max-w-full"
            href="/products/m8"
            linkProps={{
              ref: linkRef,
              className: "caller-link",
              title: "Product detail",
            }}
            name="Montážní sada M8"
            nameAs="h2"
            onAddToCart={notify}
            onAddToWishlist={wishlist}
            onViewDetails={details}
            stock={{ status: "out-of-stock", label: "Out of Stock" }}
          />
        )
      )
      const link = host.querySelector("h2 a")
      if (!(link instanceof HTMLAnchorElement)) {
        throw new Error("Missing linked product heading")
      }
      expect(linkRef.current).toBe(link)
      expect(link.getAttribute("href")).toBe("/products/m8")
      expect(link.classList.contains("caller-link")).toBe(true)
      expect(link.title).toBe("Product detail")
      link.focus()
      expect(document.activeElement).toBe(link)
      const card = host.firstElementChild
      if (!card) {
        throw new Error("Missing product card root")
      }
      expect(card.classList.contains("max-w-full")).toBe(true)
      for (const button of host.querySelectorAll("button")) {
        await act(() => button.click())
      }
      expect(notify).toHaveBeenCalledOnce()
      expect(details).toHaveBeenCalledOnce()
      expect(wishlist).toHaveBeenCalledOnce()
    } finally {
      await act(() => root.unmount())
      host.remove()
      vi.unstubAllGlobals()
    }
    expect(linkRef.current).toBeNull()
  })

  it.each<[string, Fixture]>([
    ["availability states", AvailabilityStates],
    ["price states", PriceStates],
    ["long content", LongContent],
  ])(
    "keeps Akros %s on one text alignment without a reserved title gap",
    (_, story) => {
      const host = storyCanvas(story, akrosMeta.args)
      const cards = host.querySelectorAll("[data-akros-card-example]")
      expect(cards.length).toBeGreaterThan(0)
      for (const card of cards) {
        const heading = card.querySelector("h3")
        const price = card.querySelector("[data-akros-card-price]")
        if (!(heading && price)) {
          throw new Error("Missing Akros heading or price")
        }
        expect(heading.classList.contains("min-h-0")).toBe(true)
        expect(heading.classList.contains("text-start")).toBe(true)
        expect(price.classList.contains("items-start")).toBe(true)
        expect(price.classList.contains("text-start")).toBe(true)
        expect(card.querySelector("h3 a")?.textContent).toBe(
          heading.getAttribute("title")
        )
      }
    }
  )

  it("separates Akros amounts with a local token gap and secondary former price", () => {
    const css = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../stories/templates/akros-product-card.css"
      ),
      "utf8"
    )
    expect(css).toContain("--gap-price-block-primary: var(--spacing-200)")
    expect(css).toContain(
      "--color-price-block-original-fg: var(--color-fg-secondary)"
    )
    expect(css).not.toContain("justify-content: center")
    const host = storyCanvas(LongContent, akrosMeta.args)
    const price = host.querySelector("[data-akros-card-price]")
    if (!price) {
      throw new Error("Missing long-content Akros price")
    }
    expect(price.textContent).toContain("12 345,67 Kč")
    expect(price.querySelector("del")?.textContent).toContain("15 432,10 Kč")
    expect(price.textContent).toContain("Původní cena")
    expect(price.textContent).toContain("−20 %")
  })

  it("bounds the autoplay-only demo with the existing gallery frame", () => {
    const defaults = galleryMeta.args
    if (!defaults) {
      throw new Error("Missing gallery story defaults")
    }
    const host = storyCanvas(AutoplayOnly, defaults)
    const carousel = host.querySelector('[role="region"]')
    expect(carousel).not.toBeNull()
    if (!carousel) {
      throw new Error("Missing autoplay-only carousel")
    }
    expect(carousel.closest(".max-w-md")).not.toBeNull()
    expect(carousel.closest(".p-300")).not.toBeNull()
    expect(host.querySelectorAll("button")).toHaveLength(1)
    expect(AutoplayOnly.args?.autoplay).toEqual({ delay: 900 })
    expect(AutoplayOnly.args?.showThumbnails).toBe(false)
  })
})

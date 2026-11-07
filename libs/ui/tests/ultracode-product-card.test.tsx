// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { act, createRef, type ReactElement } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { ProductCard } from "../src/molecules/product-card"
import {
  ComplexCard,
  CustomComposition,
  CustomGridLayout,
  CustomRowSpan,
  WithQuantityInput,
} from "../stories/molecules/product-card.stories"

function markup(element: ReactElement) {
  const host = document.createElement("div")
  host.innerHTML = renderToStaticMarkup(element)
  return host
}

const AGGREGATE_RATING_RULE_PATTERN =
  /@utility product-card-rating \{([\s\S]*?)\n\}/

type Fixture = { render?: unknown }
function storyMarkup(story: Fixture) {
  const render = story.render as () => ReactElement
  return markup(render())
}

describe("ProductCard hierarchy regressions", () => {
  it("lets names size to their text while retaining clamping and heading semantics", () => {
    const name = "Professional Camera Kit with Accessories"
    const host = markup(
      <ProductCard dir="rtl">
        <ProductCard.Name as="h2" title={name}>
          <a href="/camera">{name}</a>
        </ProductCard.Name>
        <ProductCard.Price>2,449 €</ProductCard.Price>
      </ProductCard>
    )
    const heading = host.querySelector("h2")
    if (!heading) {
      throw new Error("Missing product heading")
    }
    expect(heading.textContent).toBe(name)
    expect(heading.getAttribute("title")).toBe(name)
    expect(heading.querySelector("a")?.getAttribute("href")).toBe("/camera")
    expect(heading.classList.contains("line-clamp-product-card-name")).toBe(
      true
    )
    expect(heading.classList.contains("min-h-product-card-name")).toBe(false)
    expect(host.querySelector('[dir="rtl"]')).not.toBeNull()
    // Keep bottom-aligned purchase information for equal-height catalog cards.
    expect(host.querySelector("p")?.classList.contains("mt-auto")).toBe(true)
  })

  it("still allows callers to reserve a two-line name or override price placement", () => {
    const host = markup(
      <ProductCard>
        <ProductCard.Name className="min-h-product-card-name">
          Cotton T-Shirt
        </ProductCard.Name>
        <ProductCard.Price className="mt-0">$24.99</ProductCard.Price>
      </ProductCard>
    )
    expect(
      host.querySelector("h3")?.classList.contains("min-h-product-card-name")
    ).toBe(true)
    expect(host.querySelector("p")?.classList.contains("mt-0")).toBe(true)
    expect(host.querySelector("p")?.classList.contains("mt-auto")).toBe(false)
  })

  it("compacts only aggregate stars, keeping exact values and editable control semantics", () => {
    const aggregate = markup(
      <ProductCard.Rating
        rating={{ value: 4.9, displayOnly: true, size: "sm", dir: "rtl" }}
      />
    )
    expect(
      aggregate.firstElementChild?.classList.contains("product-card-rating")
    ).toBe(true)
    expect(
      aggregate.querySelector('[role="img"]')?.getAttribute("aria-label")
    ).toBe("4.9 out of 5")
    expect(
      aggregate.querySelectorAll('[role="img"] > [data-part="item"]')
    ).toHaveLength(5)
    expect(aggregate.querySelector("bdi")?.textContent).toBe("4.9 / 5")
    expect(
      aggregate.querySelector('[role="radio"], input, [tabindex="0"]')
    ).toBeNull()

    const editable = markup(
      <ProductCard.Rating
        rating={{ defaultValue: 3, name: "review", dir: "rtl" }}
      />
    )
    expect(editable.querySelectorAll('[role="radio"]')).toHaveLength(5)
    expect(editable.querySelector('input[name="review"]')).not.toBeNull()
    expect(editable.querySelector('[role="img"]')).toBeNull()

    const css = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../src/tokens/components/molecules/_product-card.css"
      ),
      "utf8"
    )
    const rule = css.match(AGGREGATE_RATING_RULE_PATTERN)?.[1]
    expect(rule).toContain('[role="img"][aria-description="Average rating"]')
    expect(rule).toContain('> [data-part="item"]')
    expect(rule).toContain("inline-size: 1em")
    expect(rule).toContain("min-inline-size: 1em")
    expect(rule).toContain("flex: 0 0 auto")
    expect(rule).not.toContain('role="radio"')
  })

  it("preserves refs, attributes and keyboard handlers on styled slots", async () => {
    const host = document.createElement("div")
    document.body.append(host)
    const root = createRoot(host)
    const cardRef = createRef<HTMLDivElement>()
    const nameRef = createRef<HTMLHeadingElement>()
    const ratingRef = createRef<HTMLDivElement>()
    const buttonRef = createRef<HTMLButtonElement>()
    const onKeyDown = vi.fn()
    try {
      await act(() => {
        root.render(
          <ProductCard data-testid="card" dir="rtl" ref={cardRef}>
            <ProductCard.Name ref={nameRef}>Camera</ProductCard.Name>
            <ProductCard.Rating className="caller-rating" ref={ratingRef}>
              <span>4.9 out of 5</span>
            </ProductCard.Rating>
            <ProductCard.Button
              onKeyDown={onKeyDown}
              ref={buttonRef}
              type="button"
            >
              Add to Cart
            </ProductCard.Button>
          </ProductCard>
        )
      })
      expect(cardRef.current).toBe(host.querySelector('[data-testid="card"]'))
      expect(nameRef.current).toBe(host.querySelector("h3"))
      expect(ratingRef.current?.classList.contains("caller-rating")).toBe(true)
      expect(ratingRef.current?.textContent).toBe("4.9 out of 5")
      expect(buttonRef.current).toBe(host.querySelector("button"))
      const button = buttonRef.current
      if (!button) {
        throw new Error("Missing product action button ref")
      }
      button.focus()
      expect(document.activeElement).toBe(buttonRef.current)
      await act(() => {
        button.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        )
      })
      expect(onKeyDown).toHaveBeenCalledOnce()
    } finally {
      await act(() => root.unmount())
      host.remove()
    }
  })

  it.each([
    ["CustomRowSpan", CustomRowSpan, "Professional Camera"],
    ["WithQuantityInput", WithQuantityInput, "Swiss Luxury Watch"],
  ] as const)(
    "gives %s grouped details their own spacing rhythm",
    (_, story, title) => {
      const host = storyMarkup(story)
      const heading = [...host.querySelectorAll("h3")].find(
        (node) => node.textContent === title
      )
      if (!heading) {
        throw new Error(`Missing grouped product heading: ${title}`)
      }
      expect(heading.parentElement?.classList.contains("flex-col")).toBe(true)
      expect(heading.parentElement?.classList.contains("gap-200")).toBe(true)
      if (story === CustomRowSpan) {
        const details = host.querySelector(".col-2")
        if (!details) {
          throw new Error("Missing custom-row details group")
        }
        expect(details.classList.contains("gap-200")).toBe(true)
        expect(details.classList.contains("self-start")).toBe(true)
      }
    }
  )

  it("does not stretch grouped custom-grid media to the full row height", () => {
    const media =
      storyMarkup(CustomGridLayout).querySelector("[data-image-state]")
    if (!media) {
      throw new Error("Missing custom-grid product media")
    }
    expect(media.classList.contains("h-auto")).toBe(true)
    expect(media.classList.contains("h-full")).toBe(false)
  })

  it.each([
    ["CustomComposition", CustomComposition, "$1,899", "$1,329"],
    ["ComplexCard", ComplexCard, "$3,499", "$2,449"],
  ] as const)(
    "keeps %s original prices secondary without dropping amounts or labels",
    (_, story, original, current) => {
      const host = storyMarkup(story)
      const previous = host.querySelector("del")
      if (!previous) {
        throw new Error("Missing original product price")
      }
      expect(previous.textContent).toBe(`Original price ${original}`)
      expect(previous.classList.contains("text-fg-muted")).toBe(true)
      expect(previous.parentElement?.classList.contains("items-baseline")).toBe(
        true
      )
      expect(host.textContent).toContain(`Current price ${current}`)
    }
  )
})

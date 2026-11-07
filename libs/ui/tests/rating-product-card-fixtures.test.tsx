// @vitest-environment happy-dom
import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ProductCardTemplate } from "../src/templates/product-card"
import { TenPointScale } from "../stories/atoms/rating.stories"
import templateMeta, {
  LinkedSaleCard,
  OnSale,
  Playground,
} from "../stories/templates/product-card.stories"

function mount(element: ReactElement) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(element)
  document.body.append(canvas)
  return canvas
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

describe("TenPointScale fixture", () => {
  function canvas() {
    if (!TenPointScale.render) {
      throw new Error("Missing ten-point fixture")
    }
    return mount(TenPointScale.render({} as never, {} as never))
  }

  it("bounds a full-width row inside a named keyboard-reachable scroll region", () => {
    const host = canvas()
    const region = host.querySelector('[role="region"]')
    expect(region?.getAttribute("aria-label")).toBe("Ten-point rating scale")
    expect(region?.getAttribute("tabindex")).toBe("0")
    for (const token of ["w-md", "max-w-full", "overflow-x-auto"]) {
      expect(region?.classList.contains(token)).toBe(true)
    }
    expect(region?.firstElementChild?.classList.contains("w-md")).toBe(true)
  })

  it("retains all ten editable choices and the atom's full target sizing", () => {
    const host = canvas()
    const choices = host.querySelectorAll('[role="radio"]')
    expect(choices).toHaveLength(10)
    for (const [index, choice] of [...choices].entries()) {
      expect(choice.getAttribute("aria-posinset")).toBe(String(index + 1))
      expect(choice.getAttribute("aria-disabled")).not.toBe("true")
      expect(choice.classList.contains("min-h-rating-target")).toBe(true)
      expect(choice.classList.contains("rating-item-fluid")).toBe(true)
    }
    expect(
      host.querySelector('[aria-checked="true"]')?.getAttribute("aria-posinset")
    ).toBe("7")
  })
})

describe("ProductCardTemplate alignment contracts", () => {
  function saleCanvas() {
    return mount(
      <ProductCardTemplate {...templateMeta.args} {...OnSale.args} />
    )
  }

  async function playSale(canvasElement: HTMLElement) {
    if (typeof OnSale.play !== "function") {
      throw new Error("Missing sale assertions")
    }
    await OnSale.play({ canvasElement } as never)
  }

  function summaryGeometry(
    canvas: HTMLElement,
    lineBoxOffset = 0,
    baselineOffset = 0
  ) {
    const score = [...canvas.querySelectorAll("bdi")].find(
      (element) => element.textContent === "4.8 / 5"
    )
    const scoreLine = score?.parentElement
    const review = [...canvas.querySelectorAll("span")].find(
      (element) => element.textContent === "(542)"
    )
    const summary = review?.parentElement
    const stars = canvas.querySelector('[role="img"]')
    if (!(score && scoreLine && review && summary && stars)) {
      throw new Error("Missing sale rating summary")
    }
    const original = canvas.querySelector("del")
    const prices = original?.parentElement
    const current = prices?.querySelector("p")
    if (!(original && prices && current)) {
      throw new Error("Missing sale prices")
    }
    // Happy DOM does not compile Tailwind; geometry below tests the measurement
    // algorithm, while browser checks validate real styles and font baselines.
    prices.style.alignItems = "baseline"
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        if (
          this.parentElement === original &&
          this.getAttribute("aria-hidden") === "true"
        ) {
          return new DOMRect(0, 140, 0, 0)
        }
        if (
          this.parentElement === current &&
          this.getAttribute("aria-hidden") === "true"
        ) {
          return new DOMRect(0, 140 + baselineOffset, 0, 0)
        }
        if (this === original) {
          return new DOMRect(0, 125, 40, 18)
        }
        if (this === current) {
          return new DOMRect(50, 120, 50, 26)
        }
        // Inline glyph bounds need not reach the bottom of their containing line box.
        if (this === score) {
          return new DOMRect(0, 100, 40, 16.890_625)
        }
        if (this === scoreLine) {
          return new DOMRect(0, 100 + lineBoxOffset, 40, 20)
        }
        if (this === review) {
          return new DOMRect(70, 100, 30, 20)
        }
        if (this === summary) {
          return new DOMRect(0, 60, 100, 60)
        }
        if (this === stars) {
          return new DOMRect(0, 60, 60, 32)
        }
        return new DOMRect()
      }
    )
  }

  it("compares rating line boxes rather than inline score glyph bounds", async () => {
    const canvas = saleCanvas()
    summaryGeometry(canvas)
    await playSale(canvas)
  })

  it("still rejects rating line-box misalignment greater than one pixel", async () => {
    const canvas = saleCanvas()
    summaryGeometry(canvas, 2)
    await expect(playSale(canvas)).rejects.toThrow()
  })

  it("measures sale-price baselines, not unequal-font box bottoms, and removes probes", async () => {
    const canvas = saleCanvas()
    summaryGeometry(canvas)
    const before = canvas.innerHTML
    await playSale(canvas)
    expect(canvas.innerHTML).toBe(before)
  })

  it("still rejects sale-price baseline misalignment greater than one pixel", async () => {
    const canvas = saleCanvas()
    summaryGeometry(canvas, 0, 2)
    const before = canvas.innerHTML
    await expect(playSale(canvas)).rejects.toThrow()
    expect(canvas.innerHTML).toBe(before)
  })

  it.each([
    ["Playground", Playground],
    ["OnSale", OnSale],
    ["LinkedSaleCard", LinkedSaleCard],
  ] as const)(
    "preserves %s's semantic sale-price baseline layout",
    (_name, story) => {
      const canvas = mount(
        <ProductCardTemplate {...templateMeta.args} {...story.args} />
      )
      const original = canvas.querySelector("del")
      const row = original?.parentElement
      const current = row?.querySelector("p")
      expect(original?.textContent).toContain(story.args?.originalPrice)
      expect(current?.textContent).toContain(story.args?.price)
      expect(original?.querySelector(".sr-only")?.textContent).toBe(
        `${story.args?.originalPriceLabel ?? "Original price"}: `
      )
      expect(current?.querySelector(".sr-only")?.textContent).toBe(
        `${story.args?.currentPriceLabel ?? "Current price"}: `
      )
      expect(row?.classList.contains("flex")).toBe(true)
      expect(row?.classList.contains("items-baseline")).toBe(true)
      expect(row?.classList.contains("items-end")).toBe(false)
      expect(current?.classList.contains("mt-0")).toBe(true)
      expect(current?.classList.contains("mt-auto")).toBe(false)
      expect(
        original?.classList.contains("text-product-card-original-price-fg")
      ).toBe(true)
      expect(
        original?.classList.contains("text-product-card-original-price-size")
      ).toBe(true)
    }
  )
})

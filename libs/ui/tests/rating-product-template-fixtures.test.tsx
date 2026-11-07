// @vitest-environment happy-dom
import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ProductCardTemplate } from "../src/templates/product-card"
import { TenPointScale } from "../stories/atoms/rating.stories"
import { OnSale } from "../stories/templates/product-card.stories"

const hosts: HTMLElement[] = []

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("Missing fixture element")
  }
  return value
}

function canvas(element: ReactElement) {
  const host = document.createElement("div")
  host.innerHTML = renderToStaticMarkup(element)
  document.body.append(host)
  hosts.push(host)
  return host
}

function rect(x: number, y: number, width: number, height: number) {
  return new DOMRect(x, y, width, height)
}

afterEach(() => {
  vi.restoreAllMocks()
  for (const host of hosts.splice(0)) {
    host.remove()
  }
})

// Happy DOM has no layout engine. These deterministic geometry regressions
// exercise the story assertions, not browser rendering (covered by the parent).
describe("TenPointScale fixture geometry contract", () => {
  function fixture(
    width: number,
    fontSize: number,
    gap: number,
    rows?: number
  ) {
    if (!TenPointScale.render) {
      throw new Error("Missing ten-point fixture")
    }
    const host = canvas(TenPointScale.render({} as never, {} as never))
    const control = required(
      host.querySelector<HTMLElement>('[role="radiogroup"]')
    )
    const inputs = [...control.querySelectorAll<HTMLElement>('[role="radio"]')]
    control.style.columnGap = `${gap}px`
    const region = required(host.querySelector<HTMLElement>('[role="region"]'))
    region.style.overflowX = "auto"
    Object.defineProperty(host, "clientWidth", { value: width })
    Object.defineProperty(region, "clientWidth", { value: width })
    Object.defineProperties(control, {
      clientWidth: { value: 448 },
      scrollWidth: { value: 448 },
    })
    const minimum = Math.max(24, fontSize)
    const perRow = rows ? Math.ceil(10 / rows) : 10
    const boxes = new Map<Element, DOMRect>([
      [region, rect(0, 0, width, 32)],
      [control, rect(0, 0, 448, Math.ceil(10 / perRow) * 32)],
    ])
    for (const [index, input] of inputs.entries()) {
      input.style.fontSize = `${fontSize}px`
      boxes.set(
        input,
        rect(
          (index % perRow) * (minimum + gap),
          Math.floor(index / perRow) * 32,
          minimum,
          32
        )
      )
    }
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        return boxes.get(this) ?? rect(0, 0, 0, 0)
      }
    )
    return { host, inputs, boxes }
  }

  it.each([
    [448, 24, 16],
    [320, 24, 16],
    [320, 28, 4],
    [292, 28, 4],
  ])(
    "retains all ten choices at width %s, glyph %s, gap %s",
    async (width, fontSize, gap) => {
      const { host, inputs } = fixture(width, fontSize, gap)
      expect(host.firstElementChild?.classList.contains("w-md")).toBe(true)
      expect(host.firstElementChild?.classList.contains("max-w-full")).toBe(
        true
      )
      expect(inputs).toHaveLength(10)
      expect(inputs.map((input) => input.getAttribute("aria-label"))).toEqual(
        Array.from({ length: 10 }, (_, index) => `${index + 1} stars`)
      )
      expect(inputs[6]?.getAttribute("aria-checked")).toBe("true")
      expect(inputs[6]?.getAttribute("tabindex")).toBe("0")
      await required(TenPointScale.play)({ canvasElement: host } as never)
    }
  )

  it("rejects unnecessary wrapping when the full minimum footprint fits", async () => {
    const { host } = fixture(448, 24, 16, 2)
    await expect(
      required(TenPointScale.play)({ canvasElement: host } as never)
    ).rejects.toThrow()
  })

  it("accepts fractional flex rounding within the shared one-pixel budget", async () => {
    const { host, inputs, boxes } = fixture(320, 24, 16)
    boxes.set(required(inputs[9]), rect(424.0625, 0, 24, 32))
    await required(TenPointScale.play)({ canvasElement: host } as never)
  })

  it("rejects more than one pixel of actual inner-control clipping", async () => {
    const { host, inputs, boxes } = fixture(320, 24, 16)
    boxes.set(required(inputs[9]), rect(426, 0, 24, 32))
    await expect(
      required(TenPointScale.play)({ canvasElement: host } as never)
    ).rejects.toThrow()
  })

  it("rejects later choices clipped by the inner control", async () => {
    const { host, inputs, boxes } = fixture(320, 24, 16)
    boxes.set(required(inputs[9]), rect(440, 0, 24, 32))
    await expect(
      required(TenPointScale.play)({ canvasElement: host } as never)
    ).rejects.toThrow()
  })
})

describe("ProductCardTemplate comparable line boxes and price baselines", () => {
  function fixture(scoreLineOffset = 0, priceBaselineOffset = 0) {
    const host = canvas(<ProductCardTemplate {...OnSale.args} />)
    const score = required(
      [...host.querySelectorAll("bdi")].find(
        (node) => node.textContent === "4.8 / 5"
      )
    )
    const scoreLine = required(score.closest("span"))
    const reviews = required(
      [...host.querySelectorAll("span")].find(
        (node) => node.textContent === "(542)"
      )
    )
    const summary = required(reviews.parentElement)
    const stars = required(host.querySelector('[role="img"]'))
    const original = required(host.querySelector("del"))
    const prices = required(original.parentElement)
    const current = required(prices.querySelector("p"))
    prices.style.alignItems = "baseline"
    prices.style.display = "flex"
    original.style.fontSize = "14px"
    current.style.fontSize = "24px"
    const boxes = new Map<Element, DOMRect>([
      [summary, rect(0, 0, 300, 80)],
      [reviews, rect(260, 60, 40, 20)],
      [scoreLine, rect(0, 62 + scoreLineOffset, 60, 18)],
      // Inline glyph bottom differs by the exact CI failure; line boxes align.
      [score, rect(0, 64, 60, 12.890_625)],
      [stars, rect(0, 20, 180, 32)],
      // Unequal font-size boxes can legitimately have unequal bottoms.
      [original, rect(0, 90, 60, 14)],
      [current, rect(70, 84, 100, 24)],
    ])
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.style.verticalAlign === "baseline") {
          return rect(
            0,
            this.parentElement === current ? 100 + priceBaselineOffset : 100,
            0,
            0
          )
        }
        return boxes.get(this) ?? rect(0, 0, 0, 0)
      }
    )
    return { host, prices, original, current }
  }

  it("accepts aligned line boxes and actual baselines despite unequal text-box bottoms", async () => {
    const { host, original, current } = fixture()
    await required(OnSale.play)({ canvasElement: host } as never)
    expect(original.children).toHaveLength(1)
    expect(current.children).toHaveLength(1)
    expect(original.textContent).toBe("Original price: $149.99")
    expect(current.textContent).toBe("Current price: $89.99")
  })

  it("still rejects rating line boxes separated by more than one pixel", async () => {
    const { host } = fixture(2)
    await expect(
      required(OnSale.play)({ canvasElement: host } as never)
    ).rejects.toThrow()
  })

  it("rejects sale-price baselines separated by more than one pixel and removes probes", async () => {
    const { host, original, current } = fixture(0, 2)
    await expect(
      required(OnSale.play)({ canvasElement: host } as never)
    ).rejects.toThrow()
    expect(original.children).toHaveLength(1)
    expect(current.children).toHaveLength(1)
  })

  it("requires semantic baseline layout, not merely coincident boxes", async () => {
    const { host, prices } = fixture()
    prices.style.alignItems = "flex-end"
    await expect(
      required(OnSale.play)({ canvasElement: host } as never)
    ).rejects.toThrow()
  })
})

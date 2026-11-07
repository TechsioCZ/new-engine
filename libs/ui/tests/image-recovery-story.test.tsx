// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FailedAndRecovery } from "../stories/atoms/image.stories"

function fixture() {
  if (!FailedAndRecovery.render) {
    throw new Error("The image recovery story must retain its composition")
  }
  return FailedAndRecovery.render({} as never, {} as never)
}

function slots(canvas: HTMLElement) {
  return Array.from(canvas.querySelectorAll<HTMLElement>("[data-image-state]"))
}

function geometry(canvas: HTMLElement) {
  return slots(canvas).map((slot) => ({
    className: slot.className,
    ratio: slot.style.getPropertyValue("--image-aspect-ratio"),
    reservation: slot.querySelector("[data-image-reservation]")?.outerHTML,
  }))
}

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe("Image failed-and-recovery story", () => {
  it("authors equal-sized slots for native, adapter and decorative missing media", () => {
    const canvas = document.createElement("div")
    canvas.innerHTML = renderToStaticMarkup(fixture())
    const boxes = slots(canvas)
    expect(boxes).toHaveLength(3)
    for (const box of boxes) {
      expect(box.classList.contains("size-image-md")).toBe(true)
      expect(box.classList.contains("size-image-sm")).toBe(false)
      expect(box.querySelector("[data-image-reservation]")).not.toBeNull()
    }
    expect(boxes.map((box) => box.dataset.imageState)).toEqual([
      "loading",
      "loading",
      "error",
    ])
    const decorative = boxes[2]
    expect(decorative?.querySelector("img")?.hasAttribute("src")).toBe(false)
    expect(
      decorative
        ?.querySelector("[data-image-fallback]")
        ?.getAttribute("aria-hidden")
    ).toBe("true")
  })

  it("keeps the authored geometry and missing tile through native/adapter recovery", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const canvas = document.createElement("div")
    document.body.append(canvas)
    const root = createRoot(canvas)
    try {
      await act(async () => root.render(fixture()))
      const before = geometry(canvas)
      // Happy DOM eagerly loads data URLs, including invalid raster bytes.
      // Simulate failure below and check recovery callbacks relative to mount.
      const initialLoads = Number(
        canvas.querySelector('[data-testid="image-loads"]')?.textContent
      )
      const decorative = slots(canvas)[2]
      const images = () =>
        Array.from(canvas.querySelectorAll("img")).slice(0, 2)
      expect(images()[1]?.dataset.frameworkImage).toBe("true")
      await act(() => {
        for (const image of images()) {
          image.dispatchEvent(new Event("error"))
        }
      })
      expect(slots(canvas).map((box) => box.dataset.imageState)).toEqual([
        "error",
        "error",
        "error",
      ])
      expect(
        canvas.querySelector('[data-testid="image-errors"]')?.textContent
      ).toBe("2")
      expect(geometry(canvas)).toEqual(before)
      const action = canvas.querySelector("button")
      if (!action) {
        throw new Error("The image recovery action must remain available")
      }
      await act(async () => action.click())
      // Happy DOM delivers data-URL load events during act; do not double-fire them.
      expect(slots(canvas).map((box) => box.dataset.imageState)).toEqual([
        "loaded",
        "loaded",
        "error",
      ])
      expect(geometry(canvas)).toEqual(before)
      expect(slots(canvas)[2]).toBe(decorative)
      expect(canvas.querySelectorAll("[data-image-fallback]")).toHaveLength(1)
      expect(images().map((image) => image.alt)).toEqual([
        "Mountain landscape",
        "Mountain landscape from adapter",
      ])
      for (const image of images()) {
        expect(image.hasAttribute("aria-hidden")).toBe(false)
      }
      expect(
        canvas.querySelector('[data-testid="image-loads"]')?.textContent
      ).toBe(String(initialLoads + 2))
      expect(action.textContent).toBe("Break photo")
    } finally {
      await act(async () => root.unmount())
    }
  })
})

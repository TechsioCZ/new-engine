// @vitest-environment happy-dom
import { act } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MediaLifecycleAndRefs } from "../stories/organisms/gallery.stories"

function fixture() {
  if (!MediaLifecycleAndRefs.render) {
    throw new Error("The Gallery lifecycle story must retain its composition")
  }
  return MediaLifecycleAndRefs.render({} as never, {} as never)
}

function image(canvas: HTMLElement) {
  const target = canvas.querySelector<HTMLImageElement>(
    '[data-media-prop="preserved"]'
  )
  if (!target) {
    throw new Error("Missing Gallery media ref target")
  }
  return target
}

function frame(canvas: HTMLElement) {
  const target = image(canvas).closest<HTMLElement>("[data-image-state]")
  if (!target) {
    throw new Error("Missing Gallery media reservation")
  }
  return target
}

function reservation(canvas: HTMLElement) {
  return {
    ratio: frame(canvas).style.getPropertyValue("--image-aspect-ratio"),
    className: frame(canvas).className,
    svg: frame(canvas).querySelector("[data-image-reservation]")?.outerHTML,
  }
}

function button(canvas: HTMLElement, name: string) {
  const target = Array.from(canvas.querySelectorAll("button")).find(
    (element) => element.textContent === name
  )
  if (!target) {
    throw new Error(`Missing Gallery action: ${name}`)
  }
  return target
}

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe("Gallery authored media lifecycle", () => {
  it("labels held loading and keeps every control and the report in a spaced grid", () => {
    const canvas = document.createElement("div")
    canvas.innerHTML = renderToStaticMarkup(fixture())
    expect(canvas.querySelector("[data-gallery-loading]")?.textContent).toBe(
      "Loading image…"
    )
    expect(canvas.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(image(canvas).hasAttribute("src")).toBe(false)
    expect(image(canvas).alt).toBe("Workshop sneaker full view")
    expect(image(canvas).dataset.adapter).toBe("shared")
    const group = canvas.querySelector(
      '[aria-label="Gallery lifecycle controls"]'
    )
    if (!group) {
      throw new Error("Missing Gallery lifecycle controls")
    }
    expect(group.className).toContain("grid-cols-2")
    expect(group.className).toContain("gap-200")
    expect(group.querySelectorAll("button")).toHaveLength(9)
    expect(button(canvas, "Check cleanup").className).toContain("col-span-2")
    expect(canvas.firstElementChild?.className).toContain("pb-300")
    expect(canvas.querySelector('[role="status"]')?.textContent).toContain(
      "Refs attach to their actual DOM targets."
    )
    for (const thumbnail of canvas.querySelectorAll(
      'button[aria-label^="Show slide"] img'
    )) {
      expect(thumbnail.getAttribute("alt")).toBe("")
      expect(thumbnail.getAttribute("aria-hidden")).toBe("true")
    }
  })

  it("requests real photo bytes without synthesizing success, preserves native events and cleans refs", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const canvas = document.createElement("div")
    document.body.append(canvas)
    const root = createRoot(canvas)
    const click = async (name: string) => {
      await act(async () => button(canvas, name).click())
    }
    const report = () => canvas.querySelector('[role="status"]')?.textContent
    try {
      await act(async () => root.render(fixture()))
      const geometry = reservation(canvas)
      await click("Check refs")
      expect(report()).toContain("refs verified")
      await click("Simulate image error")
      expect(frame(canvas).dataset.imageState).toBe("error")
      expect(canvas.querySelector("[data-gallery-loading]")).toBeNull()
      expect(
        frame(canvas)
          .querySelector("[data-image-fallback]")
          ?.getAttribute("aria-label")
      ).toBe("Workshop sneaker full view")
      await click("Change source")
      expect(frame(canvas).dataset.imageState).toBe("loading")
      expect(image(canvas).hasAttribute("src")).toBe(false)
      expect(canvas.querySelector("[data-gallery-loading]")).not.toBeNull()
      await click("Simulate image load")
      expect(image(canvas).getAttribute("src")?.endsWith("shoes-1.avif")).toBe(
        true
      )
      expect(image(canvas).dataset.requestedSrc).toBe(
        image(canvas).getAttribute("src")
      )
      const thumbnail = canvas.querySelector<HTMLImageElement>(
        '[data-adapter="thumbnail"]'
      )
      if (!thumbnail) {
        throw new Error("Missing Gallery thumbnail adapter")
      }
      expect(thumbnail.getAttribute("src")).toBe(
        image(canvas).getAttribute("src")
      )
      // Happy DOM cannot decode this AVIF. A click must not manufacture a load event.
      expect(frame(canvas).dataset.imageState).toBe("loading")
      await click("Check events")
      expect(report()).toBe("Load events: 0; error events: 1")
      expect(reservation(canvas)).toEqual(geometry)
      // A genuine adapter failure must remain a failure, even for the recovery URL.
      await act(async () => image(canvas).dispatchEvent(new Event("error")))
      expect(frame(canvas).dataset.imageState).toBe("error")
      await click("Change source")
      await click("Simulate image load")
      // This tests callback forwarding only; pixel readiness belongs to browser decode().
      await act(async () => image(canvas).dispatchEvent(new Event("load")))
      expect(frame(canvas).dataset.imageState).toBe("loaded")
      expect(image(canvas).alt).toBe("Workshop sneaker full view")
      expect(image(canvas).hasAttribute("aria-hidden")).toBe(false)
      expect(canvas.querySelector("[data-gallery-loading]")).toBeNull()
      expect(reservation(canvas)).toEqual(geometry)
      await click("Check events")
      expect(report()).toBe("Load events: 1; error events: 2")
      await click("Use object scroll ref")
      await click("Check refs")
      expect(report()).toContain("refs verified")
      await click("Unmount gallery")
      await click("Check cleanup")
      expect(report()).toBe("All refs cleaned.")
      await click("Remount gallery")
      expect(frame(canvas).dataset.imageState).toBe("loading")
      expect(image(canvas).hasAttribute("src")).toBe(false)
      expect(reservation(canvas)).toEqual(geometry)
    } finally {
      await act(async () => root.unmount())
    }
  })
})

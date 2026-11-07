// @vitest-environment happy-dom
import { act, type ComponentPropsWithRef, createRef } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ImageWithFallback } from "../src/atoms/image"

// Exercise the public adapter events without happy-dom fetching/decoding URLs.
function EventOnlyImageAdapter({
  src,
  srcSet,
  alt,
  width,
  height,
  ...props
}: ComponentPropsWithRef<"img">) {
  return (
    // biome-ignore lint/performance/noImgElement: This adapter tests native image events without requesting or decoding a resource.
    <img
      {...props}
      alt={alt}
      data-request-src={src}
      data-request-srcset={srcSet}
      height={height}
      width={width}
    />
  )
}

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe("Image request and reservation contracts", () => {
  it("updates intrinsic dimensions without restarting a pending or failed request", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const canvas = document.createElement("div")
    document.body.append(canvas)
    const root = createRoot(canvas)
    const ref = createRef<HTMLImageElement>()
    const render = (width: number | string, height?: number | string) =>
      act(() =>
        root.render(
          <ImageWithFallback
            alt="Ceramic bowl"
            as={EventOnlyImageAdapter}
            height={height}
            ref={ref}
            size="custom"
            src="product.png"
            width={width}
          />
        )
      )
    const reservation = () =>
      canvas.querySelector("svg[data-image-reservation]")
    try {
      await render(960, 640)
      const image = ref.current
      const frame = canvas.querySelector<HTMLElement>("[data-image-state]")
      if (!(image && frame)) {
        throw new Error("Missing mounted image or reservation frame")
      }
      expect(frame.dataset.imageState).toBe("loading")
      expect(reservation()?.getAttribute("width")).toBe("960")
      expect(reservation()?.getAttribute("height")).toBe("640")

      await render("320", "640")
      expect(ref.current).toBe(image)
      expect(frame.dataset.imageState).toBe("loading")
      expect(image.width).toBe(320)
      expect(image.height).toBe(640)
      expect(reservation()?.getAttribute("width")).toBe("320")
      expect(reservation()?.getAttribute("height")).toBe("640")

      await act(() => image.dispatchEvent(new Event("error")))
      const fallback = canvas.querySelector("[data-image-fallback]")
      expect(fallback).not.toBeNull()
      await render(240)
      expect(ref.current).toBe(image)
      expect(frame.dataset.imageState).toBe("error")
      expect(reservation()).toBeNull()
      expect(canvas.querySelector("[data-image-fallback]")).toBe(fallback)

      await render(240, 160)
      expect(reservation()?.getAttribute("width")).toBe("240")
      expect(reservation()?.getAttribute("height")).toBe("160")
      expect(reservation()?.getAttribute("aria-hidden")).toBe("true")
      expect(reservation()?.getAttribute("focusable")).toBe("false")
      expect(frame.dataset.imageState).toBe("error")
      await act(() => image.dispatchEvent(new Event("load")))
      expect(frame.dataset.imageState).toBe("loaded")
      expect(canvas.querySelector("[data-image-fallback]")).toBeNull()
      expect(reservation()?.getAttribute("width")).toBe("240")
      expect(reservation()?.getAttribute("height")).toBe("160")
      expect(ref.current).toBe(image)
      // Intrinsic attributes are a DOM contract, not a happy-dom layout measurement.
    } finally {
      await act(() => root.unmount())
    }
  })

  it("starts fresh on a srcSet-only change and ignores events from the retired image", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const canvas = document.createElement("div")
    document.body.append(canvas)
    const root = createRoot(canvas)
    const ref = createRef<HTMLImageElement>()
    const onLoad = vi.fn()
    const onError = vi.fn()
    const render = (srcSet: string) =>
      act(() =>
        root.render(
          <ImageWithFallback
            alt="Ceramic bowl"
            as={EventOnlyImageAdapter}
            height={240}
            onError={onError}
            onLoad={onLoad}
            ref={ref}
            src="product.png"
            srcSet={srcSet}
            width={320}
          />
        )
      )
    try {
      await render("product-small.png 1x")
      const retiredImage = ref.current
      if (!retiredImage) {
        throw new Error("Missing initial image before the srcSet change")
      }
      await act(() => retiredImage.dispatchEvent(new Event("error")))
      expect(canvas.querySelector("[data-image-fallback]")).not.toBeNull()
      expect(onError).toHaveBeenCalledTimes(1)

      await render("product-large.png 2x")
      const image = ref.current
      if (!image) {
        throw new Error("Missing replacement image after the srcSet change")
      }
      expect(image.dataset.requestSrc).toBe("product.png")
      expect(image.dataset.requestSrcset).toBe("product-large.png 2x")
      expect(
        canvas.querySelector<HTMLElement>("[data-image-state]")?.dataset
          .imageState
      ).toBe("loading")
      expect(canvas.querySelector("[data-image-fallback]")).toBeNull()
      expect(image.alt).toBe("Ceramic bowl")
      expect(image.getAttribute("aria-hidden")).not.toBe("true")

      await act(() => {
        retiredImage.dispatchEvent(new Event("load"))
        retiredImage.dispatchEvent(new Event("error"))
      })
      expect(onLoad).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledTimes(1)
      expect(
        canvas.querySelector<HTMLElement>("[data-image-state]")?.dataset
          .imageState
      ).toBe("loading")
      expect(canvas.querySelector("[data-image-fallback]")).toBeNull()

      await act(() => image.dispatchEvent(new Event("load")))
      expect(
        canvas.querySelector<HTMLElement>("[data-image-state]")?.dataset
          .imageState
      ).toBe("loaded")
      expect(onLoad).toHaveBeenCalledTimes(1)
      expect(onLoad.mock.calls[0]?.[0].target).toBe(image)
    } finally {
      await act(() => root.unmount())
    }
  })
})

describe("Image fallback accessibility updates", () => {
  it.each([false, "false", true, "true"] as const)(
    "honors aria-hidden=%s when failed RTL media changes from informative to decorative and back",
    async (hidden) => {
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
      const canvas = document.createElement("div")
      canvas.dir = "rtl"
      document.body.append(canvas)
      const root = createRoot(canvas)
      const ref = createRef<HTMLImageElement>()
      const hiddenAttribute = String(hidden)
      const label = "وعاء خزفي — الصورة غير متاحة"
      const render = (alt: string, fallbackLabel: string) =>
        act(() =>
          root.render(
            <ImageWithFallback
              alt={alt}
              aria-hidden={hidden}
              as={EventOnlyImageAdapter}
              fallbackLabel={fallbackLabel}
              height={160}
              ref={ref}
              src="product.png"
              width={240}
            />
          )
        )
      try {
        await render("Ceramic bowl", "Photo unavailable")
        const image = ref.current
        if (!image) {
          throw new Error("Missing image before the accessibility transitions")
        }
        await act(() => image.dispatchEvent(new Event("error")))
        const fallback = canvas.querySelector("[data-image-fallback]")
        if (!fallback) {
          throw new Error("Missing fallback after the image error event")
        }
        expect(fallback.getAttribute("role")).toBe("img")
        expect(fallback.getAttribute("aria-hidden") === "true").toBe(
          hiddenAttribute === "true"
        )

        await render("", label)
        expect(ref.current).toBe(image)
        expect(canvas.querySelector("[data-image-fallback]")).toBe(fallback)
        expect(fallback.getAttribute("aria-hidden")).toBe("true")
        expect(fallback.hasAttribute("aria-label")).toBe(false)
        expect(image.alt).toBe("")
        expect(image.getAttribute("aria-hidden")).toBe("true")

        await render("وعاء خزفي", label)
        expect(fallback.getAttribute("aria-label")).toBe(label)
        expect(fallback.getAttribute("aria-hidden") === "true").toBe(
          hiddenAttribute === "true"
        )
        expect(image.alt).toBe("")
        expect(image.getAttribute("aria-hidden")).toBe("true")
        expect(fallback.textContent?.trim()).toBe("")

        await act(() => image.dispatchEvent(new Event("load")))
        expect(canvas.querySelector("[data-image-fallback]")).toBeNull()
        expect(image.alt).toBe("وعاء خزفي")
        expect(image.getAttribute("aria-hidden")).toBe(hiddenAttribute)
        expect(ref.current).toBe(image)
      } finally {
        await act(() => root.unmount())
      }
    }
  )
})

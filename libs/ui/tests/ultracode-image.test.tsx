// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { act, type ComponentPropsWithRef, createRef } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ImageWithFallback } from "../src/atoms/image"
import { FailedAndRecovery } from "../stories/atoms/image.stories"

const FALLBACK_ICON_TOKEN =
  /--text-image-fallback-icon:\s*var\(--text-icon-2xl\);/

// Keep loading deterministic without happy-dom decoding a data URL eagerly.
function EventOnlyImageAdapter({
  src,
  alt,
  width,
  height,
  ...props
}: ComponentPropsWithRef<"img">) {
  return (
    // biome-ignore lint/performance/noImgElement: This adapter tests the library's native image contract without requesting or decoding a resource.
    <img
      {...props}
      alt={alt}
      data-request-src={src}
      height={height}
      width={width}
    />
  )
}

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe("Image fallback presentation", () => {
  it("uses a larger component-local glyph token without changing shared icon sizes", () => {
    const tokens = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../src/tokens/components/atoms/_image.css"
      ),
      "utf8"
    )
    expect(tokens).toMatch(FALLBACK_ICON_TOKEN)
    const canvas = document.createElement("div")
    canvas.innerHTML = renderToStaticMarkup(
      <ImageWithFallback alt="Product photo" size="md" src="" />
    )
    const fallback = canvas.querySelector("[data-image-fallback]")
    const icon = fallback?.querySelector(".token-icon-image-unavailable")
    expect(icon?.classList.contains("text-image-fallback-icon")).toBe(true)
    expect(icon?.getAttribute("aria-hidden")).toBe("true")
    expect(fallback?.getAttribute("aria-label")).toBe("Product photo")
  })

  it("gives native, adapter and decorative recovery tiles the same rounded frame", () => {
    if (!FailedAndRecovery.render) {
      throw new Error("The image recovery story must retain its composition")
    }
    const canvas = document.createElement("div")
    canvas.innerHTML = renderToStaticMarkup(
      FailedAndRecovery.render({} as never, {} as never)
    )
    const boxes = Array.from(
      canvas.querySelectorAll<HTMLElement>("[data-image-state]")
    )
    expect(boxes).toHaveLength(3)
    for (const box of boxes) {
      expect(box.classList.contains("rounded-lg")).toBe(true)
      expect(box.classList.contains("overflow-hidden")).toBe(true)
      expect(box.classList.contains("size-image-md")).toBe(true)
      expect(box.querySelector("img")?.classList.contains("rounded-lg")).toBe(
        true
      )
      expect(box.querySelector("[data-image-reservation]")).not.toBeNull()
    }
    expect(
      boxes[2]
        ?.querySelector("[data-image-fallback]")
        ?.getAttribute("aria-hidden")
    ).toBe("true")
    expect(canvas.querySelector("button")?.textContent).toBe(
      "Load working photo"
    )
  })

  it("preserves the frame, full accessible label, adapter ref and overrides through loading and recovery", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
    const canvas = document.createElement("div")
    document.body.append(canvas)
    const root = createRoot(canvas)
    const ref = createRef<HTMLImageElement>()
    const onError = vi.fn()
    const onLoad = vi.fn()
    const fallbackLabel = "Mountain landscape from adapter — photo unavailable"
    try {
      await act(() =>
        root.render(
          <ImageWithFallback
            alt="Mountain landscape from adapter"
            as={EventOnlyImageAdapter}
            className="aspect-video rounded-lg object-contain"
            dir="rtl"
            fallbackLabel={fallbackLabel}
            height={640}
            onError={onError}
            onLoad={onLoad}
            ref={ref}
            size="custom"
            src="pending-photo.png"
            width={960}
          />
        )
      )
      const image = ref.current
      const box = canvas.querySelector<HTMLElement>("[data-image-state]")
      if (!(image && box)) {
        throw new Error("Missing mounted image or recovery frame")
      }
      const reservation = box.querySelector("[data-image-reservation]")
      const frameClasses = box.className
      const ratio = box.style.getPropertyValue("--image-aspect-ratio")
      expect(box.dataset.imageState).toBe("loading")
      expect(image.classList.contains("opacity-0")).toBe(true)
      expect(canvas.querySelector("[data-image-fallback]")).toBeNull()

      await act(() => image.dispatchEvent(new Event("error")))
      expect(box.dataset.imageState).toBe("error")
      const fallback = canvas.querySelector("[data-image-fallback]")
      if (!fallback) {
        throw new Error("Missing fallback after the image error event")
      }
      expect(fallback.getAttribute("aria-label")).toBe(fallbackLabel)
      expect(fallback.getAttribute("role")).toBe("img")
      expect(image.getAttribute("aria-hidden")).toBe("true")
      expect(image.alt).toBe("")
      expect(image.classList.contains("opacity-0")).toBe(true)
      expect(onError).toHaveBeenCalledTimes(1)

      await act(() => image.dispatchEvent(new Event("load")))
      expect(box.dataset.imageState).toBe("loaded")
      expect(canvas.querySelector("[data-image-fallback]")).toBeNull()
      expect(image.classList.contains("opacity-0")).toBe(false)
      expect(image.alt).toBe("Mountain landscape from adapter")
      expect(image.hasAttribute("aria-hidden")).toBe(false)
      expect(image.dir).toBe("rtl")
      expect(image.classList.contains("object-contain")).toBe(true)
      expect(box.classList.contains("aspect-video")).toBe(true)
      expect(box.classList.contains("rounded-lg")).toBe(true)
      expect(box.className).toBe(frameClasses)
      expect(box.style.getPropertyValue("--image-aspect-ratio")).toBe(ratio)
      expect(box.querySelector("[data-image-reservation]")).toBe(reservation)
      expect(ref.current).toBe(image)
      expect(onLoad).toHaveBeenCalledTimes(1)
    } finally {
      await act(() => root.unmount())
    }
  })
})

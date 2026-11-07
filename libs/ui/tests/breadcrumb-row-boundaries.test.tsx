// @vitest-environment happy-dom
import { act, createRef, type ReactNode, type Ref } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Breadcrumb } from "../src/molecules/breadcrumb"

let root: Root | undefined
let rowOffset = 0
let resized: (() => void) | undefined
let frameId = 0
const frames = new Map<number, FrameRequestCallback>()

function flushFrames() {
  const pending = [...frames.values()]
  frames.clear()
  act(() => {
    for (const callback of pending) {
      callback(0)
    }
  })
}

function resizeAndFlush() {
  resized?.()
  flushFrames()
}

const disconnected = vi.fn()
const observed = vi.fn()
const measuredGap = "--_breadcrumb-measured-gap"
const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts")

function mockSeparatorLayout() {
  const original = getComputedStyle
  vi.stubGlobal("getComputedStyle", (element: HTMLElement) => {
    if (!element.matches(".breadcrumb-segment > ol > li:first-child")) {
      return original(element)
    }
    const style = document.createElement("div").style
    const custom = element.querySelector<HTMLElement>(
      "[data-testid='custom-marker']"
    )
    const iconWidth = element.querySelector(".text-icon-2xl") ? 32 : 16
    const contentWidth = custom
      ? Number.parseFloat(custom.style.width)
      : iconWidth
    style.width = `${contentWidth + 16}px`
    style.boxSizing = "border-box"
    return style
  })
}

async function mount(
  callerRef?: Ref<HTMLOListElement>,
  separator: ReactNode = <Breadcrumb.Separator />
) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frameId += 1
    const id = frameId
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id))
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resized = callback
      }
      observe = observed
      disconnect = disconnected
    }
  )
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const top =
        this.classList.contains("breadcrumb-segment") &&
        this.textContent?.includes("Current")
          ? rowOffset
          : 0
      return new DOMRect(0, top, 90, 20)
    }
  )
  const canvas = document.createElement("div")
  document.body.append(canvas)
  root = createRoot(canvas)
  const ref = createRef<HTMLOListElement>()
  await act(() =>
    root?.render(
      <Breadcrumb>
        <Breadcrumb.List ref={callerRef ?? ref}>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
          </Breadcrumb.Item>
          {separator}
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/products">Products</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.CurrentLink>Current</Breadcrumb.CurrentLink>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb>
    )
  )
  return { canvas, ref }
}

afterEach(async () => {
  await act(() => root?.unmount())
  root = undefined
  document.body.replaceChildren()
  rowOffset = 0
  resized = undefined
  frames.clear()
  frameId = 0
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  if (originalFonts) {
    Object.defineProperty(document, "fonts", originalFonts)
  } else {
    Reflect.deleteProperty(document, "fonts")
  }
  disconnected.mockClear()
  observed.mockClear()
})

describe("Breadcrumb decorative row boundaries", () => {
  it("reserves the large icon's layout footprint rather than transformed client pixels", async () => {
    mockSeparatorLayout()
    const { canvas } = await mount(
      undefined,
      <Breadcrumb.Separator iconSize="2xl" />
    )
    const list = canvas.querySelector<HTMLOListElement>("nav > ol")
    // Mock client bounds are 90px, but the intrinsic host is 32px + two 8px gaps.
    expect(list?.style.getPropertyValue(measuredGap)).toBe("48px")
    expect(canvas.querySelector(".text-icon-2xl")).not.toBeNull()
    for (const separator of canvas.querySelectorAll(
      ".breadcrumb-segment > ol > li:first-child"
    )) {
      expect(observed).toHaveBeenCalledWith(separator, { box: "border-box" })
    }
    if (!list) {
      throw new Error("Missing Breadcrumb list")
    }
    const write = vi.spyOn(list.style, "setProperty")
    resizeAndFlush()
    resizeAndFlush()
    expect(write).not.toHaveBeenCalled()
  })

  it("coalesces observer delivery into a frame and cancels pending writes on cleanup", async () => {
    mockSeparatorLayout()
    const { canvas } = await mount(
      undefined,
      <Breadcrumb.Separator>
        <span data-testid="custom-marker" style={{ width: 96 }}>
          Divider
        </span>
      </Breadcrumb.Separator>
    )
    const list = canvas.querySelector<HTMLOListElement>("nav > ol")
    const marker = canvas.querySelector<HTMLElement>(
      "[data-testid='custom-marker']"
    )
    if (!(list && marker)) {
      throw new Error("Missing Breadcrumb list or custom divider")
    }
    const write = vi.spyOn(list.style, "setProperty")
    marker.style.width = "144px"
    resized?.()
    resized?.()
    expect(frames.size).toBe(1)
    expect(write).not.toHaveBeenCalled()
    expect(list.style.getPropertyValue(measuredGap)).toBe("112px")
    flushFrames()
    expect(write).toHaveBeenCalledOnce()
    expect(list.style.getPropertyValue(measuredGap)).toBe("160px")
    marker.style.width = "4px"
    resized?.()
    const queued = [...frames.values()][0]
    await act(() => root?.unmount())
    root = undefined
    expect(frames.size).toBe(0)
    expect(list.style.getPropertyValue(measuredGap)).toBe("")
    queued?.(0)
    expect(list.style.getPropertyValue(measuredGap)).toBe("")
  })

  it("remeasures wide custom content while hidden and shrinks back without a ghost gap", async () => {
    mockSeparatorLayout()
    rowOffset = 32
    const { canvas } = await mount(
      undefined,
      <Breadcrumb.Separator>
        <span data-testid="custom-marker" style={{ width: 96 }}>
          Section divider
        </span>
      </Breadcrumb.Separator>
    )
    const list = canvas.querySelector<HTMLOListElement>("nav > ol")
    const marker = canvas.querySelector<HTMLElement>(
      "[data-testid='custom-marker']"
    )
    expect(list?.style.getPropertyValue(measuredGap)).toBe("112px")
    marker?.closest(".breadcrumb-segment")?.setAttribute("data-wrap-start", "")
    if (marker) {
      marker.style.width = "144.25px"
    }
    resizeAndFlush()
    expect(list?.style.getPropertyValue(measuredGap)).toBe("160.25px")
    if (marker) {
      marker.style.width = "4px"
    }
    resizeAndFlush()
    expect(list?.style.getPropertyValue(measuredGap)).toBe("32px")
    expect(canvas.querySelector("[data-wrap-start]")?.textContent).toBe(
      "Current"
    )
    const lateResize = resized
    await act(() => root?.unmount())
    root = undefined
    expect(list?.style.getPropertyValue(measuredGap)).toBe("")
    expect(list?.querySelector("[data-wrap-start]")).toBeNull()
    lateResize?.()
    expect(list?.style.getPropertyValue(measuredGap)).toBe("")
    expect(disconnected).toHaveBeenCalledOnce()
  })

  it.each([false, true])(
    "guards font-ready measurements after unmount=%s",
    async (unmounted) => {
      mockSeparatorLayout()
      const ready = Promise.withResolvers<FontFaceSet>()
      const fonts = { ready: ready.promise } as FontFaceSet
      Object.defineProperty(document, "fonts", {
        configurable: true,
        value: fonts,
      })
      const { canvas } = await mount(
        undefined,
        <Breadcrumb.Separator>
          <span data-testid="custom-marker" style={{ width: 96 }}>
            Section divider
          </span>
        </Breadcrumb.Separator>
      )
      const list = canvas.querySelector<HTMLOListElement>("nav > ol")
      const marker = canvas.querySelector<HTMLElement>(
        "[data-testid='custom-marker']"
      )
      if (marker) {
        marker.style.width = "128px"
      }
      if (unmounted) {
        await act(() => root?.unmount())
        root = undefined
      }
      await act(async () => {
        ready.resolve(fonts)
        await ready.promise
      })
      expect(list?.style.getPropertyValue(measuredGap)).toBe(
        unmounted ? "" : "144px"
      )
    }
  )

  it("replaces observed separators after rerender without retaining their measurements", async () => {
    mockSeparatorLayout()
    const { canvas } = await mount(
      undefined,
      <Breadcrumb.Separator>
        <span data-testid="custom-marker" style={{ width: 96 }}>
          Section divider
        </span>
      </Breadcrumb.Separator>
    )
    const list = canvas.querySelector<HTMLOListElement>("nav > ol")
    expect(list?.style.getPropertyValue(measuredGap)).toBe("112px")
    const oldResize = resized
    await act(() =>
      root?.render(
        <Breadcrumb>
          <Breadcrumb.List>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Separator iconSize="2xl" />
            <Breadcrumb.Item>Current</Breadcrumb.Item>
          </Breadcrumb.List>
        </Breadcrumb>
      )
    )
    expect(canvas.querySelector("nav > ol")).toBe(list)
    expect(list?.style.getPropertyValue(measuredGap)).toBe("48px")
    expect(disconnected).toHaveBeenCalledOnce()
    oldResize?.()
    expect(list?.style.getPropertyValue(measuredGap)).toBe("48px")
  })

  it.each([0, 1, 1.25, 32])(
    "marks only a new row beyond the one-pixel budget: %s",
    async (offset) => {
      rowOffset = offset
      const { canvas } = await mount()
      const segments = canvas.querySelectorAll(".breadcrumb-segment")
      expect(segments).toHaveLength(2)
      expect(segments[0]?.hasAttribute("data-wrap-start")).toBe(false)
      expect(segments[1]?.hasAttribute("data-wrap-start")).toBe(offset > 1)
      expect(canvas.querySelectorAll("a[href]")).toHaveLength(2)
      expect(canvas.querySelector('[aria-current="page"]')?.textContent).toBe(
        "Current"
      )
    }
  )

  it("updates decoration after resize and disconnects without changing the caller ref", async () => {
    const { canvas, ref } = await mount()
    expect(ref.current).toBe(canvas.querySelector("nav > ol"))
    expect(resized).toBeTypeOf("function")
    rowOffset = 32
    resizeAndFlush()
    expect(canvas.querySelector("[data-wrap-start]")?.textContent).toBe(
      "Current"
    )
    rowOffset = 0
    resizeAndFlush()
    expect(canvas.querySelector("[data-wrap-start]")).toBeNull()
    await act(() => root?.unmount())
    root = undefined
    expect(disconnected).toHaveBeenCalledOnce()
    expect(ref.current).toBeNull()
  })

  it("preserves the custom separator host, content, props, events and ref", async () => {
    const ref = createRef<HTMLLIElement>()
    const clicked = vi.fn()
    const { canvas } = await mount(
      undefined,
      <Breadcrumb.Separator
        className="custom-separator"
        data-testid="custom-separator"
        onClick={clicked}
        ref={ref}
        title="Section divider"
      >
        <span data-testid="custom-marker">/</span>
      </Breadcrumb.Separator>
    )
    const separator = canvas.querySelector('[data-testid="custom-separator"]')
    expect(ref.current).toBe(separator)
    expect(separator?.tagName).toBe("LI")
    expect(separator?.classList.contains("custom-separator")).toBe(true)
    expect(separator?.getAttribute("title")).toBe("Section divider")
    expect(separator?.getAttribute("aria-hidden")).toBe("true")
    expect(
      separator?.querySelector('[data-testid="custom-marker"]')?.textContent
    ).toBe("/")
    expect(
      separator?.parentElement?.parentElement?.classList.contains(
        "breadcrumb-segment"
      )
    ).toBe(true)
    await act(() => ref.current?.click())
    expect(clicked).toHaveBeenCalledOnce()
    await act(() => root?.unmount())
    root = undefined
    expect(ref.current).toBeNull()
  })

  it("detaches a callback List ref without a cleanup return", async () => {
    const caller = vi.fn<(node: HTMLOListElement | null) => void>()
    const { canvas } = await mount(caller)
    expect(caller).toHaveBeenCalledWith(canvas.querySelector("nav > ol"))
    await act(() => root?.unmount())
    root = undefined
    expect(caller).toHaveBeenLastCalledWith(null)
    expect(caller).toHaveBeenCalledTimes(2)
  })

  it("preserves React 19 callback-ref cleanup without an extra null callback", async () => {
    let current: HTMLOListElement | null = null
    const cleaned = vi.fn()
    const caller = vi.fn((node: HTMLOListElement | null) => {
      current = node
      return () => {
        current = null
        cleaned()
      }
    })
    const { canvas } = await mount(caller)
    expect(current).toBe(canvas.querySelector("nav > ol"))
    await act(() => root?.unmount())
    root = undefined
    expect(current).toBeNull()
    expect(cleaned).toHaveBeenCalledOnce()
    expect(caller).toHaveBeenCalledOnce()
  })
})

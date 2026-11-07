// @vitest-environment happy-dom
import { act, createRef, type Ref } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Tabs } from "../src/molecules/tabs"

let root: Root | undefined
let range = 253
let position = 0
let nextFrame = 0
const frames = new Map<number, FrameRequestCallback>()
const resizes: TestResizeObserver[] = []

class TestResizeObserver {
  readonly targets = new Set<Element>()
  readonly notify: () => void
  readonly disconnect = vi.fn(() => this.targets.clear())

  constructor(notify: () => void) {
    this.notify = notify
    resizes.push(this)
  }

  observe(target: Element) {
    this.targets.add(target)
  }
}

function flushFrames() {
  const pending = [...frames.values()]
  frames.clear()
  act(() => {
    for (const callback of pending) {
      callback(0)
    }
  })
}

function overflowEdges(list: HTMLElement) {
  return [list.dataset.overflowLeft, list.dataset.overflowRight]
}

async function mount({
  direction = "ltr",
  ref,
  onScroll,
}: {
  direction?: "ltr" | "rtl"
  ref?: Ref<HTMLDivElement>
  onScroll?: () => void
} = {}) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  root = createRoot(canvas)
  await act(() =>
    root?.render(
      <Tabs defaultValue="overview" dir="ltr">
        <Tabs.List
          className="caller-list"
          onScroll={onScroll}
          ref={ref}
          style={{ direction, backgroundColor: "rebeccapurple" }}
        >
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
        </Tabs.List>
      </Tabs>
    )
  )
  const list = canvas.querySelector<HTMLDivElement>('[role="tablist"]')
  if (!list) {
    throw new Error("Missing tablist")
  }
  return { canvas, list }
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.stubGlobal("ResizeObserver", TestResizeObserver)
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    nextFrame += 1
    frames.set(nextFrame, callback)
    return nextFrame
  })
  vi.stubGlobal("cancelAnimationFrame", (frame: number) => frames.delete(frame))
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200)
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(
    () => 200 + range
  )
  vi.spyOn(HTMLElement.prototype, "scrollLeft", "get").mockImplementation(
    () => position
  )
  vi.spyOn(HTMLElement.prototype, "scrollLeft", "set").mockImplementation(
    (value) => {
      position = value
    }
  )
})

afterEach(async () => {
  await act(() => root?.unmount())
  root = undefined
  document.body.replaceChildren()
  range = 253
  position = 0
  nextFrame = 0
  frames.clear()
  resizes.length = 0
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// These exercise edge measurement/lifecycle, not native background painting.
describe("Tabs physical overflow edges", () => {
  it.each([
    ["ltr", 0, false, true],
    ["ltr", 126, true, true],
    ["ltr", 252, true, false],
    ["rtl", 0, true, false],
    ["rtl", -126, true, true],
    ["rtl", -252, false, true],
    ["rtl", 10, true, false],
    ["rtl", -270, false, true],
  ] as const)(
    "%s at native scrollLeft %s paints left=%s/right=%s without an indicator",
    async (direction, scrollLeft, left, right) => {
      position = scrollLeft
      const { list } = await mount({ direction })
      expect(overflowEdges(list)).toEqual([String(left), String(right)])
      expect(list.querySelector('[data-part="indicator"]')).toBeNull()
      expect(list.style.backgroundColor).toBe("rebeccapurple")
      expect(list.classList.contains("caller-list")).toBe(true)
    }
  )

  it.each([0, 1, 1.25])(
    "uses a one-CSS-pixel overflow budget, including under scaled ancestors: %s",
    async (overflow) => {
      range = overflow
      const { canvas, list } = await mount()
      canvas.style.transform = "scale(0.5)"
      expect(overflowEdges(list)).toEqual(["false", String(overflow > 1)])
    }
  )

  it("updates on native scrolling without replacing caller handlers or styles", async () => {
    const onScroll = vi.fn()
    const { list } = await mount({ direction: "rtl", onScroll })
    position = -126
    await act(() => list.dispatchEvent(new Event("scroll")))
    flushFrames()
    expect(overflowEdges(list)).toEqual(["true", "true"])
    position = -252
    await act(() => list.dispatchEvent(new Event("scroll")))
    flushFrames()
    expect(overflowEdges(list)).toEqual(["false", "true"])
    expect(onScroll).toHaveBeenCalledTimes(2)
    expect(list.style.direction).toBe("rtl")
    expect(list.style.backgroundColor).toBe("rebeccapurple")
  })

  it("updates on child resizing, content edits, child replacement and viewport resize", async () => {
    const { list } = await mount()
    const resize = resizes.find((observer) => observer.targets.has(list))
    expect(resize).toBeDefined()
    expect(resize?.targets.has(list.firstElementChild as Element)).toBe(true)
    range = 0
    resize?.notify()
    flushFrames()
    expect(overflowEdges(list)).toEqual(["false", "false"])

    range = 253
    const text = list.querySelector("button")?.firstChild
    if (!text) {
      throw new Error("Missing trigger label")
    }
    text.textContent = "A longer overview label"
    await vi.waitFor(() => {
      flushFrames()
      expect(overflowEdges(list)).toEqual(["false", "true"])
    })

    range = 0
    const extra = document.createElement("span")
    list.append(extra)
    await vi.waitFor(() => {
      flushFrames()
      expect(overflowEdges(list)).toEqual(["false", "false"])
      expect(resize?.targets.has(extra)).toBe(true)
    })

    range = 253
    window.dispatchEvent(new Event("resize"))
    flushFrames()
    expect(overflowEdges(list)).toEqual(["false", "true"])
  })

  it("refreshes computed CSS direction and orientation, including ancestor class changes", async () => {
    const { canvas, list } = await mount()
    const style = document.createElement("style")
    style.textContent =
      ".rtl-tabs [role=tablist] { direction: rtl !important; }"
    canvas.append(style)
    canvas.className = "rtl-tabs"
    await vi.waitFor(() => {
      flushFrames()
      expect(overflowEdges(list)).toEqual(["true", "false"])
    })
    list.dataset.orientation = "vertical"
    await vi.waitFor(() => {
      flushFrames()
      expect(overflowEdges(list)).toEqual(["false", "false"])
    })
    list.dataset.orientation = "horizontal"
    canvas.className = ""
    await vi.waitFor(() => {
      flushFrames()
      expect(overflowEdges(list)).toEqual(["false", "true"])
    })
  })

  it("ignores private edge attributes and indicator geometry writes", async () => {
    const { list } = await mount()
    const indicator = document.createElement("div")
    indicator.dataset.scope = "tabs"
    indicator.dataset.part = "indicator"
    list.append(indicator)
    await vi.waitFor(() => {
      flushFrames()
      expect(resizes.some((observer) => observer.targets.has(indicator))).toBe(
        false
      )
    })
    // Let the child-list notification settle before isolating geometry writes.
    await new Promise((resolve) => setTimeout(resolve, 0))
    flushFrames()
    range = 0
    indicator.style.setProperty("--tabs-indicator-width", "100px")
    list.setAttribute("data-overflow-left", "false")
    await new Promise((resolve) => setTimeout(resolve, 0))
    flushFrames()
    expect(overflowEdges(list)).toEqual(["false", "true"])
  })

  it("cleans observers, queued measurement and listeners while detaching an object ref", async () => {
    const ref = createRef<HTMLDivElement>()
    const { list } = await mount({ ref })
    expect(ref.current).toBe(list)
    const resize = resizes.find((observer) => observer.targets.has(list))
    const disconnected = vi.spyOn(MutationObserver.prototype, "disconnect")
    const removeList = vi.spyOn(list, "removeEventListener")
    const removeWindow = vi.spyOn(window, "removeEventListener")
    const cancelFrame = vi.spyOn(globalThis, "cancelAnimationFrame")
    resize?.notify()
    const measurement = nextFrame
    await act(() => root?.unmount())
    root = undefined
    expect(ref.current).toBeNull()
    expect(resize?.targets.size).toBe(0)
    expect(disconnected).toHaveBeenCalled()
    expect(removeList).toHaveBeenCalledWith("scroll", expect.any(Function))
    expect(removeWindow).toHaveBeenCalledWith("resize", expect.any(Function))
    expect(cancelFrame).toHaveBeenCalledWith(measurement)
    expect(frames.has(measurement)).toBe(false)
  })

  it("detaches callback refs that do not return a cleanup", async () => {
    const ref = vi.fn<(node: HTMLDivElement | null) => void>()
    const { list } = await mount({ ref })
    expect(ref).toHaveBeenLastCalledWith(list)
    await act(() => root?.unmount())
    root = undefined
    expect(ref).toHaveBeenLastCalledWith(null)
  })

  it("preserves React 19 callback-ref cleanup without an extra null callback", async () => {
    const cleanup = vi.fn()
    const ref = vi.fn((_node: HTMLDivElement | null) => cleanup)
    const { list } = await mount({ ref })
    expect(ref).toHaveBeenLastCalledWith(list)
    const attached = ref.mock.calls.length
    const cleaned = cleanup.mock.calls.length
    await act(() => root?.unmount())
    root = undefined
    expect(ref).toHaveBeenCalledTimes(attached)
    expect(cleanup).toHaveBeenCalledTimes(cleaned + 1)
  })
})

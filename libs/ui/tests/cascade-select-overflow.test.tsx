// @vitest-environment happy-dom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CascadeSelect } from "../src/molecules/cascade-select"

const items = [
  {
    label: "InternationalKitchenAndGardenEquipment",
    value: "home",
    children: [
      {
        label: "Outdoor furniture and accessories",
        value: "outdoor",
        children: [{ label: "Weather-resistant dining sets", value: "dining" }],
      },
    ],
  },
]

let root: Root | undefined
let frames: Map<number, FrameRequestCallback>
let frameId: number
let offset: number
let viewportWidth: number
let direction: "ltr" | "rtl"

function bounds(left: number, width: number): DOMRect {
  return new DOMRect(left, 0, width, 140)
}

async function flushFrames() {
  await act(() => {
    // Reveal deliberately waits for two placement frames.
    for (let count = 0; frames.size && count < 8; count++) {
      const pending = [...frames.values()]
      frames.clear()
      for (const callback of pending) {
        callback(0)
      }
    }
  })
}

async function mount(dir: "ltr" | "rtl") {
  direction = dir
  const canvas = document.createElement("div")
  document.body.append(canvas)
  root = createRoot(canvas)
  await act(() => {
    root?.render(
      <CascadeSelect
        defaultHighlightedValue={["home", "outdoor"]}
        defaultOpen
        defaultValue={[["home", "outdoor", "dining"]]}
        dir={dir}
        items={items}
      >
        <CascadeSelect.Label>Product category</CascadeSelect.Label>
        <CascadeSelect.Control>
          <CascadeSelect.Trigger>
            <CascadeSelect.ValueText />
          </CascadeSelect.Trigger>
        </CascadeSelect.Control>
        <CascadeSelect.Content>
          <CascadeSelect.Node />
        </CascadeSelect.Content>
      </CascadeSelect>
    )
  })
  await flushFrames()
  const content = canvas.querySelector<HTMLElement>('[data-part="content"]')
  if (!content) {
    throw new Error("Missing CascadeSelect content")
  }
  return content
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  frames = new Map()
  frameId = 0
  offset = 0
  viewportWidth = 376
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frameId += 1
    frames.set(frameId, callback)
    return frameId
  })
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id)
  })
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
    function (this: HTMLElement) {
      return this.dataset.part === "content" ? viewportWidth : 0
    }
  )
  vi.spyOn(HTMLElement.prototype, "clientLeft", "get").mockReturnValue(1)
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      if (this.dataset.part === "content") {
        return bounds(8, viewportWidth + 2)
      }
      if (this.dataset.part === "column") {
        const depth = Number(this.dataset.depth)
        const width = depth === 2 ? 176 : 240
        const left = 9 + depth * 240 - offset
        return bounds(
          direction === "rtl" ? 18 + viewportWidth - left - width : left,
          width
        )
      }
      return bounds(0, 0)
    }
  )
  vi.spyOn(HTMLElement.prototype, "scrollBy").mockImplementation(function (
    this: HTMLElement,
    options: ScrollToOptions | number
  ) {
    if (this.dataset.part === "content" && typeof options === "object") {
      offset += (options.left ?? 0) * (direction === "rtl" ? -1 : 1)
      this.scrollLeft = direction === "rtl" ? -offset : offset
    }
  })
})

afterEach(async () => {
  await act(() => root?.unmount())
  root = undefined
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("CascadeSelect horizontal continuation", () => {
  it.each(["ltr", "rtl"] as const)(
    "marks only the hidden logical start after revealing a narrow %s leaf",
    async (dir) => {
      const content = await mount(dir)
      expect(offset).toBe(280)
      expect(content.hasAttribute("data-overflow-start")).toBe(true)
      expect(content.hasAttribute("data-overflow-end")).toBe(false)
      expect(
        content.style.getPropertyValue("--_cascade-select-continuation-offset")
      ).toBe(dir === "rtl" ? "-280px" : "280px")
      expect(content.querySelectorAll('[data-part="column"]')).toHaveLength(3)
      expect(content.textContent).toContain(
        "InternationalKitchenAndGardenEquipment"
      )
      const leaf = content.querySelector<HTMLElement>(
        '[data-value="home,outdoor,dining"]'
      )
      expect(leaf?.getAttribute("data-state")).toBe("checked")
      expect(leaf?.querySelector('[data-part="item-indicator"]')).not.toBeNull()
    }
  )

  it.each(["ltr", "rtl"] as const)(
    "updates both %s edges during native scrolling without revealing the leaf again",
    async (dir) => {
      const content = await mount(dir)
      for (const [position, start, end] of [
        [0, false, true],
        [100, true, true],
        [280, true, false],
      ] as const) {
        offset = position
        content.scrollLeft = dir === "rtl" ? -offset : offset
        await act(() => content.dispatchEvent(new Event("scroll")))
        await flushFrames()
        expect(offset).toBe(position)
        expect(content.hasAttribute("data-overflow-start")).toBe(start)
        expect(content.hasAttribute("data-overflow-end")).toBe(end)
      }
    }
  )

  it.each(["ltr", "rtl"] as const)(
    "does not generate %s continuation paint when all columns fit, including subpixel edges",
    async (dir) => {
      viewportWidth = 656
      const content = await mount(dir)
      expect(offset).toBe(0)
      expect(content.hasAttribute("data-overflow-start")).toBe(false)
      expect(content.hasAttribute("data-overflow-end")).toBe(false)
      offset = 0.5
      content.dispatchEvent(new Event("scroll"))
      expect(content.hasAttribute("data-overflow-start")).toBe(false)
      expect(content.hasAttribute("data-overflow-end")).toBe(false)
    }
  )

  it.each(["ltr", "rtl"] as const)(
    "still reveals the keyboard's parent column and keeps its %s active descendant reachable",
    async (dir) => {
      const content = await mount(dir)
      await act(() => {
        content.focus()
        content.dispatchEvent(
          new KeyboardEvent("keydown", {
            bubbles: true,
            key: dir === "rtl" ? "ArrowRight" : "ArrowLeft",
          })
        )
      })
      await flushFrames()
      expect(offset).toBe(0)
      expect(document.activeElement).toBe(content)
      const activeId = content.getAttribute("aria-activedescendant")
      expect(activeId).toBeTruthy()
      expect(document.getElementById(activeId ?? "")?.dataset.value).toBe(
        "home"
      )
      expect(content.hasAttribute("data-overflow-start")).toBe(false)
      expect(content.hasAttribute("data-overflow-end")).toBe(true)
    }
  )

  it("remeasures column and viewport resizing and disconnects the owned observer", async () => {
    const observed = new Set<Element>()
    let resize: () => void = () => undefined
    const disconnect = vi.fn()
    vi.stubGlobal(
      "ResizeObserver",
      class {
        callback: ResizeObserverCallback
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
        }
        observe(target: Element) {
          observed.add(target)
          if (target.getAttribute("data-part") === "content") {
            resize = () => this.callback([], this as unknown as ResizeObserver)
          }
        }
        unobserve() {
          // Test boundary: no layout engine owns these observations.
        }
        disconnect = disconnect
      }
    )
    const content = await mount("ltr")
    expect(observed.has(content)).toBe(true)
    for (const column of content.querySelectorAll('[data-part="column"]')) {
      expect(observed.has(column)).toBe(true)
    }
    viewportWidth = 656
    offset = 0
    content.scrollLeft = 0
    resize()
    await flushFrames()
    expect(content.hasAttribute("data-overflow-start")).toBe(false)
    expect(content.hasAttribute("data-overflow-end")).toBe(false)
    await act(() => root?.unmount())
    root = undefined
    expect(disconnect).toHaveBeenCalled()
  })

  it("removes cue state, the scroll subscription and pending reveals when unmounted", async () => {
    const content = await mount("ltr")
    await act(() => root?.unmount())
    root = undefined
    expect(content.hasAttribute("data-overflow-start")).toBe(false)
    expect(content.hasAttribute("data-overflow-end")).toBe(false)
    expect(
      content.style.getPropertyValue("--_cascade-select-continuation-offset")
    ).toBe("")
    content.dispatchEvent(new Event("scroll"))
    await flushFrames()
    expect(content.hasAttribute("data-overflow-start")).toBe(false)
    expect(
      content.style.getPropertyValue("--_cascade-select-continuation-offset")
    ).toBe("")
  })
})

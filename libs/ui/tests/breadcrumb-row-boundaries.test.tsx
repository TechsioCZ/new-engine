// @vitest-environment happy-dom
import { act, createRef, type ReactNode, type Ref } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Breadcrumb } from "../src/molecules/breadcrumb"

let root: Root | undefined
let rowOffset = 0
let resized: (() => void) | undefined
const disconnected = vi.fn()

async function mount(
  callerRef?: Ref<HTMLOListElement>,
  separator: ReactNode = <Breadcrumb.Separator />
) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resized = callback
      }
      observe() {}
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
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  disconnected.mockClear()
})

describe("Breadcrumb decorative row boundaries", () => {
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
    resized?.()
    expect(canvas.querySelector("[data-wrap-start]")?.textContent).toBe(
      "Current"
    )
    rowOffset = 0
    resized?.()
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

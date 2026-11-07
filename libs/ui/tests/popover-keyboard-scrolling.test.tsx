// @vitest-environment happy-dom
import { act, createRef, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Popover } from "../src/molecules/popover"

const roots: Root[] = []

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
})

afterEach(async () => {
  await act(() => {
    for (const root of roots.splice(0)) {
      root.unmount()
    }
  })
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

async function mount(element: ReactNode) {
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  roots.push(root)
  await act(() => root.render(element))
  return canvas
}

function required<T>(value: T | null): T {
  if (value === null) {
    throw new Error("Missing Popover keyboard fixture element")
  }
  return value
}

async function settleFocus() {
  await act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
  )
}

describe("Popover keyboard scrolling", () => {
  it("names the scrolling region with the mounted title or caller's external label", async () => {
    const canvas = await mount(
      <>
        <h2 id="external-delivery-title">External delivery information</h2>
        <Popover defaultOpen portalled={false}>
          <Popover.Positioner>
            <Popover.Content>
              <Popover.Title>Delivery information</Popover.Title>
              <p>Read-only delivery information.</p>
            </Popover.Content>
          </Popover.Positioner>
        </Popover>
        <Popover defaultOpen portalled={false}>
          <Popover.Positioner>
            <Popover.Content aria-labelledby="external-delivery-title">
              <p>Read-only external delivery information.</p>
            </Popover.Content>
          </Popover.Positioner>
        </Popover>
      </>
    )
    const regions = canvas.querySelectorAll("section.popover-scroll-viewport")
    const title = required(canvas.querySelector('[data-part="title"]'))
    expect(regions).toHaveLength(2)
    expect(regions[0]?.getAttribute("aria-labelledby")).toBe(title.id)
    expect(regions[1]?.getAttribute("aria-labelledby")).toBe(
      "external-delivery-title"
    )
  })

  it.each([false, true])(
    "preserves the first control's initial focus with modal=%s",
    async (modal) => {
      const first = createRef<HTMLInputElement>()
      const canvas = await mount(
        <Popover modal={modal} portalled={false}>
          <Popover.Trigger>Delivery details</Popover.Trigger>
          <Popover.Positioner>
            <Popover.Content aria-label="Delivery details">
              <input aria-label="Delivery note" ref={first} />
              <Popover.CloseTrigger />
            </Popover.Content>
          </Popover.Positioner>
        </Popover>
      )
      await act(() => required(canvas.querySelector("button")).click())
      await settleFocus()
      expect(document.activeElement).toBe(first.current)
    }
  )

  it.each(["explicit", "autofocus", "disabled", "opt-out"] as const)(
    "preserves %s initial-focus policy rather than focusing the scroller",
    async (policy) => {
      const target = createRef<HTMLInputElement>()
      let initialFocusEl: (() => HTMLInputElement | null | false) | undefined
      if (policy === "explicit") {
        initialFocusEl = () => target.current
      } else if (policy === "opt-out") {
        initialFocusEl = () => false
      }
      const canvas = await mount(
        <Popover
          autoFocus={policy !== "disabled"}
          initialFocusEl={initialFocusEl}
          portalled={false}
        >
          <Popover.Trigger>Delivery details</Popover.Trigger>
          <Popover.Positioner>
            <Popover.Content aria-label="Delivery details">
              <input aria-label="First delivery note" />
              <input
                aria-label="Preferred delivery note"
                data-autofocus={policy === "autofocus" ? "" : undefined}
                ref={target}
              />
            </Popover.Content>
          </Popover.Positioner>
        </Popover>
      )
      const trigger = required(canvas.querySelector("button"))
      await act(() => {
        trigger.focus()
        trigger.click()
      })
      await settleFocus()
      expect(document.activeElement).toBe(
        policy === "disabled" || policy === "opt-out" ? trigger : target.current
      )
    }
  )

  it("makes the task scroller independently focusable without moving pinned close chrome or caller props", async () => {
    const contentRef = createRef<HTMLDivElement>()
    const onKeyDown = vi.fn()
    const canvas = await mount(
      <Popover defaultOpen portalled={false}>
        <Popover.Trigger>Delivery details</Popover.Trigger>
        <Popover.Positioner>
          <Popover.Content
            aria-label="Delivery details"
            data-caller="surface"
            onKeyDown={onKeyDown}
            ref={contentRef}
            tabIndex={-1}
          >
            <Popover.Title>Delivery details</Popover.Title>
            <p>Long read-only delivery information.</p>
            <Popover.CloseTrigger aria-label="Close delivery details" />
          </Popover.Content>
        </Popover.Positioner>
      </Popover>
    )
    const content = required(canvas.querySelector('[role="dialog"]'))
    const viewport = required(
      content.querySelector<HTMLDivElement>(".popover-scroll-viewport")
    )
    expect(viewport.tabIndex).toBe(0)
    expect(viewport.tagName).toBe("SECTION")
    expect(viewport.getAttribute("aria-label")).toBe("Delivery details")
    await act(() => viewport.focus())
    expect(document.activeElement).toBe(viewport)
    const arrow = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    })
    await act(() => {
      viewport.dispatchEvent(arrow)
    })
    expect(arrow.defaultPrevented).toBe(false)
    expect(onKeyDown).toHaveBeenCalledOnce()
    expect(contentRef.current).toBe(content)
    expect(content.getAttribute("tabindex")).toBe("-1")
    expect(content.getAttribute("data-caller")).toBe("surface")
    expect(content.getAttribute("aria-label")).toBe("Delivery details")
    const close = required(
      content.querySelector<HTMLButtonElement>(
        '[aria-label="Close delivery details"]'
      )
    )
    expect(viewport.contains(close)).toBe(false)
    expect(close.closest(".popover-chrome")).not.toBeNull()
    await act(() => close.click())
    expect(canvas.querySelector('[role="dialog"]')).toBeNull()
  })
})

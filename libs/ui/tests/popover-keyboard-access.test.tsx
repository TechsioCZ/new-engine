// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import postcss from "postcss"
import { act, createRef, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { Popover } from "../src/molecules/popover"

const roots: Root[] = []

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  // Happy DOM has no layout; make this visible fixture visible to Zag's focus queries.
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(100)
})

afterEach(async () => {
  await act(() => {
    for (const root of roots.splice(0)) {
      root.unmount()
    }
  })
  document.body.replaceChildren()
  vi.restoreAllMocks()
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

function required<T>(value: T | null | undefined): T {
  if (value == null) {
    throw new Error("Missing Popover keyboard fixture element")
  }
  return value
}

it("makes read-only task content focusable independently of pinned close chrome", async () => {
  const contentRef = createRef<HTMLDivElement>()
  const onKeyDown = vi.fn()
  const canvas = await mount(
    <Popover defaultOpen portalled={false}>
      <Popover.Trigger>Delivery information</Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content
          aria-label="Delivery details"
          data-caller="content"
          onKeyDown={onKeyDown}
          ref={contentRef}
        >
          <Popover.Title>Delivery information</Popover.Title>
          <p>{"Regional delivery information. ".repeat(100)}</p>
          <Popover.CloseTrigger />
        </Popover.Content>
      </Popover.Positioner>
    </Popover>
  )
  const viewport = required(
    canvas.querySelector<HTMLElement>(".popover-scroll-viewport")
  )
  const close = required(
    canvas.querySelector<HTMLElement>('[data-part="close-trigger"]')
  )
  expect(viewport.contains(close)).toBe(false)
  expect(viewport.getAttribute("tabindex")).toBe("0")
  await act(() => viewport.focus())
  expect(document.activeElement).toBe(viewport)
  const arrow = new KeyboardEvent("keydown", {
    key: "ArrowDown",
    bubbles: true,
    cancelable: true,
  })
  await act(() => {
    expect(viewport.dispatchEvent(arrow)).toBe(true)
  })
  expect(arrow.defaultPrevented).toBe(false)
  expect(onKeyDown).toHaveBeenCalledOnce()
  const content = required(contentRef.current)
  expect(content.getAttribute("role")).toBe("dialog")
  expect(content.getAttribute("aria-label")).toBe("Delivery details")
  expect(content.getAttribute("data-caller")).toBe("content")
  expect(content.contains(viewport)).toBe(true)
  expect(viewport.tagName).toBe("SECTION")
  expect(viewport.getAttribute("aria-label")).toBe("Delivery details")

  const foundation = postcss.parse(
    readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../src/tokens/_foundation-overrides.css"
      ),
      "utf8"
    )
  )
  let focusSelector = ""
  foundation.walkRules((rule) => {
    if (rule.selector.includes(":focus-visible")) {
      rule.walkDecls("box-shadow", () => {
        focusSelector = rule.selector.replaceAll(/\s+/g, " ")
      })
    }
  })
  expect(focusSelector).not.toBe("")
  viewport.setAttribute("data-focus-visible", "")
  expect(viewport.matches(focusSelector)).toBe(true)
})

it.each([false, true])(
  "preserves default form, close-only, explicit and disabled autofocus (modal=%s)",
  async (modal) => {
    for (const scenario of ["form", "close", "explicit", "disabled"] as const) {
      const explicitRef = createRef<HTMLInputElement>()
      const canvas = await mount(
        <Popover
          autoFocus={scenario !== "disabled"}
          initialFocusEl={
            scenario === "explicit" ? () => explicitRef.current : undefined
          }
          modal={modal}
          portalled={false}
        >
          <Popover.Trigger>Open delivery information</Popover.Trigger>
          <Popover.Positioner>
            <Popover.Content aria-label="Delivery information">
              {scenario !== "close" && <input aria-label="First field" />}
              {scenario === "explicit" && (
                <input aria-label="Chosen field" ref={explicitRef} />
              )}
              <Popover.CloseTrigger />
            </Popover.Content>
          </Popover.Positioner>
        </Popover>
      )
      const trigger = required(
        canvas.querySelector<HTMLButtonElement>("button")
      )
      await act(() => trigger.focus())
      await act(() => trigger.click())
      let expected: Element
      if (scenario === "explicit") {
        expected = required(explicitRef.current)
      } else if (scenario === "close") {
        expected = required(
          document.querySelector('[data-part="close-trigger"]')
        )
      } else if (scenario === "disabled") {
        expected = trigger
      } else {
        expected = required(
          document.querySelector('[aria-label="First field"]')
        )
      }
      await act(async () => {
        await vi.waitFor(() => expect(document.activeElement).toBe(expected))
      })
      await act(() => roots.pop()?.unmount())
      canvas.remove()
    }
  }
)

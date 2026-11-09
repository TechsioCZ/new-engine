// @vitest-environment happy-dom
import {
  act,
  createElement as h,
  StrictMode,
  startTransition,
  useState,
} from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Button } from "../src/atoms/button"
import { Rating } from "../src/atoms/rating"

/**
 * Uncontrolled interactions commit focus with their values instead of depending on a frame that
 * may arrive early or never. Controlled interactions retain Zag's existing path so parent-scheduled
 * transitions still work. These tests keep reset, clamp and external updates out of stale requests.
 */

let root: Root | undefined
const NativeWeakRef = WeakRef

/**
 * happy-dom stores every MutationObserver listener's internal callback in a `WeakRef`
 * (`lib/mutation-observer/MutationObserverListener.js`) and its mutation reporting permanently
 * drops that listener once the target has been collected, so an observer can silently stop firing
 * whenever the garbage collector runs between `observe()` and a mutation. Browsers keep an
 * observing observer's callback alive for as long as it observes. Retaining function targets
 * restores that lifetime for the atom's MutationObserver-based focus recovery, while the object
 * caches happy-dom also keeps in `WeakRef`s keep their real weak semantics.
 */
function restoreObservingCallbackLifetime() {
  class ObservingLifetimeWeakRef<T extends object> {
    readonly #native: WeakRef<T>
    readonly #retained: T | undefined
    constructor(target: T) {
      this.#native = new NativeWeakRef(target)
      this.#retained = typeof target === "function" ? target : undefined
    }
    deref(): T | undefined {
      return this.#retained ?? this.#native.deref()
    }
  }
  vi.stubGlobal("WeakRef", ObservingLifetimeWeakRef)
}

beforeEach(() => {
  // The maintained happy-dom idiom for tests that mount and interact through act(). Without it
  // React reports the environment as unconfigured and stops treating the updates the atom
  // schedules from its own microtask as act work, so commit timing stops being deterministic.
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  restoreObservingCallbackLifetime()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

async function mount(element: Parameters<Root["render"]>[0]) {
  const container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(element))
  return container
}

const radios = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[role="radio"]'))

const checkedIndex = (container: HTMLElement) =>
  radios(container).findIndex(
    (radio) => radio.getAttribute("aria-checked") === "true"
  )

const activeIndex = (container: HTMLElement) =>
  radios(container).indexOf(document.activeElement as HTMLElement)

const scoreOf = (container: HTMLElement) =>
  (container.querySelector("input") as HTMLInputElement | null)?.value

const tabIndexOf = (container: HTMLElement, index: number) =>
  radios(container)[index]?.getAttribute("tabindex")

/**
 * Deliver the atom's microtasked event work inside act. Zag processes focus and key events from a
 * queued microtask, so without this the update it schedules lands after act returns.
 */
async function flushEventWork() {
  await Promise.resolve()
}

async function focusRadio(container: HTMLElement, index: number) {
  const radio = radios(container)[index]
  if (!radio) {
    throw new Error(`Missing rating radio ${index}`)
  }
  await act(async () => {
    radio.focus()
    // happy-dom does not always emit focusin for a programmatic focus; React needs it for onFocus.
    radio.dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
    await flushEventWork()
  })
}

async function pressKey(container: HTMLElement, index: number, key: string) {
  const radio = radios(container)[index]
  if (!radio) {
    throw new Error(`Missing rating radio ${index}`)
  }
  await act(async () => {
    radio.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
    )
    await flushEventWork()
  })
}

/** Drain the atom's async work: React commits, native reset timers, deferred animation frames. */
async function settle() {
  for (let turn = 0; turn < 3; turn += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }
}

function stubFrames(mode: "immediate" | "deferred" | "never") {
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    if (mode === "immediate") {
      callback(0)
    } else if (mode === "deferred") {
      frames.push(callback)
    }
    return frames.length
  })
  vi.stubGlobal("cancelAnimationFrame", () => undefined)
  return async () => {
    await act(() => {
      for (const callback of frames.splice(0)) {
        callback(0)
      }
    })
  }
}

function rating(name = "score") {
  return {
    name,
    labelText: "Rate your delivery",
    defaultValue: 3,
    allowHalf: false,
  }
}

function buttonNamed(container: HTMLElement, name: string) {
  const match = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === name
  )
  if (!match) {
    throw new Error(`Missing button: ${name}`)
  }
  return match
}

async function clickButton(container: HTMLElement, name: string) {
  await act(async () => buttonNamed(container, name).click())
}

async function focusElement(element: HTMLElement) {
  await act(async () => {
    element.focus()
    element.dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
    await flushEventWork()
  })
}

/**
 * A controlled parent that owns the score, the read-only state and an adjacent field, so an
 * external update can arrive after the control has already been left.
 */
function TransactionHarness({
  initialValue = 3,
  allowHalf = true,
  count,
}: {
  initialValue?: number
  allowHalf?: boolean
  count?: number
}) {
  const [value, setValue] = useState(initialValue)
  const [readOnly, setReadOnly] = useState(false)
  return h(
    "div",
    null,
    h(Rating, {
      name: "score",
      labelText: "Rate your delivery",
      value,
      count,
      allowHalf,
      readOnly,
      onChange: setValue,
    }),
    h(
      Button,
      { variant: "secondary", onClick: () => setReadOnly(true) },
      "Lock the score"
    ),
    h(
      Button,
      { variant: "secondary", onClick: () => setValue(1) },
      "Apply saved score"
    ),
    h("button", { type: "button" }, "Next field")
  )
}

describe("Rating focus ownership across browser scheduling", () => {
  it.each([
    ["a frame delivered before the value commits", "immediate"],
    ["no frame delivered at all", "never"],
  ] as const)(
    "keeps the newly checked star focused with %s",
    async (_case, mode) => {
      stubFrames(mode)
      const container = await mount(h(Rating, rating()))
      await focusRadio(container, 2)
      await pressKey(container, 2, "ArrowLeft")
      await settle()
      expect(scoreOf(container)).toBe("2")
      expect(checkedIndex(container)).toBe(1)
      expect(activeIndex(container)).toBe(1)
    }
  )

  it("commits one real arrow transaction into value, ARIA, tabindex and focus", async () => {
    const deliver = stubFrames("deferred")
    const onChange = vi.fn()
    const container = await mount(
      h(
        "form",
        { "aria-label": "Delivery review" },
        h(Rating, { ...rating(), onChange })
      )
    )
    await focusRadio(container, 2)
    await pressKey(container, 2, "ArrowLeft")
    await deliver()
    await settle()
    expect(scoreOf(container)).toBe("2")
    expect(checkedIndex(container)).toBe(1)
    expect(tabIndexOf(container, 1)).toBe("0")
    expect(tabIndexOf(container, 2)).toBe("-1")
    expect(activeIndex(container)).toBe(1)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it.each([false, true])(
    "preserves controlled transition acceptance with StrictMode=%s",
    async (strict) => {
      const deliver = stubFrames("deferred")
      const onChange = vi.fn()
      function Controlled() {
        const [value, setValue] = useState(3)
        return h(Rating, {
          ...rating(),
          value,
          onChange: (next) => {
            onChange(next)
            startTransition(() => setValue(next))
          },
        })
      }
      const element = h(Controlled)
      const container = await mount(
        strict ? h(StrictMode, null, element) : element
      )
      await focusRadio(container, 2)
      await pressKey(container, 2, "ArrowLeft")
      await deliver()
      await settle()
      expect(scoreOf(container)).toBe("2")
      expect(checkedIndex(container)).toBe(1)
      expect(tabIndexOf(container, 1)).toBe("0")
      expect(activeIndex(container)).toBe(1)
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith(2)
    }
  )

  it("owns focus for an arrow transaction under StrictMode", async () => {
    stubFrames("never")
    const container = await mount(h(StrictMode, null, h(Rating, rating())))
    await focusRadio(container, 2)
    await pressKey(container, 2, "ArrowLeft")
    await settle()
    expect(scoreOf(container)).toBe("2")
    expect(checkedIndex(container)).toBe(1)
    expect(activeIndex(container)).toBe(1)
  })

  it("moves focus to the star a pointer click selects without a delivered frame", async () => {
    stubFrames("never")
    const onChange = vi.fn()
    const container = await mount(h(Rating, { ...rating(), onChange }))
    await focusRadio(container, 2)
    await act(async () => radios(container)[0]?.click())
    await settle()
    expect(scoreOf(container)).toBe("1")
    expect(checkedIndex(container)).toBe(0)
    expect(activeIndex(container)).toBe(0)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it("keeps the recovered star focused when the scale clamps the score", async () => {
    const deliver = stubFrames("deferred")
    const onChange = vi.fn()
    function Harness() {
      const [count, setCount] = useState(5)
      return h(
        "form",
        { "aria-label": "Delivery review" },
        h(Rating, { ...rating(), defaultValue: 5, count, onChange }),
        h(
          Button,
          { variant: "secondary", onClick: () => setCount(3) },
          "Use three stars"
        )
      )
    }
    const container = await mount(h(Harness))
    await focusRadio(container, 4)
    expect(activeIndex(container)).toBe(4)
    const mutationsDelivered = new Promise<void>((resolve) => {
      const observer = new MutationObserver(() => {
        observer.disconnect()
        resolve()
      })
      observer.observe(container, { childList: true, subtree: true })
    })
    const shrink = container.querySelector("button")
    if (!shrink) {
      throw new Error("Missing scale control")
    }
    await act(async () => shrink.click())
    await mutationsDelivered
    await deliver()
    await settle()
    expect(radios(container)).toHaveLength(3)
    expect(scoreOf(container)).toBe("3")
    expect(checkedIndex(container)).toBe(2)
    expect(activeIndex(container)).toBe(2)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it("restores a silent reset without notifying or claiming focus", async () => {
    const deliver = stubFrames("deferred")
    const onChange = vi.fn()
    const container = await mount(
      h(
        "form",
        { "aria-label": "Delivery review" },
        h(Rating, { ...rating(), onChange }),
        h(
          Button,
          { variant: "secondary", type: "reset" },
          "Restore original score"
        )
      )
    )
    await focusRadio(container, 2)
    await pressKey(container, 2, "ArrowLeft")
    await deliver()
    await settle()
    expect(scoreOf(container)).toBe("2")
    expect(activeIndex(container)).toBe(1)
    const form = container.querySelector("form")
    if (!form) {
      throw new Error("Missing rating form")
    }
    await act(async () => form.reset())
    await settle()
    expect(scoreOf(container)).toBe("3")
    expect(checkedIndex(container)).toBe(2)
    expect(tabIndexOf(container, 2)).toBe("0")
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(activeIndex(container)).toBe(1)
  })

  it("still owns focus for a real arrow after a silent native reset", async () => {
    const deliver = stubFrames("deferred")
    const onChange = vi.fn()
    const container = await mount(
      h(
        "form",
        { "aria-label": "Delivery review" },
        h(Rating, { ...rating(), onChange }),
        h(
          Button,
          { variant: "secondary", type: "reset" },
          "Restore original score"
        )
      )
    )
    await focusRadio(container, 2)
    await pressKey(container, 2, "ArrowLeft")
    await deliver()
    await settle()
    const form = container.querySelector("form")
    if (!form) {
      throw new Error("Missing rating form")
    }
    await act(async () => form.reset())
    await settle()
    expect(scoreOf(container)).toBe("3")
    await pressKey(container, 1, "ArrowRight")
    await deliver()
    await settle()
    expect(scoreOf(container)).toBe("4")
    expect(checkedIndex(container)).toBe(3)
    expect(activeIndex(container)).toBe(3)
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith(4)
  })

  it("leaves focus alone when the value changes outside the control", async () => {
    function Harness() {
      const [value, setValue] = useState(3)
      return h(
        "div",
        null,
        h(Rating, { ...rating(), value }),
        h(
          Button,
          { variant: "secondary", onClick: () => setValue(1) },
          "Apply saved score"
        )
      )
    }
    const container = await mount(h(Harness))
    await focusRadio(container, 2)
    const apply = container.querySelector("button")
    if (!apply) {
      throw new Error("Missing saved score control")
    }
    await act(async () => apply.click())
    await settle()
    expect(checkedIndex(container)).toBe(0)
    expect(activeIndex(container)).toBe(2)
  })

  it("keeps focus on the third star when an external update follows a half-step arrow", async () => {
    const deliver = stubFrames("deferred")
    const container = await mount(h(TransactionHarness, null))
    await focusRadio(container, 2)
    await pressKey(container, 2, "ArrowLeft")
    await deliver()
    await settle()
    expect(scoreOf(container)).toBe("2.5")
    expect(checkedIndex(container)).toBe(2)
    expect(activeIndex(container)).toBe(2)
    await clickButton(container, "Apply saved score")
    await settle()
    expect(checkedIndex(container)).toBe(0)
    expect(activeIndex(container)).toBe(2)
  })

  it("keeps focus on the third star when an external update follows a no-op click", async () => {
    const deliver = stubFrames("deferred")
    const container = await mount(h(TransactionHarness, { allowHalf: false }))
    await focusRadio(container, 2)
    await act(async () => radios(container)[2]?.click())
    await deliver()
    await settle()
    expect(scoreOf(container)).toBe("3")
    expect(checkedIndex(container)).toBe(2)
    expect(activeIndex(container)).toBe(2)
    await clickButton(container, "Apply saved score")
    await settle()
    expect(checkedIndex(container)).toBe(0)
    expect(activeIndex(container)).toBe(2)
  })

  it("keeps focus on the fifth star when an external update follows a boundary End", async () => {
    const deliver = stubFrames("deferred")
    const container = await mount(
      h(TransactionHarness, { initialValue: 5, allowHalf: false })
    )
    await focusRadio(container, 4)
    await pressKey(container, 4, "End")
    await deliver()
    await settle()
    expect(scoreOf(container)).toBe("5")
    expect(activeIndex(container)).toBe(4)
    await clickButton(container, "Apply saved score")
    await settle()
    expect(checkedIndex(container)).toBe(0)
    expect(activeIndex(container)).toBe(4)
  })

  it("never reclaims focus for an external update after the control went read-only", async () => {
    const deliver = stubFrames("deferred")
    const container = await mount(h(TransactionHarness, null))
    await focusRadio(container, 2)
    await pressKey(container, 2, "ArrowLeft")
    await deliver()
    await settle()
    expect(scoreOf(container)).toBe("2.5")
    await clickButton(container, "Lock the score")
    await settle()
    expect(
      container
        .querySelector('[data-part="control"]')
        ?.hasAttribute("data-readonly")
    ).toBe(true)
    const next = buttonNamed(container, "Next field")
    await focusElement(next)
    expect(document.activeElement).toBe(next)
    await clickButton(container, "Apply saved score")
    await settle()
    expect(checkedIndex(container)).toBe(0)
    expect(document.activeElement).toBe(next)
  })
})

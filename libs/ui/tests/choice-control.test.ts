import { readFileSync } from "node:fs"
import {
  type ComponentPropsWithRef,
  createElement as h,
  type KeyboardEvent,
} from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  getControlledChoiceInputProps,
  handleChoiceArrowKey,
  isSilentChoiceReset,
  mergeChoiceInputProps,
  runSilentChoiceReset,
} from "../src/internal/choice-control"
import { RadioCard } from "../src/molecules/radio-card"
import { RadioGroup } from "../src/molecules/radio-group"

const publicHookPattern =
  /from ["']react["']|useSyncExternalStore|subscribeOwnerFormReset|isEffectivelyDisabled/
const publicChoicePattern =
  /export function (getControlledChoiceInputProps|trackChoiceFormControl|useChoiceFocusRecovery)/

const events = [
  "onClick",
  "onChange",
  "onFocus",
  "onBlur",
  "onKeyDown",
  "onKeyUp",
] as const

describe("consumer-first choice events", () => {
  it.each(events)(
    "honors cancellation for %s without losing observation or checked restoration",
    (key) => {
      const calls: string[] = []
      const consumer = {
        [key]: (consumerEvent: Event) => {
          calls.push("consumer")
          consumerEvent.preventDefault()
        },
      }
      const machine = {
        [key]: () => calls.push("machine"),
        defaultChecked: true,
      }
      const props = getControlledChoiceInputProps(
        mergeChoiceInputProps(consumer, machine),
        false
      )
      const event = new Event("click", { cancelable: true })
      ;(props[key] as unknown as (event: Event) => void)(event)
      expect(calls).toEqual(["consumer"])
      expect(props.checked).toBe(false)
      expect(props.defaultChecked).toBeUndefined()
    }
  )
  it.each(events)(
    "runs observational %s before the machine exactly once",
    (key) => {
      const calls: string[] = []
      const props = mergeChoiceInputProps(
        { [key]: () => calls.push("consumer") },
        { [key]: () => calls.push("machine") }
      )
      ;(props[key] as unknown as (event: Event) => void)(new Event("click"))
      expect(calls).toEqual(["consumer", "machine"])
    }
  )
  it("preserves native props and the consumer ref", () => {
    const ref = vi.fn()
    const props: ComponentPropsWithRef<"input"> = mergeChoiceInputProps(
      { ref, form: "external", "aria-label": "Choice" },
      { name: "choice" }
    )
    expect(props).toMatchObject({
      ref,
      form: "external",
      name: "choice",
      "aria-label": "Choice",
    })
  })
})

it("scopes silent reset notifications to one machine and releases suppression after errors", () => {
  const first = {},
    second = {}
  expect(isSilentChoiceReset(first)).toBe(false)
  expect(() =>
    runSilentChoiceReset(first, () => {
      expect(isSilentChoiceReset(first)).toBe(true)
      runSilentChoiceReset(first, () =>
        expect(isSilentChoiceReset(first)).toBe(true)
      )
      expect(isSilentChoiceReset(first)).toBe(true)
      expect(isSilentChoiceReset(second)).toBe(false)
      throw new Error("reset failed")
    })
  ).toThrow("reset failed")
  expect(isSilentChoiceReset(first)).toBe(false)
})

it("owns arrows once, wraps both ways and respects cancellation/modifiers", () => {
  const inputs = Array.from({ length: 3 }, () => ({
    matches: () => false,
    parentElement: null,
    focus: vi.fn(),
    click: vi.fn(),
    closest: () => root,
  }))
  const root = { dir: "ltr", querySelectorAll: () => inputs }
  const press = (index: number, key: string, extra = {}) => {
    const event = {
      key,
      currentTarget: inputs[index],
      preventDefault: vi.fn(),
      ...extra,
    }
    handleChoiceArrowKey(event as unknown as KeyboardEvent<HTMLInputElement>)
    return event
  }
  expect(press(0, "ArrowDown").preventDefault).toHaveBeenCalledOnce()
  expect(inputs[1]?.click).toHaveBeenCalledOnce()
  press(1, "ArrowUp")
  expect(inputs[0]?.click).toHaveBeenCalledOnce()
  press(0, "ArrowUp")
  expect(inputs[2]?.click).toHaveBeenCalledOnce()
  press(0, "ArrowUp", { defaultPrevented: true })
  press(0, "ArrowUp", { ctrlKey: true })
  expect(inputs[2]?.click).toHaveBeenCalledOnce()
})

it("keeps internal lifecycle contracts out of server-safe public utils and Checkbox", () => {
  const utils = readFileSync(
    new URL("../src/utils.ts", import.meta.url),
    "utf8"
  )
  const checkbox = readFileSync(
    new URL("../src/atoms/checkbox.tsx", import.meta.url),
    "utf8"
  )
  expect(utils).not.toMatch(publicHookPattern)
  expect(checkbox).not.toMatch(publicChoicePattern)
})

it("honors explicit radio group names rather than dangling generated label IDs", () => {
  const named = { "aria-label": "Delivery", children: null }
  for (const element of [h(RadioGroup, named), h(RadioCard, named)]) {
    const html = renderToStaticMarkup(element)
    expect(html).toContain('aria-label="Delivery"')
    expect(html).not.toContain("aria-labelledby=")
  }
})

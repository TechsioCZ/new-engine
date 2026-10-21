import { type ChangeEvent, createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  Checkbox,
  type CheckboxProps,
  getControlledChoiceInputProps,
} from "../src/atoms/checkbox"
import { Rating } from "../src/atoms/rating"
import { FormCheckbox } from "../src/molecules/form-checkbox"

const INPUT_TAG = /<input\b[^>]*>/
const GROUP_TAG = /<div\b[^>]*role="radiogroup"[^>]*>/

it("removes Zag's mutable native default while retaining handlers and refs", () => {
  const onClick = vi.fn()
  const onChange = vi.fn()
  const ref = vi.fn()
  const props = getControlledChoiceInputProps(
    { defaultChecked: true, onClick, onChange, ref, name: "updates" },
    false,
    true
  )
  expect(props.defaultChecked).toBeUndefined()
  expect(props.checked).toBe(false)
  expect(props.onClick).toBe(onClick)
  expect(props.ref).toBe(ref)
  const target = { indeterminate: false }
  const event = { currentTarget: target } as ChangeEvent<HTMLInputElement>
  props.onChange?.(event)
  expect(target.indeterminate).toBe(true)
  expect(onChange).toHaveBeenCalledExactlyOnceWith(event)
})

describe.each(["sm", "md", "lg"] as const)("Checkbox %s", (size) => {
  it("uses the labeled checkbox geometry and consumes size instead of emitting a native size attribute", () => {
    const html = renderToStaticMarkup(
      h(Checkbox, { size, "aria-label": "Select Alpine daypack" })
    )
    expect(html).toContain(`size-form-checkbox-control-${size}`)
    expect(html).not.toContain(` size="${size}"`)
  })
})

it("defaults to md and rejects native numeric sizing", () => {
  expect(renderToStaticMarkup(h(Checkbox))).toContain(
    "size-form-checkbox-control-md"
  )
  const valid: CheckboxProps = { size: "sm" }
  // @ts-expect-error Checkboxes have a canonical control size, not native text-field character sizing.
  const invalid: CheckboxProps = { size: 24 }
  expect(valid.size).toBe("sm")
  expect(invalid.size).toBe(24)
})

it("keeps the cross-component documentation recommendation compile checked", () => {
  const html = renderToStaticMarkup(
    h(FormCheckbox, {
      name: "newsletter",
      label: "Send me product updates",
      helpText: "You can unsubscribe anytime.",
    })
  )
  const input = html.match(INPUT_TAG)?.[0]
  expect(input).toContain("aria-describedby=")
  expect(html).toContain("You can unsubscribe anytime.")
  for (const className of ["min-w-0", "flex-1", "wrap-anywhere"]) {
    expect(html).toContain(className)
  }
})

it.each([
  [{ labelText: "Delivery score" }, 'aria-labelledby="'],
  [{ "aria-label": "Packing score" }, 'aria-label="Packing score"'],
  [{ "aria-labelledby": "external-score" }, 'aria-labelledby="external-score"'],
  [{}, 'aria-label="Rating"'],
])(
  "routes the accessible name to the actual radiogroup for %o",
  (props, expected) => {
    const html = renderToStaticMarkup(h(Rating, props))
    expect(html.match(GROUP_TAG)?.[0]).toContain(expected)
  }
)

it.each([
  [{ count: 3, value: 5, allowHalf: false }, "3 / 3", 'value="3"'],
  [{ count: 5, value: 4.5, allowHalf: false }, "5 / 5", 'value="5"'],
  [
    { count: 5, value: 4.6, readOnly: true, allowHalf: false },
    "4.6 / 5",
    'value="4.6"',
  ],
  [{ count: 0, value: -1 }, "0 / 1", 'value="0"'],
])(
  "projects valid scores without mutating controlled ownership for %o",
  (props, score, value) => {
    const html = renderToStaticMarkup(h(Rating, props))
    expect(html).toContain(score)
    expect(html.match(INPUT_TAG)?.[0]).toContain(value)
  }
)

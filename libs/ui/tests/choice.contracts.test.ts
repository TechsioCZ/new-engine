import {
  type Dispatch,
  createElement as h,
  type Ref,
  type SetStateAction,
} from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, expectTypeOf, it } from "vitest"
import { ColorSelect } from "../src/molecules/color-select"
import { Combobox, type ComboboxProps } from "../src/molecules/combobox"
import type { SearchSuggestionsProps } from "../src/templates/search-suggestions"
import { SelectTemplate } from "../src/templates/select"

const INPUT_TAG = /<input\b[^>]*>/
const DESCRIPTIONS = /aria-describedby="external native-hint [^"]+-help"/

const items = [
  { label: "Alpha", value: "a" },
  { label: "Beta", value: "b" },
]

describe("choice public contracts", () => {
  it("accepts direct array setters and exposes focusable input refs through templates", () => {
    expectTypeOf<Dispatch<SetStateAction<string[]>>>().toExtend<
      NonNullable<ComboboxProps["onChange"]>
    >()
    expectTypeOf<ComboboxProps["ref"]>().toEqualTypeOf<
      Ref<HTMLInputElement> | undefined
    >()
    expectTypeOf<SearchSuggestionsProps["ref"]>().toEqualTypeOf<
      Ref<HTMLInputElement> | undefined
    >()
    const setValues: Dispatch<SetStateAction<string[]>> = () => undefined
    const single: ComboboxProps = { items, value: [], onChange: setValues }
    const multiple: ComboboxProps = {
      items,
      multiple: true,
      value: [],
      onChange: setValues,
    }
    expect(single.onChange).toBe(multiple.onChange)
  })

  it("separates root attributes from merged native input descriptions", () => {
    const html = renderToStaticMarkup(
      h(Combobox, {
        items,
        className: "consumer-root",
        style: { width: "100%" },
        title: "Root title",
        "aria-describedby": "external",
        helpText: "Choose a category.",
        inputProps: {
          "aria-label": "Category",
          "aria-describedby": "native-hint",
          autoComplete: "off",
          onBlur: () => undefined,
        },
      })
    )
    const input = html.match(INPUT_TAG)?.[0]
    expect(html).toContain("consumer-root")
    expect(input).not.toContain("consumer-root")
    expect(input).toContain('aria-label="Category"')
    expect(input).not.toContain("aria-labelledby=")
    expect(input).toMatch(DESCRIPTIONS)
    expect(input).toContain('autoComplete="off"')
  })

  it.each([
    { defaultValue: [] },
    { defaultValue: ["a"] },
    { defaultValue: ["a", "b"] },
  ])(
    "associates every submitted hidden selection with the visible input's external form ($defaultValue)",
    ({ defaultValue }) => {
      const html = renderToStaticMarkup(
        h(Combobox, {
          items,
          name: "category",
          defaultValue,
          multiple: true,
          inputProps: { form: "external-order" },
        })
      )
      const inputs = html.match(/<input\b[^>]*>/g) ?? []
      const submitted = inputs.filter((input) =>
        input.includes('name="category"')
      )
      expect(submitted).toHaveLength(defaultValue.length || 1)
      for (const input of inputs) {
        expect(input).toContain('form="external-order"')
      }
      for (const value of defaultValue.length ? defaultValue : [""]) {
        expect(
          submitted.some((input) => input.includes(`value="${value}"`))
        ).toBe(true)
      }
    }
  )

  it("honors explicit input accessible names instead of an automatic visible-label ID", () => {
    const html = renderToStaticMarkup(
      h(Combobox, {
        items,
        label: "Visible category",
        inputProps: { "aria-label": "External category" },
      })
    )
    const input = html.match(INPUT_TAG)?.[0]
    expect(input).toContain('aria-label="External category"')
    expect(input).not.toContain("aria-labelledby=")
  })

  it("renders built-in named removal controls, but no read-only removal affordances", () => {
    const html = renderToStaticMarkup(
      h(Combobox, {
        items,
        multiple: true,
        defaultValue: ["a", "b"],
        label: "Categories",
      })
    )
    expect(html).toContain('aria-label="Remove Alpha"')
    expect(html).toContain('aria-label="Remove Beta"')
    const locked = renderToStaticMarkup(
      h(Combobox, {
        items,
        multiple: true,
        defaultValue: ["a", "b"],
        readOnly: true,
      })
    )
    expect(locked).toContain("Alpha")
    expect(locked).toContain("Beta")
    expect(locked).not.toContain('aria-label="Remove ')
  })

  it("has an explicit empty native value when a controlled selection is unavailable", () => {
    const html = renderToStaticMarkup(
      h(SelectTemplate, {
        label: "Country",
        items,
        value: ["removed"],
        required: true,
      })
    )
    expect(html).toContain('<option value="" selected="">')
    expect(html).toContain("Select an option")
    expect(html).not.toContain('<option value="a" selected')
  })

  it("keeps white product color and wraps grid labels without dimming selected fills", () => {
    const html = renderToStaticMarkup(
      h(ColorSelect, {
        layout: "grid",
        colors: [
          {
            color: "#ffffff",
            label: "UnbrokenLocalizedColorName",
            selected: true,
            count: 0,
          },
        ],
      })
    )
    expect(html).toContain("background-color:#ffffff")
    expect(html).not.toContain("brightness-")
    expect(html).toContain("wrap-anywhere")
    expect(html).toContain("(0)")
  })
})

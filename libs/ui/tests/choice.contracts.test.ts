import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  type Dispatch,
  createElement as h,
  type Ref,
  type SetStateAction,
} from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"
import { describe, expect, expectTypeOf, it } from "vitest"
import { ColorSelect } from "../src/molecules/color-select"
import { Combobox, type ComboboxProps } from "../src/molecules/combobox"
import { Select } from "../src/molecules/select"
import type { SliderProps, SliderThumbProps } from "../src/molecules/slider"
import type { SearchSuggestionsProps } from "../src/templates/search-suggestions"
import { SelectTemplate } from "../src/templates/select"

const BUTTON_TAG = /<button\b[^>]*>/
const INPUT_TAG = /<input\b[^>]*>/
const DESCRIPTIONS = /aria-describedby="external native-hint [^"]+-help"/
const TSX_DOCS = /```tsx\n([\s\S]*?)```/

const items = [
  { label: "Alpha", value: "a" },
  { label: "Beta", value: "b" },
]

describe("choice public contracts", () => {
  it("compiles the exact Select compound example copied from Docs", () => {
    const root = fileURLToPath(new URL("../", import.meta.url))
    const storyPath = `${root}stories/molecules/select.stories.tsx`
    const story = ts.createSourceFile(
      storyPath,
      readFileSync(storyPath, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )
    let snippet: string | undefined
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node)) {
        const code = node.text.match(TSX_DOCS)?.[1]
        if (code?.includes("@techsio/ui-kit/molecules/select")) {
          snippet = code
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(story)
    expect(snippet).toBeDefined()
    const file = `${root}tests/__select-docs.tsx`
    const config = ts.readConfigFile(`${root}tsconfig.json`, ts.sys.readFile)
    const { options } = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      root
    )
    const compilerOptions = {
      ...options,
      incremental: false,
      paths: {
        ...options.paths,
        "@techsio/ui-kit/molecules/*": [`${root}src/molecules/*`],
      },
    }
    const host = ts.createCompilerHost(compilerOptions)
    const getSourceFile = host.getSourceFile.bind(host)
    host.getSourceFile = (name, languageVersion, onError, createNew) =>
      name === file
        ? ts.createSourceFile(
            name,
            snippet ?? "",
            languageVersion,
            true,
            ts.ScriptKind.TSX
          )
        : getSourceFile(name, languageVersion, onError, createNew)
    const program = ts.createProgram([file], compilerOptions, host)
    expect(
      ts
        .getPreEmitDiagnostics(program)
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
        )
    ).toEqual([])
  }, 60_000)

  it("exposes per-thumb refs and focus handlers on the slider", () => {
    expectTypeOf<SliderThumbProps["ref"]>().toEqualTypeOf<
      Ref<HTMLDivElement> | undefined
    >()
    expectTypeOf<NonNullable<SliderProps["getThumbProps"]>>()
      .parameter(0)
      .toEqualTypeOf<number>()
  })

  it.each([
    { "aria-label": "External country" },
    { "aria-labelledby": "external-label" },
    { "aria-label": "Ignored fallback", "aria-labelledby": "external-label" },
  ])(
    "lets explicit Select trigger names replace machine names (%j)",
    (name) => {
      const html = renderToStaticMarkup(
        h(
          Select,
          // biome-ignore lint/correctness/noChildrenProp: required root children prop is supplied by createElement arguments.
          { items, children: null },
          h(Select.Label, { key: "label" }, "Generated label"),
          h(
            Select.Trigger,
            { key: "trigger", ...name },
            h(Select.ValueText, {})
          )
        )
      )
      const trigger = html.match(BUTTON_TAG)?.[0] ?? ""
      if (name["aria-labelledby"]) {
        expect(trigger).toContain('aria-labelledby="external-label"')
      } else {
        expect(trigger).toContain('aria-label="External country"')
        expect(trigger).not.toContain("aria-labelledby=")
      }
    }
  )

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

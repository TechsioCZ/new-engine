import { readFileSync } from "node:fs"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Input } from "../src/atoms/input"
import { Textarea } from "../src/atoms/textarea"

const classAttribute = /class="([^"]*)"/

const classOf = (html: string) =>
  (html.match(classAttribute)?.[1] ?? "").split(" ")

const css = (name: string) =>
  readFileSync(
    new URL(`../src/tokens/components/atoms/_${name}.css`, import.meta.url),
    "utf8"
  )

type ReadOnlyFieldProps = {
  readOnly?: boolean
  defaultValue?: string
  variant?: "error"
}

describe.each([
  ["input", (props: ReadOnlyFieldProps) => h(Input, props)],
  ["textarea", (props: ReadOnlyFieldProps) => h(Textarea, props)],
] as const)("%s read-only border response", (name, renderField) => {
  const editableHover =
    name === "input"
      ? "hover:border-input-border-hover"
      : "hover:border-textarea-border-hover"
  const editableFocus =
    name === "input"
      ? "focus:border-input-border-focus"
      : "focus:border-textarea-border-focus"

  it("swaps only the hover/focus border tokens and keeps the focus ring", () => {
    const classes = classOf(
      renderToStaticMarkup(renderField({ readOnly: true, defaultValue: "x" }))
    )
    expect(classes).toContain(`hover:border-${name}-border-readonly-hover`)
    expect(classes).toContain(`focus:border-${name}-border-readonly-focus`)
    expect(classes).not.toContain(editableHover)
    expect(classes).not.toContain(editableFocus)
    expect(classes).toContain(`focus-visible:outline-${name}-ring`)
    expect(classes).toContain("form-control-readonly")
  })

  it("leaves editable fields on the editable border tokens", () => {
    const classes = classOf(renderToStaticMarkup(renderField({})))
    expect(classes).toContain(editableHover)
    expect(classes).toContain(editableFocus)
    expect(classes.some((c) => c.includes("readonly-"))).toBe(false)
  })

  it("keeps validation focus borders on read-only fields", () => {
    const classes = classOf(
      renderToStaticMarkup(renderField({ readOnly: true, variant: "error" }))
    )
    expect(classes).toContain(`focus:border-${name}-border-danger-focus`)
    expect(classes.some((c) => c.includes("border-readonly-"))).toBe(false)
  })

  it("defaults the read-only border aliases to the editable response", () => {
    const source = css(name)
    const editable = name === "input" ? "input-border" : "textarea-border"
    expect(source).toContain(
      `--color-${name}-border-readonly-hover: var(--color-${editable}-hover);`
    )
    expect(source).toContain(
      `--color-${name}-border-readonly-focus: var(--color-${editable}-focus);`
    )
  })
})

describe("textarea inline padding", () => {
  it.each(["sm", "md", "lg"] as const)(
    "%s keeps block padding and adds an independent inline token",
    (size) => {
      const classes = classOf(renderToStaticMarkup(h(Textarea, { size })))
      expect(classes).toContain(`p-textarea-${size}`)
      expect(classes).toContain(`px-textarea-inline-${size}`)
      expect(css("textarea")).toContain(
        `--padding-textarea-inline-${size}: var(--padding-textarea-${size});`
      )
    }
  )

  it("honours the deprecated readonly alias", () => {
    const classes = classOf(
      renderToStaticMarkup(h(Textarea, { readonly: true }))
    )
    expect(classes).toContain("focus:border-textarea-border-readonly-focus")
  })
})

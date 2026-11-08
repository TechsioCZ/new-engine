// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import postcss from "postcss"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { StatusText } from "../src/atoms/status-text"
import { ReadOnly as CheckboxReadOnly } from "../stories/atoms/checkbox.stories"
import { Variants as InputVariants } from "../stories/atoms/input.stories"

function source(file: string) {
  return readFileSync(new URL(file, import.meta.url), "utf8")
}

function aliases(file: string) {
  const values = new Map<string, string>()
  postcss.parse(source(file)).walkDecls((decl) => {
    values.set(decl.prop, decl.value)
  })
  return values
}

function canvasFor(Fixture: () => ReactNode) {
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(<Fixture />)
  return canvas
}

describe("field guidance presentation", () => {
  it("shows an incomplete name when asking for first and last name", () => {
    const render = InputVariants.render
    if (!render) {
      throw new Error("Missing Input variants render")
    }
    const canvas = canvasFor(() => render({}, {} as never))
    expect(
      canvas.querySelector('[aria-invalid="true"]')?.getAttribute("value")
    ).toBe("Alex")
    expect(canvas.querySelector('[role="alert"]')?.textContent).toContain(
      "first and last name"
    )
  })

  it("labels both immutable checkbox choices explicitly", () => {
    const render = CheckboxReadOnly.render
    if (!render) {
      throw new Error("Missing Checkbox read-only render")
    }
    const canvas = canvasFor(() =>
      render(CheckboxReadOnly.args ?? {}, {} as never)
    )
    const labels = Array.from(canvas.querySelectorAll("label"), (node) =>
      node.textContent?.trim()
    )
    expect(labels).toContain("Product selection (read-only)")
    expect(labels).toContain("Confirmed selection (read-only)")
    expect(canvas.querySelectorAll('input[type="checkbox"]')).toHaveLength(2)
    expect(
      canvas.querySelectorAll('input[type="checkbox"][checked]')
    ).toHaveLength(1)
  })

  it("restores the existing read-only Input surface without editable border responses", () => {
    const values = aliases("../src/tokens/_business-atoms.css")
    expect(values.get("--color-input-readonly")).toBe(
      "var(--color-form-control-readonly)"
    )
    for (const state of ["hover", "focus"]) {
      expect(values.get(`--color-input-border-readonly-${state}`)).toBe(
        "var(--color-input-border-base)"
      )
    }
  })

  it("opts Business into one em-based neutral feedback column at every size", () => {
    const business = aliases("../src/tokens/_business-atoms.css")
    for (const size of ["sm", "md", "lg"]) {
      expect(
        business
          .get(`--padding-status-text-neutral-${size}`)
          ?.replace(/\s+/g, "")
      ).toBe(`calc(1em+var(--spacing-status-text-${size}))`)
    }
  })

  it("keeps neutral offsets zero by default and reads size aliases on the current message", () => {
    const css = postcss.parse(
      source("../src/tokens/components/atoms/_status-text.css")
    )
    const defaults = new Map<string, string>()
    const local = new Map<string, string>()
    css.walkAtRules((rule) => {
      if (rule.name === "theme") {
        rule.walkDecls((decl) => {
          defaults.set(decl.prop, decl.value)
        })
      }
      if (rule.name === "utility") {
        rule.walkDecls("--padding-status-text-neutral", (decl) => {
          local.set(rule.params, decl.value)
        })
      }
    })
    for (const size of ["sm", "md", "lg"]) {
      expect(defaults.get(`--padding-status-text-neutral-${size}`)).toBe(
        "var(--dimension-0)"
      )
      expect(local.get(`status-text-leading-${size}`)).toBe(
        `var(--padding-status-text-neutral-${size})`
      )
    }
  })

  it("places neutral padding below caller utilities and excludes explicit icons", () => {
    const css = postcss.parse(
      source("../src/tokens/components/atoms/_status-text.css")
    )
    let componentLayer = false
    let iconGuard = false
    css.walkRules((rule) => {
      if (!rule.selector.includes("status-text-neutral-prefix")) {
        return
      }
      componentLayer =
        rule.parent?.type === "atrule" &&
        rule.parent.name === "layer" &&
        rule.parent.params === "components"
      iconGuard = rule.selector.includes(':not(:has(> [aria-hidden="true"]))')
    })
    expect(componentLayer).toBe(true)
    expect(iconGuard).toBe(true)
  })

  it("keeps neutral guidance silent and icon-free with explicit icon overrides intact", () => {
    const neutral = renderToStaticMarkup(
      <StatusText className="p-200">Order updates only.</StatusText>
    )
    expect(neutral).toContain("p-200")
    expect(neutral).toContain("status-text-neutral-prefix")
    expect(neutral).not.toContain("role=")
    expect(neutral).not.toContain("token-icon-")
    const explicit = renderToStaticMarkup(
      <StatusText icon="token-icon-home">Order updates only.</StatusText>
    )
    expect(explicit).toContain("token-icon-home")
    expect(explicit).not.toContain("role=")
  })
})

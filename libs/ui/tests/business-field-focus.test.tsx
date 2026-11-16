// @vitest-environment happy-dom
// Business keeps Input, Textarea and NumericInput on their own resting fill
// while focused, so the existing focus outline, border and native selection
// carry the signal instead of a second darkened surface. The aliases stay
// Business-only, stay on each field's own token and leave every other brand on
// the shared form-control focus fill.
import { readFileSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/postcss"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Input } from "../src/atoms/input"
import { NumericInput } from "../src/atoms/numeric-input"
import { Textarea } from "../src/atoms/textarea"

const tokensDir = path.resolve(process.cwd(), "src/tokens")
const businessAtomsPath = path.join(tokensDir, "_business-atoms.css")
const businessAtoms = readFileSync(businessAtomsPath, "utf8")
const readTokens = (file: string) =>
  readFileSync(path.join(tokensDir, file), "utf8")

/** The base theme every brand starts from, plus the generated brand blocks. */
const baseTheme = readTokens("figma/variables.css")
const brandOverrides = readTokens("figma/brand-overrides.css")
const semantic = readTokens("_semantic.css")
const formControl = readTokens("components/_form-control.css")

const VAR_REFERENCE = /var\(\s*(--[\w-]+)\s*\)/g

function declarations(css: string) {
  const values = new Map<string, string>()
  postcss.parse(css).walkDecls((decl) => {
    if (decl.prop.startsWith("--")) {
      values.set(decl.prop, decl.value)
    }
  })
  return values
}

const businessTokens = declarations(businessAtoms)
const baseTokens = new Map([
  ...declarations(semantic),
  ...declarations(baseTheme),
  ...declarations(formControl),
])
/** The live Business cascade: the base theme plus the Business overrides. */
const businessCascade = new Map([...baseTokens, ...businessTokens])

/** Follow `var()` aliases so an alias can be compared with what it really means. */
function resolveAlias(
  value: string,
  tokens: Map<string, string>,
  depth = 0
): string {
  if (depth > 12) {
    throw new Error(`Alias chain did not terminate: ${value}`)
  }
  const replaced = value.replace(VAR_REFERENCE, (match, name: string) =>
    tokens.has(name)
      ? resolveAlias(tokens.get(name) ?? "", tokens, depth + 1)
      : match
  )
  return replaced === value ? value : resolveAlias(replaced, tokens, depth + 1)
}

function classAttribute(html: string) {
  return html.match(/class="([^"]*)"/)?.[1] ?? ""
}

async function compileFieldFocusCss() {
  const source = [
    '@import "tailwindcss" source(none);',
    `@import "${path.join(tokensDir, "figma/variables.css")}";`,
    `@import "${businessAtomsPath}";`,
    '@source inline("focus:bg-input-bg-focus focus:bg-textarea-bg-focus has-[input:focus]:bg-numeric-input-input-bg-focus");',
  ].join("\n")
  const { css } = await postcss([tailwindcss()]).process(source, {
    from: path.join(tokensDir, "business-field-focus-probe.css"),
  })
  return css
}

describe("Business field focus", () => {
  it("keeps each field on its own resting fill while focused", () => {
    expect(businessTokens.get("--color-input-bg-focus")).toBe(
      "var(--color-input-bg-base)"
    )
    expect(businessTokens.get("--color-textarea-bg-focus")).toBe(
      "var(--color-textarea-bg)"
    )
    expect(businessTokens.get("--color-numeric-input-input-bg-focus")).toBe(
      "var(--color-numeric-input-bg)"
    )

    // Focus and rest resolve to the same live value, so focusing adds no paint.
    const pairs = [
      ["--color-input-bg-focus", "--color-input-bg-base"],
      ["--color-textarea-bg-focus", "--color-textarea-bg"],
      ["--color-numeric-input-input-bg-focus", "--color-numeric-input-bg"],
    ] as const
    for (const [focus, resting] of pairs) {
      const focusFill = resolveAlias(`var(${focus})`, businessCascade)
      const restingFill = resolveAlias(`var(${resting})`, businessCascade)
      expect(focusFill).toBe(restingFill)
      // The chain terminates in a real paint, not in a dangling reference.
      expect(focusFill).toMatch(/light-dark|color-mix|oklch|rgb|hsl/)
    }

    // The shared focus role really is a different surface, so keeping the
    // resting fill is the visible change rather than a no-op alias.
    const sharedFocus = resolveAlias(
      "var(--color-form-control-bg-focus)",
      businessCascade
    )
    const sharedResting = resolveAlias(
      "var(--color-form-control-bg)",
      businessCascade
    )
    expect(sharedFocus).not.toBe(sharedResting)
    expect(
      resolveAlias("var(--color-input-bg-focus)", businessCascade)
    ).not.toBe(sharedFocus)

    // The compound NumericInput paints its resting fill from the shared
    // form-control base, so its own neutral alias is that same surface.
    expect(formControl).toContain(
      "background-color: var(--color-form-control-bg)"
    )
    expect(resolveAlias("var(--color-numeric-input-bg)", businessCascade)).toBe(
      sharedResting
    )
  })

  it("keeps the override Business-only and leaves the shared roles alone", () => {
    const selectors: string[] = []
    postcss.parse(businessAtoms).walkRules((rule) => {
      selectors.push(rule.selector)
    })
    expect(selectors).toEqual(['[data-theme="business"]'])

    // No shared role and no other component alias moves with it.
    expect(businessTokens.has("--color-form-control-bg")).toBe(false)
    expect(businessTokens.has("--color-form-control-bg-focus")).toBe(false)
    expect(businessTokens.has("--color-form-control-bg-hover")).toBe(false)
    const focusAliases = [...businessTokens.keys()]
      .filter((name) => name.endsWith("-bg-focus"))
      .sort()
    expect(focusAliases).toEqual([
      "--color-input-bg-focus",
      "--color-numeric-input-input-bg-focus",
      "--color-textarea-bg-focus",
    ])

    // Other brands keep the shared form-control focus fill.
    const sharedFocus = "var(--color-form-control-bg-focus)"
    expect(baseTokens.get("--color-input-bg-focus")).toBe(sharedFocus)
    expect(baseTokens.get("--color-textarea-bg-focus")).toBe(sharedFocus)
    expect(baseTokens.get("--color-numeric-input-input-bg-focus")).toBe(
      sharedFocus
    )
    for (const alias of focusAliases) {
      expect(brandOverrides).not.toContain(`${alias}:`)
    }
  })

  it("keeps the atoms consuming those aliases through real Tailwind output", async () => {
    const inputClasses = classAttribute(
      renderToStaticMarkup(<Input aria-label="Name" defaultValue="Alex" />)
    )
    expect(inputClasses).toContain("bg-input-bg-base")
    expect(inputClasses).toContain("focus:bg-input-bg-focus")
    expect(inputClasses).toContain("disabled:hover:bg-input-bg-disabled")

    const textareaClasses = classAttribute(
      renderToStaticMarkup(<Textarea aria-label="Notes" defaultValue="Hi" />)
    )
    expect(textareaClasses).toContain("bg-textarea-bg")
    expect(textareaClasses).toContain("focus:bg-textarea-bg-focus")

    const canvas = document.createElement("div")
    canvas.innerHTML = renderToStaticMarkup(
      <NumericInput defaultValue={2}>
        <NumericInput.Control>
          <NumericInput.Input aria-label="Quantity" />
        </NumericInput.Control>
      </NumericInput>
    )
    const control = canvas.querySelector(
      '[data-scope="number-input"][data-part="control"]'
    )
    const editor = canvas.querySelector('[role="spinbutton"]')
    // One compound fill: the group carries the state surface and the editor
    // keeps the numeric editor's own alias classes rather than a second
    // opaque field fill.
    expect(control?.classList.contains("form-control-base")).toBe(true)
    expect(
      control?.classList.contains(
        "has-[input:focus]:bg-numeric-input-input-bg-focus"
      )
    ).toBe(true)
    expect(editor?.classList.contains("bg-numeric-input-input-bg")).toBe(true)
    expect(editor?.classList.contains("focus:bg-numeric-input-input-bg")).toBe(
      true
    )
    expect(editor?.classList.contains("focus:bg-transparent")).toBe(false)

    const css = await compileFieldFocusCss()
    const root = postcss.parse(css)
    const candidates = [
      "bg-input-bg-focus",
      "bg-textarea-bg-focus",
      "bg-numeric-input-input-bg-focus",
    ]
    const utilities = new Map<
      string,
      { selector: string; declarations: Record<string, string> }
    >()
    root.walkRules((rule) => {
      const candidate = candidates.find((name) => rule.selector.includes(name))
      if (!candidate) {
        return
      }
      const found: Record<string, string> = {}
      rule.each((declaration) => {
        if (declaration.type === "decl") {
          expect(declaration.important).toBeUndefined()
          found[declaration.prop] = declaration.value
        }
      })
      utilities.set(candidate, { selector: rule.selector, declarations: found })
    })

    const readUtility = (className: string) => {
      const entry = utilities.get(className)
      if (!entry) {
        throw new Error(`Tailwind did not emit ${className}`)
      }
      return entry
    }

    // Each field reads its own alias, so the Business value is the live one.
    expect(
      readUtility("bg-input-bg-focus").declarations["background-color"]
    ).toBe("var(--color-input-bg-focus)")
    expect(
      readUtility("bg-textarea-bg-focus").declarations["background-color"]
    ).toBe("var(--color-textarea-bg-focus)")
    const numeric = readUtility("bg-numeric-input-input-bg-focus")
    expect(numeric.declarations["background-color"]).toBe(
      "var(--color-numeric-input-input-bg-focus)"
    )
    expect(numeric.selector).toContain(":has(:is(input:focus))")
  })
})

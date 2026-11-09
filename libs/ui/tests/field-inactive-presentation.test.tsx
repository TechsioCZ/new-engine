// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/postcss"
import postcss, {
  type AtRule,
  type Declaration,
  type Node,
  type Rule,
} from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { NumericInput } from "../src/atoms/numeric-input"
import { Textarea } from "../src/atoms/textarea"

// Focused regression for the inactive field presentation batch. Two pictured
// inconsistencies are pinned here: the Business NumericInput invalid fill must
// stay on the same neutral surface Business Input and Textarea paint, and a
// disabled Textarea must stop offering the native resize grip without changing
// editable or read-only resize modes.

// happy-dom replaces the module URL, so resolve the package root from the
// vitest working directory instead.
const uiRoot = process.cwd().endsWith(path.join("libs", "ui"))
  ? process.cwd()
  : path.join(process.cwd(), "libs", "ui")
const tokensDir = path.join(uiRoot, "src", "tokens")
const tokensSource = (file: string) =>
  readFileSync(path.join(tokensDir, file), "utf8")
const atomSource = (file: string) =>
  readFileSync(path.join(uiRoot, "src", "atoms", file), "utf8")

const INVALID_FILL = "--color-numeric-input-bg-invalid"
const SHARED_INVALID_FILL = "var(--color-bg-danger-subtle)"
const BUSINESS_INVALID_FILL = "var(--color-numeric-input-bg)"
const SHARED_FIELD_FILL = "var(--color-form-control-bg)"
const THEME_SCOPE = /\[data-theme="([^"]+)"\]/
const CLASS_ATTRIBUTE = /class="([^"]+)"/

function declarationsOf(css: string, property: string) {
  const found: Declaration[] = []
  postcss.parse(css).walkDecls(property, (declaration) => {
    found.push(declaration)
  })
  return found
}

// The nearest enclosing `@scope ([data-theme="…"])` names the brand that owns
// a declaration; a declaration outside any brand scope is shared.
function brandOf(node: Node | undefined): string | null {
  let current = node
  while (current) {
    if (current.type === "atrule") {
      const rule = current as AtRule
      if (rule.name === "scope") {
        return THEME_SCOPE.exec(rule.params)?.[1] ?? null
      }
    }
    current = current.parent as Node | undefined
  }
  return null
}

function brandScope(css: string, brand: string) {
  let scope: AtRule | undefined
  postcss.parse(css).walkAtRules("scope", (rule) => {
    if (THEME_SCOPE.exec(rule.params)?.[1] === brand) {
      scope = rule
    }
  })
  return scope
}

function classesOf(markup: string) {
  return markup.match(CLASS_ATTRIBUTE)?.[1]?.split(" ") ?? []
}

function elementOf(markup: string, selector: string) {
  const canvas = document.createElement("div")
  canvas.innerHTML = markup
  const node = canvas.querySelector(selector)
  if (!node) {
    throw new Error(`Rendered markup must contain ${selector}`)
  }
  return node
}

// Compile the real component stylesheets so the assertions read Tailwind's
// emitted output rather than the authored source.
async function compileProbe(inline: string) {
  const input = [
    '@import "tailwindcss" source(none);',
    `@import "${path.join(tokensDir, "figma/variables.css")}";`,
    `@import "${path.join(tokensDir, "_scheme-scopes.css")}";`,
    `@import "${path.join(tokensDir, "components/_form-control.css")}";`,
    `@import "${path.join(tokensDir, "components/atoms/_numeric-input.css")}";`,
    `@import "${path.join(tokensDir, "components/atoms/_textarea.css")}";`,
    // The NumericInput stepper glyph aliases @apply the icon atom's glyph
    // utilities, which need the iconify plugin. Stub only those two aliases so
    // the real validation utility below compiles unchanged.
    "@utility token-icon-increment { --probe-glyph: increment; }",
    "@utility token-icon-decrement { --probe-glyph: decrement; }",
    `@source inline("${inline}");`,
    "",
  ].join("\n")
  const { css } = await postcss([tailwindcss()]).process(input, {
    from: path.join(tokensDir, "field-inactive-emitted-probe.css"),
  })
  return css
}

function resizeDeclarations(css: string, selectorIncludes: string) {
  const found: Declaration[] = []
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selector.includes(selectorIncludes)) {
      return
    }
    rule.walkDecls("resize", (declaration) => {
      found.push(declaration)
    })
  })
  return found
}

describe("Business NumericInput invalid fill", () => {
  it("repoints the invalid fill to an alias the component already owns", () => {
    const authored = declarationsOf(
      tokensSource("_business-atoms.css"),
      INVALID_FILL
    )
    expect(authored).toHaveLength(1)
    const [declaration] = authored
    if (!declaration) {
      throw new Error("Business atoms must own the numeric invalid fill alias")
    }
    expect((declaration.parent as Rule).selector).toBe(
      '[data-theme="business"]'
    )
    // An existing neutral field alias, not a new token or a raw colour.
    expect(declaration.value).toBe(BUSINESS_INVALID_FILL)
    // The neutral target is the shared field surface Input and Textarea wear.
    expect(tokensSource("figma/variables.css")).toContain(
      `--color-numeric-input-bg: ${SHARED_FIELD_FILL}`
    )
  })

  it("regenerates the shared danger fill and the Business neutral override", () => {
    const generated = tokensSource("_scheme-scopes.css")
    const resolved = declarationsOf(generated, INVALID_FILL).map(
      (declaration) => ({
        brand: brandOf(declaration.parent),
        value: declaration.value,
      })
    )
    expect(resolved).toEqual([
      { brand: null, value: SHARED_INVALID_FILL },
      { brand: "business", value: BUSINESS_INVALID_FILL },
    ])
    for (const other of ["neo", "akros"]) {
      const scope = brandScope(generated, other)
      if (!scope) {
        throw new Error(`${other} brand scope must exist`)
      }
      const overrides: string[] = []
      scope.walkDecls(INVALID_FILL, (declaration) => {
        overrides.push(declaration.value)
      })
      expect(overrides).toEqual([])
    }
  })

  it("keeps the invalid fill consumed by the emitted validation rule", async () => {
    const css = await compileProbe("numeric-input-validation")
    const invalidRules: { selector: string; backgrounds: string[] }[] = []
    postcss.parse(css).walkRules((rule) => {
      if (!rule.selector.includes("numeric-input-validation")) {
        return
      }
      const backgrounds: string[] = []
      rule.walkDecls("background-color", (declaration) => {
        backgrounds.push(declaration.value)
      })
      invalidRules.push({ selector: rule.selector, backgrounds })
    })
    expect(invalidRules).toHaveLength(1)
    const [invalidRule] = invalidRules
    if (!invalidRule) {
      throw new Error("Tailwind must emit the numeric validation rule")
    }
    // The rule must read the alias so a brand scope (or a caller) can repaint
    // it; copying the value at build time would freeze the fill.
    expect(invalidRule.backgrounds).toEqual([`var(${INVALID_FILL})`])
    // Disabled stays authoritative: the invalid paint never reaches a
    // disabled field.
    expect(invalidRule.selector).toContain(":not([data-disabled])")
    expect(invalidRule.selector).toContain("[data-invalid]")
    const business = brandScope(css, "business")
    if (!business) {
      throw new Error("Business scope must survive the Tailwind build")
    }
    const businessFills: string[] = []
    business.walkDecls(INVALID_FILL, (declaration) => {
      businessFills.push(declaration.value)
    })
    expect(businessFills).toEqual([BUSINESS_INVALID_FILL])
    expect(atomSource("numeric-input.tsx")).toContain(
      "numeric-input-validation"
    )
  })

  it("paints an invalid control through the alias instead of a pink utility", () => {
    const markup = renderToStaticMarkup(
      <NumericInput defaultValue={150} invalid>
        <NumericInput.Control>
          <NumericInput.Input aria-label="Quantity" />
          <NumericInput.TriggerContainer>
            <NumericInput.IncrementTrigger />
            <NumericInput.DecrementTrigger />
          </NumericInput.TriggerContainer>
        </NumericInput.Control>
      </NumericInput>
    )
    const control = elementOf(markup, '[data-part="control"]')
    expect(control.hasAttribute("data-invalid")).toBe(true)
    expect(control.hasAttribute("data-disabled")).toBe(false)
    const classes = Array.from(control.classList)
    expect(classes).toContain("numeric-input-validation")
    expect(classes).toContain("form-control-base")
    expect(classes.some((name) => name.includes("danger"))).toBe(false)
    expect(classes.some((name) => name.startsWith("bg-numeric-input-bg"))).toBe(
      false
    )
  })
})

describe("Disabled Textarea resize mode", () => {
  it("keeps the configured resize mode for editable and read-only fields", () => {
    const editable = classesOf(
      renderToStaticMarkup(<Textarea aria-label="Notes" />)
    )
    expect(editable).toContain("disabled:resize-none")
    expect(editable).toContain("resize-y")

    const readOnly = classesOf(
      renderToStaticMarkup(<Textarea aria-label="Notes" readOnly resize="x" />)
    )
    expect(readOnly).toContain("resize-x")
    expect(readOnly).not.toContain("resize-none")
    const readOnlyField = elementOf(
      renderToStaticMarkup(<Textarea aria-label="Notes" readOnly resize="x" />),
      "textarea"
    ) as HTMLTextAreaElement
    expect(readOnlyField.readOnly).toBe(true)
    expect(readOnlyField.disabled).toBe(false)

    const auto = classesOf(
      renderToStaticMarkup(<Textarea aria-label="Notes" resize="auto" />)
    )
    expect(auto).toContain("field-sizing-content")
    expect(auto).toContain("resize-none")
  })

  it("merges the caller's own class while keeping native disabled semantics", () => {
    const markup = renderToStaticMarkup(
      <Textarea
        aria-label="Notes"
        className="resize-x"
        disabled
        resize="both"
      />
    )
    const classes = classesOf(markup)
    expect(classes).toContain("disabled:resize-none")
    // The caller's own mode wins the merge, so the variant mode is replaced
    // rather than duplicated.
    expect(classes).toContain("resize-x")
    expect(classes).not.toContain("resize")
    const field = elementOf(markup, "textarea") as HTMLTextAreaElement
    expect(field.disabled).toBe(true)
    expect(field.disabled).toBe(field.hasAttribute("disabled"))
    expect(field.getAttribute("aria-label")).toBe("Notes")
  })

  it("emits a non-important disabled resize state utility", async () => {
    const css = await compileProbe(
      "disabled:resize-none resize-y resize-x resize-none resize field-sizing-content"
    )
    const disabledResize = resizeDeclarations(css, ":disabled")
    expect(disabledResize).toHaveLength(1)
    const [declaration] = disabledResize
    if (!declaration) {
      throw new Error("Tailwind must emit the disabled resize state")
    }
    expect(declaration.value).toBe("none")
    // An ordinary state utility: specificity beats the base mode, so no
    // !important is needed and a caller can still outrank it.
    expect(declaration.important).toBeUndefined()
    expect((declaration.parent as Rule).selector).toContain("resize-none")

    expect(resizeDeclarations(css, ".resize-y")[0]?.value).toBe("vertical")
    expect(resizeDeclarations(css, ".resize-x")[0]?.value).toBe("horizontal")
    expect(resizeDeclarations(css, ".resize-none")[0]?.value).toBe("none")
  })
})

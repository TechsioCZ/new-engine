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
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { NumericInput } from "../src/atoms/numeric-input"
import { Textarea } from "../src/atoms/textarea"
import { Disabled as InputDisabled } from "../stories/atoms/input.stories"
import { Disabled as NumericInputDisabled } from "../stories/atoms/numeric-input.stories"
import { Disabled as TextareaDisabled } from "../stories/atoms/textarea.stories"

// Focused regression for the inactive field presentation batch. The pictured
// inconsistencies are pinned here: the Business NumericInput invalid fill must
// stay on the same neutral surface Business Input and Textarea paint, a
// disabled Textarea must stop offering the native resize grip without changing
// editable or read-only resize modes, the Business read-only surface must read
// the shared read-only role instead of the editable resting fill, and the
// disabled helper dim must stay inside the Business brand without the atom
// claiming ownership of an external label.

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
const READONLY_FILL = "--color-textarea-readonly"
const SHARED_READONLY_FILL = "var(--color-form-control-readonly)"
const DISABLED_FOREGROUND = "--color-fg-disabled"
const HELPER_FOREGROUND_SELECTOR = /(fg-disabled|status-text-fg)/
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
    for (const other of ["n1", "akros"]) {
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

describe("Business Textarea read-only surface", () => {
  it("repoints the Business read-only alias to the shared read-only role", () => {
    const authored = declarationsOf(
      tokensSource("_business-atoms.css"),
      READONLY_FILL
    )
    expect(authored).toHaveLength(1)
    const [declaration] = authored
    if (!declaration) {
      throw new Error("Business atoms must own the textarea read-only alias")
    }
    expect((declaration.parent as Rule).selector).toBe(
      '[data-theme="business"]'
    )
    // The editable resting fill is not a read-only surface; Business reads the
    // same shared read-only role Business Input already reads.
    expect(declaration.value).toBe(SHARED_READONLY_FILL)
    expect(declaration.value).not.toBe("var(--color-fill-base)")
    // The shared default is unchanged, so every other brand keeps its fill.
    expect(tokensSource("components/atoms/_textarea.css")).toContain(
      `${READONLY_FILL}: ${SHARED_READONLY_FILL}`
    )
  })

  it("regenerates the Business read-only alias without touching other brands", () => {
    const generated = tokensSource("_scheme-scopes.css")
    const resolved = declarationsOf(generated, READONLY_FILL).map(
      (declaration) => ({
        brand: brandOf(declaration.parent),
        value: declaration.value,
      })
    )
    expect(resolved).toEqual([
      { brand: null, value: SHARED_READONLY_FILL },
      { brand: "business", value: SHARED_READONLY_FILL },
    ])
    for (const other of ["n1", "akros"]) {
      const scope = brandScope(generated, other)
      if (!scope) {
        throw new Error(`${other} brand scope must exist`)
      }
      const overrides: string[] = []
      scope.walkDecls(READONLY_FILL, (declaration) => {
        overrides.push(declaration.value)
      })
      expect(overrides).toEqual([])
    }
  })

  it("paints read-only through the shared alias and keeps every resize mode", async () => {
    const css = await compileProbe("form-control-readonly textarea-readonly")
    const readonlyBackgrounds: string[] = []
    const textareaAliases: string[] = []
    postcss.parse(css).walkRules((rule) => {
      if (rule.selector.includes("form-control-readonly")) {
        rule.walkDecls("background-color", (declaration) => {
          readonlyBackgrounds.push(declaration.value)
        })
      }
      if (rule.selector.includes("textarea-readonly")) {
        rule.walkDecls((declaration) => {
          if (declaration.prop === "--color-form-control-bg-readonly") {
            textareaAliases.push(declaration.value)
          }
        })
      }
    })
    // The read-only paint reads the shared alias, and the component feeds that
    // alias from its own read-only surface instead of a frozen value.
    expect(readonlyBackgrounds).toEqual([
      "var(--color-form-control-bg-readonly)",
    ])
    expect(textareaAliases).toEqual(["var(--color-textarea-bg-readonly)"])

    const readOnly = classesOf(
      renderToStaticMarkup(<Textarea aria-label="Notes" readOnly />)
    )
    expect(readOnly).toContain("form-control-readonly")
    expect(readOnly).toContain("textarea-readonly")
    // Read-only keeps the configured resize mode: view resizing is not editing.
    expect(readOnly).toContain("resize-y")
    expect(readOnly).not.toContain("resize-none")
  })
})

describe("Disabled field label and helper hierarchy", () => {
  it("keeps the NumericInput disabled example's external label caller-owned", () => {
    const canvas = renderStory(NumericInputDisabled)
    const input = canvas.querySelector("input")
    const label = canvas.querySelector("label")
    if (!(input && label)) {
      throw new Error("The disabled numeric example must keep its label")
    }
    expect(input.disabled).toBe(true)
    expect(label.getAttribute("for")).toBe(input.id)
    // The caller dims the label through Label's own disabled treatment; the
    // atom never owns an external label's state.
    expect(Array.from(label.classList)).toContain("text-label-fg-disabled")
    const control = canvas.querySelector('[data-part="control"]')
    expect(control?.hasAttribute("data-disabled")).toBe(true)
  })

  it("scopes the disabled Textarea helper dimming to the Business brand", () => {
    const canvas = renderStory(TextareaDisabled)
    const field = canvas.querySelector("textarea")
    const label = canvas.querySelector("label")
    const helper = canvas.querySelector('[data-status="default"]')
    if (!(field && label && helper)) {
      throw new Error(
        "The disabled textarea example must keep its label, field and helper"
      )
    }
    expect(field.disabled).toBe(true)
    expect(Array.from(label.classList)).toContain("text-label-fg-disabled")
    // Only Business dims the helper, and it reaches the dim through the brand's
    // own ancestor scope instead of a bare disabled foreground.
    expect(Array.from(helper.classList)).toContain(
      "in-data-[theme=business]:text-fg-disabled"
    )
    expect(Array.from(helper.classList)).not.toContain("text-fg-disabled")
    // Every other brand keeps the neutral StatusText foreground it had before.
    expect(Array.from(helper.classList)).toContain("text-status-text-fg")
    // The helper still explains why the field is unavailable.
    expect(helper.textContent).toContain(
      "Available after the order is confirmed."
    )
    expect(field.getAttribute("aria-describedby")).toBe(helper.id)
  })

  it("resolves the label's disabled foreground from the shared disabled role", () => {
    const generated = tokensSource("_scheme-scopes.css")
    expect(
      declarationsOf(generated, "--color-label-fg-disabled").map(
        (declaration) => declaration.value
      )
    ).toEqual([`var(${DISABLED_FOREGROUND})`])
  })

  it("emits the Business-scoped helper dim beside the neutral role", async () => {
    const css = await compileProbe(
      "text-status-text-fg in-data-[theme=business]:text-fg-disabled"
    )
    const emitted: { selector: string; colours: string[] }[] = []
    postcss.parse(css).walkRules((rule) => {
      if (!HELPER_FOREGROUND_SELECTOR.test(rule.selector)) {
        return
      }
      const colours: string[] = []
      rule.walkDecls("color", (declaration) => {
        colours.push(declaration.value)
      })
      emitted.push({ selector: rule.selector, colours })
    })
    // The neutral role Akros and the other brands keep is emitted untouched...
    expect(emitted.map((rule) => rule.colours)).toEqual([
      ["var(--color-status-text-fg)"],
      [`var(${DISABLED_FOREGROUND})`],
    ])
    const [neutral, scoped] = emitted
    expect(neutral?.selector).toBe(".text-status-text-fg")
    // ...and the dim is reachable only under the Business ancestor, so no
    // other brand inherits the disabled-label foreground.
    expect(scoped?.selector).toContain(':where([data-theme="business"])')
    expect(scoped?.selector).toContain("text-fg-disabled")
  })
})

describe("Verified field presentation consistency", () => {
  it("scopes the disabled Input helper dimming to Business", () => {
    const canvas = renderStory(InputDisabled)
    const field = canvas.querySelector("input")
    const helper = canvas.querySelector('[data-status="default"]')
    if (!(field && helper)) {
      throw new Error("Disabled Input must retain its field and helper")
    }
    expect(field.disabled).toBe(true)
    expect(field.getAttribute("aria-describedby")).toBe(helper.id)
    expect(Array.from(helper.classList)).toContain(
      "in-data-[theme=business]:text-fg-disabled"
    )
    expect(Array.from(helper.classList)).toContain("text-status-text-fg")
    expect(Array.from(helper.classList)).not.toContain("text-fg-disabled")
  })

  it("aligns only the Business large radius with Input and preserves other themes", () => {
    const alias = "--radius-textarea-surface-lg"
    const shared = declarationsOf(
      tokensSource("components/atoms/_textarea.css"),
      alias
    )
    expect(shared.map((declaration) => declaration.value)).toEqual([
      "var(--radius-textarea)",
    ])
    const business = declarationsOf(tokensSource("_business-atoms.css"), alias)
    expect(business.map((declaration) => declaration.value)).toEqual([
      "var(--radius-input-lg)",
    ])
    const generated = declarationsOf(tokensSource("_scheme-scopes.css"), alias)
    expect(
      generated.map((declaration) => ({
        brand: brandOf(declaration.parent),
        value: declaration.value,
      }))
    ).toEqual([
      { brand: null, value: "var(--radius-textarea)" },
      { brand: "business", value: "var(--radius-input-lg)" },
    ])
  })

  it("consumes the live large radius and preserves caller radius utilities", async () => {
    const classes = classesOf(
      renderToStaticMarkup(<Textarea aria-label="Notes" size="lg" />)
    )
    expect(classes).toContain("rounded-(--radius-textarea-surface-lg)")
    expect(classes).not.toContain("rounded-textarea")
    for (const size of ["sm", "md", "lg", undefined] as const) {
      const radiusClasses = classesOf(
        renderToStaticMarkup(
          <Textarea aria-label="Notes" className="rounded-none" size={size} />
        )
      ).filter((name) => name.startsWith("rounded-"))
      expect(radiusClasses).toEqual(["rounded-none"])
    }
    const overridden = classesOf(
      renderToStaticMarkup(
        <Textarea aria-label="Notes" className="rounded-none" size="lg" />
      )
    )
    expect(overridden).toContain("rounded-none")
    expect(overridden).not.toContain("rounded-(--radius-textarea-surface-lg)")
    const css = await compileProbe("rounded-(--radius-textarea-surface-lg)")
    const radii: string[] = []
    postcss.parse(css).walkRules((rule) => {
      if (rule.selector.includes("radius-textarea-surface-lg")) {
        rule.walkDecls("border-radius", (declaration) => {
          radii.push(declaration.value)
        })
      }
    })
    expect(radii).toEqual(["var(--radius-textarea-surface-lg)"])
  })
})

// Render a story composition the way the storybook canvas does, so these
// assertions read the same markup the pictured examples ship.
function renderStory(story: { render?: unknown }) {
  function Fixture() {
    if (typeof story.render !== "function") {
      throw new Error("Story must retain its composition")
    }
    return (story.render as () => ReactNode)()
  }
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(<Fixture />)
  return canvas
}

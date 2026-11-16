// Default Link focus strengthens the link's own underline without changing
// inline geometry and without painting any focus box.
// Caller focus paint and the forced-colours fallback remain independently usable.
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/postcss"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Link } from "../src/atoms/link"

const tokensDir = fileURLToPath(new URL("../src/tokens/", import.meta.url))
const linkCssPath = path.join(tokensDir, "components/atoms/_link.css")
const linkCss = readFileSync(linkCssPath, "utf8")
const semanticCss = readFileSync(path.join(tokensDir, "_semantic.css"), "utf8")
const figmaCss = readFileSync(
  path.join(tokensDir, "figma/variables.css"),
  "utf8"
)
const foundationCss = readFileSync(
  path.join(tokensDir, "_foundation-overrides.css"),
  "utf8"
)

const ANCHOR_CLASSES = /<a\b[^>]*class="([^"]*)"/
const ARBITRARY_LITERAL = /\[[^\]]*\]/
const VAR_REFERENCE = /var\(\s*(--[\w-]+)\s*\)/g
/** The shared two-tone focus rule paints exactly these states. */
const SHARED_FOCUS_EXCLUSION = /:not\(\s*:disabled,\s*\[data-disabled\]\s*\)/
/** Layout-affecting utilities would move glyphs or change the inline box. */
const LAYOUT_UTILITY =
  /(?:^|\s)(?:-?(?:m[trblxyse]?|p[trblxyse]?)|w|h|size|inline-block|inline-flex|block|transform|translate-x|translate-y|scale)-/

function declarations(css: string) {
  const values = new Map<string, string>()
  postcss.parse(css).walkDecls((decl) => {
    if (decl.prop.startsWith("--")) {
      values.set(decl.prop, decl.value)
    }
  })
  return values
}

const linkTokens = declarations(linkCss)
const themeTokens = new Map([
  ...declarations(semanticCss),
  ...declarations(figmaCss),
])

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

/** Top-level halves of a resolved `light-dark()`, so inverse pairs can be compared. */
function lightDarkBranches(value: string) {
  if (!(value.startsWith("light-dark(") && value.endsWith(")"))) {
    return
  }
  const body = value.slice("light-dark(".length, -1)
  let depth = 0
  for (let index = 0; index < body.length; index++) {
    const character = body[index]
    if (character === "(") {
      depth += 1
    } else if (character === ")") {
      depth -= 1
    } else if (character === "," && depth === 0) {
      return [body.slice(0, index).trim(), body.slice(index + 1).trim()]
    }
  }
  throw new Error("Expected two top-level light-dark() branches")
}

function classes(html: string) {
  return html.match(ANCHOR_CLASSES)?.[1] ?? ""
}

async function compileFocusCss() {
  const source = [
    '@import "tailwindcss" source(none);',
    `@import "${linkCssPath}";`,
    '@source inline("hover:decoration-2 focus-visible:link-focus-inline data-focus-visible:link-focus-inline");',
  ].join("\n")
  const { css } = await postcss([tailwindcss()]).process(source, {
    from: path.join(path.dirname(linkCssPath), "link-focus-probe.css"),
  })
  return css
}

describe("Link inline focus", () => {
  it("strengthens the link's own underline with live scheme tokens", () => {
    // Focus is the link's own underline made unmistakable: one continuous rule
    // in the shared ring colour, one border step heavier than the hover
    // hairline and dropped clear of the glyphs. No focus-only colour pair and
    // no focus fill are introduced.
    expect(linkTokens.get("--color-link-focus-decoration")).toBe(
      "var(--color-link-ring)"
    )
    expect(linkTokens.get("--color-link-ring")).toBe(
      "var(--color-ring-default)"
    )
    expect(linkTokens.get("--border-width-link-focus")).toBe(
      "var(--border-width-lg)"
    )
    expect(linkTokens.get("--spacing-link-focus-underline-offset")).toBe(
      "var(--dimension-4)"
    )
    expect(linkTokens.get("--color-link-fg-readable")).toBe(
      "var(--color-link-text)"
    )

    const all = new Map([...linkTokens, ...themeTokens])
    const decoration = resolveAlias("var(--color-link-focus-decoration)", all)
    const thickness = resolveAlias("var(--border-width-link-focus)", all)
    const offset = resolveAlias(
      "var(--spacing-link-focus-underline-offset)",
      all
    )

    // The underline colour is a live scheme token, so it follows light/dark
    // instead of freezing one scheme's colour.
    expect(themeTokens.has("--color-ring-default")).toBe(true)
    const branches = lightDarkBranches(decoration)
    if (branches === undefined) {
      throw new Error("Focus decoration must resolve to a light-dark() pair")
    }
    expect(branches[0]).not.toBe(branches[1])

    // The weight has to terminate in a real length token, not in a dangling
    // reference, and it is heavier than the resting hairline.
    expect(themeTokens.has("--border-width-lg")).toBe(true)
    expect(thickness).toBe(themeTokens.get("--border-width-lg"))
    expect(Number.parseFloat(thickness)).toBeGreaterThan(1)

    // The extra clearance is a real length too, so the rule can drop clear of
    // descenders instead of relying on skip-ink gaps.
    expect(themeTokens.has("--dimension-4")).toBe(true)
    expect(offset).toBe(themeTokens.get("--dimension-4"))
    expect(Number.parseFloat(offset)).toBeGreaterThan(0)
  })

  it("keeps shared ring geometry unchanged and adds no layout space", () => {
    // Link only reads shared tokens; it never redeclares the shared ring offset.
    expect(linkCss).not.toContain("--default-ring-offset:")
    expect(linkCss).not.toContain("!important")
    expect(linkCss).not.toContain("forced-color-adjust")
    expect(linkCss).not.toContain("padding-inline")
    expect(linkCss).not.toContain("margin-inline")
    expect(linkCss).not.toContain("transform")
    // The focus paint is decoration only: no fill and no box geometry to inset.
    expect(linkCss).not.toContain("background-color")
    expect(linkCss).not.toContain("border-radius")
    // The local halo colour covers the same states as the shared compositor.
    expect(linkCss).not.toContain("box-shadow:")
    expect(linkCss).not.toContain("outline: none")
    expect(SHARED_FOCUS_EXCLUSION.test(foundationCss)).toBe(true)
    expect(SHARED_FOCUS_EXCLUSION.test(linkCss)).toBe(true)

    const html = renderToStaticMarkup(
      <p className="max-w-md text-fg-primary">
        Orders ship within two working days.{" "}
        <Link href="#delivery" size="current">
          Read delivery information
        </Link>
        {"."}
      </p>
    )
    const classNames = classes(html)
    expect(classNames).toContain("focus-visible:link-focus-inline")
    expect(classNames).toContain("data-focus-visible:link-focus-inline")
    expect(classNames.split(" ")).not.toContain("link-focus-inline")
    expect(classNames).not.toContain("focus-visible:rounded")
    expect(classNames).toContain("underline")
    expect(classNames).not.toContain("outline-link-ring")
    expect(classNames).not.toContain("focus-visible:outline")
    expect(classNames).not.toContain("link-focus-clearance")
    expect(classNames).not.toMatch(LAYOUT_UTILITY)
    expect(classNames).not.toMatch(ARBITRARY_LITERAL)
    // The trailing period stays a sibling text node, so nothing may paint over it.
    expect(html).toContain("</a>.</p>")
  })

  it("emits the focus highlight, the reset and the forced-colours fallback", async () => {
    const css = await compileFocusCss()
    const root = postcss.parse(css)
    const focusRules: {
      selector: string
      layered: boolean
      declarations: Record<string, string>
    }[] = []
    root.walkRules((rule) => {
      if (!rule.selector.includes("link-focus-inline")) {
        return
      }
      const found: Record<string, string> = {}
      rule.each((declaration) => {
        if (declaration.type === "decl") {
          expect(declaration.important).toBeUndefined()
          found[declaration.prop] = declaration.value
        }
      })
      focusRules.push({
        selector: rule.selector,
        layered: rule.parent?.type === "atrule",
        declarations: found,
      })
    })

    const highlight = focusRules.find(
      (rule) =>
        rule.declarations["text-decoration-style"] === "solid" &&
        rule.selector.includes(":focus-visible")
    )
    expect(highlight?.declarations).toEqual({
      "--color-focus-contrast": "transparent",
      "text-decoration-line": "underline",
      "text-decoration-style": "solid",
      "text-decoration-color": "var(--color-link-focus-decoration)",
      "text-decoration-thickness": "var(--border-width-link-focus)",
      "text-decoration-skip-ink": "none",
      "text-underline-offset": "var(--spacing-link-focus-underline-offset)",
      "outline-style": "none",
      "outline-width": "0",
      "outline-color": "var(--color-link-ring)",
    })
    expect(highlight?.selector).toContain(":focus-visible")
    expect(highlight?.layered).toBe(true)

    // A transparent local halo leaves the shared --tw-shadow compositor intact;
    // caller focus utilities share state specificity and follow its defaults.
    expect(
      focusRules.some((rule) => rule.selector.includes("[data-focus-visible]"))
    ).toBe(true)
    const selectors: string[] = []
    root.walkRules((rule) => {
      selectors.push(rule.selector)
    })
    const hoverIndex = selectors.findIndex((selector) =>
      selector.includes("hover\\:decoration-2")
    )
    const focusIndex = selectors.findIndex((selector) =>
      selector.includes("focus-visible\\:link-focus-inline")
    )
    expect(hoverIndex).toBeGreaterThanOrEqual(0)
    expect(focusIndex).toBeGreaterThan(hoverIndex)
    expect(highlight?.selector).toContain("[data-disabled]")
    expect(focusRules.every((rule) => rule.layered)).toBe(true)
    expect(focusRules.some((rule) => "box-shadow" in rule.declarations)).toBe(
      false
    )
    expect(foundationCss).toContain("var(--tw-shadow, 0 0 #0000)")

    const emitted = new Map<string, string>()
    const focusBoxPaint: string[] = []
    const forcedColors: Record<string, string> = {}
    root.walkDecls((declaration) => {
      if (
        declaration.prop.startsWith("--color-link-focus") ||
        declaration.prop === "--border-width-link-focus" ||
        declaration.prop === "--spacing-link-focus-underline-offset"
      ) {
        emitted.set(declaration.prop, declaration.value)
      }
    })
    // The focus utility paints decoration only: no fill and no box radius, so
    // there is no box edge that could reach the prose beside the link.
    root.walkRules((rule) => {
      if (!rule.selector.includes("link-focus-inline")) {
        return
      }
      rule.walkDecls((declaration) => {
        if (
          declaration.prop === "background-color" ||
          declaration.prop === "border-radius"
        ) {
          focusBoxPaint.push(`${declaration.prop}: ${declaration.value}`)
        }
      })
    })
    root.walkAtRules("media", (atRule) => {
      if (!atRule.params.includes("forced-colors")) {
        return
      }
      atRule.walkDecls((declaration) => {
        forcedColors[declaration.prop] = declaration.value
      })
    })
    expect(emitted.get("--color-link-focus-decoration")).toBe(
      "var(--color-link-ring)"
    )
    expect(emitted.get("--border-width-link-focus")).toBe(
      "var(--border-width-lg)"
    )
    expect(emitted.get("--spacing-link-focus-underline-offset")).toBe(
      "var(--dimension-4)"
    )
    expect(focusBoxPaint).toEqual([])
    // One rule, not a stack: the focus paint never asks for the double style
    // that used to add a second rail under the resting hairline.
    expect(css).not.toContain("text-decoration-style: double")
    expect(css).not.toContain("decoration-double")
    expect(forcedColors).toEqual({
      "text-decoration-color": "Highlight",
      outline: "var(--default-ring-width) solid CanvasText",
      "outline-offset": "calc(-1 * var(--default-ring-width))",
    })
  })

  it("keeps caller classes and the external navigation contract", () => {
    const html = renderToStaticMarkup(
      <Link
        className="underline-offset-4 focus-visible:decoration-4"
        external
        href="https://example.com"
      >
        Read the delivery guide
      </Link>
    )
    expect(html.startsWith("<a ")).toBe(true)
    const classNames = classes(html)
    expect(classNames).toContain("underline-offset-4")
    expect(classNames).toContain("focus-visible:decoration-4")
    expect(classNames).toContain("link-focus-inline")
    // The component adds no decoration utility of its own, so the focus paint
    // stays retargetable through the Link-owned tokens.
    expect(classNames).not.toContain("focus-visible:decoration-double")
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })
})

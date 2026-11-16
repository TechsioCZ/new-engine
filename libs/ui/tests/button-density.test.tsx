import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Button } from "../src/atoms/button"
import { LinkButton } from "../src/atoms/link-button"

const css = readFileSync(
  new URL("../src/tokens/components/atoms/_button.css", import.meta.url),
  "utf8"
)

const VAR_REFERENCE_LIST_RE = /^(var\(--[\w-]+\)\s*)+$/

function themeDeclarations() {
  const values = new Map<string, string>()
  postcss.parse(css).walkAtRules("theme", (rule) => {
    rule.walkDecls((decl) => {
      values.set(decl.prop, decl.value)
    })
  })
  return values
}

const CLASS_ATTRIBUTE_REGEX = /class="([^"]*)"/
const WHITESPACE_REGEX = /\s+/

// Whole class tokens only: substring checks would match `gap-button-sm` for `p-button-sm`.
function classTokens(html: string) {
  const classes = html.match(CLASS_ATTRIBUTE_REGEX)?.[1]
  return classes ? classes.split(WHITESPACE_REGEX) : []
}

describe("button density", () => {
  it.each(["sm", "md", "lg"] as const)(
    "keeps content-driven %s geometry by default",
    (size) => {
      const html = renderToStaticMarkup(<Button size={size}>Save</Button>)
      expect(html).toContain(`button-size-${size}`)
      expect(html).toContain(`p-button-${size}`)
      expect(html).not.toContain("button-compact")
    }
  )

  it.each(["sm", "md", "lg"] as const)(
    "renders fixed compact %s geometry without content-driven sizing",
    (size) => {
      const html = renderToStaticMarkup(
        <Button density="compact" size={size}>
          Save
        </Button>
      )
      const tokens = classTokens(html)
      expect(tokens).toContain(`h-button-compact-${size}`)
      expect(tokens).toContain(`p-button-compact-${size}`)
      expect(tokens).not.toContain(`button-size-${size}`)
      expect(tokens).not.toContain(`h-form-control-${size}`)
      expect(tokens).not.toContain(`p-button-${size}`)
    }
  )

  it("applies compact density to LinkButton navigation", () => {
    const html = renderToStaticMarkup(
      <LinkButton density="compact" href="/orders" size="md">
        Orders
      </LinkButton>
    )
    expect(html).toContain("h-button-compact-md")
    expect(html).toContain("p-button-compact-md")
    expect(html).not.toContain("button-size-md")
    expect(html).not.toContain("density=")
  })

  it("keeps LinkButton default geometry unchanged", () => {
    const html = renderToStaticMarkup(
      <LinkButton href="/orders">Orders</LinkButton>
    )
    expect(html).toContain("button-size-md")
    expect(html).toContain("p-button-md")
    expect(html).not.toContain("button-compact")
  })

  it("declares the compact height and padding tokens as var() references", () => {
    const tokens = themeDeclarations()
    const sizes = ["sm", "md", "lg"] as const
    for (const size of sizes) {
      for (const name of [
        `--height-button-compact-${size}`,
        `--padding-button-compact-${size}`,
      ]) {
        const value = tokens.get(name)
        expect(value, name).toBeTruthy()
        expect(value, name).toMatch(VAR_REFERENCE_LIST_RE)
      }
    }
    const heights = sizes.map((size) =>
      tokens.get(`--height-button-compact-${size}`)
    )
    expect(new Set(heights).size).toBe(sizes.length)
  })
})

import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ActionIcon } from "../src/atoms/action-icon"
import { Button } from "../src/atoms/button"
import { LinkButton } from "../src/atoms/link-button"

const css = readFileSync(
  new URL("../src/tokens/components/atoms/_button.css", import.meta.url),
  "utf8"
)

function declarations(name: string) {
  const values = new Map<string, string>()
  postcss.parse(css).walkAtRules("utility", (rule) => {
    if (rule.params === name) {
      rule.walkDecls((decl) => {
        values.set(decl.prop, decl.value)
      })
    }
  })
  return values
}

describe("disabled action treatments", () => {
  it("defaults disabled icon surfaces to the existing resting reference", () => {
    const aliases = new Map<string, string>()
    const source = readFileSync(
      new URL(
        "../src/tokens/components/atoms/_action-icon.css",
        import.meta.url
      ),
      "utf8"
    )
    postcss.parse(source).walkDecls((decl) => {
      aliases.set(decl.prop, decl.value)
    })
    expect(aliases.get("--color-action-icon-surface-disabled")).toBe(
      "var(--color-action-icon-surface)"
    )
    expect(aliases.get("--color-action-icon-bg-disabled")).toBe(
      "var(--color-action-icon-surface-disabled)"
    )
  })

  it("opts only Business into the existing unavailable icon surface", () => {
    const aliases = new Map<string, string>()
    const source = readFileSync(
      new URL("../src/tokens/_business-atoms.css", import.meta.url),
      "utf8"
    )
    postcss.parse(source).walkDecls((decl) => {
      aliases.set(decl.prop, decl.value)
    })
    expect(aliases.get("--color-action-icon-surface-disabled")).toBe(
      "var(--color-fill-disabled)"
    )
  })

  it("keeps disabled icon names and native semantics without an opacity wash", () => {
    for (const tone of ["neutral", "danger"] as const) {
      const html = renderToStaticMarkup(
        <ActionIcon
          aria-label="Remove item"
          disabled
          icon="token-icon-close"
          tone={tone}
        />
      )
      expect(html).toContain("disabled:bg-action-icon-bg-disabled")
      expect(html).toContain('aria-label="Remove item"')
      expect(html).toContain('disabled=""')
      expect(html).not.toContain("opacity-")
    }
  })

  it("retains explicit caller disabled-surface classes", () => {
    const html = renderToStaticMarkup(
      <ActionIcon
        aria-label="Remove item"
        className="disabled:bg-transparent"
        disabled
        icon="token-icon-close"
      />
    )
    expect(html).toContain("disabled:bg-transparent")
    expect(html).not.toContain("disabled:bg-action-icon-bg-disabled")
  })

  it.each(["borderless", "outlined"] as const)(
    "shares the %s silhouette with disabled navigation",
    (theme) => {
      for (const html of [
        renderToStaticMarkup(
          <Button disabled theme={theme}>
            Unavailable action
          </Button>
        ),
        renderToStaticMarkup(
          <LinkButton disabled href="/project" theme={theme}>
            Unavailable route
          </LinkButton>
        ),
      ]) {
        expect(html).toContain(`button-disabled-${theme}`)
        expect(html).not.toContain("disabled:border-0")
        expect(html).not.toContain("disabled:bg-button-bg-disabled")
        expect(html).toContain("button-size-md")
        expect(html).toContain("text-button-md")
      }
    }
  )

  it.each([
    ["borderless", "--color-button-bg-borderless-base"],
    ["outlined", "--color-button-bg-outlined"],
  ])(
    "routes disabled %s paint through its existing surface",
    (theme, alias) => {
      expect(
        declarations(`button-disabled-${theme}`).get(
          "--color-button-bg-disabled-treatment"
        )
      ).toBe(`var(${alias})`)
    }
  )

  it("keeps unavailable interaction guards and excludes busy actions", () => {
    const values = declarations("button-disabled")
    expect(values.get("background-color")?.replace(/\s+/g, "")).toBe(
      "var(--color-button-bg-disabled-treatment,var(--color-button-bg-disabled))"
    )
    expect(values.get("cursor")).toBe("not-allowed")
    expect(values.get("transform")).toBe("none")
    expect(css).toContain('[aria-disabled="true"]:not([data-loading])')
  })

  it("preserves disabled navigation semantics and filled unavailable actions", () => {
    const link = renderToStaticMarkup(
      <LinkButton disabled href="/project" theme="outlined">
        Unavailable route
      </LinkButton>
    )
    expect(link).toContain("<span")
    expect(link).toContain('aria-disabled="true"')
    expect(link).toContain('tabindex="-1"')
    expect(link).not.toContain("href=")
    for (const theme of ["solid", "light"] as const) {
      const html = renderToStaticMarkup(
        <Button disabled theme={theme}>
          Unavailable action
        </Button>
      )
      expect(html).toContain("disabled:bg-button-bg-disabled")
      expect(html).not.toContain("button-disabled-outlined")
      expect(html).not.toContain("button-disabled-borderless")
    }
  })
})

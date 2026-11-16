import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ActionIcon } from "../src/atoms/action-icon"

const css = postcss.parse(
  readFileSync(
    new URL("../src/tokens/components/atoms/_action-icon.css", import.meta.url),
    "utf8"
  )
)

describe("ActionIcon caller surfaces", () => {
  it.each([false, true])(
    "keeps caller surface utilities above the default when disabled=%s",
    (disabled) => {
      const html = renderToStaticMarkup(
        <ActionIcon
          aria-label="Next slide"
          className="bg-carousel-navigation-bg"
          disabled={disabled}
          icon="token-icon-chevron-right"
        />
      )
      expect(html).toContain("bg-carousel-navigation-bg")
      expect(html).toContain("action-icon-surface")
      expect(html).not.toContain("disabled:bg-action-icon-bg-disabled")
      expect(html).toContain('aria-label="Next slide"')
    }
  )

  it.each([
    [".action-icon-surface", "--color-action-icon-bg"],
    [".action-icon-surface:disabled", "--color-action-icon-bg-disabled"],
  ])("paints %s below caller utility classes", (selector, alias) => {
    let layer: string | undefined
    let background: string | undefined
    css.walkRules(selector, (rule) => {
      if (rule.parent?.type === "atrule" && rule.parent.name === "layer") {
        layer = rule.parent.params
      }
      rule.walkDecls("background-color", (decl) => {
        background = decl.value
      })
    })
    expect(layer).toBe("components")
    expect(background).toBe(`var(${alias})`)
  })
})

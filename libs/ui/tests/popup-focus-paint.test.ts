// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

const tokens = resolve(dirname(fileURLToPath(import.meta.url)), "../src/tokens")
const foundation = postcss.parse(
  readFileSync(resolve(tokens, "_foundation-overrides.css"), "utf8")
)
let focusSelector = ""
foundation.walkRules((rule) => {
  if (!rule.selector.includes(":focus-visible")) {
    return
  }
  rule.walkDecls("box-shadow", () => {
    focusSelector = rule.selector.replaceAll(/\s+/g, " ")
  })
})

function focusTarget(tag: string, className = "") {
  const target = document.createElement(tag)
  target.className = className
  target.setAttribute("data-part", "content")
  target.setAttribute("data-focus-visible", "")
  return target
}

describe("popup focus paint ownership", () => {
  it("keeps two-tone focus on ordinary controls", () => {
    expect(focusSelector).not.toBe("")
    expect(focusTarget("button").matches(focusSelector)).toBe(true)
    expect(focusTarget("input").matches(focusSelector)).toBe(true)
    expect(focusTarget("div").matches(focusSelector)).toBe(true)
  })

  it.each(["popup-surface-base", "popup-item-base"])(
    "does not add an outer halo over %s's own focus treatment",
    (className) => {
      expect(focusTarget("div", className).matches(focusSelector)).toBe(false)
    }
  )

  it("retains popup elevation and forced-color option focus", () => {
    const css = postcss.parse(
      readFileSync(resolve(tokens, "components/_popup-surface.css"), "utf8")
    )
    const declarations = new Map<string, string>()
    css.walkAtRules("utility", (utility) => {
      if (utility.params === "popup-surface-base") {
        utility.walkDecls((decl) => {
          declarations.set(decl.prop, decl.value)
        })
      }
    })
    expect(declarations.get("box-shadow")).toBe("var(--shadow-popup)")
    expect(declarations.get("outline")).toBe("2px solid transparent")
    let highlightedOutline = ""
    css.walkAtRules("media", (media) => {
      if (media.params !== "(forced-colors: active)") {
        return
      }
      media.walkRules((rule) => {
        if (rule.selector !== "&[data-highlighted]") {
          return
        }
        rule.walkDecls("outline", (decl) => {
          highlightedOutline = decl.value
        })
      })
    })
    expect(highlightedOutline).toBe("2px solid Highlight")
  })
})

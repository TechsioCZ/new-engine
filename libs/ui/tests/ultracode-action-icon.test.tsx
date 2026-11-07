import { readFileSync } from "node:fs"
import postcss from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Sizes } from "../stories/atoms/action-icon.stories"

const buttonTags = /<button\b[^>]*>/g
const classAttribute = /\bclass="([^"]+)"/
const whitespace = /\s+/
const closeGlyph = /token-icon-close/g

function tokens(file: string) {
  return postcss.parse(readFileSync(new URL(file, import.meta.url), "utf8"))
}

describe("ActionIcon size progression", () => {
  it("keeps the real size matrix on the component's glyph and target scale", () => {
    if (!Sizes.render) {
      throw new Error("Missing ActionIcon sizes composition")
    }
    const html = renderToStaticMarkup(Sizes.render({} as never, {} as never))
    const buttons = html.match(buttonTags) ?? []
    expect(buttons).toHaveLength(3)
    for (const [index, size] of ["sm", "md", "lg"].entries()) {
      const button = buttons[index]
      const classes = button?.match(classAttribute)?.[1]?.split(whitespace)
      expect(classes).toEqual(
        expect.arrayContaining([
          size === "lg" ? "size-action-icon-lg" : `size-icon-control-${size}`,
          `text-action-icon-${size}`,
        ])
      )
      expect(button).toContain('aria-label="Close details"')
      expect(button).toContain('type="button"')
    }
    expect(html.match(closeGlyph)).toHaveLength(3)
    for (const label of ["Small (sm)", "Medium (md)", "Large (lg)"]) {
      expect(html).toContain(label)
    }
  })

  it("retains the coarse-pointer correction without changing desktop defaults", () => {
    const defaults = new Map<string, string>()
    tokens("../src/tokens/components/atoms/_action-icon.css").walkDecls(
      ({ prop, value }) => {
        defaults.set(prop, value)
      }
    )
    expect(defaults.get("--size-action-icon-target-lg")).toBe(
      "var(--size-icon-control-lg)"
    )
    expect(defaults.get("--size-action-icon-lg")).toBe(
      "var(--size-action-icon-target-lg)"
    )

    // The old 40px Large surface shrank below the 44px touch sm/md targets.
    // Keep this assertion scoped to Business's actual coarse-pointer override.
    const touch = new Map<string, string>()
    tokens("../src/tokens/_business.css").walkAtRules("media", (media) => {
      if (media.params !== "(pointer: coarse)") {
        return
      }
      media.walkAtRules("scope", (scope) => {
        if (scope.params !== '([data-theme="business"]) to ([data-theme])') {
          return
        }
        scope.walkDecls(({ prop, value }) => {
          touch.set(prop, value.split(whitespace).join(" "))
        })
      })
    })
    for (const size of ["sm", "md"]) {
      expect(touch.get(`--size-icon-control-${size}`)).toBe(
        `var(--height-form-control-${size})`
      )
      expect(touch.get(`--height-form-control-${size}`)).toBe(
        "max(2.75rem, calc(1lh + 0.875rem))"
      )
    }
    expect(touch.get("--size-action-icon-target-lg")).toBe(
      "max( var(--height-form-control-md), var(--height-form-control-lg) )"
    )
  })
})

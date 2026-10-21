import { runInNewContext } from "node:vm"
import { describe, expect, it } from "vitest"
import { BrandThemeScript } from "../src/theme/theme-provider"
import { tv } from "../src/utils"

function executeBrand(stored: string | null, unavailable = false) {
  const attrs = new Map([["data-theme", "neo"]])
  const element = BrandThemeScript({ defaultBrand: "akros" })
  runInNewContext(element.props.dangerouslySetInnerHTML.__html, {
    localStorage: {
      getItem: () => {
        if (unavailable) {
          throw new Error("blocked")
        }
        return stored
      },
    },
    document: {
      documentElement: {
        setAttribute: (name: string, value: string) => attrs.set(name, value),
        removeAttribute: (name: string) => attrs.delete(name),
      },
    },
  })
  return attrs.get("data-theme")
}

describe("pre-hydration brand script", () => {
  it("preserves stored base when the application defaults to Akros", () => {
    expect(executeBrand("base")).toBeUndefined()
  })
  it.each([null, "unknown", "__proto__", "constructor"])(
    "rejects invalid stored brand %s",
    (stored) => {
      expect(executeBrand(stored)).toBe("akros")
    }
  )
  it("applies a registered non-base brand", () => {
    expect(executeBrand("neo")).toBe("neo")
  })
  it("does not throw when storage is unavailable", () => {
    expect(executeBrand(null, true)).toBe("akros")
  })
})

describe("foundation token class merging", () => {
  it("keeps label and popover font weights independent from font family", () => {
    for (const weight of ["label", "popover-title"]) {
      const classes = tv({ base: `font-${weight} font-sans` })().split(" ")
      expect(classes).toContain(`font-${weight}`)
      expect(classes).toContain("font-sans")
    }
  })
  it("does not drop popover description size when adding its foreground", () => {
    const classes = tv({
      base: "text-popover-description text-popover-description-fg",
    })().split(" ")
    expect(classes).toContain("text-popover-description")
    expect(classes).toContain("text-popover-description-fg")
  })
})

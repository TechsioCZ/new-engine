import { readFileSync } from "node:fs"
import postcss, { type AtRule } from "postcss"
import { expect, test } from "vitest"

const tokens = postcss.parse(
  readFileSync(
    new URL("../src/tokens/components/molecules/_popover.css", import.meta.url),
    "utf8"
  )
)

function utilityDeclarations(name: string) {
  let utility: AtRule | undefined
  tokens.walkAtRules("utility", (rule) => {
    if (rule.params === name) {
      utility = rule
    }
  })
  if (!utility) {
    throw new Error(`Missing ${name} utility`)
  }
  const declarations = new Map<string, string>()
  utility.walkDecls((declaration) => {
    declarations.set(declaration.prop, declaration.value.replace(/\s+/g, ""))
  })
  return declarations
}

test("popover scrolling reserves the full two-tone focus paint without moving content", () => {
  const viewport = utilityDeclarations("popover-scroll-viewport")
  // The foundation focus shadow extends two ring widths plus its offset.
  expect(viewport.get("--popover-focus-clearance")).toBe(
    "calc(var(--default-ring-width)*2+var(--default-ring-offset))"
  )
  expect(viewport.get("padding")).toBe("var(--popover-focus-clearance)")
  expect(viewport.get("margin")).toBe("calc(var(--popover-focus-clearance)*-1)")
  expect(viewport.get("overflow-y")).toBe("auto")
  expect(viewport.get("min-height")).toBe("0")
})

test("focus clearance does not bypass the popover's collision and viewport caps", () => {
  const panel = utilityDeclarations("popover-viewport")
  expect(panel.get("max-width")).toBe(
    "min(var(--width-popover-max),var(--available-width,100vw),calc(100vw-var(--spacing-popover-viewport)*2))"
  )
  expect(panel.get("max-height")).toBe(
    "min(var(--available-height,100svh),calc(100svh-var(--spacing-popover-viewport)*2))"
  )
  expect(panel.get("overflow-wrap")).toBe("anywhere")
  expect(panel.has("min-width")).toBe(false)
})

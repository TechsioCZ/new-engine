import { readFileSync } from "node:fs"
import postcss from "postcss"
import { compile } from "tailwindcss"
import { expect, it } from "vitest"

it("compiles named loading-chart heights from the shared sizing tokens", async () => {
  const source = readFileSync(
    new URL("../src/tokens/components/molecules/_chart.css", import.meta.url),
    "utf8"
  )
  const tokens = new Map<string, string>()
  postcss.parse(source).walkDecls((declaration) => {
    tokens.set(declaration.prop, declaration.value.replace(/\s+/g, ""))
  })
  expect(tokens.get("--height-chart-placeholder")).toBe("var(--container-3xs)")
  expect(tokens.get("--height-chart-placeholder-lg")).toBe(
    "calc(var(--height-chart-placeholder)+var(--dimension-24))"
  )

  const compiler = await compile(`${source}\n@tailwind utilities;`)
  const css = compiler.build(["h-chart-placeholder", "h-chart-placeholder-lg"])
  const heights = new Map<string, string>()
  postcss.parse(css).walkRules((rule) => {
    rule.walkDecls("height", (declaration) => {
      heights.set(rule.selector, declaration.value)
    })
  })
  expect(heights.get(".h-chart-placeholder")).toBe(
    "var(--height-chart-placeholder)"
  )
  expect(heights.get(".h-chart-placeholder-lg")).toBe(
    "var(--height-chart-placeholder-lg)"
  )
})

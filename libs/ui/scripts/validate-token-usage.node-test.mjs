import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { compile } from "tailwindcss"
import { findMissingTokens } from "./validate-token-usage.js"

describe("fractional dimension utilities", () => {
  for (const [prefix, property] of [
    ["w", "width"],
    ["h", "height"],
    ["min-w", "min-width"],
    ["max-w", "max-width"],
    ["min-h", "min-height"],
    ["max-h", "max-height"],
  ]) {
    it(`accepts token-free ${prefix} fractions supported by Tailwind`, async () => {
      const compiler = await compile("@tailwind utilities;")
      const css = compiler.build([`${prefix}-4/5`])
      assert.ok(css.includes(`${property}: calc(4/5 * 100%);`))
      assert.deepEqual(findMissingTokens(`${prefix}-4/5`, new Set()), [])
    })
  }

  it("accepts fractions after existing responsive and state modifiers", () => {
    for (const className of [
      "sm:w-1/2",
      "md:hover:max-w-2/3",
      "data-[state=open]:min-h-3/4",
      "w-0/2",
      "w-12/7",
    ]) {
      assert.deepEqual(findMissingTokens(className, new Set()), [], className)
    }
  })

  it("does not exempt malformed or non-dimension slash values", () => {
    for (const className of [
      "w-1/0",
      "w-1.5/2",
      "w-01/2",
      "w-1/-2",
      "w-card/2",
      "p-4/5",
      "bg-missing/50",
      "text-missing/50",
    ]) {
      assert.ok(findMissingTokens(className, new Set()).length > 0, className)
    }
  })

  it("still requires custom dimension tokens", () => {
    assert.ok(findMissingTokens("md:w-card", new Set()).length > 0)
    assert.deepEqual(
      findMissingTokens("md:w-card", new Set(["--width-card"])),
      []
    )
  })
})

import { readFileSync } from "node:fs"
import postcss from "postcss"
import { describe, expect, it } from "vitest"

const reference = /^var\(\s*(--[\w-]+)\s*\)$/

function declarations(file: string) {
  const values = new Map<string, string>()
  postcss
    .parse(readFileSync(new URL(file, import.meta.url), "utf8"))
    .walkDecls((declaration) => {
      values.set(declaration.prop, declaration.value)
    })
  return values
}

function resolve(
  values: Map<string, string>,
  name: string
): string | undefined {
  const value = values.get(name)
  const target = value?.match(reference)?.[1]
  return target ? resolve(values, target) : value
}

describe("RadioCard readonly hover tokens", () => {
  it("inherits a distinct public component override instead of bypassing it", () => {
    const values = declarations(
      "../src/tokens/components/molecules/_radio-card.css"
    )
    values.set("--color-radio-card-item-border-hover", "rgb(83, 47, 139)")
    values.set("--color-form-control-border-hover", "rgb(11, 101, 67)")
    expect(
      resolve(values, "--color-radio-card-item-border-readonly-hover")
    ).toBe("rgb(83, 47, 139)")
  })

  it("keeps the deliberate Business neutral readonly override separate", () => {
    const values = declarations("../src/tokens/_business.css")
    values.set("--color-border-primary", "rgb(210, 214, 220)")
    values.set("--color-radio-card-item-border-hover", "rgb(83, 47, 139)")
    expect(
      resolve(values, "--color-radio-card-item-border-readonly-hover")
    ).toBe("rgb(210, 214, 220)")
  })
})

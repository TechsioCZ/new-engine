import { describe, expect, it } from "vitest"
import { resolveCmsLocale } from "./cms-locale"

describe("resolveCmsLocale", () => {
  it.each([
    ["sk-SK", "sk"],
    ["cs-CZ", "cs"],
    ["hu-HU", "hu"],
    ["ro-RO", "ro"],
  ] as const)("maps %s to the exact Payload locale %s", (marketLocale, cmsLocale) => {
    expect(resolveCmsLocale(marketLocale)).toBe(cmsLocale)
  })
})

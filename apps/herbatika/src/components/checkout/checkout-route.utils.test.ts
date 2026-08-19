import { describe, expect, it } from "vitest"
import { resolveCheckoutStepHref } from "./checkout-route.utils"

describe("resolveCheckoutStepHref", () => {
  it.each([
    ["kosik", "sk", "/kosik"],
    ["doprava-platba", "cz", "/pokladna/doprava"],
    ["udaje", "hu", "/penztar/kapcsolat"],
    ["suhrn", "ro", "/finalizare-comanda/verificare"],
  ] as const)("maps %s into the %s public flow", (step, market, expected) => {
    expect(resolveCheckoutStepHref(step, market)).toBe(expected)
  })
})

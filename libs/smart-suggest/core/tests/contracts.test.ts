import { describe, expect, it } from "vitest"
import {
  cachePolicyAllowsPersistentWrite,
  isSerializableSuggestion,
  normalizeSuggestLimit,
  type SmartSuggestSuggestion,
} from "../src/index"

describe("Smart Suggest core contracts", () => {
  it("keeps suggestions JSON-serializable", () => {
    const suggestion: SmartSuggestSuggestion = {
      confidence: 0.92,
      displayLabel: "Vaclavske namesti 1, Praha 1, 110 00",
      id: "cz-ruian-1",
      kind: "address",
      source: {
        id: "cz-ruian-sample",
        kind: "owned-dataset",
        name: "RUIAN sample",
      },
      address: {
        city: "Praha",
        countryCode: "CZ",
        houseNumber: "1",
        postalCode: "110 00",
        street: "Vaclavske namesti",
      },
    }

    expect(isSerializableSuggestion(suggestion)).toBe(true)
    expect(JSON.parse(JSON.stringify(suggestion))).toMatchObject({
      id: "cz-ruian-1",
      kind: "address",
    })
  })

  it("normalizes suggest limits to the public API range", () => {
    expect(normalizeSuggestLimit(undefined)).toBe(10)
    expect(normalizeSuggestLimit(Number.NaN)).toBe(10)
    expect(normalizeSuggestLimit(0)).toBe(1)
    expect(normalizeSuggestLimit(6.8)).toBe(6)
    expect(normalizeSuggestLimit(100)).toBe(20)
  })

  it("makes provider cache policy persistence explicit", () => {
    expect(cachePolicyAllowsPersistentWrite({ kind: "none" })).toBe(false)
    expect(
      cachePolicyAllowsPersistentWrite({ kind: "ttl", ttlSeconds: 60 })
    ).toBe(true)
    expect(cachePolicyAllowsPersistentWrite({ kind: "permanent" })).toBe(true)
  })
})

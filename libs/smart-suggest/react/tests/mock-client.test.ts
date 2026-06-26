import { describe, expect, it } from "vitest"

import { createMockSmartSuggestClient } from "../src/index"

describe("createMockSmartSuggestClient", () => {
  it("returns deterministic mock suggestions", async () => {
    const client = createMockSmartSuggestClient()

    await expect(
      client.suggest({ kind: "address", query: "Praha" })
    ).resolves.toMatchObject({
      cacheStatus: "disabled",
      requestId: "mock-address",
      suggestions: [],
    })
  })

  it("uses validation package behavior for phone and postal mocks", async () => {
    const client = createMockSmartSuggestClient()

    await expect(
      client.validatePhone({
        defaultCountry: "CZ",
        rawInput: "777 123 456",
      })
    ).resolves.toMatchObject({
      e164: "+420777123456",
      isValid: true,
    })
    await expect(
      client.validatePostal({ countryCode: "CZ", rawInput: "12345" })
    ).resolves.toMatchObject({
      displayValue: "123 45",
      isValid: true,
    })
  })

  it("allows method overrides", async () => {
    const client = createMockSmartSuggestClient({
      suggest: async () => ({
        cacheStatus: "hit",
        requestId: "override",
        suggestions: [],
      }),
    })

    await expect(
      client.suggest({ kind: "address", query: "Praha" })
    ).resolves.toMatchObject({ cacheStatus: "hit", requestId: "override" })
  })
})

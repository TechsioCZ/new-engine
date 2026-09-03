import { describe, expect, it } from "vitest"
import { resolveStorefrontApiMessages } from "./_messages"

describe("resolveStorefrontApiMessages", () => {
  it.each([
    ["sk", "Požiadavku v pokladni sa nepodarilo spracovať."],
    ["cz", "Požadavek v pokladně se nepodařilo zpracovat."],
    ["hu", "A pénztári kérést nem sikerült feldolgozni."],
    ["ro", "Cererea de finalizare a comenzii nu a putut fi procesată."],
  ] as const)("returns exact %s storefront API copy", (market, expected) => {
    const messages = resolveStorefrontApiMessages(market)

    expect(messages.checkoutAccessFailed).toBe(expected)
    expect(Object.values(messages)).toHaveLength(19)
    expect(Object.values(messages).every((message) => message.length > 0)).toBe(
      true
    )
  })

  it("rejects unsupported market input", () => {
    expect(() =>
      resolveStorefrontApiMessages(
        "de" as Parameters<typeof resolveStorefrontApiMessages>[0]
      )
    ).toThrow("Unsupported storefront API market")
  })
})

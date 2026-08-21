import { describe, expect, it, vi } from "vitest"
import {
  parseMarketPriceAuthority,
  verifyMarketPriceAuthorityRawSources,
} from "../../../../../src/scripts/market-price-authority/authority"
import { canonicalJsonLine } from "../../../../../src/scripts/market-price-authority/canonical"
import { authority, authorityBytes, rawSourceBytes } from "./fixtures"

const SHA_256 = /^[a-f0-9]{64}$/

describe("reviewed four-market price authority", () => {
  it("parses only canonical four-market reviewed bytes", () => {
    expect(parseMarketPriceAuthority(authorityBytes())).toEqual(authority())
    expect(() => parseMarketPriceAuthority(authorityBytes().trimEnd())).toThrow(
      "canonical JSON followed by one LF"
    )
    expect(() => parseMarketPriceAuthority(`${authorityBytes()}\n`)).toThrow(
      "canonical JSON followed by one LF"
    )
    expect(() =>
      parseMarketPriceAuthority(authorityBytes().replaceAll("\n", "\r\n"))
    ).toThrow("canonical JSON followed by one LF")
  })

  it("rejects the wrong market currency tuple and duplicate channel scope", () => {
    const value = authority()
    expect(() =>
      parseMarketPriceAuthority(
        canonicalJsonLine({
          ...value,
          markets: value.markets.map((market, index) =>
            index === 0 ? { ...market, currencyCode: "eur" } : market
          ),
        })
      )
    ).toThrow("cz/czk market tuple")
    expect(() =>
      parseMarketPriceAuthority(
        canonicalJsonLine({
          ...value,
          markets: value.markets.map((market, index) =>
            index === 1
              ? { ...market, salesChannelId: value.markets[0]?.salesChannelId }
              : market
          ),
        })
      )
    ).toThrow("distinct salesChannelId")
  })

  it("requires explicit unavailable state and currency-safe amounts", () => {
    const value = authority()
    const mutate = (marketIndex: number, entry: Record<string, unknown>) =>
      canonicalJsonLine({
        ...value,
        markets: value.markets.map((market, index) =>
          index === marketIndex
            ? { ...market, prices: [{ ...market.prices[0], ...entry }] }
            : market
        ),
      })
    expect(() => parseMarketPriceAuthority(mutate(2, { amount: 1 }))).toThrow(
      "must be null when unavailable"
    )
    expect(() =>
      parseMarketPriceAuthority(mutate(1, { amount: 1990.5 }))
    ).toThrow("integer HUF")
    expect(() =>
      parseMarketPriceAuthority(mutate(0, { amount: 1.001 }))
    ).toThrow("at most two decimal places")
  })

  it("rejects noncanonical ordering, duplicate identities, and approval chronology", () => {
    const value = authority()
    const first = value.markets[0]
    expect(first).toBeDefined()
    expect(() =>
      parseMarketPriceAuthority(
        canonicalJsonLine({
          ...value,
          markets: value.markets.map((market, index) =>
            index === 0
              ? { ...market, prices: [market.prices[0], market.prices[0]] }
              : market
          ),
        })
      )
    ).toThrow("strictly sorted and unique")
    expect(() =>
      parseMarketPriceAuthority(
        canonicalJsonLine({
          ...value,
          markets: value.markets.map((market, index) =>
            index === 0
              ? {
                  ...market,
                  commercialApproval: {
                    ...market.commercialApproval,
                    approvedAt: "2026-08-20T09:00:00.000Z",
                  },
                }
              : market
          ),
        })
      )
    ).toThrow("retrievedAt <= editedAt <= approvedAt")
  })

  it("verifies each independently supplied raw source byte stream", async () => {
    const read = vi.fn(
      async (path: string) =>
        rawSourceBytes[path as keyof typeof rawSourceBytes]
    )
    await expect(
      verifyMarketPriceAuthorityRawSources(
        authority(),
        { cz: "cz", hu: "hu", ro: "ro", sk: "sk" },
        read
      )
    ).resolves.toEqual({
      cz: expect.stringMatching(SHA_256),
      hu: expect.stringMatching(SHA_256),
      ro: expect.stringMatching(SHA_256),
      sk: expect.stringMatching(SHA_256),
    })
    await expect(
      verifyMarketPriceAuthorityRawSources(
        authority(),
        { cz: "cz", hu: "hu", ro: "ro", sk: "sk" },
        async (path) =>
          path === "ro"
            ? "tampered"
            : rawSourceBytes[path as keyof typeof rawSourceBytes]
      )
    ).rejects.toThrow("ro raw source bytes")
  })
})

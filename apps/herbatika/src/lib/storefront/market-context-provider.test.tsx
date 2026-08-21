import type { ComponentType, PropsWithChildren } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  getHerbatikaMarketContext,
  type HerbatikaMarketCode,
  type HerbatikaMarketContext,
} from "./market-context"
import { MarketProvider, useMarketContext } from "./market-context-provider"

const MARKET_CONTEXT_INVARIANT_ERROR =
  "Market context is unavailable. Wrap market consumers in <MarketProvider> with an explicit value."

type UnsafeMarketProviderProps = PropsWithChildren<{
  value?: HerbatikaMarketContext
}>

const UnsafeMarketProvider =
  MarketProvider as unknown as ComponentType<UnsafeMarketProviderProps>

function MarketProbe() {
  const market = useMarketContext()

  return (
    <output>
      {market.code}|{market.locale}|{market.currencyCode}
    </output>
  )
}

describe("market context provider", () => {
  it("fails closed when a consumer is rendered without a market provider", () => {
    expect(() => renderToStaticMarkup(<MarketProbe />)).toThrowError(
      MARKET_CONTEXT_INVARIANT_ERROR
    )
  })

  it("rejects a market provider with an omitted or undefined value", () => {
    expect(() =>
      renderToStaticMarkup(
        <UnsafeMarketProvider>
          <MarketProbe />
        </UnsafeMarketProvider>
      )
    ).toThrowError(MARKET_CONTEXT_INVARIANT_ERROR)

    expect(() =>
      renderToStaticMarkup(
        <UnsafeMarketProvider value={undefined}>
          <MarketProbe />
        </UnsafeMarketProvider>
      )
    ).toThrowError(MARKET_CONTEXT_INVARIANT_ERROR)
  })

  it.each([
    ["sk", "sk-SK", "EUR"],
    ["cz", "cs-CZ", "CZK"],
    ["hu", "hu-HU", "HUF"],
    ["ro", "ro-RO", "RON"],
  ] satisfies ReadonlyArray<
    readonly [HerbatikaMarketCode, HerbatikaMarketContext["locale"], string]
  >)("provides the explicit %s market context", (code, locale, currency) => {
    const markup = renderToStaticMarkup(
      <MarketProvider value={getHerbatikaMarketContext(code)}>
        <MarketProbe />
      </MarketProvider>
    )

    expect(markup).toContain(`${code}|${locale}|${currency}`)
  })
})

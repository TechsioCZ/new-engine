"use client"

import {
  createContext,
  useContext,
  useEffect,
  type PropsWithChildren,
} from "react"
import {
  DEFAULT_MARKET_CONTEXT,
  type HerbatikaMarketContext,
} from "./market-context"

const MarketContext = createContext<HerbatikaMarketContext>(
  DEFAULT_MARKET_CONTEXT
)

type MarketProviderProps = PropsWithChildren<{
  value?: HerbatikaMarketContext
}>

export function MarketProvider({
  children,
  value = DEFAULT_MARKET_CONTEXT,
}: MarketProviderProps) {
  useEffect(() => {
    document.documentElement.lang = value.htmlLang
  }, [value.htmlLang])

  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  )
}

export const useMarketContext = () => useContext(MarketContext)

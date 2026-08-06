"use client"

import { createContext, type PropsWithChildren, useContext } from "react"
import {
  DEFAULT_MARKET_CONTEXT,
  type HerbaticaMarketContext,
} from "./market-context"

const MarketContext = createContext<HerbaticaMarketContext>(
  DEFAULT_MARKET_CONTEXT
)

type MarketProviderProps = PropsWithChildren<{
  value?: HerbaticaMarketContext
}>

export function MarketProvider({
  children,
  value = DEFAULT_MARKET_CONTEXT,
}: MarketProviderProps) {
  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  )
}

export const useMarketContext = () => useContext(MarketContext)

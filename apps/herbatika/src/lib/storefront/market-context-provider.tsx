"use client"

import { createContext, type PropsWithChildren, useContext } from "react"
import type { HerbatikaMarketContext } from "./market-context"

const MARKET_CONTEXT_INVARIANT_ERROR =
  "Market context is unavailable. Wrap market consumers in <MarketProvider> with an explicit value."

const MarketContext = createContext<HerbatikaMarketContext | undefined>(
  undefined
)

type MarketProviderProps = PropsWithChildren<{
  value: HerbatikaMarketContext
}>

export function MarketProvider({ children, value }: MarketProviderProps) {
  if (!value) {
    throw new Error(MARKET_CONTEXT_INVARIANT_ERROR)
  }

  return (
    <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
  )
}

export const useMarketContext = (): HerbatikaMarketContext => {
  const context = useContext(MarketContext)

  if (!context) {
    throw new Error(MARKET_CONTEXT_INVARIANT_ERROR)
  }

  return context
}

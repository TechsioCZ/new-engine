"use client"

import { createContext, useContext } from "react"
import type { PropsWithChildren } from "react"

import { DEFAULT_MARKET_CONTEXT } from "./market-context"
import type { HerbatikaMarketContext } from "./market-context"

const MarketContext = createContext<HerbatikaMarketContext>(
  DEFAULT_MARKET_CONTEXT,
)

type MarketProviderProps = PropsWithChildren<{
  value?: HerbatikaMarketContext
}>

export const MarketProvider = ({
  children,
  value = DEFAULT_MARKET_CONTEXT,
}: MarketProviderProps) => (
  <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
)

export const useMarketContext = () => useContext(MarketContext)

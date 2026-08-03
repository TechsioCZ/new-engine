"use client"

import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { RegionProvider } from "@techsio/storefront-data/shared/region-context"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import type { PropsWithChildren } from "react"
import { useEffect } from "react"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import type { HerbatikaMarketContext } from "@/lib/storefront/market-context"
import { MarketProvider } from "@/lib/storefront/market-context-provider"
import { useRegionBootstrap } from "@/lib/storefront/regions"

type RegionBootstrapProviderProps = PropsWithChildren<{
  initialRegion?: RegionInfo | null
}>

function RegionBootstrapProvider({
  children,
  initialRegion = null,
}: RegionBootstrapProviderProps) {
  const { region } = useRegionBootstrap({ initialRegion })

  return <RegionProvider region={region}>{children}</RegionProvider>
}

type ProvidersProps = PropsWithChildren<{
  initialMarketContext?: HerbatikaMarketContext
  initialRegion?: RegionInfo | null
}>

function useDisableNextDevIndicator() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return
    }

    runDetachedPromise(
      fetch("/__nextjs_disable_dev_indicator", {
        method: "POST",
      }),
      () => {
        // Ignore failures in environments where Next.js devtools endpoint is unavailable.
      }
    )
  }, [])
}

export function Providers({
  children,
  initialMarketContext,
  initialRegion = null,
}: ProvidersProps) {
  useDisableNextDevIndicator()

  return (
    <StorefrontDataProvider>
      <NuqsAdapter>
        <MarketProvider value={initialMarketContext}>
          <RegionBootstrapProvider initialRegion={initialRegion}>
            {children}
          </RegionBootstrapProvider>
        </MarketProvider>
      </NuqsAdapter>
    </StorefrontDataProvider>
  )
}

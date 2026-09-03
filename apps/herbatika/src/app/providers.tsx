"use client"

import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { RegionProvider } from "@techsio/storefront-data/shared/region-context"
import { NuqsAdapter as AppNuqsAdapter } from "nuqs/adapters/next/app"
import { NuqsAdapter as PagesNuqsAdapter } from "nuqs/adapters/next/pages"
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
  initialMarketContext: HerbatikaMarketContext
  initialRegion?: RegionInfo | null
  router?: "app" | "pages"
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
  router = "app",
}: ProvidersProps) {
  useDisableNextDevIndicator()
  const RouterNuqsAdapter =
    router === "pages" ? PagesNuqsAdapter : AppNuqsAdapter

  return (
    <StorefrontDataProvider>
      <RouterNuqsAdapter>
        <MarketProvider value={initialMarketContext}>
          <RegionBootstrapProvider initialRegion={initialRegion}>
            {children}
          </RegionBootstrapProvider>
        </MarketProvider>
      </RouterNuqsAdapter>
    </StorefrontDataProvider>
  )
}

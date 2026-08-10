"use client"

import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { RegionProvider } from "@techsio/storefront-data/shared/region-context"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import type { PropsWithChildren } from "react"
import { useEffect } from "react"

import type { HerbatikaMarketContext } from "@/lib/storefront/market-context"
import { MarketProvider } from "@/lib/storefront/market-context-provider"
import { useRegionBootstrap } from "@/lib/storefront/regions"
import { AUTH_SESSION_LOGOUT_STORAGE_KEY } from "@/lib/storefront/sdk"

type RegionBootstrapProviderProps = PropsWithChildren<{
  initialRegion?: RegionInfo | null
}>

const RegionBootstrapProvider = ({
  children,
  initialRegion = null,
}: RegionBootstrapProviderProps) => {
  const { region } = useRegionBootstrap({ initialRegion })

  return <RegionProvider region={region}>{children}</RegionProvider>
}

type ProvidersProps = PropsWithChildren<{
  initialMarketContext?: HerbatikaMarketContext
  initialRegion?: RegionInfo | null
}>

const useDisableNextDevIndicator = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return
    }

    navigator.sendBeacon("/__nextjs_disable_dev_indicator")
  }, [])
}

const useAuthSessionLogoutSync = () => {
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_SESSION_LOGOUT_STORAGE_KEY) {
        return
      }

      window.location.replace("/")
    }

    window.addEventListener("storage", handleStorage)
    return () => {
      window.removeEventListener("storage", handleStorage)
    }
  }, [])
}

export const Providers = ({
  children,
  initialMarketContext,
  initialRegion = null,
}: ProvidersProps) => {
  useDisableNextDevIndicator()
  useAuthSessionLogoutSync()

  return (
    <StorefrontDataProvider>
      <NuqsAdapter>
        <MarketProvider
          {...(initialMarketContext === undefined
            ? {}
            : { value: initialMarketContext })}
        >
          <RegionBootstrapProvider initialRegion={initialRegion}>
            {children}
          </RegionBootstrapProvider>
        </MarketProvider>
      </NuqsAdapter>
    </StorefrontDataProvider>
  )
}

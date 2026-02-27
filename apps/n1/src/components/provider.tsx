"use client"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"
import { makeQueryClient } from "@techsio/storefront-data/shared/query-client"
import { RegionProvider } from "@techsio/storefront-data/shared/region-context"
import { Toaster } from "@techsio/ui-kit/molecules/toast"
import { Suspense, type ReactNode } from "react"
import { useSuspenseRegion } from "@/hooks/use-region"
import { cacheConfig } from "@/lib/cache-config"
import { PrefetchManager } from "./prefetch-manager"

const queryClientConfig = {
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 10_000),
      staleTime: cacheConfig.realtime.staleTime,
    },
  },
}

const queryClient = makeQueryClient(queryClientConfig)

function StorefrontRegionBridge({ children }: { children: ReactNode }) {
  const { regionId, countryCode } = useSuspenseRegion()

  return (
    <RegionProvider
      region={
        regionId ? { region_id: regionId, country_code: countryCode } : null
      }
    >
      {children}
    </RegionProvider>
  )
}

export function Providers({ children }: { children: ReactNode }) {

  return (
    <StorefrontDataProvider client={queryClient}>
      <Suspense fallback={null}>
        <StorefrontRegionBridge>
          <Suspense fallback={null}>
            <PrefetchManager />
          </Suspense>
          {children}
        </StorefrontRegionBridge>
      </Suspense>
      <Toaster />
      {/* React Query DevTools - only in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </StorefrontDataProvider>
  )
}

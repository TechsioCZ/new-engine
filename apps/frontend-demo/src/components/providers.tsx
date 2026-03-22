"use client"

import { type DehydratedState, HydrationBoundary } from "@tanstack/react-query"
import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"
import { RegionProvider } from "@techsio/storefront-data/shared/region-context"
import { Toaster } from "@techsio/ui-kit/molecules/toast"
import { ThemeProvider } from "next-themes"
import type { PropsWithChildren } from "react"
import { useRegions } from "@/hooks/use-region"

function StorefrontRegionBoundary({ children }: PropsWithChildren) {
  const { selectedRegion } = useRegions()
  const region = selectedRegion
    ? {
        region_id: selectedRegion.id,
        country_code: selectedRegion.countries?.[0]?.iso_2 ?? "cz",
      }
    : null

  return <RegionProvider region={region}>{children}</RegionProvider>
}

type ProvidersProps = PropsWithChildren<{
  hydrationState?: DehydratedState
}>

export function Providers({ children, hydrationState }: ProvidersProps) {
  return (
    <StorefrontDataProvider>
      <HydrationBoundary state={hydrationState}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <StorefrontRegionBoundary>{children}</StorefrontRegionBoundary>
          <Toaster />
        </ThemeProvider>
      </HydrationBoundary>
    </StorefrontDataProvider>
  )
}

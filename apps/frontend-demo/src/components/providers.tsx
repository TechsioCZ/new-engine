"use client"

import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"
import { RegionProvider } from "@techsio/storefront-data/shared/region-context"
import { Toaster } from "@techsio/ui-kit/molecules/toast"
import { ThemeProvider } from "next-themes"
import type { PropsWithChildren } from "react"
import { useRegions } from "@/hooks/use-region"
import { CartPrefetch } from "./cart-prefetch"

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

export function Providers({ children }: PropsWithChildren) {
  return (
    <StorefrontDataProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        <StorefrontRegionBoundary>
          <CartPrefetch />
          {children}
        </StorefrontRegionBoundary>
        <Toaster />
      </ThemeProvider>
    </StorefrontDataProvider>
  )
}

"use client"

import { StorefrontDataProvider } from "@techsio/storefront-data/client/provider"
import { RegionProvider } from "@techsio/storefront-data/shared/region-context"
import { Toaster } from "@techsio/ui-kit/molecules/toast"
import { NextIntlClientProvider } from "next-intl"
import { NuqsAdapter } from "nuqs/adapters/next/pages"
import type { PropsWithChildren } from "react"
import { MarketProvider } from "@/lib/storefront/market-context-provider"
import type { ProductPageContext } from "@/lib/storefront/product-page-context"

type ProductPagesProviderProps = PropsWithChildren<{
  context: ProductPageContext
}>

export function ProductPagesProvider({
  children,
  context,
}: ProductPagesProviderProps) {
  return (
    <NextIntlClientProvider
      locale={context.locale}
      messages={context.messages}
      timeZone={context.marketContext.timeZone}
    >
      <StorefrontDataProvider>
        <NuqsAdapter>
          <MarketProvider value={context.marketContext}>
            <RegionProvider region={context.region}>
              {children}
              <Toaster />
            </RegionProvider>
          </MarketProvider>
        </NuqsAdapter>
      </StorefrontDataProvider>
    </NextIntlClientProvider>
  )
}

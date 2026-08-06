"use client"

import { Toaster } from "@techsio/ui-kit/molecules/toast"
import { usePathname } from "next/navigation"
import type { PropsWithChildren } from "react"
import { buildCartUrl } from "@/lib/url/builder"
import { getSegment } from "@/lib/url/segments"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { CheckoutFooter } from "@/components/checkout/checkout-footer"
import { CheckoutHeader } from "@/components/checkout/checkout-header"
import { HerbatikaFooter } from "@/components/herbatika-footer"
import { HerbatikaHeader } from "@/components/herbatika-header"

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname()
  const market = useMarketContext().code
  const checkoutRoot = `/${getSegment(market, "checkout")}`
  const isCheckoutRoute =
    pathname === buildCartUrl(market) ||
    pathname === checkoutRoot ||
    pathname.startsWith(`${checkoutRoot}/`)
  const shell = isCheckoutRoute ? (
    <div className="flex min-h-dvh flex-col bg-base">
      <CheckoutHeader />
      <div className="flex-1">{children}</div>
      <CheckoutFooter />
    </div>
  ) : (
    <div className="flex min-h-dvh flex-col bg-base">
      <HerbatikaHeader />
      <div className="flex-1">{children}</div>
      <HerbatikaFooter />
    </div>
  )

  return (
    <>
      {shell}
      <Toaster />
    </>
  )
}

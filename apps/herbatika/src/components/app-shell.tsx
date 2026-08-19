"use client"

import { Toaster } from "@techsio/ui-kit/molecules/toast"
import { usePathname } from "next/navigation"
import type { PropsWithChildren } from "react"
import { CheckoutFooter } from "@/components/checkout/checkout-footer"
import { CheckoutHeader } from "@/components/checkout/checkout-header"
import { HerbatikaFooter } from "@/components/herbatika-footer"
import { HerbatikaHeader } from "@/components/herbatika-header"
import type { ReviewTrustSource } from "@/components/reviews/reviews.types"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { buildPath } from "@/lib/url/public-url"

type AppShellProps = PropsWithChildren<{
  categoryPublicSlugsById?: PublicEntitySlugMap
  reviewTrustSources: readonly ReviewTrustSource[]
}>

export function AppShell({
  categoryPublicSlugsById,
  children,
  reviewTrustSources,
}: AppShellProps) {
  const pathname = usePathname()
  const { code: market } = useMarketContext()
  const checkoutRoot = buildPath({ kind: "checkout" }, market)
  const isCheckoutRoute =
    pathname === checkoutRoot || pathname?.startsWith(`${checkoutRoot}/`)
  const shell = isCheckoutRoute ? (
    <div className="flex min-h-dvh flex-col bg-base">
      <CheckoutHeader />
      <div className="flex-1">{children}</div>
      <CheckoutFooter />
    </div>
  ) : (
    <div className="flex min-h-dvh flex-col bg-base">
      <HerbatikaHeader categoryPublicSlugsById={categoryPublicSlugsById} />
      <div className="flex-1">{children}</div>
      <HerbatikaFooter reviewTrustSources={reviewTrustSources} />
    </div>
  )

  return (
    <>
      {shell}
      <Toaster />
    </>
  )
}

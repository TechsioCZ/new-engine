"use client"

import { Toaster } from "@techsio/ui-kit/molecules/toast"
import { usePathname } from "next/navigation"
import type { PropsWithChildren } from "react"
import { CheckoutFooter } from "@/components/checkout/checkout-footer"
import { CheckoutHeader } from "@/components/checkout/checkout-header"
import { HerbatikaFooter } from "@/components/herbatika-footer"
import type { FooterMarketAlternates } from "@/components/herbatika-footer.market-links"
import { HerbatikaHeader } from "@/components/herbatika-header"
import type { ReviewTrustSource } from "@/components/reviews/reviews.types"
import type { CmsFooterNavigation } from "@/lib/storefront/cms-types"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { buildPath } from "@/lib/url/public-url"

type AppShellProps = PropsWithChildren<{
  categoryPublicSlugsById?: PublicEntitySlugMap
  footerNavigation: CmsFooterNavigation
  marketAlternates?: FooterMarketAlternates
  reviewTrustSources: readonly ReviewTrustSource[]
}>

export function AppShell({
  categoryPublicSlugsById,
  children,
  footerNavigation,
  marketAlternates,
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
      <HerbatikaFooter
        marketAlternates={marketAlternates}
        navigation={footerNavigation}
        reviewTrustSources={reviewTrustSources}
      />
    </div>
  )

  return (
    <>
      {shell}
      <Toaster />
    </>
  )
}

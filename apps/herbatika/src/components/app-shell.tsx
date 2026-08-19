"use client"

import { Toaster } from "@techsio/ui-kit/molecules/toast"
import { usePathname } from "next/navigation"
import type { PropsWithChildren } from "react"
import { CheckoutFooter } from "@/components/checkout/checkout-footer"
import { CheckoutHeader } from "@/components/checkout/checkout-header"
import { HerbatikaFooter } from "@/components/herbatika-footer"
import { HerbatikaHeader } from "@/components/herbatika-header"
import type { ReviewTrustSource } from "@/components/reviews/reviews.types"
import type { CmsFooterNavigation } from "@/lib/storefront/cms-types"

type AppShellProps = PropsWithChildren<{
  footerNavigation: CmsFooterNavigation
  reviewTrustSources: readonly ReviewTrustSource[]
}>

export function AppShell({
  children,
  footerNavigation,
  reviewTrustSources,
}: AppShellProps) {
  const pathname = usePathname()
  const isCheckoutRoute = pathname?.startsWith("/checkout") ?? false
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
      <HerbatikaFooter
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

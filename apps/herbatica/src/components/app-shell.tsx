"use client"

import { Toaster } from "@techsio/ui-kit/molecules/toast"
import { usePathname } from "next/navigation"
import type { PropsWithChildren } from "react"
import { CheckoutFooter } from "@/components/checkout/checkout-footer"
import { CheckoutHeader } from "@/components/checkout/checkout-header"
import { HerbaticaFooter } from "@/components/herbatica-footer"
import { HerbaticaHeader } from "@/components/herbatica-header"

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname()
  const isCheckoutRoute = pathname.startsWith("/checkout")
  const shell = isCheckoutRoute ? (
    <div className="flex min-h-dvh flex-col bg-base">
      <CheckoutHeader />
      <div className="flex-1">{children}</div>
      <CheckoutFooter />
    </div>
  ) : (
    <div className="flex min-h-dvh flex-col bg-base">
      <HerbaticaHeader />
      <div className="flex-1">{children}</div>
      <HerbaticaFooter />
    </div>
  )

  return (
    <>
      {shell}
      <Toaster />
    </>
  )
}

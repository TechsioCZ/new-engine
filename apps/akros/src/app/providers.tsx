"use client"

import { StorefrontDataProvider } from "@techsio/storefront-data"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import type { PropsWithChildren } from "react"

export function Providers({ children }: PropsWithChildren) {
  return (
    <StorefrontDataProvider>
      <NuqsAdapter>{children}</NuqsAdapter>
    </StorefrontDataProvider>
  )
}

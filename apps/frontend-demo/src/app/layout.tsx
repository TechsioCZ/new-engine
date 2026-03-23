import { dehydrate } from "@tanstack/react-query"
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
import type { Metadata } from "next"
import "../tokens/index.css"
import type * as React from "react"
import { DisclaimerWrapper } from "@/components/disclaimer-wrapper"
import { Footer } from "@/components/footer"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Providers } from "@/components/providers"
import { createCategoryRegistryQueryOptions } from "@/lib/categories/query-options"

export const metadata: Metadata = {
  title: "Frontend Demo",
  description: "Demo application using the UI library",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const queryClient = getServerQueryClient()
  await queryClient.prefetchQuery(createCategoryRegistryQueryOptions())
  const hydrationState = dehydrate(queryClient)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen min-w-layout-min flex-col">
        <Providers hydrationState={hydrationState}>
          <HeaderWrapper
            logo={{ text: "Demo Store", icon: "icon-[mdi--store]" }}
          />
          <main className="flex-1">
            <DisclaimerWrapper />
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

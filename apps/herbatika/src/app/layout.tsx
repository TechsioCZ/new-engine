import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import type { DehydratedState } from "@tanstack/react-query"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import type { AbstractIntlMessages } from "next-intl"
import { getMessages } from "next-intl/server"
import { Inter, Open_Sans, Roboto, Rubik } from "next/font/google"
import localFont from "next/font/local"
import { Suspense } from "react"

import { AppShell } from "@/components/app-shell"
import {
  buildCategoryListParams,
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"
import type { HerbatikaMarketContext } from "@/lib/storefront/market-context"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import { fetchServerCategories } from "@/lib/storefront/storefront-server"

import "./globals.css"
import { Providers } from "./providers"

const verdana = localFont({
  display: "swap",
  src: [
    {
      path: "./fonts/Verdana-Regular.woff2",
      style: "normal",
      weight: "400",
    },
    {
      path: "./fonts/Verdana-Bold.woff2",
      style: "normal",
      weight: "700",
    },
  ],
  variable: "--font-verdana",
})

const openSans = Open_Sans({
  display: "swap",
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
})

const inter = Inter({
  display: "swap",
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter-font",
})

const rubik = Rubik({
  display: "swap",
  subsets: ["latin", "latin-ext"],
  variable: "--font-rubik",
})

const roboto = Roboto({
  display: "swap",
  subsets: ["latin", "latin-ext"],
  variable: "--font-roboto",
  weight: ["400", "700"],
})

export const generateMetadata = async (): Promise<Metadata> => {
  const marketContext = await getMarketServerContext()

  return {
    description: marketContext.metadata.description,
    title: marketContext.metadata.title,
  }
}

type LayoutShellProps = Readonly<{
  children: React.ReactNode
  dehydratedState: DehydratedState
  initialRegion?: RegionInfo | null
  marketContext: HerbatikaMarketContext
  messages: AbstractIntlMessages
}>

const LayoutShell = ({
  children,
  dehydratedState,
  initialRegion = null,
  marketContext,
  messages,
}: LayoutShellProps) => (
  <NextIntlClientProvider messages={messages}>
    <Providers
      initialMarketContext={marketContext}
      initialRegion={initialRegion}
    >
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={<div className="min-h-dvh bg-base" />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </HydrationBoundary>
    </Providers>
  </NextIntlClientProvider>
)

const ResolvedLayoutShell = async ({
  children,
  marketContext,
}: Readonly<{
  children: React.ReactNode
  marketContext: HerbatikaMarketContext
}>) => {
  const [{ queryClient, region }, messages] = await Promise.all([
    getRegionServerContext(),
    getMessages(),
  ])

  try {
    await fetchServerCategories(
      queryClient,
      buildCategoryListParams({
        fields: CATEGORY_TREE_FIELDS,
        limit: CATEGORY_TREE_LIMIT,
        page: 1,
      }),
    )
  } catch (error) {
    console.error("Failed to prefetch storefront categories", error)
  }

  return (
    <LayoutShell
      dehydratedState={dehydrate(queryClient)}
      initialRegion={region}
      marketContext={marketContext}
      messages={messages}
    >
      {children}
    </LayoutShell>
  )
}

const ResolvedRootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) => {
  const marketContext = await getMarketServerContext()

  return (
    <html
      className={`${verdana.variable} ${openSans.variable} ${inter.variable} ${rubik.variable} ${roboto.variable}`}
      lang={marketContext.htmlLang}
    >
      <body className={`text-fg-primary ${verdana.className}`}>
        <Suspense
          // Avoid rendering a fallback app shell here. During streaming, it can
          // coexist with the resolved shell and duplicate header popover ids.
          fallback={<div className="min-h-dvh bg-base" />}
        >
          <ResolvedLayoutShell marketContext={marketContext}>
            {children}
          </ResolvedLayoutShell>
        </Suspense>
      </body>
    </html>
  )
}

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode
}>) => (
  <Suspense fallback={null}>
    <ResolvedRootLayout>{children}</ResolvedRootLayout>
  </Suspense>
)

export default RootLayout

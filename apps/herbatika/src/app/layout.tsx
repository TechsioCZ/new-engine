import {
  type DehydratedState,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import type { Metadata } from "next"
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
import type { StorefrontTextMessages } from "@/lib/storefront/storefront-texts"
import { fetchStorefrontTextMessages } from "@/lib/storefront/storefront-texts.server"
import "./globals.css"
import { Providers } from "./providers"

const verdana = localFont({
  src: [
    {
      path: "./fonts/Verdana-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Verdana-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-verdana",
  display: "swap",
})

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

const inter = Inter({
  variable: "--font-inter-font",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

export async function generateMetadata(): Promise<Metadata> {
  const marketContext = await getMarketServerContext()

  return {
    title: marketContext.metadata.title,
    description: marketContext.metadata.description,
  }
}

type LayoutShellProps = Readonly<{
  children: React.ReactNode
  dehydratedState: DehydratedState
  initialRegion?: RegionInfo | null
  marketContext: HerbatikaMarketContext
  storefrontTextMessages: StorefrontTextMessages
}>

function LayoutShell({
  children,
  dehydratedState,
  initialRegion = null,
  marketContext,
  storefrontTextMessages,
}: LayoutShellProps) {
  return (
    <Providers
      initialMarketContext={marketContext}
      initialRegion={initialRegion}
      storefrontTextMessages={storefrontTextMessages}
    >
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={<div className="min-h-dvh bg-base" />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </HydrationBoundary>
    </Providers>
  )
}

async function ResolvedLayoutShell({
  children,
  marketContext,
}: Readonly<{
  children: React.ReactNode
  marketContext: HerbatikaMarketContext
}>) {
  const [{ queryClient, region }, storefrontTextMessages] = await Promise.all([
    getRegionServerContext(),
    fetchStorefrontTextMessages(marketContext),
  ])

  try {
    await fetchServerCategories(
      queryClient,
      buildCategoryListParams({
        page: 1,
        limit: CATEGORY_TREE_LIMIT,
        fields: CATEGORY_TREE_FIELDS,
      })
    )
  } catch (error) {
    console.error("Failed to prefetch storefront categories", error)
  }

  return (
    <LayoutShell
      dehydratedState={dehydrate(queryClient)}
      initialRegion={region}
      marketContext={marketContext}
      storefrontTextMessages={storefrontTextMessages}
    >
      {children}
    </LayoutShell>
  )
}

async function ResolvedRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={null}>
      <ResolvedRootLayout>{children}</ResolvedRootLayout>
    </Suspense>
  )
}

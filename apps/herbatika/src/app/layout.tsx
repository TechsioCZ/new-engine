import {
  type DehydratedState,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import type { Metadata } from "next"
import { type AbstractIntlMessages, NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { Suspense } from "react"
import { AppShell } from "@/components/app-shell"
import type { ReviewTrustSource } from "@/components/reviews/reviews.types"
import {
  buildCategoryListParams,
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config"
import { fetchCmsFooterNavigation } from "@/lib/storefront/cms"
import type { CmsFooterNavigation } from "@/lib/storefront/cms-types"
import { fetchExternalReviewTrustSources } from "@/lib/storefront/external-reviews.server"
import type { HerbatikaMarketContext } from "@/lib/storefront/market-context"
import { getMarketServerContext } from "@/lib/storefront/market-context.server"
import { getAppRegionServerContext } from "@/lib/storefront/ssr/context.app.server"
import { fetchServerCategories } from "@/lib/storefront/storefront-server"
import "./globals.css"
import { Providers } from "./providers"
import { storefrontFontVariables, verdana } from "./storefront-fonts"

export const dynamic = "force-dynamic"

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
  footerNavigation: CmsFooterNavigation
  marketContext: HerbatikaMarketContext
  messages: AbstractIntlMessages
  reviewTrustSources: readonly ReviewTrustSource[]
}>

function LayoutShell({
  children,
  dehydratedState,
  initialRegion = null,
  footerNavigation,
  marketContext,
  messages,
  reviewTrustSources,
}: LayoutShellProps) {
  return (
    <NextIntlClientProvider messages={messages}>
      <Providers
        initialMarketContext={marketContext}
        initialRegion={initialRegion}
      >
        <HydrationBoundary state={dehydratedState}>
          <Suspense fallback={<div className="min-h-dvh bg-base" />}>
            <AppShell
              footerNavigation={footerNavigation}
              reviewTrustSources={reviewTrustSources}
            >
              {children}
            </AppShell>
          </Suspense>
        </HydrationBoundary>
      </Providers>
    </NextIntlClientProvider>
  )
}

async function ResolvedLayoutShell({
  children,
  marketContext,
}: Readonly<{
  children: React.ReactNode
  marketContext: HerbatikaMarketContext
}>) {
  const [
    { market, queryClient, region },
    messages,
    footerNavigation,
    reviewTrustSources,
  ] = await Promise.all([
    getAppRegionServerContext(),
    getMessages(),
    fetchCmsFooterNavigation(marketContext.locale),
    fetchExternalReviewTrustSources(marketContext.code),
  ])

  try {
    await fetchServerCategories(
      market,
      queryClient,
      buildCategoryListParams({
        page: 1,
        limit: CATEGORY_TREE_LIMIT,
        fields: CATEGORY_TREE_FIELDS,
        locale: marketContext.locale,
      })
    )
  } catch (error) {
    console.error("Failed to prefetch storefront categories", error)
  }

  return (
    <LayoutShell
      dehydratedState={dehydrate(queryClient)}
      footerNavigation={footerNavigation}
      initialRegion={region}
      marketContext={marketContext}
      messages={messages}
      reviewTrustSources={reviewTrustSources}
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
    <html className={storefrontFontVariables} lang={marketContext.htmlLang}>
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

import { type DehydratedState, HydrationBoundary } from "@tanstack/react-query"
import type { AppProps } from "next/app"
import type { AbstractIntlMessages } from "next-intl"
import { NextIntlClientProvider } from "next-intl"
import { Providers } from "@/app/providers"
import { AppShell } from "@/components/app-shell"
import { SeoHead } from "@/lib/seo/head"
import type { SeoPageMetadata } from "@/lib/seo/metadata"
import type { HerbatikaMarketContext } from "@/lib/storefront/market-context"
import "@/app/globals.css"

type StorefrontPageProps = {
  dehydratedState?: DehydratedState
  marketContext?: HerbatikaMarketContext
  messages?: AbstractIntlMessages
  seo?: SeoPageMetadata
}

export default function StorefrontApp({
  Component,
  pageProps,
}: AppProps<StorefrontPageProps>) {
  const content = <Component {...pageProps} />
  if (!(pageProps.marketContext && pageProps.messages)) {
    return content
  }
  return (
    <NextIntlClientProvider messages={pageProps.messages}>
      <Providers initialMarketContext={pageProps.marketContext}>
        <HydrationBoundary state={pageProps.dehydratedState}>
          {pageProps.seo ? <SeoHead metadata={pageProps.seo} /> : null}
          <AppShell>{content}</AppShell>
        </HydrationBoundary>
      </Providers>
    </NextIntlClientProvider>
  )
}

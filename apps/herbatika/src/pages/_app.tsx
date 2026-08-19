import { type DehydratedState, HydrationBoundary } from "@tanstack/react-query"
import type { AppProps } from "next/app"
import Head from "next/head"
import type { AbstractIntlMessages } from "next-intl"
import { NextIntlClientProvider } from "next-intl"
import { Providers } from "@/app/providers"
import { AppShell } from "@/components/app-shell"
import type { ReviewTrustSource } from "@/components/reviews/reviews.types"
import type { PublicSeo } from "@/lib/routing/public-page"
import type { HerbatikaMarketContext } from "@/lib/storefront/market-context"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import {
  buildPublicSeoJsonLd,
  serializePublicSeoJsonLd,
} from "@/lib/url/public-seo"
import "@/app/globals.css"

type StorefrontPageProps = Readonly<{
  dehydratedState?: DehydratedState
  categoryPublicSlugsById?: PublicEntitySlugMap
  marketContext?: HerbatikaMarketContext
  messages?: AbstractIntlMessages
  reviewTrustSources?: readonly ReviewTrustSource[]
  seo?: PublicSeo
}>

function PublicSeoHead({ seo }: { seo: PublicSeo }) {
  const jsonLd = buildPublicSeoJsonLd(seo)
  return (
    <Head>
      {seo.title ? <title>{seo.title}</title> : null}
      {seo.description ? (
        <meta content={seo.description} name="description" />
      ) : null}
      {seo.title ? <meta content={seo.title} property="og:title" /> : null}
      {seo.description ? (
        <meta content={seo.description} property="og:description" />
      ) : null}
      <meta content={seo.robots} name="robots" />
      {seo.canonical ? <link href={seo.canonical} rel="canonical" /> : null}
      {seo.canonical ? (
        <meta content={seo.canonical} property="og:url" />
      ) : null}
      {Object.entries(seo.alternates ?? {}).map(([hrefLang, href]) => (
        <link href={href} hrefLang={hrefLang} key={hrefLang} rel="alternate" />
      ))}
      {jsonLd ? (
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized by the URL architecture SEO helper.
          dangerouslySetInnerHTML={{ __html: serializePublicSeoJsonLd(jsonLd) }}
          type="application/ld+json"
        />
      ) : null}
    </Head>
  )
}

export default function HerbatikaPagesApp({
  Component,
  pageProps,
}: AppProps<StorefrontPageProps>) {
  const content = <Component {...pageProps} />
  if (
    !(
      pageProps.marketContext &&
      pageProps.messages &&
      pageProps.reviewTrustSources
    )
  ) {
    return content
  }

  return (
    <NextIntlClientProvider messages={pageProps.messages}>
      <Providers initialMarketContext={pageProps.marketContext}>
        <HydrationBoundary state={pageProps.dehydratedState}>
          {pageProps.seo ? <PublicSeoHead seo={pageProps.seo} /> : null}
          <AppShell
            categoryPublicSlugsById={pageProps.categoryPublicSlugsById}
            reviewTrustSources={pageProps.reviewTrustSources}
          >
            {content}
          </AppShell>
        </HydrationBoundary>
      </Providers>
    </NextIntlClientProvider>
  )
}

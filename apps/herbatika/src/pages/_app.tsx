import { type DehydratedState, HydrationBoundary } from "@tanstack/react-query"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import type { AppProps } from "next/app"
import Head from "next/head"
import type { AbstractIntlMessages } from "next-intl"
import { NextIntlClientProvider } from "next-intl"
import { Providers } from "@/app/providers"
import { AppShell } from "@/components/app-shell"
import type { ReviewTrustSource } from "@/components/reviews/reviews.types"
import type { PublicSeo } from "@/lib/routing/public-page"
import type { CmsFooterNavigation } from "@/lib/storefront/cms-types"
import type { HerbatikaMarketContext } from "@/lib/storefront/market-context"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import {
  buildPublicOpenGraphLocales,
  buildPublicSeoJsonLd,
  serializePublicSeoJsonLd,
} from "@/lib/url/public-seo"
import "@/app/globals.css"

type StorefrontPageProps = Readonly<{
  dehydratedState?: DehydratedState
  categoryPublicSlugsById?: PublicEntitySlugMap
  footerNavigation?: CmsFooterNavigation
  initialRegion?: RegionInfo | null
  marketContext?: HerbatikaMarketContext
  messages?: AbstractIntlMessages
  reviewTrustSources?: readonly ReviewTrustSource[]
  seo?: PublicSeo
}>

function PublicSeoHead({
  marketContext,
  seo,
}: {
  marketContext: HerbatikaMarketContext
  seo: PublicSeo
}) {
  const jsonLd = buildPublicSeoJsonLd({
    ...seo,
    inLanguage: marketContext.locale,
  })
  const openGraphLocales = buildPublicOpenGraphLocales({
    alternates: seo.alternates,
    locale: marketContext.locale,
  })
  const brandTitle = marketContext.metadata.title
  const title = seo.title ? `${seo.title} | ${brandTitle}` : brandTitle
  const description = seo.description ?? marketContext.metadata.description
  return (
    <Head>
      <title>{title}</title>
      <meta content={description} name="description" />
      <meta content={title} property="og:title" />
      <meta content={description} property="og:description" />
      <meta content={openGraphLocales.locale} property="og:locale" />
      {openGraphLocales.alternateLocales.map((locale) => (
        <meta content={locale} key={locale} property="og:locale:alternate" />
      ))}
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
      pageProps.footerNavigation &&
      pageProps.reviewTrustSources
    )
  ) {
    return content
  }

  return (
    <NextIntlClientProvider
      locale={pageProps.marketContext.locale}
      messages={pageProps.messages}
      timeZone={pageProps.marketContext.timeZone}
    >
      <Providers
        initialMarketContext={pageProps.marketContext}
        initialRegion={pageProps.initialRegion}
        router="pages"
      >
        <HydrationBoundary state={pageProps.dehydratedState}>
          {pageProps.seo ? (
            <PublicSeoHead
              marketContext={pageProps.marketContext}
              seo={pageProps.seo}
            />
          ) : null}
          <AppShell
            categoryPublicSlugsById={pageProps.categoryPublicSlugsById}
            footerNavigation={pageProps.footerNavigation}
            marketAlternates={pageProps.seo?.alternates}
            reviewTrustSources={pageProps.reviewTrustSources}
          >
            {content}
          </AppShell>
        </HydrationBoundary>
      </Providers>
    </NextIntlClientProvider>
  )
}

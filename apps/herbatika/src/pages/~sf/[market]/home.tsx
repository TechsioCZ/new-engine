import type { DehydratedState } from "@tanstack/react-query"
import { HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import {
  createRequestServerContext,
  loadShell,
  resolveMarketParam,
  type StorefrontShellProps,
} from "@/lib/routing/public-page"
import type { SeoPageMetadata } from "@/lib/seo/metadata"
import {
  fetchCmsHeroBanners,
  fetchCmsHomepagePromo,
} from "@/lib/storefront/cms"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"
import { getMarketOrigin } from "@/lib/url/builder"

type Props = StorefrontShellProps & {
  dehydratedState: DehydratedState
  heroBanners: Awaited<ReturnType<typeof fetchCmsHeroBanners>>
  homepagePromo: Awaited<ReturnType<typeof fetchCmsHomepagePromo>>
  seo: SeoPageMetadata
}
export const getServerSideProps: GetServerSideProps<Props> = async (
  context
) => {
  const market = resolveMarketParam(context)
  if (!market) {
    return { notFound: true }
  }
  const requestContext = createRequestServerContext(context, market)
  const locale = getHerbatikaMarketContext(market).locale
  try {
    const [{ dehydratedState }, heroBanners, homepagePromo] = await Promise.all(
      [
        prefetchHomePageStorefrontData(requestContext),
        fetchCmsHeroBanners(locale),
        fetchCmsHomepagePromo(locale),
      ]
    )
    return {
      props: {
        ...(await loadShell(market)),
        dehydratedState,
        heroBanners,
        homepagePromo,
        seo: {
          canonical: getMarketOrigin(market),
          robots: "index, follow",
          openGraph: { url: getMarketOrigin(market) },
        },
      },
    }
  } catch {
    context.res.statusCode = 503
    context.res.setHeader("Retry-After", "60")
    return {
      props: {
        ...(await loadShell(market)),
        dehydratedState: { mutations: [], queries: [] },
        heroBanners: [],
        homepagePromo: null,
        seo: { robots: "noindex, follow" },
      },
    }
  }
}
export default function HomePage({
  dehydratedState,
  heroBanners,
  homepagePromo,
}: Props) {
  return (
    <HydrationBoundary state={dehydratedState}>
      <HerbatikaHomepage
        heroBanners={heroBanners}
        homepagePromo={homepagePromo}
      />
    </HydrationBoundary>
  )
}

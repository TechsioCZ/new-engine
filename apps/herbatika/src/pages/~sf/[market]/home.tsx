import type { DehydratedState } from "@tanstack/react-query"
import { HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import type { HeroBannerItem } from "@/components/homepage/homepage.data.types"
import {
  foundSource,
  type PublicPageProps,
  resolveStaticPublicPage,
} from "@/lib/routing/public-page"
import {
  type CmsBlogCardItem,
  fetchCachedLatestCmsBlogPosts,
  fetchCmsHeroBanners,
  fetchCmsHomepagePromo,
} from "@/lib/storefront/cms"
import { hydrateCmsHeroBannerTargets } from "@/lib/storefront/cms-hero-targets.server"
import { fetchHeurekaHomepageReviews } from "@/lib/storefront/external-reviews.server"
import { HOMEPAGE_SECTION_CATEGORY_HANDLES } from "@/lib/storefront/homepage-catalog-config"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"
import {
  type PublicEntitySlugMap,
  readRequiredPublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"

type HomeValue = Readonly<{
  articlePublicSlugsById: PublicEntitySlugMap
  blogPosts: CmsBlogCardItem[]
  categoryPublicSlugsById: PublicEntitySlugMap
  dehydratedState: DehydratedState
  heroBanners: HeroBannerItem[]
  homepagePromo: Awaited<ReturnType<typeof fetchCmsHomepagePromo>>
  homepageReviewsData: Awaited<ReturnType<typeof fetchHeurekaHomepageReviews>>
  homepageSectionCategorySourceIds: Readonly<Record<string, string>>
  productPublicSlugsById: PublicEntitySlugMap
}>

type Props = PublicPageProps<HomeValue>

export const getServerSideProps = (async (context) =>
  resolveStaticPublicPage(context, {
    expectedRouteKey: "home",
    loadSource: async (market) => {
      const locale = getHerbatikaMarketContext(market).locale
      const [
        storefront,
        heroBanners,
        homepagePromo,
        blogPosts,
        homepageReviewsData,
      ] = await Promise.all([
        prefetchHomePageStorefrontData({
          cookieHeader: context.req.headers.cookie,
          market,
        }),
        fetchCmsHeroBanners(locale),
        fetchCmsHomepagePromo(locale),
        fetchCachedLatestCmsBlogPosts(3, [], locale),
        fetchHeurekaHomepageReviews(market),
      ])
      if (!storefront.region) {
        return {
          kind: "invalid-response",
          causeCode: "MISSING_REGION",
        } as const
      }
      const sectionIds = Object.keys(HOMEPAGE_SECTION_CATEGORY_HANDLES)
      if (
        sectionIds.some(
          (sectionId) => !storefront.homepageSectionCategorySourceIds[sectionId]
        )
      ) {
        return {
          causeCode: "INCOMPLETE_HOMEPAGE_SECTION_CATEGORY_SOURCE",
          kind: "invalid-response",
        } as const
      }
      const [
        articlePublicSlugsById,
        categoryPublicSlugsById,
        hydratedHeroBanners,
        productPublicSlugsById,
      ] = await Promise.all([
        readRequiredPublicEntitySlugs({
          kind: "article",
          market,
          requiredSourceIds: blogPosts.map((post) => post.sourceId),
        }),
        readRequiredPublicEntitySlugs({
          kind: "category",
          market,
          requiredSourceIds: storefront.categorySourceIds,
        }),
        hydrateCmsHeroBannerTargets(heroBanners, market),
        readRequiredPublicEntitySlugs({
          kind: "product",
          market,
          requiredSourceIds: storefront.visibleProductIds,
        }),
      ])
      if (articlePublicSlugsById.kind !== "found") {
        return articlePublicSlugsById
      }
      if (categoryPublicSlugsById.kind !== "found") {
        return categoryPublicSlugsById
      }
      if (hydratedHeroBanners.kind !== "found") {
        return hydratedHeroBanners
      }
      if (productPublicSlugsById.kind !== "found") {
        return productPublicSlugsById
      }
      return foundSource({
        articlePublicSlugsById: articlePublicSlugsById.value,
        blogPosts,
        categoryPublicSlugsById: categoryPublicSlugsById.value,
        dehydratedState: storefront.dehydratedState,
        heroBanners: hydratedHeroBanners.value,
        homepagePromo,
        homepageReviewsData,
        homepageSectionCategorySourceIds:
          storefront.homepageSectionCategorySourceIds,
        productPublicSlugsById: productPublicSlugsById.value,
      })
    },
    path: { kind: "home" },
    queryKind: "homepage",
  })) satisfies GetServerSideProps<Props>

export default function HomePage({ page }: Props) {
  if (page.kind === "error") {
    return <main data-status={page.status}>Storefront unavailable.</main>
  }
  return (
    <HydrationBoundary state={page.value.dehydratedState}>
      <HerbatikaHomepage
        articlePublicSlugsById={page.value.articlePublicSlugsById}
        blogPosts={page.value.blogPosts}
        categoryPublicSlugsById={page.value.categoryPublicSlugsById}
        heroBanners={page.value.heroBanners}
        homepagePromo={page.value.homepagePromo}
        homepageReviewsData={page.value.homepageReviewsData}
        homepageSectionCategorySourceIds={
          page.value.homepageSectionCategorySourceIds
        }
        productPublicSlugsById={page.value.productPublicSlugsById}
      />
    </HydrationBoundary>
  )
}

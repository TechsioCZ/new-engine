import type { DehydratedState } from "@tanstack/react-query"
import { HydrationBoundary } from "@tanstack/react-query"
import type { GetServerSideProps } from "next"
import { HerbatikaHomepage } from "@/components/herbatika-homepage"
import type { HeroBannerItem } from "@/components/homepage/homepage.data.types"
import { resolveHomepageHeroSource } from "@/components/homepage/homepage.hero.data"
import { LocalizedPageError } from "@/lib/routing/pages/localized-page-error"
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
import { hasCompleteHomepageSectionSources } from "@/lib/storefront/homepage-catalog-config"
import { readReviewedHomepageHeroBanners } from "@/lib/storefront/homepage-hero-source-manifest.server"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
import { prefetchHomePageStorefrontData } from "@/lib/storefront/ssr"
import {
  type PublicEntitySlugMap,
  readAvailablePublicEntitySlugs,
  readCompletePublicEntitySlugs,
} from "@/lib/storefront/ssr/public-entity-projections"
import type { SourceReadResult } from "@/lib/url-registry/contracts"

// Registry slug projections are best-effort: the URL registry runtime can be
// disabled, so a non-approved hero source (or a rejected read) degrades to an
// empty slug map instead of failing the whole homepage.
const readOptionalPublicEntitySlugs = (
  approved: boolean,
  read: () => Promise<SourceReadResult<PublicEntitySlugMap>>
): Promise<SourceReadResult<PublicEntitySlugMap>> =>
  approved ? read() : Promise.resolve({ kind: "found" as const, value: {} })

const publicEntitySlugValue = (
  result: SourceReadResult<PublicEntitySlugMap>
): PublicEntitySlugMap => (result.kind === "found" ? result.value : {})

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
  publicationApproved: boolean
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
        fetchCmsHeroBanners(locale).catch(() => []),
        fetchCmsHomepagePromo(locale).catch(() => null),
        fetchCachedLatestCmsBlogPosts(3, [], locale).catch(() => []),
        fetchHeurekaHomepageReviews(market).catch(() => null),
      ])
      const heroSource = resolveHomepageHeroSource(heroBanners, market, () =>
        readReviewedHomepageHeroBanners(locale)
      )
      if (heroSource.publicationApproved && !storefront.region) {
        return {
          kind: "invalid-response",
          causeCode: "MISSING_REGION",
        } as const
      }
      if (
        heroSource.publicationApproved &&
        !hasCompleteHomepageSectionSources(
          storefront.homepageSectionCategorySourceIds
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
        readOptionalPublicEntitySlugs(heroSource.publicationApproved, () =>
          readAvailablePublicEntitySlugs({
            kind: "article",
            market,
            requiredSourceIds: blogPosts.map((post) => post.sourceId),
          })
        ),
        readOptionalPublicEntitySlugs(heroSource.publicationApproved, () =>
          readCompletePublicEntitySlugs({
            kind: "category",
            market,
            requiredSourceIds: storefront.categorySourceIds,
          })
        ),
        hydrateCmsHeroBannerTargets(heroSource.value, market),
        readOptionalPublicEntitySlugs(heroSource.publicationApproved, () =>
          readAvailablePublicEntitySlugs({
            kind: "product",
            market,
            requiredSourceIds: storefront.visibleProductIds,
          })
        ),
      ])
      if (
        heroSource.publicationApproved &&
        hydratedHeroBanners.kind !== "found"
      ) {
        return hydratedHeroBanners
      }
      return foundSource({
        articlePublicSlugsById: publicEntitySlugValue(articlePublicSlugsById),
        blogPosts,
        categoryPublicSlugsById: publicEntitySlugValue(categoryPublicSlugsById),
        dehydratedState: storefront.dehydratedState,
        heroBanners:
          hydratedHeroBanners.kind === "found"
            ? hydratedHeroBanners.value
            : heroSource.value,
        homepagePromo,
        homepageReviewsData,
        homepageSectionCategorySourceIds:
          storefront.homepageSectionCategorySourceIds,
        productPublicSlugsById: publicEntitySlugValue(productPublicSlugsById),
        publicationApproved: heroSource.publicationApproved,
      })
    },
    isIndexable: (value) => value.publicationApproved,
    path: { kind: "home" },
    queryKind: "homepage",
    useLinkFreeShellWhenNoindex: true,
  })) satisfies GetServerSideProps<Props>

export default function HomePage({ page }: Props) {
  if (page.kind === "error") {
    return <LocalizedPageError status={page.status} surface="storefront" />
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

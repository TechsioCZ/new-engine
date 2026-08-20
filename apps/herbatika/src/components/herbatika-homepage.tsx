"use client"
import { BENEFITS } from "@/assets/benefits"
import type { HeroBannerItem } from "@/components/homepage/homepage.data"
import type { HomepagePromoContent } from "@/components/homepage/homepage.data.types"
import { resolveHomepageHeroBanners } from "@/components/homepage/homepage.hero.data"
import { HomepageBlogSection } from "@/components/homepage/sections/homepage-blog-section"
import { HomepageHeroCarouselSection } from "@/components/homepage/sections/homepage-hero-carousel-section"
import { HomepageProductCollectionSection } from "@/components/homepage/sections/homepage-product-collection-section"
import { HomepagePromoSection } from "@/components/homepage/sections/homepage-promo-section"
import { HomepageReviewsSection } from "@/components/homepage/sections/homepage-reviews-section"
import { useHomepageController } from "@/components/homepage/use-homepage-controller"
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section"
import type { HomepageReviewsData } from "@/components/reviews/reviews.types"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import type { BlogCardItemWithSourceId } from "./blog/blog-card-projection"
import { BenefitsSection } from "./homepage/sections/benefits-section"
import { PurposeCarousel } from "./homepage/sections/purpose-carousel"

type HerbatikaHomepageProps = {
  articlePublicSlugsById: PublicEntitySlugMap
  blogPosts: BlogCardItemWithSourceId[]
  categoryPublicSlugsById: PublicEntitySlugMap
  heroBanners?: HeroBannerItem[]
  homepagePromo?: HomepagePromoContent | null
  homepageReviewsData?: HomepageReviewsData | null
  homepageSectionCategorySourceIds: Readonly<Record<string, string>>
  productPublicSlugsById: PublicEntitySlugMap
}

export function HerbatikaHomepage({
  articlePublicSlugsById,
  blogPosts,
  categoryPublicSlugsById,
  heroBanners,
  homepagePromo,
  homepageReviewsData,
  homepageSectionCategorySourceIds,
  productPublicSlugsById,
}: HerbatikaHomepageProps) {
  const market = useMarketContext().code
  const controller = useHomepageController({
    categoryPublicSlugsById,
    homepageSectionCategorySourceIds,
    productPublicSlugsById,
  })
  const banners = resolveHomepageHeroBanners(heroBanners, market)

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-homepage-gap p-homepage font-rubik 2xl:p-homepage-lg">
      <HomepageHeroCarouselSection banners={banners} />
      <PurposeCarousel categoryPublicSlugsById={categoryPublicSlugsById} />
      <BenefitsSection benefits={BENEFITS} />

      {controller.leadingSections.map((section) => (
        <HomepageProductCollectionSection
          key={section.id}
          onProductHoverEnd={controller.handleProductHoverEnd}
          onProductHoverStart={controller.handleProductHoverStart}
          section={section}
          shouldShowProductSkeleton={controller.shouldShowProductSkeleton}
        />
      ))}

      <HomepageReviewsSection
        market={market}
        reviewsData={homepageReviewsData}
      />

      {controller.trailingSections.map((section) => (
        <HomepageProductCollectionSection
          key={section.id}
          onProductHoverEnd={controller.handleProductHoverEnd}
          onProductHoverStart={controller.handleProductHoverStart}
          section={section}
          shouldShowProductSkeleton={controller.shouldShowProductSkeleton}
        />
      ))}

      <HomepageBlogSection
        articlePublicSlugsById={articlePublicSlugsById}
        posts={blogPosts}
      />
      <HomepagePromoSection promo={homepagePromo} />
      <RecentlyVisitedProductsSection />
    </main>
  )
}

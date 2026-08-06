"use client"
import { BENEFITS } from "@/assets/benefits"
import type { HeroBannerItem } from "@/components/homepage/homepage.data"
import { createBlogPosts, createHeroBanners } from "@/components/homepage/homepage.data"
import type { HomepagePromoContent } from "@/components/homepage/homepage.data.types"
import { HomepageBlogSection } from "@/components/homepage/sections/homepage-blog-section"
import { HomepageHeroCarouselSection } from "@/components/homepage/sections/homepage-hero-carousel-section"
import { HomepageProductCollectionSection } from "@/components/homepage/sections/homepage-product-collection-section"
import { HomepagePromoSection } from "@/components/homepage/sections/homepage-promo-section"
import { HomepageReviewsSection } from "@/components/homepage/sections/homepage-reviews-section"
import { useHomepageController } from "@/components/homepage/use-homepage-controller"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section"
import { BenefitsSection } from "./homepage/sections/benefits-section"
import { PurposeCarousel } from "./homepage/sections/purpose-carousel"

type HerbatikaHomepageProps = {
  heroBanners?: HeroBannerItem[]
  homepagePromo?: HomepagePromoContent | null
}

export function HerbatikaHomepage({
  heroBanners,
  homepagePromo,
}: HerbatikaHomepageProps) {
  const controller = useHomepageController()
  const market = useMarketContext().code
  const banners = heroBanners?.length ? heroBanners : createHeroBanners(market)
  const blogPosts = createBlogPosts(market)

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-homepage-gap p-homepage font-rubik 2xl:p-homepage-lg">
      <HomepageHeroCarouselSection banners={banners} />
      <PurposeCarousel />
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

      <HomepageReviewsSection />

      {controller.trailingSections.map((section) => (
        <HomepageProductCollectionSection
          key={section.id}
          onProductHoverEnd={controller.handleProductHoverEnd}
          onProductHoverStart={controller.handleProductHoverStart}
          section={section}
          shouldShowProductSkeleton={controller.shouldShowProductSkeleton}
        />
      ))}

      <HomepageBlogSection posts={blogPosts} />
      <HomepagePromoSection promo={homepagePromo} />
      <RecentlyVisitedProductsSection />
    </main>
  )
}

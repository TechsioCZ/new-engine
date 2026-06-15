"use client"
import { BENEFITS } from "@/assets/benefits"
import { BLOG_POSTS, HERO_BANNERS } from "@/components/homepage/homepage.data"
import type { HeroBannerItem } from "@/components/homepage/homepage.data"
import { HomepageBlogSection } from "@/components/homepage/sections/homepage-blog-section"
import { HomepageHeroCarouselSection } from "@/components/homepage/sections/homepage-hero-carousel-section"
import { HomepageProductCollectionSection } from "@/components/homepage/sections/homepage-product-collection-section"
import { HomepagePromoSection } from "@/components/homepage/sections/homepage-promo-section"
import { HomepageReviewsSection } from "@/components/homepage/sections/homepage-reviews-section"
import { useHomepageController } from "@/components/homepage/use-homepage-controller"
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section"
import { BenefitsSection } from "./homepage/sections/benefits-section"
import { PurposeCarousel } from "./homepage/sections/purpose-carousel"

type HerbatikaHomepageProps = {
  heroBanners?: HeroBannerItem[]
}

export function HerbatikaHomepage({ heroBanners }: HerbatikaHomepageProps) {
  const controller = useHomepageController()
  const banners = heroBanners?.length ? heroBanners : HERO_BANNERS

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

      <HomepageBlogSection posts={BLOG_POSTS} />
      <HomepagePromoSection />
      <RecentlyVisitedProductsSection />
    </main>
  )
}

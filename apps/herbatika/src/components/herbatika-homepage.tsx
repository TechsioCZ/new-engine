"use client";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import {
  BLOG_POSTS,
  HERO_BANNERS,
} from "@/components/homepage/homepage.data";
import { BENEFITS } from "@/assets/benefits";
import { useHomepageController } from "@/components/homepage/use-homepage-controller";
import { HomepageBlogSection } from "@/components/homepage/sections/homepage-blog-section";
import { HomepageHeroCarouselSection } from "@/components/homepage/sections/homepage-hero-carousel-section";
import { HomepageProductCollectionSection } from "@/components/homepage/sections/homepage-product-collection-section";
import { HomepagePromoSection } from "@/components/homepage/sections/homepage-promo-section";
import { HomepageRecentProductsSection } from "@/components/homepage/sections/homepage-recent-products-section";
import { HomepageReviewsSection } from "@/components/homepage/sections/homepage-reviews-section";
import { PurposeCarousel } from "./homepage/sections/purpose-carousel";
import { BenefitsSection } from "./homepage/sections/benefits-section";

export function HerbatikaHomepage() {
  const controller = useHomepageController();

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-700 px-400 py-550 font-rubik lg:px-550 lg:py-700">
      <HomepageHeroCarouselSection banners={HERO_BANNERS} />
      <PurposeCarousel />
      <BenefitsSection benefits={BENEFITS} />

      {controller.cartMessage ? (
        <div className="flex">
          <Badge
            className="rounded-full px-300 py-100 text-xs font-semibold"
            variant="success"
          >
            {controller.cartMessage}
          </Badge>
        </div>
      ) : null}

      {controller.mutationError ? (
        <StatusText className="text-sm" showIcon status="error">
          {controller.mutationError}
        </StatusText>
      ) : null}

      {controller.productsError ? (
        <StatusText className="text-sm" showIcon status="error">
          {controller.productsError}
        </StatusText>
      ) : null}

      {controller.leadingSections.map((section) => (
        <HomepageProductCollectionSection
          isProductAdding={controller.isProductAdding}
          key={section.id}
          onAddToCart={controller.handleAddToCart}
          onProductHoverEnd={controller.handleProductHoverEnd}
          onProductHoverStart={controller.handleProductHoverStart}
          section={section}
          shouldShowProductSkeleton={controller.shouldShowProductSkeleton}
        />
      ))}

      <HomepageReviewsSection />

      {controller.trailingSections.map((section) => (
        <HomepageProductCollectionSection
          isProductAdding={controller.isProductAdding}
          key={section.id}
          onAddToCart={controller.handleAddToCart}
          onProductHoverEnd={controller.handleProductHoverEnd}
          onProductHoverStart={controller.handleProductHoverStart}
          section={section}
          shouldShowProductSkeleton={controller.shouldShowProductSkeleton}
        />
      ))}

      <HomepageBlogSection posts={BLOG_POSTS} />
      <HomepagePromoSection />
      <HomepageRecentProductsSection
        products={controller.recentProducts}
        shouldShowProductSkeleton={controller.shouldShowProductSkeleton}
      />
    </main>
  );
}

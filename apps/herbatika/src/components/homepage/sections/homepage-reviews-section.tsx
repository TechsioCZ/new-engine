import { StorefrontReviewsSection } from "@/components/reviews/storefront-reviews-section";
import { STOREFRONT_HEUREKA_REVIEWS } from "@/components/reviews/storefront-reviews.data";

export function HomepageReviewsSection() {
  return (
    <StorefrontReviewsSection
      headingText="Overené zákazníkmi"
      reviews={STOREFRONT_HEUREKA_REVIEWS}
      scoreLabel={null}
      sectionClassName="space-y-500"
      variant="homepage"
    />
  );
}

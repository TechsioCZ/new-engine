import { ReviewsSection } from "@/components/reviews/reviews-section";
import { HEUREKA_REVIEWS } from "@/components/reviews/reviews.data";

export function HomepageReviewsSection() {
  return (
    <ReviewsSection
      headingText="Overené zákazníkmi"
      reviews={HEUREKA_REVIEWS}
      scoreLabel={null}
      sectionClassName="space-y-500"
      variant="homepage"
    />
  );
}

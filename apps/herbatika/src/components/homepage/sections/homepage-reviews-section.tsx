import { HEUREKA_REVIEWS } from "@/components/reviews/reviews.data"
import { ReviewsSection } from "@/components/reviews/reviews-section"

export function HomepageReviewsSection() {
  return (
    <ReviewsSection
      headingText="Overené zákazníkmi"
      reviews={HEUREKA_REVIEWS}
      scoreLabel={null}
      sectionClassName="space-y-500"
      variant="homepage"
    />
  )
}

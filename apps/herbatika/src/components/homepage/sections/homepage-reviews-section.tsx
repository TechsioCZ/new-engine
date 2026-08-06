import { ReviewsSection } from "@/components/reviews/reviews-section"
import { HEUREKA_REVIEWS } from "@/components/reviews/reviews.data"

export const HomepageReviewsSection = () => (
  <ReviewsSection
    reviews={HEUREKA_REVIEWS}
    scoreLabel={null}
    sectionClassName="space-y-500"
    variant="homepage"
  />
)

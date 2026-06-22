import { HEUREKA_REVIEWS } from "@/components/reviews/reviews.data"
import { ReviewsSection } from "@/components/reviews/reviews-section"
import type { HomepageReviewsData } from "@/components/reviews/reviews.types"

type HomepageReviewsSectionProps = {
  reviewsData?: HomepageReviewsData | null
}

export function HomepageReviewsSection({
  reviewsData,
}: HomepageReviewsSectionProps) {
  const reviews =
    reviewsData && reviewsData.reviews.length > 0
      ? reviewsData.reviews
      : HEUREKA_REVIEWS

  return (
    <ReviewsSection
      headingText="Overené zákazníkmi"
      reviews={reviews}
      scoreLabel={null}
      sectionClassName="space-y-500"
      trustSources={reviewsData?.trustSources}
      variant="homepage"
    />
  )
}

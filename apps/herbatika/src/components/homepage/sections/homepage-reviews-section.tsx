import { ReviewsSection } from "@/components/reviews/reviews-section"
import type { HomepageReviewsData } from "@/components/reviews/reviews.types"

type HomepageReviewsSectionProps = {
  reviewsData?: HomepageReviewsData | null
}

export function HomepageReviewsSection({
  reviewsData,
}: HomepageReviewsSectionProps) {
  if (!reviewsData || reviewsData.reviews.length === 0) {
    return null
  }

  return (
    <ReviewsSection
      headingText="Overené zákazníkmi"
      reviews={reviewsData.reviews}
      scoreLabel={null}
      sectionClassName="space-y-500"
      trustSources={reviewsData.trustSources}
      variant="homepage"
    />
  )
}

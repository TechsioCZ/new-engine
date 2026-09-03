import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/reviews/reviews-section", () => ({
  ReviewsSection: () => <div>external-reviews-visible</div>,
}))

import { HomepageReviewsSection } from "./homepage-reviews-section"

const reviewsData = {
  reviews: [
    {
      id: "review-1",
      author: "Customer",
      dateLabel: "19. 08. 2026",
      rating: 5,
    },
  ],
  trustSources: [],
}

describe("HomepageReviewsSection market isolation", () => {
  it("renders Heureka reviews for SK", () => {
    expect(
      renderToStaticMarkup(
        <HomepageReviewsSection market="sk" reviewsData={reviewsData} />
      )
    ).toContain("external-reviews-visible")
  })

  it("hides Heureka reviews for RO even if stale data reaches the component", () => {
    expect(
      renderToStaticMarkup(
        <HomepageReviewsSection market="ro" reviewsData={reviewsData} />
      )
    ).toBe("")
  })
})

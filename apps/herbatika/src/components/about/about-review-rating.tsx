"use client";

import { Rating } from "@techsio/ui-kit/atoms/rating";

export function AboutReviewRating() {
  return (
    <Rating
      aria-label="5 z 5 hviezdičiek"
      className="pointer-events-none"
      readOnly
      size="lg"
      value={5}
    />
  );
}

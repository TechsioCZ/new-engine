"use client"

import { Rating } from "@techsio/ui-kit/atoms/rating"
import { useTranslations } from "next-intl"

export function AboutReviewRating() {
  const tContent = useTranslations("content")

  return (
    <Rating
      aria-label={tContent("about.rating_aria", { max: 5, rating: 5 })}
      className="pointer-events-none"
      readOnly
      size="lg"
      value={5}
    />
  )
}

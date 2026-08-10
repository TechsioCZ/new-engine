"use client"

import { clamp } from "@techsio/std/number"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { useTranslations } from "next-intl"
import type { CSSProperties } from "react"

interface FractionalRatingProps {
  label?: string
  value: number
}

const STAR_COUNT = 5

type StarFillStyle = CSSProperties & {
  "--star-fill": string
}

export const FractionalRating = ({ label, value }: FractionalRatingProps) => {
  const tCatalog = useTranslations("catalog")
  const normalizedValue = Number.isFinite(value)
    ? clamp(value, 0, STAR_COUNT)
    : 0

  return (
    <output
      aria-label={
        label ??
        tCatalog("reviews.rating_aria", {
          max: STAR_COUNT,
          rating: normalizedValue.toFixed(1),
        })
      }
      className="pointer-events-none relative inline-flex items-center gap-rating-lg text-rating-lg"
    >
      {Array.from({ length: STAR_COUNT }, (_, index) => {
        const fill = clamp(normalizedValue - index, 0, 1)
        const style: StarFillStyle = {
          "--star-fill": `${fill * 100}%`,
        }

        return (
          <span
            className="relative inline-grid shrink-0"
            key={`star-${index + 1}`}
          >
            <Icon
              className="text-rating-fg-base"
              icon="token-icon-rating"
              size="current"
            />
            <span
              aria-hidden="true"
              className="rating-star-fill pointer-events-none absolute inset-y-0 start-0 overflow-hidden"
              style={style}
            >
              <Icon
                className="absolute text-rating-fg-active"
                icon="token-icon-rating"
                size="current"
              />
            </span>
          </span>
        )
      })}
    </output>
  )
}

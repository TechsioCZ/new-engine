"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useMemo, useState } from "react"
import { stripHtml } from "@/components/product-detail/utils/html-sanitizer"
import {
  type CategoryContextImageTile,
  CategoryContextImageTileGrid,
} from "./category-context-image-tile-grid"
import {
  CATEGORY_RICH_TEXT_CLASS,
  sanitizeCategoryRichTextHtml,
} from "./category-rich-text"

type CategoryContextPanelProps = {
  imageTiles?: CategoryContextImageTile[]
  introHtml?: string | null
  introText?: string | null
}

export function CategoryContextPanel({
  imageTiles,
  introHtml,
  introText,
}: CategoryContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const sanitizedIntroHtml = useMemo(
    () => sanitizeCategoryRichTextHtml(introHtml),
    [introHtml]
  )
  const resolvedIntroText = sanitizedIntroHtml
    ? stripHtml(sanitizedIntroHtml)
    : (introText ?? "")
  const shouldShowIntroToggle = Boolean(
    resolvedIntroText && resolvedIntroText.length > 260
  )

  if (!(sanitizedIntroHtml || introText || imageTiles?.length)) {
    return null
  }

  return (
    <section className="space-y-350">
      {sanitizedIntroHtml || introText ? (
        <div className="space-y-150">
          {sanitizedIntroHtml ? (
            <div
              className={`${CATEGORY_RICH_TEXT_CLASS} ${
                isExpanded ? "" : "line-clamp-4"
              }`}
              dangerouslySetInnerHTML={{ __html: sanitizedIntroHtml }}
            />
          ) : (
            <div
              className={`max-w-none font-verdana text-fg-primary text-sm leading-relaxed sm:text-md ${
                isExpanded ? "" : "line-clamp-4"
              }`}
            >
              {introText}
            </div>
          )}
          {shouldShowIntroToggle ? (
            <Button
              className="p-0 font-semibold text-primary text-sm underline-offset-2 hover:underline"
              onClick={() => {
                setIsExpanded((previousValue) => !previousValue)
              }}
              size="current"
              theme="unstyled"
              type="button"
            >
              {isExpanded ? "Zobraziť menej" : "Zobraziť viac"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {imageTiles?.length ? (
        <CategoryContextImageTileGrid tiles={imageTiles ?? []} />
      ) : null}
    </section>
  )
}

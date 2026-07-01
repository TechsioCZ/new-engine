"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useState } from "react"
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

type CategoryIntroProps = {
  introText?: string | null
  isExpanded: boolean
  onExpandedChange: (isExpanded: boolean) => void
  sanitizedIntroHtml: string
  shouldShowIntroToggle: boolean
}

function CategoryIntro({
  introText,
  isExpanded,
  onExpandedChange,
  sanitizedIntroHtml,
  shouldShowIntroToggle,
}: CategoryIntroProps) {
  if (!(sanitizedIntroHtml || introText)) {
    return null
  }

  const introClassName = isExpanded ? "" : "line-clamp-4"

  return (
    <div className="space-y-150">
      {sanitizedIntroHtml ? (
        <div
          className={`${CATEGORY_RICH_TEXT_CLASS} ${introClassName}`}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Category intro HTML is normalized through sanitizeCategoryRichTextHtml before rendering.
          dangerouslySetInnerHTML={{ __html: sanitizedIntroHtml }}
        />
      ) : (
        <div
          className={`max-w-none font-verdana text-fg-primary text-sm leading-relaxed sm:text-md ${introClassName}`}
        >
          {introText}
        </div>
      )}
      {shouldShowIntroToggle ? (
        <Button
          className="p-0 font-semibold text-primary text-sm underline-offset-2 hover:underline"
          onClick={() => {
            onExpandedChange(!isExpanded)
          }}
          size="current"
          theme="unstyled"
          type="button"
        >
          {isExpanded ? "Zobraziť menej" : "Zobraziť viac"}
        </Button>
      ) : null}
    </div>
  )
}

export function CategoryContextPanel({
  imageTiles,
  introHtml,
  introText,
}: CategoryContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const sanitizedIntroHtml = sanitizeCategoryRichTextHtml(introHtml)
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
      <CategoryIntro
        introText={introText}
        isExpanded={isExpanded}
        onExpandedChange={setIsExpanded}
        sanitizedIntroHtml={sanitizedIntroHtml}
        shouldShowIntroToggle={shouldShowIntroToggle}
      />

      {imageTiles?.length ? (
        <CategoryContextImageTileGrid tiles={imageTiles ?? []} />
      ) : null}
    </section>
  )
}

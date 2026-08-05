"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { stripHtml } from "@/components/product-detail/utils/html-sanitizer"

import { CategoryContextImageTileGrid } from "./category-context-image-tile-grid"
import type { CategoryContextImageTile } from "./category-context-image-tile-grid"
import {
  CATEGORY_RICH_TEXT_CLASS,
  sanitizeCategoryRichTextHtml,
} from "./category-rich-text"

interface CategoryContextPanelProps {
  imageTiles?: CategoryContextImageTile[]
  introHtml?: string | null
  introText?: string | null
}

interface CategoryIntroProps {
  introText?: string | null
  isExpanded: boolean
  onExpandedChange: (isExpanded: boolean) => void
  sanitizedIntroHtml: string
  shouldShowIntroToggle: boolean
}

const CategoryIntro = ({
  introText,
  isExpanded,
  onExpandedChange,
  sanitizedIntroHtml,
  shouldShowIntroToggle,
}: CategoryIntroProps) => {
  const tCatalog = useTranslations("catalog")

  if (!(sanitizedIntroHtml || introText)) {
    return null
  }

  const introClassName = isExpanded ? "" : "line-clamp-4"

  return (
    <div className="space-y-150">
      {sanitizedIntroHtml ? (
        <div
          className={`${CATEGORY_RICH_TEXT_CLASS} ${introClassName}`}
          // Category intro HTML is normalized through sanitizeCategoryRichTextHtml before rendering.
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
          {isExpanded
            ? tCatalog("filters.show_less")
            : tCatalog("filters.show_more")}
        </Button>
      ) : null}
    </div>
  )
}

export const CategoryContextPanel = ({
  imageTiles,
  introHtml,
  introText,
}: CategoryContextPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const sanitizedIntroHtml = sanitizeCategoryRichTextHtml(introHtml)
  const resolvedIntroText = sanitizedIntroHtml
    ? stripHtml(sanitizedIntroHtml)
    : (introText ?? "")
  const shouldShowIntroToggle = Boolean(
    resolvedIntroText && resolvedIntroText.length > 260,
  )

  if (!(sanitizedIntroHtml || introText || imageTiles?.length)) {
    return null
  }

  return (
    <section className="space-y-350">
      <CategoryIntro
        {...(introText === undefined ? {} : { introText })}
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

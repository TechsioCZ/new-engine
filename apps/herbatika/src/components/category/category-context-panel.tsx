"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { SafeHtml } from "@techsio/ui-kit/atoms/safe-html"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { stripHtml } from "@/components/product-detail/utils/html-sanitizer"

import { CategoryContextImageTileGrid } from "./category-context-image-tile-grid"
import type { CategoryContextImageTile } from "./category-context-image-tile-grid"
import {
  CATEGORY_RICH_TEXT_CLASS,
  CATEGORY_RICH_TEXT_POLICY,
  sanitizeCategoryRichTextHtml,
} from "./category-rich-text-config"

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

  const hasSanitizedIntroHtml = sanitizedIntroHtml.length > 0
  const hasIntroText =
    introText !== null && introText !== undefined && introText.length > 0

  if (!hasSanitizedIntroHtml && !hasIntroText) {
    return null
  }

  const introClassName = isExpanded ? "" : "line-clamp-4"

  return (
    <div className="space-y-150">
      {hasSanitizedIntroHtml ? (
        <div className={`${CATEGORY_RICH_TEXT_CLASS} ${introClassName}`}>
          <SafeHtml
            html={sanitizedIntroHtml}
            policy={CATEGORY_RICH_TEXT_POLICY}
          />
        </div>
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
  const hasSanitizedIntroHtml = sanitizedIntroHtml.length > 0
  const hasIntroText =
    introText !== null && introText !== undefined && introText.length > 0
  const hasImageTiles = imageTiles !== undefined && imageTiles.length > 0
  const resolvedIntroText = hasSanitizedIntroHtml
    ? stripHtml(sanitizedIntroHtml)
    : (introText ?? "")
  const shouldShowIntroToggle = resolvedIntroText.length > 260
  const imageTileGrid = hasImageTiles ? (
    <CategoryContextImageTileGrid tiles={imageTiles} />
  ) : null

  if (!hasSanitizedIntroHtml && !hasIntroText && !hasImageTiles) {
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

      {imageTileGrid}
    </section>
  )
}

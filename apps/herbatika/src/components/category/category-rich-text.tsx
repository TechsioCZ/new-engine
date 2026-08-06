"use client"

import { SafeHtml } from "@techsio/ui-kit/atoms/safe-html"

import {
  CATEGORY_RICH_TEXT_CLASS,
  CATEGORY_RICH_TEXT_POLICY,
  sanitizeCategoryRichTextHtml,
} from "./category-rich-text-config"

interface CategoryRichTextProps {
  className?: string
  html: string | null | undefined
}

export const CategoryRichText = ({
  className,
  html,
}: CategoryRichTextProps) => {
  const sanitizedHtml = sanitizeCategoryRichTextHtml(html)

  if (sanitizedHtml === "") {
    return null
  }

  return (
    <div
      className={[CATEGORY_RICH_TEXT_CLASS, className]
        .filter((value) => value !== undefined && value !== "")
        .join(" ")}
    >
      <SafeHtml html={sanitizedHtml} policy={CATEGORY_RICH_TEXT_POLICY} />
    </div>
  )
}

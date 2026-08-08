import type { HttpTypes } from "@medusajs/types"
import { isRecord } from "@techsio/std/object"

import { rewriteCategoryMetadataHtml } from "@/components/category/category-html-rewrite"

const CATEGORY_DESCRIPTION_PLACEHOLDERS = new Set([
  "Imported from Herbatica XML feed.",
  "Imported from Herbatica category export.",
])

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null

interface ResolveCategoryIntroTextInput {
  activeCategory: HttpTypes.StoreProductCategory | null
}

type ResolveCategoryHtmlInput = ResolveCategoryIntroTextInput & {
  categoryByHandle: Map<string, HttpTypes.StoreProductCategory>
}

export const resolveCategoryIntroText = ({
  activeCategory,
}: ResolveCategoryIntroTextInput) => {
  const description = activeCategory?.description?.trim()
  if (
    description === undefined ||
    description === "" ||
    CATEGORY_DESCRIPTION_PLACEHOLDERS.has(description)
  ) {
    return null
  }

  return description
}

const resolveCategoryMetadataHtml = ({
  activeCategory,
  categoryByHandle,
  field,
}: ResolveCategoryHtmlInput & {
  field: "bottom_description_html" | "top_description_html"
}) => {
  const metadata = isRecord(activeCategory?.metadata)
    ? activeCategory.metadata
    : null
  const html = asString(metadata?.[field])
  if (html === null) {
    return null
  }

  return rewriteCategoryMetadataHtml(html, categoryByHandle)
}

export const resolveCategoryIntroHtml = (input: ResolveCategoryHtmlInput) =>
  resolveCategoryMetadataHtml({ ...input, field: "top_description_html" })

export const resolveCategoryBottomHtml = (input: ResolveCategoryHtmlInput) =>
  resolveCategoryMetadataHtml({ ...input, field: "bottom_description_html" })

"use client"

import { useMemo } from "react"
import { sanitizeHtml } from "@/components/product-detail/utils/html-sanitizer"

type CategoryRichTextProps = {
  className?: string
  html: string | null | undefined
}

export const CATEGORY_RICH_TEXT_CLASS = `max-w-none font-verdana text-sm leading-relaxed text-fg-primary sm:text-md 
  [&_a]:font-bold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 
  [&_em]:italic 
  [&_h2]:mt-500 [&_h2]:font-rubik [&_h2]:text-xl [&_h2]:font-bold 
  [&_h3]:mt-400 [&_h3]:font-rubik [&_h3]:text-lg [&_h3]:font-bold 
  [&_h4]:mt-300 [&_h4]:font-rubik [&_h4]:text-md [&_h4]:font-bold 
  [&_li]:ml-400 [&_li]:list-disc 
  [&_p+p]:mt-0 [&_strong]:font-bold [&_ul]:mt-250
  [&_img]:mt-400 [&_img]:h-auto [&_img]:w-full [&_img]:max-w-4xl [&_img]:mx-auto [&_img]:rounded-sm
  [&_p:has(img)+p]:mx-auto [&_p:has(img)+p]:mt-100 [&_p:has(img)+p]:w-full [&_p:has(img)+p]:max-w-4xl [&_p:has(img)+p]:text-xs [&_p:has(img)+p]:text-fg-secondary
  `

export const sanitizeCategoryRichTextHtml = (
  html: string | null | undefined
) => (html ? sanitizeHtml(html) : "")

export function CategoryRichText({ className, html }: CategoryRichTextProps) {
  const sanitizedHtml = useMemo(
    () => sanitizeCategoryRichTextHtml(html),
    [html]
  )

  if (!sanitizedHtml) {
    return null
  }

  return (
    <div
      className={[CATEGORY_RICH_TEXT_CLASS, className]
        .filter(Boolean)
        .join(" ")}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}

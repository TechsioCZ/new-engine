"use client"

import { useMemo } from "react"
import { sanitizeHtml } from "@/components/product-detail/utils/html-sanitizer"

type ProductDetailHtmlContentProps = {
  html: string
  fallback: string
}

export function ProductDetailHtmlContent({
  html,
  fallback,
}: ProductDetailHtmlContentProps) {
  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html])

  if (!sanitizedHtml) {
    return <p className="text-fg-secondary text-md">{fallback}</p>
  }

  return (
    <div
      className="space-y-300 text-fg-secondary text-md [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-medium [&_h2]:text-fg-primary [&_h2]:text-xl [&_h3]:font-medium [&_h3]:text-fg-primary [&_h3]:text-lg [&_h4]:font-medium [&_h4]:text-fg-primary [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md [&_li]:ml-500 [&_ol]:list-decimal [&_strong]:font-semibold [&_strong]:text-fg-primary [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_td]:border [&_td]:border-border-secondary [&_td]:p-200 [&_th]:border [&_th]:border-border-secondary [&_th]:bg-surface-secondary [&_th]:p-200 [&_th]:text-left [&_ul]:list-disc"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Product HTML is normalized through sanitizeHtml before rendering.
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}

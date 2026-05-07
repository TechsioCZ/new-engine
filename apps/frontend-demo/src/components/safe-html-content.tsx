"use client"

import DOMPurify from "dompurify"
import { useMemo } from "react"

type SanitizerConfig = NonNullable<Parameters<typeof DOMPurify.sanitize>[1]>

type SafeHtmlContentProps = {
  content: string | null | undefined
  className?: string
  /** Custom DOMPurify config for allowed tags and attributes */
  config?: SanitizerConfig
}

const HTML_TAG_PATTERN = /<[^>]*>/
const HTML_ENTITY_PATTERN = /&#?\w+;/

/**
 * Safely renders HTML content with automatic detection and sanitization.
 * Detects if content contains HTML tags or entities and sanitizes accordingly.
 * Falls back to plain text rendering for non-HTML content.
 */
export function SafeHtmlContent({
  content,
  className,
  config,
}: SafeHtmlContentProps) {
  const processedContent = useMemo(() => {
    if (!content) {
      return { isHtml: false, content: "" }
    }

    // Check if content contains HTML tags or HTML entities
    const hasHtmlTags = HTML_TAG_PATTERN.test(content)
    const hasHtmlEntities = HTML_ENTITY_PATTERN.test(content)
    const isHtml = hasHtmlTags || hasHtmlEntities

    if (isHtml) {
      // Default safe config for product descriptions
      const defaultConfig = {
        ALLOWED_TAGS: [
          "p",
          "br",
          "strong",
          "em",
          "b",
          "i",
          "u",
          "ul",
          "ol",
          "li",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "a",
          "blockquote",
          "code",
          "pre",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "span",
          "div",
        ],
        ALLOWED_ATTR: ["class", "style", "href", "target", "rel"],
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ["script", "iframe", "form", "input"],
        FORBID_ATTR: ["onerror", "onclick", "onload"],
      }

      // Merge custom config with defaults
      const finalConfig = { ...defaultConfig, ...config }
      const sanitized = DOMPurify.sanitize(content, finalConfig)

      return { isHtml: true, content: String(sanitized) }
    }

    return { isHtml: false, content }
  }, [content, config])

  if (!processedContent.content) {
    return null
  }

  if (processedContent.isHtml) {
    return (
      <div
        className={className}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Product HTML is sanitized by DOMPurify immediately above.
        dangerouslySetInnerHTML={{ __html: processedContent.content }}
      />
    )
  }

  // Render plain text - React handles this safely by default
  return <p className={className}>{processedContent.content}</p>
}

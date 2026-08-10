"use client"

import { SafeHtml } from "@techsio/ui-kit/atoms/safe-html"
import type { SafeHtmlPolicy } from "@techsio/ui-kit/atoms/safe-html"

interface SafeHtmlContentProps {
  content: string | null | undefined
  className?: string
  policy?: SafeHtmlPolicy
}

const HTML_TAG_PATTERN = /<[^>]*>/u
const HTML_ENTITY_PATTERN = /&#?\w+;/u

const PRODUCT_CONTENT_POLICY: SafeHtmlPolicy = {
  allowedAttributes: {
    "*": ["class"],
    a: ["href", "rel", "target"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedTags: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strike",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
  ],
}

const processSafeHtmlContent = (content: string | null | undefined) => {
  if (content === null || content === undefined || content === "") {
    return { content: "", isHtml: false }
  }

  return {
    content,
    isHtml: HTML_TAG_PATTERN.test(content) || HTML_ENTITY_PATTERN.test(content),
  }
}

/**
 * Safely renders HTML content with automatic detection and sanitization.
 * Falls back to plain text rendering for non-HTML content.
 */
export const SafeHtmlContent = ({
  content,
  className,
  policy = PRODUCT_CONTENT_POLICY,
}: SafeHtmlContentProps) => {
  const processedContent = processSafeHtmlContent(content)

  if (processedContent.content === "") {
    return null
  }

  if (processedContent.isHtml) {
    return (
      <div className={className}>
        <SafeHtml html={processedContent.content} policy={policy} />
      </div>
    )
  }

  return <p className={className}>{processedContent.content}</p>
}

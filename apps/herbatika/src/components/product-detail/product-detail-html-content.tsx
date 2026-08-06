"use client"

import { sanitize as sanitizeDom } from "isomorphic-dompurify"
import { createElement } from "react"
import type { ReactNode } from "react"

import {
  isSanitizedHtmlTagAllowed,
  sanitizeHtml,
} from "@/components/product-detail/utils/html-sanitizer"

interface ProductDetailHtmlContentProps {
  html: string
}

const REACT_ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  colspan: "colSpan",
  rowspan: "rowSpan",
}

const isHtmlElement = (node: Node): node is Element => node.nodeType === 1

const renderSanitizedNode = (node: Node, key: string): ReactNode => {
  if (node.nodeType === 3) {
    return node.textContent
  }
  if (!isHtmlElement(node)) {
    return null
  }

  const tag = node.tagName.toLowerCase()
  if (!isSanitizedHtmlTagAllowed(tag)) {
    return null
  }

  const properties: Record<string, unknown> = { key }
  for (const attribute of node.attributes) {
    properties[REACT_ATTRIBUTE_NAMES[attribute.name] ?? attribute.name] =
      attribute.value
  }
  const children = Array.from(node.childNodes, (child, index): ReactNode =>
    renderSanitizedNode(child, `${key}-${index}`),
  )

  return createElement(tag, properties, children)
}

export const ProductDetailHtmlContent = ({
  html,
}: ProductDetailHtmlContentProps) => {
  const sanitizedHtml = sanitizeHtml(html)
  if (sanitizedHtml === "") {
    return null
  }

  const fragment = sanitizeDom(sanitizedHtml, {
    ADD_ATTR: ["target"],
    RETURN_DOM_FRAGMENT: true,
  })
  const content = Array.from(fragment.childNodes, (node, index): ReactNode =>
    renderSanitizedNode(node, `product-detail-html-${index}`),
  )

  return (
    <div className="space-y-300 text-fg-secondary text-md [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-medium [&_h2]:text-fg-primary [&_h2]:text-xl [&_h3]:font-medium [&_h3]:text-fg-primary [&_h3]:text-lg [&_h4]:font-medium [&_h4]:text-fg-primary [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md [&_li]:ml-500 [&_ol]:list-decimal [&_strong]:font-semibold [&_strong]:text-fg-primary [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_td]:border [&_td]:border-border-secondary [&_td]:p-200 [&_th]:border [&_th]:border-border-secondary [&_th]:bg-surface-secondary [&_th]:p-200 [&_th]:text-left [&_ul]:list-disc">
      {content}
    </div>
  )
}

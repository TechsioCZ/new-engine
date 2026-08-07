import {
  type SanitizeHtmlOptions,
  sanitizeHtml,
} from "@/components/product-detail/utils/html-sanitizer"

const HOMEPAGE_PROMO_SANITIZE_OPTIONS = {
  additionalAllowedAttributeValues: {
    li: {
      "aria-checked": new Set(["false", "true"]),
      role: new Set(["checkbox"]),
    },
    span: {
      style: new Set([
        "text-decoration: line-through;",
        "text-decoration: underline;",
      ]),
    },
  },
  additionalAllowedTagAttributes: {
    li: new Set(["aria-checked", "role"]),
    span: new Set(["style"]),
  },
  additionalAllowedTags: new Set([
    "code",
    "h1",
    "h5",
    "h6",
    "hr",
    "sub",
    "sup",
  ]),
} satisfies SanitizeHtmlOptions

export const sanitizeHomepagePromoHtml = (html: string): string =>
  sanitizeHtml(html, HOMEPAGE_PROMO_SANITIZE_OPTIONS)

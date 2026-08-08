import type { SanitizeHtmlOptions } from "@/components/product-detail/utils/html-sanitizer-policy"
import { sanitizeMatchedHtmlTag } from "@/components/product-detail/utils/html-tag-sanitizer"

export type { SanitizeHtmlOptions } from "@/components/product-detail/utils/html-sanitizer-policy"

const RENDERABLE_IMAGE_TAG_REGEX = /<\s*[iI][mM][gG]\b/u

export const sanitizeHtml = (
  html: string,
  options: SanitizeHtmlOptions = {},
): string => {
  if (html === "") {
    return ""
  }

  // ASCII case pairs keep the sanitizer from widening matches through Unicode folding.
  const cleanedHtml = html
    .replaceAll(/<!--[\s\S]*?-->/gu, "")
    .replaceAll(
      /<[sS][cC][rR][iI][pP][tT][\s\S]*?<\/[sS][cC][rR][iI][pP][tT]>/gu,
      "",
    )
    .replaceAll(/<[sS][tT][yY][lL][eE][\s\S]*?<\/[sS][tT][yY][lL][eE]>/gu, "")
    .replaceAll(/<iframe[\s\S]*?<\/iframe>/giu, "")
    .replaceAll(/<object[\s\S]*?<\/object>/giu, "")
    .replaceAll(/<embed[\s\S]*?<\/embed>/giu, "")

  return cleanedHtml
    .replaceAll(/<\s*\/?\s*[a-zA-Z0-9]+[^>]*>/gu, (matchedTag: string) =>
      sanitizeMatchedHtmlTag(matchedTag, options),
    )
    .trim()
}

export const stripHtml = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === "") {
    return ""
  }

  return value
    .replaceAll(
      /<[sS][tT][yY][lL][eE][^>]*>[\s\S]*?<\/[sS][tT][yY][lL][eE]>/gu,
      " ",
    )
    .replaceAll(
      /<[sS][cC][rR][iI][pP][tT][^>]*>[\s\S]*?<\/[sS][cC][rR][iI][pP][tT]>/gu,
      " ",
    )
    .replaceAll(/<[^>]+>/gu, " ")
    .replaceAll(/&[nN][bB][sS][pP];/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim()
}

export const hasRenderableHtmlContent = (
  value: string | null | undefined,
): boolean => {
  if (value === null || value === undefined || value === "") {
    return false
  }

  const sanitizedHtml = sanitizeHtml(value)
  return (
    sanitizedHtml !== "" &&
    (stripHtml(sanitizedHtml).length > 0 ||
      RENDERABLE_IMAGE_TAG_REGEX.test(sanitizedHtml))
  )
}

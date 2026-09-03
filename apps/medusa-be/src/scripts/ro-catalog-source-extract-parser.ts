import { createHash } from "node:crypto"
import {
  decodeXml,
  extractElements,
  extractFirstText,
} from "./herbatica-xml-utils"
import {
  RO_SOURCE_ORIGIN,
  type RoSourceDuplicateGroup,
  type RoSourcePageParseResult,
  type RoSourceProductCandidate,
  type RoSourceSitemapEntry,
  type RoSourceSitemapInventoryEntry,
  type RoSourceText,
  type RoSourceWarning,
} from "./ro-catalog-source-extract-types"

const ATTRIBUTE_PATTERN = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
const TAG_PATTERN = /<[^>]+>/g
const BLOCK_END_PATTERN = /<\/(?:div|h[1-6]|li|p|tr|ul|ol)>/gi
const LINE_BREAK_PATTERN = /<br\s*\/?>/gi
const SPACE_PATTERN = /[\t\f\v ]+/g
const MANY_NEWLINES_PATTERN = /\n{3,}/g
const WHITESPACE_PATTERN = /\s+/
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const BREADCRUMB_BLOCK_PATTERN =
  /<div\b[^>]*class=(?:"[^"]*\bbreadcrumbs\b[^"]*"|'[^']*\bbreadcrumbs\b[^']*')[^>]*>([\s\S]*?)<\/div>/i
const ITEMPROP_ITEM_PATTERN = /itemprop\s*=\s*["']item["']/i
const NAME_CLASS_PATTERN = /\bname\b/
const PRODUCT_CARD_TITLE_PATTERN = /productCardTitle/i
const PRODUCT_FORM_PATTERN = /<form\b[^>]*id=["']product-detail-form["']/i
const SKU_META_PATTERN = /<meta\b[^>]*itemprop=["']sku["']/i
const PRODUCT_TITLE_PATTERN =
  /<div\b[^>]*class=(?:"[^"]*\bp-detail-inner-header\b[^"]*"|'[^']*\bp-detail-inner-header\b[^']*')[^>]*>[\s\S]*?<h1\b[^>]*>([\s\S]*?)<\/h1>/i
const HIGH_CONFIDENCE_SK_CZ =
  /\b(?:do košíka|prírodn(?:á|é|ý)|doplnky výživy|zloženie|použitie|upozornenie|objednávka|skladom|přírodn(?:í|ý)|doplňky výživy|složení|použití|upozornění|objednávka|skladem)\b/giu
const PLACEHOLDER =
  /(?:\b(?:lorem ipsum|todo|tbd|n\/a)\b|\{\{[^}]+\}\}|\[\s*(?:todo|doplnit|de completat)\s*\])/giu

export const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex")

const attributesOf = (source: string) => {
  const attributes = new Map<string, string>()
  for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
    attributes.set(
      (match[1] ?? "").toLowerCase(),
      decodeXml(match[2] ?? match[3] ?? "")
    )
  }
  return attributes
}

const normalizedHtml = (value: string | undefined) =>
  value?.replace(/^\s+|\s+$/g, "") ?? ""

export const htmlToText = (html: string) =>
  decodeXml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(LINE_BREAK_PATTERN, "\n")
      .replace(BLOCK_END_PATTERN, "\n")
      .replace(TAG_PATTERN, "")
  )
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(SPACE_PATTERN, " ").trim())
    .join("\n")
    .replace(MANY_NEWLINES_PATTERN, "\n\n")
    .trim()

const textPayload = (html: string | undefined): RoSourceText => {
  const normalized = normalizedHtml(html)
  return {
    html: normalized,
    sha256: sha256(normalized),
    text: htmlToText(normalized),
  }
}

const firstTagInner = (html: string, pattern: RegExp) => pattern.exec(html)?.[1]

const firstMetaContent = (html: string, itemprop: string) => {
  for (const match of html.matchAll(/<meta\b([^>]*)>/gi)) {
    const attributes = attributesOf(match[1] ?? "")
    if (attributes.get("itemprop")?.toLowerCase() === itemprop.toLowerCase()) {
      return attributes.get("content")?.trim()
    }
  }
  return
}

const canonicalUrl = (html: string, fallbackUrl: string) => {
  for (const match of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attributes = attributesOf(match[1] ?? "")
    if (
      attributes
        .get("rel")
        ?.toLowerCase()
        .split(WHITESPACE_PATTERN)
        .includes("canonical")
    ) {
      return toOfficialPublicUrl(attributes.get("href") ?? "", fallbackUrl)
    }
  }
  return toOfficialPublicUrl(fallbackUrl)
}

export const toOfficialPublicUrl = (
  value: string,
  base: string | URL = RO_SOURCE_ORIGIN
) => {
  let url: URL
  try {
    url = new URL(decodeXml(value), base)
  } catch {
    throw new Error(`Invalid source URL: ${value}`)
  }
  if (
    url.protocol !== "https:" ||
    url.origin !== RO_SOURCE_ORIGIN ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new Error(`Source URL must stay on ${RO_SOURCE_ORIGIN}: ${value}`)
  }
  const lowerPath = url.pathname.toLowerCase()
  if (
    ["/api/", "/export/", "/action/", "/admin/", "/script/"].some((part) =>
      lowerPath.includes(part)
    )
  ) {
    throw new Error(
      `Non-public or mutating source path is forbidden: ${url.pathname}`
    )
  }
  if (url.search || url.hash) {
    throw new Error(
      `Source URL must not contain query parameters or fragments: ${url}`
    )
  }
  url.pathname = url.pathname.replace(/\/{2,}/g, "/")
  return url.toString()
}

export const parseRoSourceSitemapInventory = (
  xml: string
): RoSourceSitemapInventoryEntry[] => {
  const entries: RoSourceSitemapInventoryEntry[] = []
  for (const element of extractElements(xml, "url")) {
    const rawUrl = extractFirstText(element.inner, "loc")
    if (!rawUrl) {
      continue
    }
    const productHint =
      element.inner.includes("<image:image") ||
      extractFirstText(element.inner, "priority") === "0.9"
    try {
      const normalizedUrl = toOfficialPublicUrl(rawUrl)
      entries.push({
        crawlable: true,
        normalizedUrl,
        productHint,
        url: rawUrl,
      })
    } catch (error) {
      entries.push({
        crawlable: false,
        productHint,
        skipReason: error instanceof Error ? error.message : String(error),
        url: rawUrl,
      })
    }
  }
  return entries
}

export const parseRoSourceSitemap = (xml: string): RoSourceSitemapEntry[] => {
  const entries = new Map<string, RoSourceSitemapEntry>()
  for (const entry of parseRoSourceSitemapInventory(xml)) {
    if (entry.crawlable && entry.normalizedUrl) {
      entries.set(entry.normalizedUrl, {
        productHint: entry.productHint,
        url: entry.normalizedUrl,
      })
    }
  }
  return [...entries.values()].sort(
    (left, right) =>
      Number(right.productHint) - Number(left.productHint) ||
      left.url.localeCompare(right.url)
  )
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Breadcrumb evidence is validated and filtered in one bounded parser pass.
const extractBreadcrumbs = (html: string, productUrl: string) => {
  const block = firstTagInner(html, BREADCRUMB_BLOCK_PATTERN)
  if (!block) {
    return []
  }
  const breadcrumbs: { name: string; slug: string; url: string }[] = []
  for (const match of block.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attributes = attributesOf(match[1] ?? "")
    const href = attributes.get("href")
    if (!(href && ITEMPROP_ITEM_PATTERN.test(match[1] ?? ""))) {
      continue
    }
    try {
      const url = toOfficialPublicUrl(href, productUrl)
      const parsed = new URL(url)
      if (parsed.pathname === "/" || url === productUrl) {
        continue
      }
      const name = htmlToText(match[2] ?? "")
      const slug = parsed.pathname.split("/").filter(Boolean).at(-1) ?? ""
      if (name && SLUG_PATTERN.test(slug)) {
        breadcrumbs.push({ name, slug, url })
      }
    } catch {
      // Ignore links that cannot be represented as official public evidence.
    }
  }
  return breadcrumbs
}

const contentByClass = (html: string, className: string) => {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(
    `<(div|section|p)\\b[^>]*class=(?:"[^"]*\\b${escaped}\\b[^"]*"|'[^']*\\b${escaped}\\b[^']*')[^>]*>([\\s\\S]*?)<\\/\\1>`,
    "i"
  )
  return pattern.exec(html)?.[2]
}

const findTextWarnings = (field: string, value: string): RoSourceWarning[] => {
  const warnings: RoSourceWarning[] = []
  if (!value.trim()) {
    warnings.push({
      code: "missing-field",
      field,
      message: `${field} is empty`,
    })
    return warnings
  }
  const placeholder = [...value.matchAll(PLACEHOLDER)][0]?.[0]
  if (placeholder) {
    warnings.push({
      code: "placeholder",
      field,
      message: `${field} contains placeholder text`,
      sample: placeholder,
    })
  }
  const skCz = [...value.matchAll(HIGH_CONFIDENCE_SK_CZ)][0]?.[0]
  if (skCz) {
    warnings.push({
      code: "possible-sk-cz",
      field,
      message: `${field} contains a high-confidence Slovak/Czech marker`,
      sample: skCz,
    })
  }
  return warnings
}

const extractProductLinks = (html: string, pageUrl: string) => {
  const urls = new Set<string>()
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attributes = attributesOf(match[1] ?? "")
    const href = attributes.get("href")
    const className = attributes.get("class") ?? ""
    const testId = attributes.get("data-testid") ?? ""
    if (
      !(
        href &&
        (NAME_CLASS_PATTERN.test(className) ||
          PRODUCT_CARD_TITLE_PATTERN.test(testId))
      )
    ) {
      continue
    }
    try {
      urls.add(toOfficialPublicUrl(href, pageUrl))
    } catch {
      // Ignore foreign/non-public links in category chrome.
    }
  }
  return [...urls].sort()
}

export const parseRoSourcePage = (
  html: string,
  pageUrl: string
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Product evidence validation intentionally reports all missing/locale issues in one parse.
): RoSourcePageParseResult => {
  const isProduct =
    PRODUCT_FORM_PATTERN.test(html) || SKU_META_PATTERN.test(html)
  if (!isProduct) {
    const productUrls = extractProductLinks(html, pageUrl)
    return productUrls.length > 0
      ? { kind: "category", productUrls }
      : { kind: "other" }
  }

  const url = canonicalUrl(html, pageUrl)
  const parsedUrl = new URL(url)
  const canonicalSlug =
    parsedUrl.pathname.split("/").filter(Boolean).at(-1) ?? ""
  const title = htmlToText(firstTagInner(html, PRODUCT_TITLE_PATTERN) ?? "")
  const short = textPayload(contentByClass(html, "p-short-description"))
  const long = textPayload(contentByClass(html, "basic-description"))
  const sku = firstMetaContent(html, "sku") ?? null
  const ean =
    firstMetaContent(html, "gtin13") ??
    firstMetaContent(html, "gtin14") ??
    firstMetaContent(html, "gtin12") ??
    firstMetaContent(html, "gtin") ??
    null
  const rawPrice = firstMetaContent(html, "price")
  const amount = rawPrice === undefined ? null : Number(rawPrice)
  const currency =
    firstMetaContent(html, "priceCurrency")?.toUpperCase() ?? null
  const warnings = [
    ...findTextWarnings("title", title),
    ...findTextWarnings("descriptions.short", short.text),
    ...findTextWarnings("descriptions.long", long.text),
  ]
  if (!(canonicalSlug && SLUG_PATTERN.test(canonicalSlug))) {
    warnings.push({
      code: "missing-field",
      field: "canonicalSlug",
      message: "canonicalSlug is missing or not URL-safe",
    })
  }
  for (const [field, value] of [
    ["sku", sku],
    ["ean", ean],
  ] as const) {
    if (!value) {
      warnings.push({
        code: "missing-field",
        field,
        message: `${field} is empty`,
      })
    }
  }
  if (!(amount !== null && Number.isFinite(amount) && amount >= 0)) {
    warnings.push({
      code: "missing-field",
      field: "price.amount",
      message: "RON price is missing or invalid",
    })
  }
  if (currency !== "RON") {
    warnings.push({
      code: "non-ron-price",
      field: "price.currency",
      message: `Expected RON price currency, received ${currency ?? "missing"}`,
    })
  }

  return {
    candidate: {
      canonicalSlug,
      categoryBreadcrumbs: extractBreadcrumbs(html, url),
      descriptions: { long, short },
      ean,
      price: {
        amount: amount !== null && Number.isFinite(amount) ? amount : null,
        currency,
      },
      sku,
      title,
    },
    kind: "product",
    warnings,
  }
}

export const candidateHash = (
  candidate: Omit<RoSourceProductCandidate, "candidateSha256" | "warnings">
) => {
  const { source, ...content } = candidate
  return sha256(
    JSON.stringify({
      ...content,
      source: { htmlSha256: source.htmlSha256, url: source.url },
    })
  )
}

export const findRoSourceDuplicates = (
  products: readonly RoSourceProductCandidate[]
): RoSourceDuplicateGroup[] => {
  const groups = new Map<
    string,
    { field: RoSourceDuplicateGroup["field"]; value: string; urls: Set<string> }
  >()
  const add = (
    field: RoSourceDuplicateGroup["field"],
    value: null | string,
    url: string
  ) => {
    if (!value) {
      return
    }
    const key = `${field}:${value.toLowerCase()}`
    const group = groups.get(key) ?? { field, value, urls: new Set<string>() }
    group.urls.add(url)
    groups.set(key, group)
  }
  for (const product of products) {
    const url = product.source.url
    add("url", url, url)
    add("slug", product.canonicalSlug, url)
    add("sku", product.sku, url)
    add("ean", product.ean, url)
    add(
      "content",
      sha256(
        `${product.title}\n${product.descriptions.short.text}\n${product.descriptions.long.text}`
      ),
      url
    )
  }
  return [...groups.values()]
    .filter((group) => group.urls.size > 1)
    .map((group) => ({
      field: group.field,
      value: group.value,
      urls: [...group.urls].sort(),
    }))
    .sort(
      (left, right) =>
        left.field.localeCompare(right.field) ||
        left.value.localeCompare(right.value)
    )
}

import { existsSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { gzipSync } from "node:zlib"
import { convertHTMLToLexical } from "@payloadcms/richtext-lexical"
import ExcelJS from "exceljs"
import { type Field, getPayload } from "payload"
import { ARTICLE_CAROUSEL_BLOCK_SLUG } from "../lib/blocks/article-carousel"
import { PRODUCT_CAROUSEL_BLOCK_SLUG } from "../lib/blocks/product-carousel"
import config from "../payload.config"

const require = createRequire(import.meta.url)
const { JSDOM } = require("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } }
}

const CONTENT_HEADER_ALIASES = new Set([
  "content",
  "body",
  "text",
  "article",
  "article_text",
  "post_content",
  "post_content_html",
])

const RICH_TEXT_GZIP_PREFIX = "payload-richtext+gzip-base64:"
const MEDIA_URL_PREFIX = "payload-media-url:"

type MediaManifestEntry = {
  url: string
  alt: string
  filename: string
}

type LinkManifestEntry = {
  words: string
  link: string
}

type ProductCarouselData = {
  products: Array<{ productSlug: string }>
}

type ArticleCarouselData = {
  articles: Array<{ articleSlug: string }>
}

type ProductWidgetData = {
  articleSlugs: string[]
  productSlugs: string[]
}

type SanitizeLexicalContext = {
  articleCarousels: Map<string, ArticleCarouselData>
  linkManifest: Map<string, LinkManifestEntry>
  mediaManifest: Map<string, MediaManifestEntry>
  mediaTokens: Map<string, MediaManifestEntry>
  productCarousels: Map<string, ProductCarouselData>
}

const SOURCE_ENV_NAMES = [
  "PAYLOAD_SEED_ARTICLES_XLSX_PATH",
  "HERBATICA_BLOG_ARTICLES_XLSX_PATH",
]
const BOM_PATTERN = /^\uFEFF/
const HEADER_WHITESPACE_PATTERN = /\s+/g
const HEADER_DASH_PATTERN = /-/g
const DIACRITIC_PATTERN = /[\u0300-\u036f]/g
const SAFE_FILENAME_PATTERN = /[^a-zA-Z0-9._-]+/g
const EDGE_DASH_PATTERN = /^-+|-+$/g
const DEFAULT_MEDIA_BASE_URL = "https://www.herbatica.sk"
const PRODUCT_WIDGET_SCRIPT_PATTERN =
  /<script\b[^>]*\bsrc=["'](https:\/\/app\.productwidgets\.cz\/e\/\d+\.js)["'][^>]*><\/script>\s*<div\b[^>]*\bid=["']pwjsroot\d+["'][^>]*><\/div>/gi
const PRODUCT_CAROUSEL_TOKEN_PREFIX = "__PAYLOAD_PRODUCT_CAROUSEL__"
const ARTICLE_CAROUSEL_TOKEN_PREFIX = "__PAYLOAD_ARTICLE_CAROUSEL__"
const MEDIA_TOKEN_PREFIX = "__PAYLOAD_MEDIA__"

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(BOM_PATTERN, "")
    .replace(HEADER_WHITESPACE_PATTERN, "_")
    .replace(HEADER_DASH_PATTERN, "_")
    .toLowerCase()

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ExcelJS exposes several cell value shapes that must be normalized here.
const getCellText = (cell: ExcelJS.Cell) => {
  const value = cell.value
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === "object" && "text" in value) {
    return String(value.text ?? "")
  }

  if (typeof value === "object" && "richText" in value) {
    const richText = value.richText
    return Array.isArray(richText)
      ? richText.map((item) => String(item.text ?? "")).join("")
      : ""
  }

  if (typeof value === "object" && "result" in value) {
    return String(value.result ?? "")
  }

  return String(value)
}

const fieldAffectsData = (field: Field): field is Field & { name: string } =>
  "name" in field && typeof field.name === "string"

const fieldHasSubFields = (
  field: Field
): field is Field & { fields: Field[] } =>
  "fields" in field && Array.isArray(field.fields)

const findInSubFields = (field: Field, name: string) =>
  fieldHasSubFields(field) ? findField(field.fields, name) : undefined

const findInTabs = (field: Field, name: string) => {
  if (field.type !== "tabs") {
    return
  }

  for (const tab of field.tabs) {
    const tabField = findField(tab.fields, name)
    if (tabField) {
      return tabField
    }
  }
}

const findField = (
  fields: Field[] | undefined,
  name: string
): Field | undefined => {
  for (const field of fields ?? []) {
    if (fieldAffectsData(field) && field.name === name) {
      return field
    }

    const nestedField = findInSubFields(field, name) ?? findInTabs(field, name)
    if (nestedField) {
      return nestedField
    }
  }
}

const resolveSourcePath = () => {
  const cliSource = process.argv[2]
  if (cliSource) {
    return cliSource
  }

  for (const envName of SOURCE_ENV_NAMES) {
    const value = process.env[envName]?.trim()
    if (value) {
      return value
    }
  }

  throw new Error(
    `Missing input XLSX path. Pass it as first argument or set ${SOURCE_ENV_NAMES.join(" / ")}.`
  )
}

const resolveOutputPath = (sourcePath: string) => {
  const cliOutput = process.argv[3]
  if (cliOutput) {
    return cliOutput
  }

  const parsed = path.parse(sourcePath)
  return path.join(
    parsed.dir,
    `${parsed.name}.richtext${parsed.ext || ".xlsx"}`
  )
}

const resolveMediaManifestPath = (outputPath: string) => {
  const parsed = path.parse(outputPath)
  return path.join(parsed.dir, `${parsed.name}.media.json`)
}

const resolveLinksManifestPath = (outputPath: string) => {
  const parsed = path.parse(outputPath)
  return path.join(parsed.dir, `${parsed.name}.links.json`)
}

const sanitizeFilename = (value: string) =>
  value
    .normalize("NFKD")
    .replace(DIACRITIC_PATTERN, "")
    .replace(SAFE_FILENAME_PATTERN, "-")
    .replace(EDGE_DASH_PATTERN, "")
    .slice(0, 180) || "image"

const filenameFromUrl = (url: string) => {
  try {
    const parsed = new URL(url)
    const basename = path.basename(decodeURIComponent(parsed.pathname))
    return sanitizeFilename(basename || "image")
  } catch {
    return sanitizeFilename(path.basename(url) || "image")
  }
}

const slugFromUrl = (value: string) => {
  try {
    const url = new URL(value)
    const segments = url.pathname.split("/").filter(Boolean)
    return segments.at(-1)?.trim() || undefined
  } catch {
    const segments = value.split("/").filter(Boolean)
    return segments.at(-1)?.trim() || undefined
  }
}

const isBlogUrl = (value: string) => {
  try {
    const url = new URL(value, "https://www.herbatica.sk")
    return url.pathname.split("/").find(Boolean) === "blog"
  } catch {
    return value.includes("/blog/") || value.startsWith("/blog/")
  }
}

const fetchProductWidgetData = async (
  widgetUrl: string
): Promise<ProductWidgetData> => {
  const response = await fetch(widgetUrl, {
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const source = await response.text()
  const articleSlugs = new Set<string>()
  const productSlugs = new Set<string>()
  for (const match of source.matchAll(/<a\s+href=["']([^"']+)["']/gi)) {
    const href = match[1]
    if (!href) {
      continue
    }

    const slug = slugFromUrl(href)
    if (!slug) {
      continue
    }

    if (isBlogUrl(href)) {
      articleSlugs.add(slug)
    } else {
      productSlugs.add(slug)
    }
  }

  return {
    articleSlugs: Array.from(articleSlugs),
    productSlugs: Array.from(productSlugs),
  }
}

const replaceProductWidgetEmbeds = async (
  html: string,
  productCarousels: Map<string, ProductCarouselData>,
  articleCarousels: Map<string, ArticleCarouselData>
) => {
  const matches = Array.from(html.matchAll(PRODUCT_WIDGET_SCRIPT_PATTERN))
  let output = html

  for (const match of matches) {
    const widgetUrl = match[1]
    if (!widgetUrl) {
      continue
    }

    try {
      const widgetData = await fetchProductWidgetData(widgetUrl)
      const replacementParts: string[] = []

      if (widgetData.productSlugs.length > 0) {
        const token = `${PRODUCT_CAROUSEL_TOKEN_PREFIX}:${productCarousels.size}`
        productCarousels.set(token, {
          products: widgetData.productSlugs.map((productSlug) => ({
            productSlug,
          })),
        })
        replacementParts.push(`<p>${token}</p>`)
      }

      if (widgetData.articleSlugs.length > 0) {
        const token = `${ARTICLE_CAROUSEL_TOKEN_PREFIX}:${articleCarousels.size}`
        articleCarousels.set(token, {
          articles: widgetData.articleSlugs.map((articleSlug) => ({
            articleSlug,
          })),
        })
        replacementParts.push(`<p>${token}</p>`)
      }

      output = output.replace(match[0], replacementParts.join(""))
    } catch (error) {
      console.warn(
        `Failed to import product widget ${widgetUrl}: ${error instanceof Error ? error.message : String(error)}`
      )
      // Keep the original widget markup so the import can be retried later.
    }
  }

  return output
}

const DATA_IMAGE_PATTERN = /^data:image\/(?:avif|gif|jpeg|png|webp);base64,/i

const normalizeMediaUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return
  }

  if (trimmed.startsWith("data:")) {
    return DATA_IMAGE_PATTERN.test(trimmed) ? trimmed : undefined
  }

  try {
    return new URL(trimmed, DEFAULT_MEDIA_BASE_URL).toString()
  } catch {
    return
  }
}

const filenameFromMediaUrl = (url: string) =>
  url.startsWith("data:") ? "inline-image" : filenameFromUrl(url)

const replaceImageEmbeds = (
  html: string,
  mediaManifest: Map<string, MediaManifestEntry>,
  mediaTokens: Map<string, MediaManifestEntry>
) => {
  const document = new JSDOM(html).window.document
  for (const img of Array.from(document.querySelectorAll("img[src]"))) {
    const url = normalizeMediaUrl(img.getAttribute("src") ?? "")
    if (!url) {
      continue
    }

    const imageAlt = img.getAttribute("alt")?.trim()
    const entry = mediaManifest.get(url) ?? {
      url,
      alt: imageAlt ? imageAlt : "Imported article image",
      filename: filenameFromMediaUrl(url),
    }
    mediaManifest.set(url, entry)

    const token = `${MEDIA_TOKEN_PREFIX}:${mediaTokens.size}`
    mediaTokens.set(token, entry)
    const paragraph = document.createElement("p")
    paragraph.textContent = token
    img.replaceWith(paragraph)
  }

  return document.body.innerHTML
}

const sanitizeUploadNode = (
  record: Record<string, unknown>,
  mediaManifest: Map<string, MediaManifestEntry>
) => {
  const sourceUrl = (record.pending as { src?: unknown } | undefined)?.src
  if (typeof sourceUrl !== "string") {
    return record
  }

  const normalizedUrl = normalizeMediaUrl(sourceUrl)
  if (!normalizedUrl) {
    return record
  }

  const manifestEntry = mediaManifest.get(normalizedUrl) ?? {
    url: normalizedUrl,
    alt: "Imported article image",
    filename: filenameFromMediaUrl(normalizedUrl),
  }
  mediaManifest.set(normalizedUrl, manifestEntry)

  const { pending: _pending, ...uploadNode } = record
  return {
    ...uploadNode,
    fields: {
      alt: manifestEntry.alt,
    },
    relationTo: "media",
    value: `${MEDIA_URL_PREFIX}${normalizedUrl}`,
  }
}

const getLexicalText = (node: unknown): string => {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return ""
  }

  const record = node as Record<string, unknown>
  const ownText = typeof record.text === "string" ? record.text : ""
  const childText = Array.isArray(record.children)
    ? record.children.map(getLexicalText).join("")
    : ""

  return `${ownText}${childText}`
}

const createProductCarouselBlockNode = (
  token: string,
  productCarousels: Map<string, ProductCarouselData>
) => {
  const carousel = productCarousels.get(token)
  if (!carousel) {
    return
  }

  return {
    type: "block",
    version: 2,
    format: "",
    fields: {
      id: token.replace(/[^a-zA-Z0-9]/g, ""),
      blockName: "Product carousel",
      blockType: PRODUCT_CAROUSEL_BLOCK_SLUG,
      products: carousel.products,
    },
  }
}

const createArticleCarouselBlockNode = (
  token: string,
  articleCarousels: Map<string, ArticleCarouselData>
) => {
  const carousel = articleCarousels.get(token)
  if (!carousel) {
    return
  }

  return {
    type: "block",
    version: 2,
    format: "",
    fields: {
      id: token.replace(/[^a-zA-Z0-9]/g, ""),
      blockName: "Article carousel",
      blockType: ARTICLE_CAROUSEL_BLOCK_SLUG,
      articles: carousel.articles,
    },
  }
}

const addLinkManifestEntry = (
  record: Record<string, unknown>,
  linkManifest: Map<string, LinkManifestEntry>
) => {
  const link = (record.fields as { url?: unknown } | undefined)?.url
  if (typeof link !== "string" || !link.trim()) {
    return
  }

  const words = getLexicalText(record)
    .trim()
    .replace(HEADER_WHITESPACE_PATTERN, " ")
  if (!words) {
    return
  }

  linkManifest.set(`${words}\u0000${link}`, { words, link })
}

const createMediaUploadNode = (
  token: string,
  mediaTokens: Map<string, MediaManifestEntry>
) => {
  const entry = mediaTokens.get(token)
  if (!entry) {
    return
  }

  return {
    type: "upload",
    version: 3,
    relationTo: "media",
    value: `${MEDIA_URL_PREFIX}${entry.url}`,
    fields: {
      alt: entry.alt,
    },
  }
}

const createCarouselBlockNode = (
  record: Record<string, unknown>,
  context: SanitizeLexicalContext
) => {
  if (record.type !== "paragraph") {
    return
  }

  const text = getLexicalText(record).trim()
  if (text.startsWith(PRODUCT_CAROUSEL_TOKEN_PREFIX)) {
    return createProductCarouselBlockNode(text, context.productCarousels)
  }

  if (text.startsWith(ARTICLE_CAROUSEL_TOKEN_PREFIX)) {
    return createArticleCarouselBlockNode(text, context.articleCarousels)
  }

  if (text.startsWith(MEDIA_TOKEN_PREFIX)) {
    return createMediaUploadNode(text, context.mediaTokens)
  }
}

const sanitizeLexicalNode = (
  node: unknown,
  context: SanitizeLexicalContext
): unknown | unknown[] | undefined => {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return node
  }

  const record = node as Record<string, unknown>
  if (record.type === "upload") {
    return sanitizeUploadNode(record, context.mediaManifest)
  }

  const carouselBlockNode = createCarouselBlockNode(record, context)
  if (carouselBlockNode) {
    return carouselBlockNode
  }

  const nextRecord = { ...record }

  if (record.type === "link") {
    addLinkManifestEntry(record, context.linkManifest)
  }

  if (
    record.root &&
    typeof record.root === "object" &&
    !Array.isArray(record.root)
  ) {
    nextRecord.root = sanitizeLexicalNode(record.root, context)
  }

  if (Array.isArray(record.children)) {
    const children = record.children.flatMap((child) => {
      const sanitized = sanitizeLexicalNode(child, context)
      return sanitized === undefined ? [] : sanitized
    })

    if (children.length === 0 && record.type !== "root") {
      return
    }

    nextRecord.children = children
  }

  return nextRecord
}

const sanitizeLexicalRichText = (
  value: unknown,
  context: SanitizeLexicalContext
) => sanitizeLexicalNode(value, context)

const assertLexicalEditorConfig = async () => {
  const payload = await getPayload({ config })
  try {
    const articlesCollection = payload.config.collections.find(
      (collection) => collection.slug === "articles"
    )
    const contentField = findField(articlesCollection?.fields, "content")
    const editorConfig = (
      contentField as { editor?: { editorConfig?: unknown } } | undefined
    )?.editor?.editorConfig

    if (!editorConfig) {
      throw new Error(
        "Unable to resolve articles.content Lexical editor config."
      )
    }

    return editorConfig
  } finally {
    await payload.destroy()
  }
}

const convertWorkbook = async () => {
  const sourcePath = path.resolve(process.cwd(), resolveSourcePath())
  const outputPath = path.resolve(process.cwd(), resolveOutputPath(sourcePath))

  if (!existsSync(sourcePath)) {
    throw new Error(`Input XLSX does not exist: ${sourcePath}`)
  }

  const editorConfig = await assertLexicalEditorConfig()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(sourcePath)

  const mediaManifest = new Map<string, MediaManifestEntry>()
  const linkManifest = new Map<string, LinkManifestEntry>()
  let productCarouselCount = 0
  let articleCarouselCount = 0
  let converted = 0
  let skipped = 0
  let maxJsonLength = 0

  for (const worksheet of workbook.worksheets) {
    const headerRow = worksheet.getRow(1)
    const contentColumnIndexes: number[] = []

    headerRow.eachCell((cell, columnIndex) => {
      const header = normalizeHeader(getCellText(cell))
      if (CONTENT_HEADER_ALIASES.has(header)) {
        contentColumnIndexes.push(columnIndex)
      }
    })

    if (contentColumnIndexes.length === 0) {
      continue
    }

    const rowIndexes: number[] = []
    worksheet.eachRow({ includeEmpty: false }, (_row, rowIndex) => {
      if (rowIndex !== 1) {
        rowIndexes.push(rowIndex)
      }
    })

    for (const rowIndex of rowIndexes) {
      const row = worksheet.getRow(rowIndex)

      for (const columnIndex of contentColumnIndexes) {
        const cell = row.getCell(columnIndex)
        const html = getCellText(cell).trim()
        if (!html) {
          skipped += 1
          continue
        }

        const productCarousels = new Map<string, ProductCarouselData>()
        const articleCarousels = new Map<string, ArticleCarouselData>()
        const htmlWithCarouselTokens = await replaceProductWidgetEmbeds(
          html,
          productCarousels,
          articleCarousels
        )
        productCarouselCount += productCarousels.size
        articleCarouselCount += articleCarousels.size

        const mediaTokens = new Map<string, MediaManifestEntry>()
        const htmlWithMediaTokens = replaceImageEmbeds(
          htmlWithCarouselTokens,
          mediaManifest,
          mediaTokens
        )

        const richText = sanitizeLexicalRichText(
          convertHTMLToLexical({
            html: htmlWithMediaTokens,
            editorConfig: editorConfig as never,
            JSDOM,
          }),
          {
            articleCarousels,
            linkManifest,
            mediaManifest,
            mediaTokens,
            productCarousels,
          }
        )
        const serialized = JSON.stringify(richText)
        const encoded = `${RICH_TEXT_GZIP_PREFIX}${gzipSync(serialized).toString("base64")}`
        maxJsonLength = Math.max(maxJsonLength, serialized.length)
        cell.value = encoded
        converted += 1
      }
    }
  }

  const mediaManifestPath = resolveMediaManifestPath(outputPath)
  const linksManifestPath = resolveLinksManifestPath(outputPath)
  await workbook.xlsx.writeFile(outputPath)
  await writeFile(
    mediaManifestPath,
    `${JSON.stringify({ media: Array.from(mediaManifest.values()) }, null, 2)}\n`
  )
  await writeFile(
    linksManifestPath,
    `${JSON.stringify(Array.from(linkManifest.values()), null, 2)}\n`
  )

  console.log("Converted HTML article content to Payload Lexical JSON.")
  console.log(`Input: ${sourcePath}`)
  console.log(`Output: ${outputPath}`)
  console.log(`Media manifest: ${mediaManifestPath}`)
  console.log(`Links manifest: ${linksManifestPath}`)
  console.log(`Converted cells: ${converted}`)
  console.log(`Skipped empty cells: ${skipped}`)
  console.log(`Media URLs: ${mediaManifest.size}`)
  console.log(`Links: ${linkManifest.size}`)
  console.log(`Product carousels: ${productCarouselCount}`)
  console.log(`Article carousels: ${articleCarouselCount}`)
  console.log(`Max serialized RichText length: ${maxJsonLength}`)
}

await convertWorkbook()

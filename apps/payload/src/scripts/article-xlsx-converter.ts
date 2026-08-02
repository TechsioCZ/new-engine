import { existsSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { gunzipSync, gzipSync } from "node:zlib"
import { convertHTMLToLexical } from "@payloadcms/richtext-lexical"
import ExcelJS from "exceljs"
import type { Field } from "payload"
import { PRODUCT_CAROUSEL_BLOCK_SLUG } from "../lib/blocks/product-carousel"
import {
  ARTICLE_CONTENT_HEADER_ALIASES,
  ARTICLE_CONVERSION_ERROR_PREFIX,
  MEDIA_URL_PREFIX,
  normalizeArticleHeader,
  RICH_TEXT_GZIP_PREFIX,
} from "./article-import-format"

const require = createRequire(import.meta.url)
const { JSDOM } = require("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } }
}

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
  products: Array<{ productExternalId: string }>
}

type ProductWidgetReference = {
  productExternalId?: string
  url: string
}

type ProductWidgetData = {
  articleLinkCount: number
  relatedArticleSlugs: string[]
  productReferences: ProductWidgetReference[]
}

export type LegacyArticleAuthor = {
  displayName: string
  role: string
  bio?: string
  portraitUrl?: string
}

export type LegacyArticleMetadata = {
  author?: LegacyArticleAuthor
  relatedArticleSlugs: string[]
}

export type ConvertArticleWorkbookOptions = {
  editorConfig?: unknown
  outputPath: string
  signal?: AbortSignal
  sheetName?: string
  sourcePath: string
}

export type ArticleWorkbookInspection = {
  format: "raw" | "richtext"
  requiresMediaManifest: boolean
  sheetName: string
}

type ConversionContext = {
  productExternalIdCache: Map<string, Promise<string | undefined>>
  signal?: AbortSignal
}

type SanitizeLexicalContext = {
  linkManifest: Map<string, LinkManifestEntry>
  mediaManifest: Map<string, MediaManifestEntry>
  mediaTokens: Map<string, MediaManifestEntry>
  productCarousels: Map<string, ProductCarouselData>
}

const SOURCE_ENV_NAMES = [
  "PAYLOAD_SEED_ARTICLES_XLSX_PATH",
  "HERBATICA_BLOG_ARTICLES_XLSX_PATH",
]
const HEADER_WHITESPACE_PATTERN = /\s+/g
const DIACRITIC_PATTERN = /[\u0300-\u036f]/g
const SAFE_FILENAME_PATTERN = /[^a-zA-Z0-9._-]+/g
const EDGE_DASH_PATTERN = /^-+|-+$/g
const DEFAULT_MEDIA_BASE_URL = "https://www.herbatica.sk"
const PRODUCT_WIDGET_SCRIPT_PATTERN =
  /<script\b[^>]*\bsrc=["'](https:\/\/app\.productwidgets\.cz\/e\/\d+\.js)["'][^>]*><\/script>\s*<div\b[^>]*\bid=["']pwjsroot\d+["'][^>]*><\/div>/gi
const PRODUCT_CAROUSEL_TOKEN_PREFIX = "__PAYLOAD_PRODUCT_CAROUSEL__"
const MEDIA_TOKEN_PREFIX = "__PAYLOAD_MEDIA__"
const PRODUCT_WIDGET_ITEM_PATTERN = /<div\s+class=(?:["']?item["']?)>/i
const PRODUCT_WIDGET_HREF_PATTERN = /<a\s+href=["']([^"']+)["']/i
const PRODUCT_WIDGET_IMAGE_PATTERN = /<img\s+src=["']([^"']+)["']/i
const SHOP_DETAIL_EXTERNAL_ID_PATTERN = /\/shop\/detail\/(\d+)(?:[-_./]|$)/i
const PRODUCT_PAGE_TIMEOUT_MS = 10_000
const MAX_FETCH_REDIRECTS = 5
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308])
const PRODUCT_WIDGET_HOSTS = new Set(["app.productwidgets.cz"])
const HERBATICA_PRODUCT_HOSTS = new Set([
  "herbatica.sk",
  "www.herbatica.sk",
])
const LEGACY_SOCIAL_IMAGE_PATTERN =
  /(?:ikona[\s_-]*herbatica[\s_-]*(?:fb|ig|yt)|facebook|instagram|youtube)/i
const LEGACY_AUTHOR_IMAGE_PATTERN =
  /(?:profil|medailon|portrait|avatar|(?:^|[\s_-])foto(?:[\s_-]|$)|fotka)/i
const LEGACY_AUTHOR_MARKER_PATTERN =
  /(?:clanok (?:si )?pre vas pripravil|clanok bol pripraveny nasim timom)/
const LEGACY_AUTHOR_RAW_MARKER_PATTERN =
  /Článok\s+(?:(?:si\s+)?pre\s+vás\s+pripravil[a]?|bol\s+pripravený\s+naším\s+tímom)[,\s\u00a0]*/i
const LEGACY_SEARCH_FOOTER_PATTERN =
  /^nenasli ste, co ste hladali\?/
const LEGACY_SHARE_PATTERN = /^pacil sa vam nas clanok\?/
const LEGACY_AUTHOR_DETAIL_PATTERN =
  /^(?:copyediting:|datum aktualizacie:|kontakt:|clen timu herbatica|zakladajuci clen)/
const LEGACY_RELATED_HEADING_PATTERN = /precitajte si (?:aj|tiez) dalsie clanky/
const LEGACY_AUTHOR_NAME_STOP_PATTERN =
  /(?:Člen tímu|Zakladajúci člen|Copyediting|Dátum aktualizácie|Kontakt|Certifikovaný poradca)/i
const LEGACY_AUTHOR_METADATA_HEADERS = {
  displayName: "author_name",
  role: "author_role",
  bio: "author_bio",
  portraitUrl: "author_image_src",
  relatedArticleSlugs: "related_article_slugs",
} as const

const cleanDomText = (value: string | null | undefined) =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(HEADER_WHITESPACE_PATTERN, " ")
    .trim()

const normalizeDomText = (value: string | null | undefined) =>
  cleanDomText(value)
    .normalize("NFD")
    .replace(DIACRITIC_PATTERN, "")
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

const getContentColumnIndexes = (worksheet: ExcelJS.Worksheet) => {
  const indexes: number[] = []
  worksheet.getRow(1).eachCell((cell, columnIndex) => {
    if (
      ARTICLE_CONTENT_HEADER_ALIASES.has(
        normalizeArticleHeader(getCellText(cell))
      )
    ) {
      indexes.push(columnIndex)
    }
  })
  return indexes
}

const getArticleMetadataColumnIndexes = (worksheet: ExcelJS.Worksheet) => {
  const columnIndexes = new Map<string, number>()
  worksheet.getRow(1).eachCell((cell, columnIndex) => {
    const header = normalizeArticleHeader(getCellText(cell))
    if (header) {
      columnIndexes.set(header, columnIndex)
    }
  })

  let nextColumnIndex = Math.max(
    worksheet.columnCount,
    worksheet.actualColumnCount
  ) + 1
  const getOrCreateColumnIndex = (header: string) => {
    const existingIndex = columnIndexes.get(header)
    if (existingIndex !== undefined) {
      return existingIndex
    }

    const columnIndex = nextColumnIndex
    nextColumnIndex += 1
    worksheet.getRow(1).getCell(columnIndex).value = header
    columnIndexes.set(header, columnIndex)
    return columnIndex
  }

  return {
    displayName: getOrCreateColumnIndex(
      LEGACY_AUTHOR_METADATA_HEADERS.displayName
    ),
    role: getOrCreateColumnIndex(LEGACY_AUTHOR_METADATA_HEADERS.role),
    bio: getOrCreateColumnIndex(LEGACY_AUTHOR_METADATA_HEADERS.bio),
    portraitUrl: getOrCreateColumnIndex(
      LEGACY_AUTHOR_METADATA_HEADERS.portraitUrl
    ),
    relatedArticleSlugs: getOrCreateColumnIndex(
      LEGACY_AUTHOR_METADATA_HEADERS.relatedArticleSlugs
    ),
  }
}

const resolveWorksheet = (workbook: ExcelJS.Workbook, sheetName?: string) => {
  const worksheet = sheetName
    ? workbook.getWorksheet(sheetName)
    : workbook.worksheets[0]
  if (!worksheet) {
    throw new Error(
      sheetName
        ? `Sheet not found: ${sheetName}`
        : "XLSX file does not contain any sheets"
    )
  }
  return worksheet
}

const inspectConvertedRichText = (value: string) => {
  let serialized: string
  try {
    serialized = gunzipSync(
      Buffer.from(value.slice(RICH_TEXT_GZIP_PREFIX.length), "base64")
    ).toString("utf8")
  } catch (error) {
    throw new Error(
      `Malformed converted rich text cell: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const parsed = JSON.parse(serialized) as unknown
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("root" in parsed) ||
    typeof parsed.root !== "object"
  ) {
    throw new Error("Malformed converted rich text cell: missing Lexical root")
  }

  return serialized.includes(MEDIA_URL_PREFIX)
}

export const inspectArticleWorkbook = async (
  filePath: string,
  sheetName?: string
): Promise<ArticleWorkbookInspection> => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  const worksheet = resolveWorksheet(workbook, sheetName)
  const contentColumnIndexes = getContentColumnIndexes(worksheet)
  if (contentColumnIndexes.length === 0) {
    throw new Error("Missing required columns: content")
  }

  let rawCellCount = 0
  let richTextCellCount = 0
  let requiresMediaManifest = false
  worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    if (rowIndex === 1) {
      return
    }

    for (const columnIndex of contentColumnIndexes) {
      const content = getCellText(row.getCell(columnIndex)).trim()
      if (!content) {
        continue
      }

      if (content.startsWith(RICH_TEXT_GZIP_PREFIX)) {
        richTextCellCount += 1
        requiresMediaManifest ||= inspectConvertedRichText(content)
      } else {
        rawCellCount += 1
      }
    }
  })

  if (rawCellCount === 0 && richTextCellCount === 0) {
    throw new Error("No article content found in XLSX file")
  }
  if (rawCellCount > 0 && richTextCellCount > 0) {
    throw new Error(
      "Workbook mixes raw article HTML and converted Payload rich text"
    )
  }

  return {
    format: richTextCellCount > 0 ? "richtext" : "raw",
    requiresMediaManifest,
    sheetName: worksheet.name,
  }
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

export const resolveArticleMediaManifestPath = (outputPath: string) => {
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

const isBlogUrl = (value: string) => {
  try {
    const url = new URL(value, "https://www.herbatica.sk")
    return url.pathname.split("/").find(Boolean) === "blog"
  } catch {
    return value.includes("/blog/") || value.startsWith("/blog/")
  }
}

const resolveRelatedArticleSlug = (value: string) => {
  try {
    const url = new URL(value, DEFAULT_MEDIA_BASE_URL)
    const segments = url.pathname.split("/").filter(Boolean)
    if (segments.length !== 2 || segments[0]?.toLowerCase() !== "blog") {
      return
    }

    return decodeURIComponent(segments[1] ?? "").trim() || undefined
  } catch {
    return
  }
}

const requestSignal = (signal: AbortSignal | undefined, timeoutMs: number) => {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  return signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal
}

const fetchWithValidatedRedirects = async (
  value: string | URL,
  validateUrl: (candidate: string) => URL,
  signal?: AbortSignal
) => {
  let url = validateUrl(String(value))
  const fetchSignal = requestSignal(signal, PRODUCT_PAGE_TIMEOUT_MS)

  for (let redirectCount = 0; redirectCount <= MAX_FETCH_REDIRECTS; redirectCount += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: fetchSignal,
    })
    if (!REDIRECT_STATUS_CODES.has(response.status)) {
      return response
    }

    const location = response.headers.get("location")
    if (!location) {
      throw new Error("Redirect is missing Location header")
    }
    url = validateUrl(new URL(location, url).toString())
  }

  throw new Error("Too many redirects")
}

const throwIfConversionAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new Error("Article import aborted")
  }
}

export const extractProductExternalIdFromHtml = (source: string) => {
  const document = new JSDOM(source).window.document
  const formProductId = document
    .querySelector<HTMLInputElement>('input[name="productId"]')
    ?.value.trim()
  if (formProductId && /^\d+$/.test(formProductId)) {
    return formProductId
  }

  return /(?:config\.)?product\s*[:=]\s*\{[\s\S]{0,1000}?\bid\s*:\s*["']?(\d+)/i
    .exec(source)?.[1]
    ?.trim()
}

const resolveProductExternalIdFromPage = async (
  value: string,
  signal?: AbortSignal
) => {
  const resolveProductPageUrl = (candidate: string) => {
    const parsed = new URL(candidate, DEFAULT_MEDIA_BASE_URL)
    if (
      parsed.protocol !== "https:" ||
      !HERBATICA_PRODUCT_HOSTS.has(parsed.hostname)
    ) {
      throw new Error("Unsupported Herbatica product URL")
    }
    return parsed
  }
  const parsed = resolveProductPageUrl(value)
  const response = await fetchWithValidatedRedirects(
    parsed,
    resolveProductPageUrl,
    signal
  )
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const source = await response.text()
  return extractProductExternalIdFromHtml(source)
}

const resolveProductExternalId = (url: string, context: ConversionContext) => {
  const absoluteUrl = new URL(url, DEFAULT_MEDIA_BASE_URL).toString()
  const cached = context.productExternalIdCache.get(absoluteUrl)
  if (cached) {
    return cached
  }

  const pending = resolveProductExternalIdFromPage(
    absoluteUrl,
    context.signal
  ).catch(
    (error) => {
      throwIfConversionAborted(context.signal)
      console.warn(
        `Failed to resolve product ID from ${absoluteUrl}: ${error instanceof Error ? error.message : String(error)}`
      )
      return undefined
    }
  )
  context.productExternalIdCache.set(absoluteUrl, pending)
  return pending
}

const resolveProductReference = async (
  reference: ProductWidgetReference,
  context: ConversionContext
) => {
  if (reference.productExternalId) {
    return { productExternalId: reference.productExternalId }
  }

  const productExternalId = await resolveProductExternalId(reference.url, context)
  if (productExternalId) {
    return { productExternalId }
  }

  throw new Error(
    `Unable to resolve stable product external_id from ${reference.url}`
  )
}

export const resolveProductWidgetUrl = (value: string) => {
  const url = new URL(value)
  if (
    url.protocol !== "https:" ||
    !PRODUCT_WIDGET_HOSTS.has(url.hostname) ||
    !/^\/e\/\d+\.js$/.test(url.pathname)
  ) {
    throw new Error("Unsupported product widget URL")
  }

  return url
}

export const extractProductWidgetReferences = (
  source: string
): ProductWidgetData => {
  const relatedArticleSlugs = new Set<string>()
  const productReferences = new Map<string, ProductWidgetReference>()
  const itemSources = source.split(PRODUCT_WIDGET_ITEM_PATTERN).slice(1)

  for (const itemSource of itemSources) {
    const href = PRODUCT_WIDGET_HREF_PATTERN.exec(itemSource)?.[1]
    if (!href) {
      continue
    }

    if (isBlogUrl(href)) {
      const slug = resolveRelatedArticleSlug(href)
      if (slug) {
        relatedArticleSlugs.add(slug)
      }
      continue
    }

    const url = new URL(href, DEFAULT_MEDIA_BASE_URL).toString()
    const imageUrl = PRODUCT_WIDGET_IMAGE_PATTERN.exec(itemSource)?.[1]
    const productExternalId = imageUrl
      ? SHOP_DETAIL_EXTERNAL_ID_PATTERN.exec(imageUrl)?.[1]
      : undefined
    productReferences.set(url, {
      url,
      ...(productExternalId ? { productExternalId } : {}),
    })
  }

  return {
    articleLinkCount: relatedArticleSlugs.size,
    relatedArticleSlugs: Array.from(relatedArticleSlugs),
    productReferences: Array.from(productReferences.values()),
  }
}

const fetchProductWidgetData = async (
  widgetUrl: string,
  signal?: AbortSignal
): Promise<ProductWidgetData> => {
  const response = await fetchWithValidatedRedirects(
    widgetUrl,
    resolveProductWidgetUrl,
    signal
  )
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return extractProductWidgetReferences(await response.text())
}

const replaceProductWidgetEmbeds = async (
  html: string,
  productCarousels: Map<string, ProductCarouselData>,
  context: ConversionContext
) => {
  const matches = Array.from(html.matchAll(PRODUCT_WIDGET_SCRIPT_PATTERN))
  let output = html
  const relatedArticleSlugs = new Set<string>()

  for (const match of matches) {
    const widgetUrl = match[1]
    if (!widgetUrl) {
      continue
    }

    try {
      const widgetData = await fetchProductWidgetData(
        widgetUrl,
        context.signal
      )
      for (const slug of widgetData.relatedArticleSlugs) {
        relatedArticleSlugs.add(slug)
      }
      const replacementParts: string[] = []

      if (widgetData.productReferences.length > 0) {
        const products = await Promise.all(
          widgetData.productReferences.map((reference) =>
            resolveProductReference(reference, context)
          )
        )
        const token = `${PRODUCT_CAROUSEL_TOKEN_PREFIX}:${productCarousels.size}`
        if (products.length > 0) {
          productCarousels.set(token, { products })
          replacementParts.push(`<p>${token}</p>`)
        }
      }

      output = output.replace(match[0], replacementParts.join(""))
    } catch (error) {
      throwIfConversionAborted(context.signal)
      throw new Error(
        `Failed to convert product widget ${widgetUrl}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return {
    html: output,
    droppedArticleLinkCount: relatedArticleSlugs.size,
    relatedArticleSlugs: Array.from(relatedArticleSlugs),
  }
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

const isEmptyElement = (element: Element) =>
  !normalizeDomText(element.textContent) &&
  !element.matches("img, video, audio, iframe, hr") &&
  !element.querySelector("img, video, audio, iframe, hr")

const previousMeaningfulElement = (element: Element) => {
  let sibling = element.previousElementSibling
  while (sibling && isEmptyElement(sibling)) {
    sibling = sibling.previousElementSibling
  }
  return sibling
}

const nextMeaningfulElement = (element: Element) => {
  let sibling = element.nextElementSibling
  while (sibling && isEmptyElement(sibling)) {
    sibling = sibling.nextElementSibling
  }
  return sibling
}

const imageSignature = (image: HTMLImageElement) =>
  `${image.getAttribute("src") ?? ""} ${image.getAttribute("alt") ?? ""}`

const isLegacySocialBlock = (element: Element) => {
  const images = Array.from(element.querySelectorAll("img"))
  return (
    images.length >= 2 &&
    images.every((image) =>
      LEGACY_SOCIAL_IMAGE_PATTERN.test(imageSignature(image))
    )
  )
}

const isLegacyAuthorPortraitBlock = (element: Element) =>
  Array.from(element.querySelectorAll("img")).some((image) => {
    const width = Number.parseInt(image.getAttribute("width") ?? "", 10)
    const height = Number.parseInt(image.getAttribute("height") ?? "", 10)
    const isSmall =
      (!Number.isFinite(width) || width <= 300) &&
      (!Number.isFinite(height) || height <= 300)
    return isSmall && LEGACY_AUTHOR_IMAGE_PATTERN.test(imageSignature(image))
  })

const isLegacyAuthorDetailBlock = (element: Element) => {
  if (isLegacyAuthorPortraitBlock(element)) {
    return true
  }

  const text = normalizeDomText(element.textContent)
  const links = Array.from(element.querySelectorAll("a[href]"))
  return (
    LEGACY_AUTHOR_DETAIL_PATTERN.test(text) ||
    links.some((link) =>
      /^(?:mailto:|\/o-nas\/?$)/i.test(link.getAttribute("href") ?? "")
    )
  )
}

const isShortAuthorNameBeforePortrait = (element: Element) => {
  const text = normalizeDomText(element.textContent)
  const next = nextMeaningfulElement(element)
  return (
    Boolean(text) &&
    text.length <= 80 &&
    !element.querySelector("a, img") &&
    Boolean(next && isLegacyAuthorPortraitBlock(next))
  )
}

const findLegacyAuthorMarkers = (document: Document) => {
  const candidates = Array.from(document.querySelectorAll("p, div")).filter(
    (element) =>
      LEGACY_AUTHOR_MARKER_PATTERN.test(normalizeDomText(element.textContent))
  )

  return candidates.filter(
    (element) =>
      !candidates.some(
        (candidate) => candidate !== element && element.contains(candidate)
      )
  )
}

const collectLegacyAuthorElements = (marker: Element) => {
  const elements = [marker]
  let sibling = marker.nextElementSibling
  let inspected = 0

  while (sibling && inspected < 8) {
    if (
      isEmptyElement(sibling) ||
      isLegacyAuthorDetailBlock(sibling) ||
      isShortAuthorNameBeforePortrait(sibling)
    ) {
      elements.push(sibling)
      sibling = sibling.nextElementSibling
      inspected += 1
      continue
    }
    break
  }

  return elements
}

const cleanAuthorNameCandidate = (value: string) => {
  const markerMatch = LEGACY_AUTHOR_RAW_MARKER_PATTERN.exec(value)
  const withoutMarker = markerMatch
    ? value.slice((markerMatch.index ?? 0) + markerMatch[0].length)
    : value
  const beforeDetails = withoutMarker.split(LEGACY_AUTHOR_NAME_STOP_PATTERN)[0]
  const name = cleanDomText(beforeDetails)
    .replace(/^[,.:;\s-]+|[,.:;\s-]+$/g, "")
    .split(",")[0]
    ?.trim()

  if (
    !name ||
    name.length > 80 ||
    name.split(/\s+/).length > 5 ||
    /^(?:copyediting|datum|kontakt|člen|zakladajúci|certifikovaný|príprava|tento)\b/i.test(
      name
    )
  ) {
    return
  }

  return name
}

const extractAuthorName = (marker: Element, elements: Element[]) => {
  const candidates: string[] = []
  const markerName = cleanAuthorNameCandidate(cleanDomText(marker.textContent))
  if (markerName) {
    candidates.push(markerName)
  }

  for (const element of elements.slice(1)) {
    for (const strong of Array.from(element.querySelectorAll("strong"))) {
      const candidate = cleanAuthorNameCandidate(cleanDomText(strong.textContent))
      if (candidate) {
        candidates.push(candidate)
      }
    }

    if (isShortAuthorNameBeforePortrait(element)) {
      const candidate = cleanAuthorNameCandidate(cleanDomText(element.textContent))
      if (candidate) {
        candidates.push(candidate)
      }
    }
  }

  return candidates.sort((left, right) => {
    const leftWords = left.split(/\s+/).length
    const rightWords = right.split(/\s+/).length
    return rightWords - leftWords || right.length - left.length
  })[0]
}

const extractAuthorBio = (elements: Element[], displayName: string) => {
  const parts: string[] = []

  for (const element of elements.slice(1)) {
    if (isShortAuthorNameBeforePortrait(element)) {
      continue
    }

    const clone = element.cloneNode(true) as Element
    clone.querySelectorAll("img, a[href^='mailto:']").forEach((node) =>
      node.remove()
    )
    clone.querySelectorAll("br").forEach((node) => node.replaceWith(" "))

    let text = cleanDomText(clone.textContent)
      .replace(displayName, "")
      .replace(/Copyediting(?: a korektúra)?:.*?(?=Dátum|Kontakt|$)/i, "")
      .replace(/Dátum aktualizácie:.*?(?=Kontakt|$)/i, "")
      .replace(/Kontakt:\s*$/i, "")
      .trim()

    if (text && !parts.includes(text)) {
      parts.push(text)
    }
  }

  return parts.join(" ").trim() || undefined
}

const extractRelatedArticleSlugs = (
  document: Document,
  marker?: Element
) => {
  const relatedHeading = Array.from(
    document.querySelectorAll("p, div")
  ).find((element) =>
    LEGACY_RELATED_HEADING_PATTERN.test(normalizeDomText(element.textContent))
  )
  const start = relatedHeading ?? marker
  if (!start) {
    return []
  }

  const slugs = new Set<string>()
  let element: Element | null = start
  while (element) {
    for (const link of Array.from(element.querySelectorAll("a[href]"))) {
      const slug = resolveRelatedArticleSlug(link.getAttribute("href") ?? "")
      if (slug) {
        slugs.add(slug)
      }
    }
    element = element.nextElementSibling
  }

  return Array.from(slugs).slice(0, 4)
}

const extractLegacyArticleMetadataFromDocument = (
  document: Document
): LegacyArticleMetadata => {
  const marker = findLegacyAuthorMarkers(document)[0]
  const relatedArticleSlugs = extractRelatedArticleSlugs(document, marker)
  if (!marker) {
    return { relatedArticleSlugs }
  }

  const elements = collectLegacyAuthorElements(marker)
  const markerText = normalizeDomText(marker.textContent)
  const isTeamCredit = markerText.includes(
    "clanok bol pripraveny nasim timom"
  )
  const displayName = isTeamCredit
    ? "Herbatika redakcia"
    : extractAuthorName(marker, elements)
  if (!displayName) {
    return { relatedArticleSlugs }
  }

  const isMaleCredit =
    markerText.includes("pripravil") && !markerText.includes("pripravila")
  const role = isMaleCredit
    ? "Článok pre vás pripravil"
    : "Článok pre vás pripravila"
  if (isTeamCredit) {
    return {
      author: { displayName, role },
      relatedArticleSlugs,
    }
  }

  const portrait = elements
    .flatMap((element) => Array.from(element.querySelectorAll("img[src]")))
    .find((image) => isLegacyAuthorPortraitBlock(image.parentElement ?? image))
  const portraitUrl = portrait
    ? normalizeMediaUrl(portrait.getAttribute("src") ?? "")
    : undefined
  const bio = extractAuthorBio(elements, displayName)

  return {
    author: {
      displayName,
      role,
      ...(bio ? { bio } : {}),
      ...(portraitUrl ? { portraitUrl } : {}),
    },
    relatedArticleSlugs,
  }
}

export const extractLegacyArticleMetadata = (
  html: string
): LegacyArticleMetadata =>
  extractLegacyArticleMetadataFromDocument(new JSDOM(html).window.document)

const findLegacyAuthorTextNode = (element: Element): Text | null => {
  for (const child of Array.from(element.childNodes)) {
    if (
      child.nodeType === 3 &&
      LEGACY_AUTHOR_RAW_MARKER_PATTERN.test(child.textContent ?? "")
    ) {
      return child as Text
    }

    if (child.nodeType === 1) {
      const match = findLegacyAuthorTextNode(child as Element)
      if (match) {
        return match
      }
    }
  }

  return null
}

const truncateElementAtLegacyAuthor = (element: Element) => {
  const markerNode = findLegacyAuthorTextNode(element)
  if (!markerNode) {
    return false
  }

  const markerMatch = LEGACY_AUTHOR_RAW_MARKER_PATTERN.exec(markerNode.data)
  if (!markerMatch || markerMatch.index === undefined) {
    return false
  }

  markerNode.data = markerNode.data.slice(0, markerMatch.index)

  let current: Node | null = markerNode
  while (current && current !== element) {
    let sibling = current.nextSibling
    while (sibling) {
      const next = sibling.nextSibling
      sibling.parentNode?.removeChild(sibling)
      sibling = next
    }
    current = current.parentNode
  }

  return true
}

const removeLegacyAuthorBlocks = (document: Document) => {
  const markers = findLegacyAuthorMarkers(document)

  for (const marker of markers) {
    let sibling = marker.nextElementSibling
    let inspected = 0
    while (sibling && inspected < 8) {
      const next = sibling.nextElementSibling
      if (
        isEmptyElement(sibling) ||
        isLegacyAuthorDetailBlock(sibling) ||
        isShortAuthorNameBeforePortrait(sibling)
      ) {
        sibling.remove()
        sibling = next
        inspected += 1
        continue
      }
      break
    }

    const markerText = normalizeDomText(marker.textContent)
    if (
      markerText.startsWith("clanok") ||
      !truncateElementAtLegacyAuthor(marker)
    ) {
      marker.remove()
    }
  }
}

const removeLegacyFooterBlocks = (document: Document) => {
  for (const element of Array.from(document.querySelectorAll("p, div"))) {
    const text = normalizeDomText(element.textContent)

    if (LEGACY_SEARCH_FOOTER_PATTERN.test(text)) {
      const separator = previousMeaningfulElement(element)
      if (separator?.tagName === "HR") {
        separator.remove()
      }
      element.remove()
      continue
    }

    if (LEGACY_SHARE_PATTERN.test(text) || isLegacySocialBlock(element)) {
      element.remove()
    }
  }
}

const removeLegacyRelatedArticleBlocks = (document: Document) => {
  const headings = Array.from(document.querySelectorAll("p, div")).filter(
    (element) =>
      LEGACY_RELATED_HEADING_PATTERN.test(normalizeDomText(element.textContent))
  )

  for (const heading of headings) {
    if (
      headings.some(
        (candidate) => candidate !== heading && heading.contains(candidate)
      )
    ) {
      continue
    }

    let sibling = heading.nextElementSibling
    while (sibling) {
      const next = sibling.nextElementSibling
      const links = Array.from(sibling.querySelectorAll("a[href]"))
      const isRelatedLinkBlock =
        links.length > 0 &&
        links.every((link) =>
          Boolean(resolveRelatedArticleSlug(link.getAttribute("href") ?? ""))
        )
      if (!(isEmptyElement(sibling) || isRelatedLinkBlock)) {
        break
      }

      sibling.remove()
      sibling = next
    }

    heading.remove()
  }
}

const removeEmptyElements = (document: Document) => {
  let removed = true
  while (removed) {
    removed = false
    for (const element of Array.from(document.querySelectorAll("span, p, div"))) {
      if (isEmptyElement(element)) {
        element.remove()
        removed = true
      }
    }
  }
}

const prepareLegacyArticleHtml = (html: string) => {
  const document = new JSDOM(html).window.document
  const metadata = extractLegacyArticleMetadataFromDocument(document)
  document.querySelectorAll("script, style").forEach((element) => element.remove())
  removeLegacyAuthorBlocks(document)
  removeLegacyRelatedArticleBlocks(document)
  removeLegacyFooterBlocks(document)
  removeEmptyElements(document)
  return { html: document.body.innerHTML, metadata }
}

export const normalizeLegacyArticleHtml = (html: string) =>
  prepareLegacyArticleHtml(html).html

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

export const shouldUnwrapEmptyCustomLink = (
  record: Record<string, unknown>
) => {
  if (record.type !== "link") {
    return false
  }

  const fields = record.fields as
    | { linkType?: unknown; url?: unknown }
    | undefined
  const isCustomLink =
    fields?.linkType === undefined || fields.linkType === "custom"

  return (
    isCustomLink &&
    (typeof fields?.url !== "string" || fields.url.trim().length === 0)
  )
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

  if (text.startsWith(MEDIA_TOKEN_PREFIX)) {
    return createMediaUploadNode(text, context.mediaTokens)
  }
}

const sanitizeLexicalRoot = (
  record: Record<string, unknown>,
  context: SanitizeLexicalContext
) => {
  if (
    !record.root ||
    typeof record.root !== "object" ||
    Array.isArray(record.root)
  ) {
    return
  }

  return sanitizeLexicalNode(record.root, context)
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

  const root = sanitizeLexicalRoot(record, context)
  if (root !== undefined) {
    nextRecord.root = root
  }

  if (Array.isArray(record.children)) {
    const children = record.children.flatMap((child) => {
      const sanitized = sanitizeLexicalNode(child, context)
      return sanitized === undefined ? [] : sanitized
    })

    if (children.length === 0 && record.type !== "root") {
      return
    }

    if (shouldUnwrapEmptyCustomLink(record)) {
      return children
    }

    nextRecord.children = children
  }

  if (record.type === "link") {
    addLinkManifestEntry(nextRecord, context.linkManifest)
  }

  return nextRecord
}

const sanitizeLexicalRichText = (
  value: unknown,
  context: SanitizeLexicalContext
) => sanitizeLexicalNode(value, context)

export const resolveArticleEditorConfig = (collections: {
  find: (
    predicate: (collection: {
      slug: string
      fields: Field[]
    }) => boolean
  ) => { fields: Field[]; slug: string } | undefined
}) => {
  const articlesCollection = collections.find(
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
}

const resolveCliEditorConfig = async () => {
  const [{ getPayload }, { default: config }] = await Promise.all([
    import("payload"),
    import("../payload.config"),
  ])
  const payload = await getPayload({ config })
  try {
    return resolveArticleEditorConfig(payload.config.collections)
  } finally {
    await payload.destroy()
  }
}

export const convertArticleWorkbook = async ({
  sourcePath: sourcePathInput,
  outputPath: outputPathInput,
  editorConfig: providedEditorConfig,
  signal,
  sheetName,
}: ConvertArticleWorkbookOptions) => {
  const sourcePath = path.resolve(process.cwd(), sourcePathInput)
  const outputPath = path.resolve(process.cwd(), outputPathInput)
  if (!existsSync(sourcePath)) {
    throw new Error(`Input XLSX does not exist: ${sourcePath}`)
  }

  const editorConfig = providedEditorConfig ?? (await resolveCliEditorConfig())
  const conversionContext: ConversionContext = {
    productExternalIdCache: new Map(),
    signal,
  }
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(sourcePath)

  const mediaManifest = new Map<string, MediaManifestEntry>()
  const linkManifest = new Map<string, LinkManifestEntry>()
  let productCarouselCount = 0
  let droppedArticleLinkCount = 0
  let extractedAuthorCount = 0
  let extractedRelatedArticleCount = 0
  let converted = 0
  let failed = 0
  const failures: Array<{ cell: string; message: string; sheet: string }> = []
  let skipped = 0
  let maxJsonLength = 0

  const worksheets = sheetName
    ? [resolveWorksheet(workbook, sheetName)]
    : workbook.worksheets
  for (const worksheet of worksheets) {
    const contentColumnIndexes = getContentColumnIndexes(worksheet)

    if (contentColumnIndexes.length === 0) {
      continue
    }

    const metadataColumns = getArticleMetadataColumnIndexes(worksheet)

    const rowIndexes: number[] = []
    worksheet.eachRow({ includeEmpty: false }, (_row, rowIndex) => {
      if (rowIndex !== 1) {
        rowIndexes.push(rowIndex)
      }
    })

    for (const rowIndex of rowIndexes) {
      throwIfConversionAborted(signal)
      const row = worksheet.getRow(rowIndex)

      for (const columnIndex of contentColumnIndexes) {
        const cell = row.getCell(columnIndex)
        const html = getCellText(cell).trim()
        if (!html) {
          skipped += 1
          continue
        }

        try {
          const metadata = extractLegacyArticleMetadata(html)
          const productCarousels = new Map<string, ProductCarouselData>()
          const widgetConversion = await replaceProductWidgetEmbeds(
            html,
            productCarousels,
            conversionContext
          )
          productCarouselCount += productCarousels.size
          droppedArticleLinkCount += widgetConversion.droppedArticleLinkCount

          const relatedArticleSlugs = Array.from(
            new Set([
              ...metadata.relatedArticleSlugs,
              ...widgetConversion.relatedArticleSlugs,
            ])
          ).slice(0, 4)
          const author = metadata.author
          if (author) {
            row.getCell(metadataColumns.displayName).value = author.displayName
            row.getCell(metadataColumns.role).value = author.role
            row.getCell(metadataColumns.bio).value = author.bio ?? ""
            row.getCell(metadataColumns.portraitUrl).value =
              author.portraitUrl ?? ""
            extractedAuthorCount += 1

            if (author.portraitUrl) {
              mediaManifest.set(author.portraitUrl, {
                url: author.portraitUrl,
                alt: author.displayName,
                filename: filenameFromMediaUrl(author.portraitUrl),
              })
            }
          }
          row.getCell(metadataColumns.relatedArticleSlugs).value =
            JSON.stringify(relatedArticleSlugs)
          extractedRelatedArticleCount += relatedArticleSlugs.length

          const mediaTokens = new Map<string, MediaManifestEntry>()
          const htmlWithMediaTokens = replaceImageEmbeds(
            normalizeLegacyArticleHtml(widgetConversion.html),
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
        } catch (error) {
          throwIfConversionAborted(signal)
          const message = error instanceof Error ? error.message : String(error)
          cell.value = `${ARTICLE_CONVERSION_ERROR_PREFIX}${message}`
          failed += 1
          failures.push({
            cell: cell.address,
            message,
            sheet: worksheet.name,
          })
          console.error(
            `Failed conversion at ${worksheet.name}!${cell.address}: ${message}`
          )
        }
      }
    }
  }

  const mediaManifestPath = resolveArticleMediaManifestPath(outputPath)
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
  console.log(`Failed cells: ${failed}`)
  console.log(`Skipped empty cells: ${skipped}`)
  console.log(`Media URLs: ${mediaManifest.size}`)
  console.log(`Links: ${linkManifest.size}`)
  console.log(`Product carousels: ${productCarouselCount}`)
  console.log(`Dropped legacy article widget links: ${droppedArticleLinkCount}`)
  console.log(`Extracted authors: ${extractedAuthorCount}`)
  console.log(`Extracted related article references: ${extractedRelatedArticleCount}`)
  console.log(`Max serialized RichText length: ${maxJsonLength}`)

  return {
    outputPath,
    mediaManifestPath,
    linksManifestPath,
    converted,
    failed,
    failures,
    skipped,
    productCarouselCount,
    droppedArticleLinkCount,
    extractedAuthorCount,
    extractedRelatedArticleCount,
  }
}

export const runArticleWorkbookConversionFromCli = async () => {
  const sourcePath = path.resolve(process.cwd(), resolveSourcePath())
  const outputPath = path.resolve(process.cwd(), resolveOutputPath(sourcePath))
  const result = await convertArticleWorkbook({ sourcePath, outputPath })
  if (result.failed > 0) {
    throw new Error(`Article conversion failed for ${result.failed} cell(s)`)
  }
}

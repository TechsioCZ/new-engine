import { createHash } from "node:crypto"
import { lookup } from "node:dns/promises"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { isIP } from "node:net"
import path from "node:path"
import { gunzipSync } from "node:zlib"
import ExcelJS from "exceljs"
import { getPayload, type PayloadRequest } from "payload"
import { DEFAULT_ARTICLE_AUTHOR } from "../lib/constants/article-author"
import { resolveEnvLocales } from "../lib/utils/env"
import type { Article } from "../payload-types"
import {
  ARTICLE_CONTENT_HEADER_ALIASES,
  ARTICLE_CONVERSION_ERROR_PREFIX,
  MEDIA_URL_PREFIX,
  normalizeArticleHeader,
  RICH_TEXT_GZIP_PREFIX,
} from "./article-import-format"

type Payload = Awaited<ReturnType<typeof getPayload>>
type PayloadId = number
type ArticleContent = Article["content"]
type RowValue = string | number | boolean | Date | null | undefined
type Row = Record<string, RowValue>
type ImportResult = "imported" | "skipped"
type PayloadLocale = PayloadRequest["locale"]
type ResolvedLocale = Exclude<PayloadLocale, undefined>
type WriteLocale = Exclude<PayloadLocale, "all" | undefined>
type ImportContext = {
  dryRun: boolean
  fallbackMediaId: PayloadId
  defaultCategoryId: PayloadId
  payload: Payload
  locale: PayloadLocale
  supportedLocales: string[]
  statusOverride: ImportStatus | undefined
  translate: boolean
  overwrite: boolean
  categoryCache: Map<string, PayloadId>
  authorCache: Map<string, PayloadId>
  mediaUrlMap: Map<string, PayloadId>
  signal?: AbortSignal
}

const REQUIRED_COLUMNS = ["title", "content", "slug"]
export const STATUS_VALUES = ["draft", "published", "archived"] as const
export type ImportStatus = (typeof STATUS_VALUES)[number]
const NEWLINE_PATTERN = /\r?\n/
const TAG_SEPARATOR_PATTERN = /[,;]/
const IS_DEBUG_IMPORT = process.env.DEBUG_IMPORT_ARTICLES === "1"
const TITLE_MAX_LENGTH = 160
const HERBATICA_TITLE_SUFFIX_PATTERN =
  /\s*(?:[-–—|,]\s*)?Herbatica\.sk\s*$/i
const SLOVAK_DATE_PATTERN =
  /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/
const DEFAULT_CATEGORY_TITLE = "Zdraví"
const DEFAULT_CATEGORY_SLUG = "zdravi"
const EXCEL_EPOCH_DAYS = 25_569
const MS_PER_DAY = 86_400_000
const DEFAULT_LOCALES = ["cs", "sk", "en"]
const DATA_IMAGE_PATTERN =
  /^data:(image\/(?:avif|gif|jpeg|png|webp));base64,(.+)$/i
const MEDIA_FETCH_TIMEOUT_MS = 15_000
const MAX_MEDIA_BYTES = 10 * 1024 * 1024
const MAX_MEDIA_REDIRECTS = 5
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
])

type MediaManifestEntry = {
  url: string
  alt?: string
  filename?: string
}

const debugLog = (...args: unknown[]) => {
  if (IS_DEBUG_IMPORT) {
    console.log(...args)
  }
}
const PLACEHOLDER_IMAGE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lNnJYQAAAABJRU5ErkJggg==",
  "base64"
)

export const articleImportUsage = `Usage:
  payload run src/scripts/import-articles.ts <xlsx-file> [sheet-name]

Payload CLI removes named arguments before running scripts. Configure optional values with:
  PAYLOAD_IMPORT_LOCALE=cs
  PAYLOAD_IMPORT_STATUS=draft|published|archived
  PAYLOAD_IMPORT_TRANSLATE=1
  PAYLOAD_IMPORT_OVERWRITE=1
  PAYLOAD_IMPORT_DRY_RUN=1
  PAYLOAD_IMPORT_MEDIA_MANIFEST_PATH=file.json

Expected columns:
  title, content, excerpt, slug, category, category_slug, tags, status, publishedDate, featured_image_path, author_name, author_role, author_bio, author_image_src, related_article_slugs

Aliases:
  title: post_url, post_title
  content: body, text, article, article_text, post_content, post_content_html
  category: category_title, rubrika, kategorie
  publishedDate: published_date, date, datum, post_date
  featured_image_path: image, image_path, featuredImage, featured_image, post_img_src, post_img
`

export type ArticleImportOptions = {
  filePath: string
  sheetName?: string
  dryRun?: boolean
  locale?: string
  status?: ImportStatus
  translate?: boolean
  overwrite?: boolean
  signal?: AbortSignal
  payload?: Payload
  mediaManifestPath?: string
}

export type ArticleImportResult = {
  filePath: string
  sheetName: string
  locale: string
  total: number
  imported: number
  failed: number
  failures: ArticleImportFailure[]
  mediaFallbacks: number
  relatedArticleLinks: number
  unresolvedRelatedArticleSlugs: string[]
  skipped: number
}

export type ArticleImportFailure = {
  message: string
  row: number
  slug?: string
}

const getValueArg = (args: string[], index: number) => {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    return
  }

  return value
}

const parseStatusArg = (
  value: string | undefined
): ImportStatus | undefined => {
  if (!value) {
    return
  }

  const normalized = value.toLowerCase().trim()
  if (STATUS_VALUES.includes(normalized as ImportStatus)) {
    return normalized as ImportStatus
  }

  console.warn(
    `Invalid --status value: ${value}. Allowed: ${STATUS_VALUES.join(", ")}`
  )
  return
}

const parseBooleanOption = (value: string | undefined) =>
  value !== undefined && ["1", "true", "yes", "on"].includes(value.toLowerCase())

export const getArticleImportCliOptions = () => {
  const positional: string[] = []
  let locale = process.env.PAYLOAD_IMPORT_LOCALE || "cs"
  let status = parseStatusArg(process.env.PAYLOAD_IMPORT_STATUS)
  let translate = parseBooleanOption(process.env.PAYLOAD_IMPORT_TRANSLATE)
  let dryRun = parseBooleanOption(process.env.PAYLOAD_IMPORT_DRY_RUN)
  let overwrite = parseBooleanOption(process.env.PAYLOAD_IMPORT_OVERWRITE)
  let mediaManifestPath = process.env.PAYLOAD_IMPORT_MEDIA_MANIFEST_PATH
  const args = process.argv.slice(2)

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case "--dry-run":
        dryRun = true
        break

      case "--translate":
        translate = true
        break

      case "--overwrite":
        overwrite = true
        break

      case "--locale": {
        const value = getValueArg(args, i)
        if (value) {
          locale = value.toLowerCase()
          i += 1
        }
        break
      }

      case "--media-manifest": {
        const value = getValueArg(args, i)
        if (value) {
          mediaManifestPath = value
          i += 1
        }
        break
      }

      case "--status": {
        const value = getValueArg(args, i)
        if (value) {
          status = parseStatusArg(value)
          i += 1
        }
        break
      }

      default:
        if (!arg.startsWith("--")) {
          positional.push(arg)
        }
    }
  }

  return {
    filePath: positional[0],
    sheetName: positional[1],
    dryRun,
    locale,
    status,
    translate,
    overwrite,
    mediaManifestPath,
  }
}

const normalizeRow = (row: Row): Row => {
  const normalized: Row = {}

  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeArticleHeader(key)] = value
  }

  return normalized
}

const getCellValue = (cell: ExcelJS.Cell): RowValue => {
  const value = cell.value
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  ) {
    return value
  }

  if ("result" in value) {
    const result = value.result
    return result instanceof Date || typeof result !== "object"
      ? (result as RowValue)
      : String(result ?? "")
  }

  if ("text" in value && typeof value.text === "string") {
    return value.text
  }

  if ("richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((item) => item.text).join("")
  }

  return String(value)
}

const firstValue = (row: Row, keys: string[]) => {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value
    }
  }

  return
}

const toText = (value: RowValue) => String(value ?? "").trim()
const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ")

export const sanitizeArticleTitle = (value: string) => {
  const title = normalizeText(value).replace(HERBATICA_TITLE_SUFFIX_PATTERN, "")
  if (title.length > TITLE_MAX_LENGTH) {
    throw new Error(
      `Article title exceeds ${TITLE_MAX_LENGTH} characters (${title.length})`
    )
  }

  return title
}

const getText = (row: Row, keys: string[]) => toText(firstValue(row, keys))

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new Error("Article import aborted")
  }
}

const isRichTextJson = (value: unknown): value is ArticleContent =>
  typeof value === "object" &&
  value !== null &&
  "root" in value &&
  typeof (value as { root?: unknown }).root === "object"

const decodeRichTextValue = (value: string) => {
  if (!value.startsWith(RICH_TEXT_GZIP_PREFIX)) {
    return value
  }

  try {
    return gunzipSync(
      Buffer.from(value.slice(RICH_TEXT_GZIP_PREFIX.length), "base64")
    ).toString("utf8")
  } catch (error) {
    throw new Error(
      `Malformed rich text payload: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

const resolveDefaultMediaManifestPath = (filePath: string) => {
  const parsed = path.parse(filePath)
  return path.join(parsed.dir, `${parsed.name}.media.json`)
}

const sanitizeFilename = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
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

const filenameWithUrlHash = (entry: MediaManifestEntry) => {
  const hash = createHash("sha1").update(entry.url).digest("hex").slice(0, 12)
  const filename = sanitizeFilename(
    entry.filename || filenameFromUrl(entry.url)
  )
  return `imported-richtext-${hash}-${filename}`
}

const loadMediaManifest = async (filePath: string | undefined) => {
  if (!(filePath && existsSync(filePath))) {
    return []
  }

  const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown
  const media = (parsed as { media?: unknown }).media
  if (!Array.isArray(media)) {
    return []
  }

  return media.filter(
    (entry): entry is MediaManifestEntry =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { url?: unknown }).url === "string"
  )
}

const isPrivateAddress = (address: string) => {
  const normalizedAddress = address.toLowerCase()
  if (
    normalizedAddress === "::1" ||
    normalizedAddress.startsWith("fc") ||
    normalizedAddress.startsWith("fd") ||
    normalizedAddress.startsWith("fe80:")
  ) {
    return true
  }

  if (
    address.startsWith("0.") ||
    address.startsWith("10.") ||
    address.startsWith("127.")
  ) {
    return true
  }

  const [first = 0, second = 0] = address.split(".").map(Number)
  return (
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}

const assertSafeMediaUrl = async (url: string) => {
  const parsed = new URL(url)
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Unsupported media URL protocol")
  }

  if (parsed.hostname === "metadata.google.internal") {
    throw new Error("Blocked cloud metadata host")
  }

  const addresses = isIP(parsed.hostname)
    ? [{ address: parsed.hostname }]
    : await lookup(parsed.hostname, { all: true })
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Blocked private or link-local media host")
  }
}

const readResponseWithLimit = async (
  response: Response,
  signal?: AbortSignal
) => {
  const reader = response.body?.getReader()
  if (!reader) {
    return Buffer.from(await response.arrayBuffer())
  }

  const chunks: Buffer[] = []
  let total = 0
  while (true) {
    throwIfAborted(signal)
    const { done, value } = await reader.read()
    if (done) {
      return Buffer.concat(chunks)
    }

    total += value.byteLength
    if (total > MAX_MEDIA_BYTES) {
      throw new Error("Media response exceeds maximum size")
    }
    chunks.push(Buffer.from(value))
  }
}

const fetchDataImageBuffer = (url: string) => {
  const match = DATA_IMAGE_PATTERN.exec(url)
  if (!match) {
    throw new Error("Unsupported data image")
  }

  const data = Buffer.from(match[2] ?? "", "base64")
  if (data.length > MAX_MEDIA_BYTES) {
    throw new Error("Data image exceeds maximum size")
  }

  return {
    data,
    mimetype: match[1]?.toLowerCase() ?? "image/png",
  }
}

const fetchMediaBuffer = async (url: string, signal?: AbortSignal) => {
  if (url.startsWith("data:")) {
    return fetchDataImageBuffer(url)
  }

  let currentUrl = url
  const timeoutSignal = AbortSignal.timeout(MEDIA_FETCH_TIMEOUT_MS)
  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  for (
    let redirectCount = 0;
    redirectCount <= MAX_MEDIA_REDIRECTS;
    redirectCount += 1
  ) {
    throwIfAborted(signal)
    await assertSafeMediaUrl(currentUrl)
    const response = await fetch(currentUrl, {
      redirect: "manual",
      signal: requestSignal,
    })

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location")
      if (!location) {
        throw new Error("Media redirect is missing Location header")
      }
      currentUrl = new URL(location, currentUrl).toString()
      continue
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]
    if (!(contentType && SUPPORTED_IMAGE_TYPES.has(contentType))) {
      throw new Error(
        `Unsupported media content type: ${contentType || "unknown"}`
      )
    }

    return {
      data: await readResponseWithLimit(response, signal),
      mimetype: contentType,
    }
  }

  throw new Error("Too many media redirects")
}

const ensureMediaFromUrl = async (
  payload: Payload,
  entry: MediaManifestEntry,
  dryRun: boolean,
  signal?: AbortSignal
): Promise<PayloadId | undefined> => {
  throwIfAborted(signal)
  const filename = filenameWithUrlHash(entry)
  const existing = await payload.find({
    collection: "media",
    where: {
      filename: {
        equals: filename,
      },
    },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    return existing.docs[0].id as PayloadId
  }

  if (dryRun) {
    return 0
  }

  const file = await fetchMediaBuffer(entry.url, signal)
  throwIfAborted(signal)
  const media = await payload.create({
    collection: "media",
    data: {
      alt: entry.alt?.trim() || "Imported article image",
    },
    file: {
      ...file,
      name: filename,
      size: file.data.length,
    },
    overrideAccess: true,
  })

  return media.id as PayloadId
}

const ensureMediaManifestUploads = async (
  payload: Payload,
  manifestPath: string | undefined,
  dryRun: boolean,
  fallbackMediaId: PayloadId,
  signal?: AbortSignal
) => {
  const entries = await loadMediaManifest(manifestPath)
  const mediaUrlMap = new Map<string, PayloadId>()
  let fallbackCount = 0

  for (const entry of entries) {
    throwIfAborted(signal)
    try {
      const mediaId = await ensureMediaFromUrl(
        payload,
        entry,
        dryRun,
        signal
      )
      if (mediaId !== undefined) {
        mediaUrlMap.set(entry.url, mediaId)
      }
    } catch (error) {
      throwIfAborted(signal)
      fallbackCount += 1
      mediaUrlMap.set(entry.url, fallbackMediaId)
      console.warn(
        `Using placeholder for rich text image ${entry.url}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  if (entries.length > 0) {
    console.log(
      `Prepared ${mediaUrlMap.size}/${entries.length} rich text media uploads (${fallbackCount} placeholders)`
    )
  }

  return { fallbackCount, mediaUrlMap }
}

const hydrateRichTextMedia = (
  node: unknown,
  mediaUrlMap: Map<string, PayloadId>,
  unresolvedMediaUrls: Set<string>
): unknown | undefined => {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return node
  }

  const record = node as Record<string, unknown>
  if (record.type === "upload") {
    const value = record.value
    if (typeof value === "string" && value.startsWith(MEDIA_URL_PREFIX)) {
      const url = value.slice(MEDIA_URL_PREFIX.length)
      const mediaId = mediaUrlMap.get(url)
      if (mediaId === undefined) {
        unresolvedMediaUrls.add(url)
        return
      }

      return {
        ...record,
        relationTo: "media",
        value: mediaId,
      }
    }
  }

  const nextRecord = { ...record }
  if (
    record.root &&
    typeof record.root === "object" &&
    !Array.isArray(record.root)
  ) {
    nextRecord.root = hydrateRichTextMedia(
      record.root,
      mediaUrlMap,
      unresolvedMediaUrls
    )
  }

  if (Array.isArray(record.children)) {
    nextRecord.children = record.children
      .map((child) =>
        hydrateRichTextMedia(child, mediaUrlMap, unresolvedMediaUrls)
      )
      .filter((child) => child !== undefined)
  }

  return nextRecord
}

const RICH_TEXT_BLOCK_TYPES = new Set([
  "block",
  "heading",
  "list",
  "listitem",
  "paragraph",
  "quote",
  "upload",
])

const isRichTextBlockNode = (node: unknown) => {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return false
  }

  const type = (node as Record<string, unknown>).type
  return typeof type === "string" && RICH_TEXT_BLOCK_TYPES.has(type)
}

const joinRichTextChildText = (children: unknown[]) => {
  let previousWasBlock = false

  return children.reduce((text, child) => {
    const childText = getRichTextPlainText(child)
    if (!childText) {
      return text
    }

    const childIsBlock = isRichTextBlockNode(child)
    const separator = text && (previousWasBlock || childIsBlock) ? " " : ""
    previousWasBlock = childIsBlock
    return `${text}${separator}${childText}`
  }, "")
}

const getRichTextPlainText = (node: unknown): string => {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return ""
  }

  const record = node as Record<string, unknown>
  const ownText = typeof record.text === "string" ? record.text : ""
  const childText = Array.isArray(record.children)
    ? joinRichTextChildText(record.children)
    : ""
  const rootText = record.root ? getRichTextPlainText(record.root) : ""
  return `${ownText}${childText}${rootText}`
}

const decodeRichTextJson = (value: string) => {
  const decoded = decodeRichTextValue(value)
  return JSON.parse(decoded) as unknown
}

const redactMediaUrl = (url: string) => {
  if (url.startsWith("data:")) {
    return "[inline data image]"
  }

  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    const hash = createHash("sha256").update(url).digest("hex").slice(0, 12)
    return `[media-url:${hash}]`
  }
}

const excerptFromContent = (content: string) => {
  if (!content.startsWith(RICH_TEXT_GZIP_PREFIX)) {
    return content.slice(0, 300)
  }

  const parsed = decodeRichTextJson(content)
  if (!isRichTextJson(parsed)) {
    return ""
  }

  return getRichTextPlainText(parsed).trim().slice(0, 300)
}

const toRichText = (
  value: string,
  mediaUrlMap: Map<string, PayloadId>
): ArticleContent => {
  if (value.startsWith(ARTICLE_CONVERSION_ERROR_PREFIX)) {
    throw new Error(value.slice(ARTICLE_CONVERSION_ERROR_PREFIX.length))
  }

  if (value.startsWith(RICH_TEXT_GZIP_PREFIX)) {
    const parsed = decodeRichTextJson(value)
    if (!isRichTextJson(parsed)) {
      throw new Error(
        "Malformed rich text payload: JSON is not Lexical rich text"
      )
    }

    const unresolvedMediaUrls = new Set<string>()
    const hydrated = hydrateRichTextMedia(
      parsed,
      mediaUrlMap,
      unresolvedMediaUrls
    )
    if (unresolvedMediaUrls.size > 0) {
      const unresolvedDescriptions = Array.from(
        unresolvedMediaUrls,
        redactMediaUrl
      )
      throw new Error(
        `Missing imported rich text media: ${unresolvedDescriptions.join(", ")}`
      )
    }

    return hydrated as ArticleContent
  }

  const lines = value
    .split(NEWLINE_PATTERN)
    .map((line) => line.trim())
    .filter(Boolean)

  const paragraphs = (lines.length > 0 ? lines : [" "]).map((line) => ({
    type: "paragraph",
    format: "",
    indent: 0,
    version: 1,
    textFormat: 0,
    textStyle: "",
    children: [
      {
        type: "text",
        detail: 0,
        format: 0,
        mode: "normal",
        style: "",
        text: line,
        version: 1,
      },
    ],
  }))

  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: paragraphs,
    },
  }
}

const parseTags = (value: string) =>
  value
    .split(TAG_SEPARATOR_PATTERN)
    .map((tag) => tag.trim())
    .filter(Boolean)

export const parseRelatedArticleSlugs = (value: string) => {
  if (!value.trim()) {
    return []
  }

  let candidates: unknown = value
  try {
    candidates = JSON.parse(value)
  } catch {
    candidates = value.split(TAG_SEPARATOR_PATTERN)
  }

  if (!Array.isArray(candidates)) {
    return []
  }

  return Array.from(
    new Set(
      candidates
        .filter((candidate): candidate is string => typeof candidate === "string")
        .map((candidate) => candidate.trim())
        .filter(Boolean)
    )
  ).slice(0, 4)
}

const hasLocaleValue = (
  value: string | Record<string, string> | undefined,
  locale: PayloadLocale
) => {
  if (!locale) {
    return false
  }

  if (!value) {
    return false
  }

  if (typeof value !== "object") {
    return value.trim().length > 0
  }

  if (locale === "all") {
    return Object.values(value).some((item) => item.trim().length > 0)
  }

  return Object.hasOwn(value, locale)
}

const resolveSupportedLocales = () => {
  return resolveEnvLocales("PAYLOAD_LOCALES", DEFAULT_LOCALES).locales
}

const resolvePayloadLocale = (
  locale: string | undefined,
  supportedLocales: string[]
): ResolvedLocale => {
  const normalized = locale?.trim().toLowerCase()
  if (!normalized) {
    return (supportedLocales[0] ?? DEFAULT_LOCALES[0]) as WriteLocale
  }

  if (normalized === "all") {
    return normalized as ResolvedLocale
  }

  if (supportedLocales.includes(normalized)) {
    return normalized as WriteLocale
  }

  throw new Error(
    `Invalid locale ${locale}. Supported values: ${supportedLocales.join(", ")}`
  )
}

type ArticlePayloadData = {
  title: string
  slug: string
  excerpt: string
  content: ArticleContent
  featuredImage: PayloadId
  category: PayloadId
  categories: PayloadId[]
  primaryCategory: PayloadId
  meta: {
    description: string
    title: string
  }
  tags: string[]
  articleAuthor: PayloadId
  publishedDate: string
  status: ImportStatus
  translationSync: boolean
}

type UpsertArticleParams = {
  payload: Payload
  existingArticle:
    | { id?: PayloadId; title?: string | Record<string, string> }
    | undefined
  locale: PayloadLocale
  supportedLocales: string[]
  overwrite: boolean
  dryRun: boolean
  data: ArticlePayloadData
}

const resolveWriteLocale = (
  value: PayloadLocale,
  supportedLocales: string[]
): WriteLocale =>
  value === "all" || value === undefined
    ? ((supportedLocales[0] ?? DEFAULT_LOCALES[0]) as WriteLocale)
    : (value as WriteLocale)

const upsertArticle = async ({
  payload,
  existingArticle,
  locale,
  supportedLocales,
  overwrite,
  dryRun,
  data,
}: UpsertArticleParams): Promise<ImportResult> => {
  const writeLocale = resolveWriteLocale(locale, supportedLocales)
  if (
    existingArticle &&
    !overwrite &&
    hasLocaleValue(existingArticle.title, locale)
  ) {
    console.log(`Skipping existing article: ${data.slug}`)
    return "skipped"
  }

  if (dryRun) {
    console.log(`Would import: ${data.title} (${data.slug})`)
    return "imported"
  }

  if (existingArticle) {
    await payload.update({
      collection: "articles",
      id: existingArticle.id as PayloadId,
      locale: writeLocale,
      data,
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: "articles",
      locale: writeLocale,
      data,
      overrideAccess: true,
    })
  }

  console.log(`Imported: ${data.title} (${data.slug})`)
  return "imported"
}

const parseStatus = (value: string) => {
  const status = value.toLowerCase()
  if (STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number])) {
    return status as (typeof STATUS_VALUES)[number]
  }

  if (value) {
    console.warn(
      `Unknown status value "${value}", defaulting to "draft". Allowed: ${STATUS_VALUES.join(", ")}`
    )
  }

  return "draft"
}

export const parseArticleDate = (value: RowValue) => {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === "number") {
    return new Date((value - EXCEL_EPOCH_DAYS) * MS_PER_DAY).toISOString()
  }

  const text = toText(value)
  if (!text) {
    throw new Error("Published date is required")
  }

  const slovakDate = SLOVAK_DATE_PATTERN.exec(text)
  if (slovakDate) {
    const day = Number(slovakDate[1])
    const month = Number(slovakDate[2])
    const year = Number(slovakDate[3])
    const date = new Date(Date.UTC(year, month - 1, day))
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error(`Invalid published date: ${text}`)
    }
    return date.toISOString()
  }

  const timestamp = Date.parse(text)
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid published date: ${text}`)
  }

  return new Date(timestamp).toISOString()
}

const findExistingBySlug = async (
  payload: Payload,
  collection: "articles" | "article-categories",
  slug: string,
  locale: WriteLocale
) => {
  const result = await payload.find({
    collection,
    locale,
    fallbackLocale: false,
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  return result.docs[0]
}

const findExistingArticleForImport = async (
  payload: Payload,
  slug: string,
  locale: WriteLocale
) => {
  const canonicalArticle = await findExistingBySlug(
    payload,
    "articles",
    slug,
    locale
  )
  const legacySlug = slugify(slug)
  if (!legacySlug || legacySlug === slug) {
    return canonicalArticle
  }

  const result = await payload.find({
    collection: "articles",
    locale,
    fallbackLocale: false,
    where: {
      slug: {
        equals: legacySlug,
      },
    },
    limit: 2,
    pagination: false,
    overrideAccess: true,
  })

  if (result.docs.length > 1) {
    throw new Error(
      `Legacy slug "${legacySlug}" matches multiple articles; refusing automatic repair`
    )
  }

  const legacyArticle = result.docs[0]
  if (canonicalArticle && legacyArticle) {
    throw new Error(
      `Canonical slug "${slug}" and legacy slug "${legacySlug}" both exist; refusing automatic repair`
    )
  }

  return canonicalArticle ?? legacyArticle
}

type EnsureCategoryParams = {
  payload: Payload
  title: string
  slug: string
  dryRun: boolean
  locale: PayloadLocale
  supportedLocales: string[]
  translate: boolean
  overwrite: boolean
  categoryCache: Map<string, PayloadId>
}

const ensureCategory = async ({
  payload,
  title,
  slug,
  dryRun,
  locale,
  supportedLocales,
  translate,
  overwrite,
  categoryCache,
}: EnsureCategoryParams) => {
  const cacheKey = `${locale ?? "default"}:${slug}`
  const cachedId = categoryCache.get(cacheKey)
  if (!overwrite && cachedId !== undefined) {
    return cachedId
  }

  const writeLocale = resolveWriteLocale(locale, supportedLocales)
  const existing = await findExistingBySlug(
    payload,
    "article-categories",
    slug,
    writeLocale
  )
  if (existing) {
    const id = existing.id as PayloadId
    if (!overwrite && hasLocaleValue(existing.title, locale)) {
      categoryCache.set(cacheKey, id)
      return id
    }

    if (!dryRun) {
      await payload.update({
        collection: "article-categories",
        id: existing.id as PayloadId,
        locale: writeLocale,
        data: {
          title,
          slug,
          translationSync: translate,
        },
        overrideAccess: true,
      })
    }

    if (!overwrite) {
      categoryCache.set(cacheKey, id)
    }
    return id
  }

  if (dryRun) {
    categoryCache.set(cacheKey, 0)
    return 0
  }

  const category = await payload.create({
    collection: "article-categories",
    locale: resolveWriteLocale(locale, supportedLocales),
    data: {
      title,
      slug,
      translationSync: translate,
    },
    overrideAccess: true,
  })

  const id = category.id as PayloadId
  categoryCache.set(cacheKey, id)
  return id
}

const ensureFallbackMedia = async (payload: Payload, dryRun: boolean) => {
  const existing = await payload.find({
    collection: "media",
    where: {
      filename: {
        equals: "imported-article-placeholder.png",
      },
    },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    return existing.docs[0].id as PayloadId
  }

  if (dryRun) {
    return 0
  }

  const media = await payload.create({
    collection: "media",
    data: {
      alt: "Imported article placeholder",
    },
    file: {
      data: PLACEHOLDER_IMAGE,
      mimetype: "image/png",
      name: "imported-article-placeholder.png",
      size: PLACEHOLDER_IMAGE.length,
    },
    overrideAccess: true,
  })

  return media.id as PayloadId
}

const ensureFeaturedImage = async ({
  payload,
  imagePath,
  title,
  dryRun,
  fallbackMediaId,
  mediaUrlMap,
  signal,
}: {
  payload: Payload
  imagePath: string
  title: string
  dryRun: boolean
  fallbackMediaId: PayloadId
  mediaUrlMap: Map<string, PayloadId>
  signal?: AbortSignal
}) => {
  if (!imagePath) {
    return fallbackMediaId
  }

  const existingId = mediaUrlMap.get(imagePath)
  if (existingId !== undefined) {
    return existingId
  }

  try {
    const mediaId = await ensureMediaFromUrl(
      payload,
      {
        url: imagePath,
        alt: title,
      },
      dryRun,
      signal
    )
    if (mediaId !== undefined) {
      mediaUrlMap.set(imagePath, mediaId)
      return mediaId
    }
  } catch (error) {
    throwIfAborted(signal)
    console.warn(
      `Failed to import featured image ${imagePath}: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return fallbackMediaId
}

type EnsureArticleAuthorParams = {
  payload: Payload
  row: Row
  dryRun: boolean
  locale: PayloadLocale
  supportedLocales: string[]
  overwrite: boolean
  authorCache: Map<string, PayloadId>
  mediaUrlMap: Map<string, PayloadId>
}

const ensureArticleAuthor = async ({
  payload,
  row,
  dryRun,
  locale,
  supportedLocales,
  overwrite,
  authorCache,
  mediaUrlMap,
}: EnsureArticleAuthorParams) => {
  const displayName =
    getText(row, ["author_name", "author", "author_display_name"]) ||
    DEFAULT_ARTICLE_AUTHOR.displayName
  const slug = slugify(displayName)
  const cacheKey = `${locale ?? "default"}:${slug}`
  const cachedId = authorCache.get(cacheKey)
  if (cachedId !== undefined) {
    return cachedId
  }

  const role = getText(row, ["author_role"]) || DEFAULT_ARTICLE_AUTHOR.role
  const extractedBio = getText(row, ["author_bio"])
  const bio =
    extractedBio ||
    (displayName === DEFAULT_ARTICLE_AUTHOR.displayName
      ? DEFAULT_ARTICLE_AUTHOR.bio
      : undefined)
  const portraitUrl = getText(row, ["author_image_src", "author_image"])
  const portrait = portraitUrl ? mediaUrlMap.get(portraitUrl) : undefined
  const writeLocale = resolveWriteLocale(locale, supportedLocales)
  const existing = await payload.find({
    collection: "article-authors",
    locale: writeLocale,
    fallbackLocale: false,
    where: { slug: { equals: slug } },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })
  const data = {
    displayName,
    slug,
    role,
    ...(bio ? { bio } : {}),
    ...(portrait !== undefined ? { portrait } : {}),
  }

  if (dryRun) {
    const id = (existing.docs[0]?.id as PayloadId | undefined) ?? 0
    authorCache.set(cacheKey, id)
    return id
  }

  const existingAuthor = existing.docs[0]
  let author = existingAuthor
  if (!existingAuthor) {
    author = await payload.create({
      collection: "article-authors",
      locale: writeLocale,
      data,
      overrideAccess: true,
    })
  } else if (overwrite) {
    author = await payload.update({
      collection: "article-authors",
      id: existingAuthor.id,
      locale: writeLocale,
      data,
      overrideAccess: true,
    })
  }

  const id = author.id as PayloadId
  authorCache.set(cacheKey, id)
  return id
}

const readRows = async (filePath: string, sheetName?: string) => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const selectedSheetName = sheetName ?? workbook.worksheets[0]?.name
  if (!selectedSheetName) {
    throw new Error("XLSX file does not contain any sheets")
  }

  const worksheet = workbook.getWorksheet(selectedSheetName)
  if (!worksheet) {
    throw new Error(`Sheet not found: ${selectedSheetName}`)
  }

  const headerRow = worksheet.getRow(1)
  const headers = headerRow.values as ExcelJS.CellValue[]
  const rows: Row[] = []

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return
    }

    const data: Row = {}
    for (let columnIndex = 1; columnIndex < headers.length; columnIndex += 1) {
      const header = String(headers[columnIndex] ?? "").trim()
      if (header) {
        data[header] = getCellValue(row.getCell(columnIndex))
      }
    }
    rows.push(data)
  })

  return {
    selectedSheetName,
    rows: rows.map(normalizeRow),
  }
}

const assertRequiredColumns = (rows: Row[]) => {
  const firstRow = rows[0]
  if (!firstRow) {
    throw new Error("No rows found in XLSX file")
  }

  const missing = REQUIRED_COLUMNS.filter((column) => {
    if (column === "content") {
      return !Array.from(ARTICLE_CONTENT_HEADER_ALIASES).some(
        (key) => key in firstRow
      )
    }

    if (column === "title") {
      return ![
        "title",
        "name",
        "nazev",
        "nadpis",
        "post_title",
      ].some((key) => key in firstRow)
    }

    if (column === "slug") {
      return !["slug", "url_slug", "post_url_href"].some(
        (key) => key in firstRow
      )
    }

    return !(column in firstRow)
  })

  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(", ")}`)
  }
}

const assertUniqueArticleSlugs = (rows: Row[]) => {
  const rowsBySlug = new Map<string, number[]>()

  for (const [index, row] of rows.entries()) {
    const slug = getText(row, ["slug", "url_slug", "post_url_href"])
    if (!slug) {
      continue
    }

    const sourceRows = rowsBySlug.get(slug) ?? []
    sourceRows.push(index + 2)
    rowsBySlug.set(slug, sourceRows)
  }

  const duplicates = [...rowsBySlug.entries()].filter(
    ([, sourceRows]) => sourceRows.length > 1
  )
  if (duplicates.length > 0) {
    const summary = duplicates
      .map(([slug, sourceRows]) => `${slug} (rows ${sourceRows.join(", ")})`)
      .join("; ")
    throw new Error(`Duplicate article slugs: ${summary}`)
  }
}

const processArticleRow = async (
  row: Row,
  index: number,
  context: ImportContext
): Promise<ImportResult> => {
  const {
    dryRun,
    defaultCategoryId,
    fallbackMediaId,
    payload,
    locale,
    statusOverride,
    translate,
    overwrite,
  } = context
  const title = sanitizeArticleTitle(
    getText(row, [
      "title",
      "name",
      "nazev",
      "nadpis",
      "post_title",
    ])
  )
  const content = getText(row, Array.from(ARTICLE_CONTENT_HEADER_ALIASES))

  if (!(title && content)) {
    console.warn(`Skipping row ${index + 2}: title or content is empty`)
    return "skipped"
  }

  const rawSlug = getText(row, [
    "slug",
    "url_slug",
    "post_url_href",
  ])
  if (!rawSlug) {
    throw new Error("post-url-href is empty")
  }

  const publishedDate = parseArticleDate(
    firstValue(row, [
      "publishedDate",
      "published_date",
      "date",
      "datum",
      "post_date",
    ])
  )

  const featuredImage = await ensureFeaturedImage({
    payload,
    imagePath: getText(row, [
      "featured_image_path",
      "featured_image",
      "featuredImage",
      "image_path",
      "image",
      "post_img_src",
      "post_img",
    ]),
    title,
    dryRun,
    fallbackMediaId,
    mediaUrlMap: context.mediaUrlMap,
    signal: context.signal,
  })

  const author = await ensureArticleAuthor({
    payload,
    row,
    dryRun,
    locale,
    supportedLocales: context.supportedLocales,
    overwrite,
    authorCache: context.authorCache,
    mediaUrlMap: context.mediaUrlMap,
  })
  const tags = parseTags(
    getText(row, ["tags", "tagy", "keywords", "klicova_slova"])
  )
  const status =
    statusOverride ?? parseStatus(getText(row, ["status", "state", "stav"]))
  const extractedExcerpt = getText(row, [
    "excerpt",
    "perex",
    "summary",
    "description",
    "popis",
  ])
  const excerpt = extractedExcerpt
    ? extractedExcerpt
    : excerptFromContent(content)
  const metaDescription =
    getText(row, ["meta_description"]) || excerpt

  const data: ArticlePayloadData = {
    title,
    slug: rawSlug,
    excerpt,
    content: toRichText(content, context.mediaUrlMap),
    featuredImage,
    category: defaultCategoryId,
    categories: [defaultCategoryId],
    primaryCategory: defaultCategoryId,
    meta: {
      title,
      description: metaDescription,
    },
    tags,
    articleAuthor: author,
    publishedDate,
    status,
    translationSync: translate,
  }

  const existingArticle = await findExistingArticleForImport(
    payload,
    rawSlug,
    resolveWriteLocale(locale, context.supportedLocales)
  )

  return upsertArticle({
    payload,
    existingArticle,
    locale,
    supportedLocales: context.supportedLocales,
    overwrite,
    dryRun,
    data,
  })
}

type RelatedArticleSyncResult = {
  links: number
  unresolvedSlugs: string[]
}

const syncRelatedArticles = async ({
  payload,
  rows,
  locale,
  supportedLocales,
  dryRun,
}: {
  payload: Payload
  rows: Row[]
  locale: PayloadLocale
  supportedLocales: string[]
  dryRun: boolean
}): Promise<RelatedArticleSyncResult> => {
  const writeLocale = resolveWriteLocale(locale, supportedLocales)
  const articles = await payload.find({
    collection: "articles",
    locale: writeLocale,
    fallbackLocale: false,
    limit: 1000,
    pagination: false,
    overrideAccess: true,
  })
  const articleIdsBySlug = new Map(
    articles.docs.flatMap((article) =>
      typeof article.slug === "string"
        ? [[article.slug, article.id as PayloadId] as const]
        : []
    )
  )
  const unresolvedSlugs = new Set<string>()
  let links = 0

  for (const row of rows) {
    if (!Object.hasOwn(row, "related_article_slugs")) {
      continue
    }

    const sourceSlug = getText(row, ["slug", "url_slug", "post_url_href"])
    const sourceId = articleIdsBySlug.get(sourceSlug)
    if (sourceId === undefined) {
      unresolvedSlugs.add(sourceSlug)
      continue
    }

    const relatedIds = parseRelatedArticleSlugs(
      getText(row, ["related_article_slugs"])
    ).flatMap((relatedSlug) => {
      const relatedId = articleIdsBySlug.get(relatedSlug)
      if (relatedId === undefined) {
        unresolvedSlugs.add(relatedSlug)
        return []
      }
      return relatedId === sourceId ? [] : [relatedId]
    })
    links += relatedIds.length

    if (!dryRun) {
      await payload.update({
        collection: "articles",
        id: sourceId,
        locale: writeLocale,
        data: { relatedArticles: relatedIds },
        overrideAccess: true,
      })
    }
  }

  return { links, unresolvedSlugs: Array.from(unresolvedSlugs).sort() }
}

export const runImportFromFile = async (
  options: ArticleImportOptions & { payload: Payload }
): Promise<ArticleImportResult> => {
  const {
    filePath,
    sheetName,
    dryRun = false,
    locale: requestedLocale,
    status: statusOverride,
    translate = false,
    overwrite = false,
    signal,
    payload,
    mediaManifestPath,
  } = options

  throwIfAborted(signal)
  const supportedLocales = resolveSupportedLocales()
  const locale = resolvePayloadLocale(requestedLocale, supportedLocales)

  const resolvedFilePath = path.resolve(process.cwd(), filePath)
  debugLog(`Resolved file path: ${resolvedFilePath}`)
  throwIfAborted(signal)
  const { selectedSheetName, rows } = await readRows(
    resolvedFilePath,
    sheetName
  )
  debugLog(`Rows loaded: ${rows.length}, sheet: ${selectedSheetName}`)
  assertRequiredColumns(rows)
  assertUniqueArticleSlugs(rows)

  throwIfAborted(signal)
  const categoryCache = new Map<string, PayloadId>()
  const authorCache = new Map<string, PayloadId>()
  const defaultCategoryId = await ensureCategory({
    payload,
    title: DEFAULT_CATEGORY_TITLE,
    slug: DEFAULT_CATEGORY_SLUG,
    dryRun,
    locale,
    supportedLocales,
    translate,
    overwrite,
    categoryCache,
  })
  const fallbackMediaId = await ensureFallbackMedia(payload, dryRun)
  debugLog(`Fallback media id: ${fallbackMediaId}`)
  const resolvedMediaManifestPath = path.resolve(
    process.cwd(),
    mediaManifestPath ?? resolveDefaultMediaManifestPath(resolvedFilePath)
  )
  const { fallbackCount: mediaFallbacks, mediaUrlMap } =
    await ensureMediaManifestUploads(
      payload,
      resolvedMediaManifestPath,
      dryRun,
      fallbackMediaId,
      signal
    )

  let imported = 0
  let failed = 0
  const failures: ArticleImportFailure[] = []
  let skipped = 0

  console.log(
    `${dryRun ? "Dry-run import" : "Importing"} ${rows.length} rows from ${resolvedFilePath} (${selectedSheetName})`
  )

  for (const [index, row] of rows.entries()) {
    throwIfAborted(signal)
    try {
      const result = await processArticleRow(row, index, {
        dryRun,
        defaultCategoryId,
        fallbackMediaId,
        payload,
        locale,
        supportedLocales,
        statusOverride,
        translate,
        overwrite,
        categoryCache,
        authorCache,
        mediaUrlMap,
        signal,
      })
      if (result === "imported") {
        imported += 1
      } else {
        skipped += 1
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const slug = getText(row, ["slug", "url_slug", "post_url_href"])
      failed += 1
      failures.push({
        message,
        row: index + 2,
        ...(slug ? { slug } : {}),
      })
      console.error(`Failed import row ${index + 2}: ${message}`)
    }
    throwIfAborted(signal)
  }

  const relatedArticles = await syncRelatedArticles({
    payload,
    rows,
    locale,
    supportedLocales,
    dryRun,
  })

  return {
    filePath: resolvedFilePath,
    sheetName: selectedSheetName,
    locale,
    total: rows.length,
    imported,
    failed,
    failures,
    mediaFallbacks,
    relatedArticleLinks: relatedArticles.links,
    unresolvedRelatedArticleSlugs: relatedArticles.unresolvedSlugs,
    skipped,
  }
}

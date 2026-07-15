import { createHash } from "node:crypto"
import { lookup } from "node:dns/promises"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { isIP } from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gunzipSync } from "node:zlib"
import ExcelJS from "exceljs"
import { getPayload, type PayloadRequest } from "payload"
import type { Article } from "../payload-types"

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
  payload: Payload
  locale: PayloadLocale
  supportedLocales: string[]
  statusOverride: ImportStatus | undefined
  translate: boolean
  overwrite: boolean
  categoryCache: Map<string, PayloadId>
  mediaUrlMap: Map<string, PayloadId>
}

const REQUIRED_COLUMNS = ["title", "content"]
export const STATUS_VALUES = ["draft", "published", "archived"] as const
export type ImportStatus = (typeof STATUS_VALUES)[number]
const HEADER_WHITESPACE_PATTERN = /\s+/g
const NEWLINE_PATTERN = /\r?\n/
const TAG_SEPARATOR_PATTERN = /[,;]/
const IS_DEBUG_IMPORT = process.env.DEBUG_IMPORT_ARTICLES === "1"
const TITLE_MAX_LENGTH = 100
const EXCEL_EPOCH_DAYS = 25_569
const MS_PER_DAY = 86_400_000
const DEFAULT_LOCALES = ["cs", "sk", "en"]
const RICH_TEXT_GZIP_PREFIX = "payload-richtext+gzip-base64:"
const MEDIA_URL_PREFIX = "payload-media-url:"
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

const usage = `Usage:
  pnpm --filter @nmit/payload run import:articles -- <xlsx-file> [sheet-name] [--locale cs] [--status draft|published|archived] [--translate] [--overwrite] [--dry-run] [--media-manifest file.json]

Expected columns:
  title, content, excerpt, slug, category, category_slug, tags, status, publishedDate, featured_image_path, author_email

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
  skipped: number
}

const hasFlag = (flag: string) => process.argv.includes(flag)
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

const getArgs = () => {
  const positional: string[] = []
  let locale = "cs"
  let status: ImportStatus | undefined
  let translate = false
  let dryRun = false
  let overwrite = false
  let mediaManifestPath: string | undefined
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

const normalizeHeader = (value: string) =>
  value
    .trim()
    .replace(HEADER_WHITESPACE_PATTERN, "_")
    .replace(/-/g, "_")
    .toLowerCase()

const normalizeRow = (row: Row): Row => {
  const normalized: Row = {}

  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeader(key)] = value
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

const sanitizeTitle = (value: string, rowIndex: number) => {
  const normalized = normalizeText(value)
  if (normalized.length <= TITLE_MAX_LENGTH) {
    return normalized
  }

  const truncated = normalized.slice(0, TITLE_MAX_LENGTH - 3).trimEnd()
  const safeTitle = `${truncated}...`
  console.warn(
    `Truncated title at row ${rowIndex + 2}: ${normalized.length} -> ${safeTitle.length} chars`
  )

  return safeTitle
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

const getCliPayload = async () => {
  const { default: config } = await import("../payload.config")
  return getPayload({ config })
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

const readResponseWithLimit = async (response: Response) => {
  const reader = response.body?.getReader()
  if (!reader) {
    return Buffer.from(await response.arrayBuffer())
  }

  const chunks: Buffer[] = []
  let total = 0
  while (true) {
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
    mimetype: match[1]?.toLowerCase() || "image/png",
  }
}

const fetchMediaBuffer = async (url: string) => {
  if (url.startsWith("data:")) {
    return fetchDataImageBuffer(url)
  }

  let currentUrl = url
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), MEDIA_FETCH_TIMEOUT_MS)
  timeout.unref?.()

  try {
    for (
      let redirectCount = 0;
      redirectCount <= MAX_MEDIA_REDIRECTS;
      redirectCount += 1
    ) {
      await assertSafeMediaUrl(currentUrl)
      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
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
        data: await readResponseWithLimit(response),
        mimetype: contentType,
      }
    }
  } finally {
    clearTimeout(timeout)
  }

  throw new Error("Too many media redirects")
}

const ensureMediaFromUrl = async (
  payload: Payload,
  entry: MediaManifestEntry,
  dryRun: boolean
): Promise<PayloadId | undefined> => {
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

  const file = await fetchMediaBuffer(entry.url)
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
  dryRun: boolean
) => {
  const entries = await loadMediaManifest(manifestPath)
  const mediaUrlMap = new Map<string, PayloadId>()

  for (const entry of entries) {
    try {
      const mediaId = await ensureMediaFromUrl(payload, entry, dryRun)
      if (mediaId !== undefined) {
        mediaUrlMap.set(entry.url, mediaId)
      }
    } catch (error) {
      console.warn(
        `Failed to import rich text image ${entry.url}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  if (entries.length > 0) {
    console.log(
      `Prepared ${mediaUrlMap.size}/${entries.length} rich text media uploads`
    )
  }

  return mediaUrlMap
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

const getRichTextPlainText = (node: unknown): string => {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return ""
  }

  const record = node as Record<string, unknown>
  const ownText = typeof record.text === "string" ? record.text : ""
  const childText = Array.isArray(record.children)
    ? record.children.map(getRichTextPlainText).join("")
    : ""
  const rootText = record.root ? getRichTextPlainText(record.root) : ""
  return `${ownText}${childText}${rootText}`
}

const decodeRichTextJson = (value: string) => {
  const decoded = decodeRichTextValue(value)
  return JSON.parse(decoded) as unknown
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
      throw new Error(
        `Unresolved rich text media URLs: ${Array.from(unresolvedMediaUrls).join(", ")}`
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
  const locales = process.env.PAYLOAD_LOCALES?.split(",")
    .map((locale) => locale.trim().toLowerCase())
    .filter(Boolean)

  return locales?.length ? locales : DEFAULT_LOCALES
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
  tags: string[]
  author?: PayloadId
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
  index: number
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
  index,
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

  try {
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
  } catch (error) {
    console.error(`Failed import row ${index + 2} (${data.slug})`)
    console.error(error)
    return "skipped"
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

const parseDate = (value: RowValue) => {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === "number") {
    return new Date((value - EXCEL_EPOCH_DAYS) * MS_PER_DAY).toISOString()
  }

  const text = toText(value)
  if (!text) {
    return new Date().toISOString()
  }

  const timestamp = Date.parse(text)
  return Number.isNaN(timestamp)
    ? new Date().toISOString()
    : new Date(timestamp).toISOString()
}

const findExistingBySlug = async (
  payload: Payload,
  collection: "articles" | "article-categories",
  slug: string,
  locale: PayloadLocale = "all"
) => {
  const result = await payload.find({
    collection,
    locale,
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

  const existing = await findExistingBySlug(payload, "article-categories", slug)
  if (existing) {
    const writeLocale = resolveWriteLocale(locale, supportedLocales)
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

const ensureFeaturedImage = (imagePath: string, fallbackMediaId: PayloadId) => {
  if (!imagePath) {
    return fallbackMediaId
  }

  console.warn("Image import from XLSX is disabled, using fallback media.")
  return fallbackMediaId
}

const findAuthor = async (payload: Payload, email: string) => {
  if (!email) {
    return
  }

  const result = await payload.find({
    collection: "users",
    where: {
      email: {
        equals: email,
      },
    },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  return result.docs[0]?.id as PayloadId | undefined
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
      return ![
        "content",
        "body",
        "text",
        "article",
        "article_text",
        "post_content",
        "post_content_html",
      ].some((key) => key in firstRow)
    }

    if (column === "title") {
      return ![
        "title",
        "name",
        "nazev",
        "nadpis",
        "post_url",
        "post_title",
      ].some((key) => key in firstRow)
    }

    return !(column in firstRow)
  })

  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(", ")}`)
  }
}

const processArticleRow = async (
  row: Row,
  index: number,
  context: ImportContext
): Promise<ImportResult> => {
  const {
    dryRun,
    fallbackMediaId,
    payload,
    locale,
    statusOverride,
    translate,
    overwrite,
  } = context
  const title = sanitizeTitle(
    getText(row, [
      "title",
      "name",
      "nazev",
      "nadpis",
      "post_url",
      "post_title",
    ]),
    index
  )
  const content = getText(row, [
    "content",
    "body",
    "text",
    "article",
    "article_text",
    "post_content",
    "post_content_html",
  ])

  if (!(title && content)) {
    console.warn(`Skipping row ${index + 2}: title or content is empty`)
    return "skipped"
  }

  const categoryTitle =
    getText(row, ["category", "category_title", "rubrika", "kategorie"]) ||
    "Blog"
  const categorySlug =
    getText(row, ["category_slug", "rubrika_slug", "kategorie_slug"]) ||
    slugify(categoryTitle)
  const categoryId = await ensureCategory({
    payload,
    title: categoryTitle,
    slug: categorySlug,
    dryRun,
    locale,
    supportedLocales: context.supportedLocales,
    translate,
    overwrite,
    categoryCache: context.categoryCache,
  })

  const featuredImage = ensureFeaturedImage(
    getText(row, [
      "featured_image_path",
      "featured_image",
      "featuredImage",
      "image_path",
      "image",
      "post_img_src",
      "post_img",
    ]),
    fallbackMediaId
  )

  const author = await findAuthor(
    payload,
    getText(row, ["author_email", "author", "email"])
  )
  const tags = parseTags(
    getText(row, ["tags", "tagy", "keywords", "klicova_slova"])
  )
  const status =
    statusOverride ?? parseStatus(getText(row, ["status", "state", "stav"]))
  const excerpt =
    getText(row, [
      "excerpt",
      "perex",
      "summary",
      "description",
      "meta_description",
      "popis",
    ]) || excerptFromContent(content)
  const rawSlug = getText(row, ["slug", "url_slug", "url", "post_url_href"])
  const slug = rawSlug ? slugify(rawSlug) : slugify(title)

  const data: ArticlePayloadData = {
    title,
    slug,
    excerpt,
    content: toRichText(content, context.mediaUrlMap),
    featuredImage,
    category: categoryId,
    tags,
    ...(author ? { author } : {}),
    publishedDate: parseDate(
      firstValue(row, [
        "publishedDate",
        "published_date",
        "date",
        "datum",
        "post_date",
      ])
    ),
    status,
    translationSync: translate,
  }

  const existingArticle = await findExistingBySlug(payload, "articles", slug)

  return upsertArticle({
    payload,
    existingArticle,
    locale,
    supportedLocales: context.supportedLocales,
    overwrite,
    dryRun,
    index,
    data,
  })
}

export const runImportFromFile = async (
  options: ArticleImportOptions
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
    payload: providedPayload,
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

  debugLog("Payload config loaded")
  throwIfAborted(signal)
  const payload = providedPayload ?? (await getCliPayload())
  debugLog("Payload initialized")
  throwIfAborted(signal)
  const fallbackMediaId = await ensureFallbackMedia(payload, dryRun)
  debugLog(`Fallback media id: ${fallbackMediaId}`)
  const resolvedMediaManifestPath = path.resolve(
    process.cwd(),
    mediaManifestPath ?? resolveDefaultMediaManifestPath(resolvedFilePath)
  )
  const mediaUrlMap = await ensureMediaManifestUploads(
    payload,
    resolvedMediaManifestPath,
    dryRun
  )

  let imported = 0
  let skipped = 0
  const categoryCache = new Map<string, PayloadId>()

  console.log(
    `${dryRun ? "Dry-run import" : "Importing"} ${rows.length} rows from ${resolvedFilePath} (${selectedSheetName})`
  )

  for (const [index, row] of rows.entries()) {
    throwIfAborted(signal)
    const result = await processArticleRow(row, index, {
      dryRun,
      fallbackMediaId,
      payload,
      locale,
      supportedLocales,
      statusOverride,
      translate,
      overwrite,
      categoryCache,
      mediaUrlMap,
    })

    if (result === "imported") {
      imported += 1
    } else {
      skipped += 1
    }
    throwIfAborted(signal)
  }

  return {
    filePath: resolvedFilePath,
    sheetName: selectedSheetName,
    locale,
    total: rows.length,
    imported,
    skipped,
  }
}

const runImportFromCli = async () => {
  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(usage)
    return
  }

  const {
    filePath,
    sheetName,
    dryRun,
    locale,
    status: statusOverride,
    translate,
    overwrite,
    mediaManifestPath,
  } = getArgs()
  if (!filePath) {
    console.log(usage)
    throw new Error("Missing XLSX file path")
  }

  const result = await runImportFromFile({
    filePath,
    sheetName,
    dryRun,
    locale,
    status: statusOverride,
    translate,
    overwrite,
    mediaManifestPath,
  })

  console.log(
    `Finished. Imported: ${result.imported}. Skipped: ${result.skipped}.`
  )
}

const currentScriptFile = fileURLToPath(import.meta.url)
if (path.resolve(process.argv[1] ?? "") === path.resolve(currentScriptFile)) {
  runImportFromCli()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

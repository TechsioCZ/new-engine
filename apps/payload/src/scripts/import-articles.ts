import { promises as fs } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getPayload, type PayloadRequest } from "payload"
import type XLSXType from "xlsx"
import config from "../payload.config"
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
}

const require = createRequire(import.meta.url)
const XLSX = require("xlsx") as typeof XLSXType

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
const DEFAULT_LOCALES = ["en"]

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
  pnpm --filter @nmit/payload run import:articles -- <xlsx-file> [sheet-name] [--locale cs] [--status draft|published|archived] [--translate] [--overwrite] [--dry-run]

Expected columns:
  title, content, excerpt, slug, category, category_slug, tags, status, publishedDate, featured_image_path, author_email

Aliases:
  title: post_url, post_title
  content: body, text, article, article_text, post_content, post_content_html
  category: category_title, rubrika, kategorie
  publishedDate: published_date, date, datum
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

const toRichText = (value: string): ArticleContent => {
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
  if (!locale || locale === "all") {
    return false
  }

  if (!value || typeof value !== "object") {
    return false
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
}: EnsureCategoryParams) => {
  const existing = await findExistingBySlug(payload, "article-categories", slug)
  if (existing) {
    const writeLocale = resolveWriteLocale(locale, supportedLocales)
    if (!overwrite && hasLocaleValue(existing.title, locale)) {
      return existing.id as PayloadId
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

    return existing.id as PayloadId
  }

  if (dryRun) {
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

  return category.id as PayloadId
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
  const workbook = XLSX.read(await fs.readFile(filePath), {
    cellDates: true,
    type: "buffer",
  })
  const selectedSheetName = sheetName ?? workbook.SheetNames[0]
  if (!selectedSheetName) {
    throw new Error("XLSX file does not contain any sheets")
  }

  const sheet = workbook.Sheets[selectedSheetName]
  if (!sheet) {
    throw new Error(`Sheet not found: ${selectedSheetName}`)
  }

  const rows = XLSX.utils.sheet_to_json<Row>(sheet, {
    defval: "",
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
    getText(row, ["excerpt", "perex", "summary", "description", "popis"]) ||
    content.slice(0, 300)
  const rawSlug = getText(row, ["slug", "url_slug", "url", "post_url_href"])
  const slug = rawSlug ? slugify(rawSlug) : slugify(title)

  const data: ArticlePayloadData = {
    title,
    slug,
    excerpt,
    content: toRichText(content),
    featuredImage,
    category: categoryId,
    tags,
    ...(author ? { author } : {}),
    publishedDate: parseDate(
      firstValue(row, ["publishedDate", "published_date", "date", "datum"])
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
  const payload = await getPayload({ config })
  debugLog("Payload initialized")
  throwIfAborted(signal)
  const fallbackMediaId = await ensureFallbackMedia(payload, dryRun)
  debugLog(`Fallback media id: ${fallbackMediaId}`)

  let imported = 0
  let skipped = 0

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

import path from "node:path"

import ExcelJS from "exceljs"
import { getPayload } from "payload"
import type { PayloadRequest } from "payload"

import type { Article } from "../payload-types"

type Payload = Awaited<ReturnType<typeof getPayload>>
type ArticleContent = Article["content"]
type RowValue = string | number | boolean | Date | null | undefined
type Row = Record<string, RowValue>
type ImportResult = "imported" | "skipped"
type PayloadLocale = PayloadRequest["locale"]
type ResolvedLocale = Exclude<PayloadLocale, undefined>
type WriteLocale = Exclude<PayloadLocale, "all" | undefined>
interface ImportContext {
  dryRun: boolean
  fallbackMediaId: number
  payload: Payload
  locale: PayloadLocale
  supportedLocales: string[]
  statusOverride: ImportStatus | undefined
  translate: boolean
  overwrite: boolean
  categoryCache: Map<string, number>
}

const REQUIRED_COLUMNS = ["title", "content"]
export const STATUS_VALUES = ["draft", "published", "archived"] as const
export type ImportStatus = (typeof STATUS_VALUES)[number]
export type ArticleImportErrorCode =
  | "ABORTED"
  | "MISSING_REQUIRED_COLUMNS"
  | "NO_ROWS"
  | "NO_SHEETS"
  | "SHEET_NOT_FOUND"

export class ArticleImportError extends Error {
  readonly code: ArticleImportErrorCode

  constructor(code: ArticleImportErrorCode, message: string) {
    super(message)
    this.name = "ArticleImportError"
    this.code = code
  }
}
const HEADER_WHITESPACE_PATTERN = /\s+/gu
const NEWLINE_PATTERN = /\r?\n/u
const TAG_SEPARATOR_PATTERN = /[,;]/u
const { DEBUG_IMPORT_ARTICLES: debugImportArticles } = process.env
const IS_DEBUG_IMPORT = debugImportArticles === "1"
const TITLE_MAX_LENGTH = 100
const EXCEL_EPOCH_DAYS = 25_569
const MS_PER_DAY = 86_400_000
const DEFAULT_LOCALE: WriteLocale = "en"
const DEFAULT_LOCALES: string[] = [DEFAULT_LOCALE]
const ARTICLE_CATEGORIES_COLLECTION = "article-categories" as const

const debugLog = (...args: unknown[]) => {
  if (IS_DEBUG_IMPORT) {
    console.log(...args)
  }
}
const PLACEHOLDER_IMAGE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lNnJYQAAAABJRU5ErkJggg==",
  "base64",
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

export interface ArticleImportOptions {
  filePath: string
  sheetName?: string
  dryRun?: boolean
  locale?: string
  status?: ImportStatus
  translate?: boolean
  overwrite?: boolean
  signal?: AbortSignal
  payload?: Payload
}

export interface ArticleImportResult {
  filePath: string
  sheetName: string
  locale: string
  total: number
  imported: number
  skipped: number
}

const hasFlag = (flag: string) => process.argv.includes(flag)
const getValueArg = (args: string[], index: number): string | undefined => {
  const value = args[index + 1]
  if (value === undefined || value === "" || value.startsWith("--")) {
    return undefined
  }

  return value
}

const isImportStatus = (value: string): value is ImportStatus =>
  STATUS_VALUES.some((status) => status === value)

const parseStatusArg = (
  value: string | undefined,
): ImportStatus | undefined => {
  if (value === undefined || value === "") {
    return undefined
  }

  const normalized = value.toLowerCase().trim()
  if (isImportStatus(normalized)) {
    return normalized
  }

  console.warn(
    `Invalid --status value: ${value}. Allowed: ${STATUS_VALUES.join(", ")}`,
  )
  return undefined
}

const getArgs = () => {
  const positional: string[] = []
  let locale = "cs"
  let status: ImportStatus | undefined
  let translate = false
  let dryRun = false
  let overwrite = false
  const args = process.argv.slice(2)

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === undefined || arg === "") {
      continue
    }

    switch (arg) {
      case "--dry-run": {
        dryRun = true
        break
      }

      case "--translate": {
        translate = true
        break
      }

      case "--overwrite": {
        overwrite = true
        break
      }

      case "--locale": {
        const value = getValueArg(args, i)
        if (value !== undefined && value !== "") {
          locale = value.toLowerCase()
          i += 1
        }
        break
      }

      case "--status": {
        const value = getValueArg(args, i)
        if (value !== undefined && value !== "") {
          status = parseStatusArg(value)
          i += 1
        }
        break
      }

      default: {
        if (!arg.startsWith("--")) {
          positional.push(arg)
        }
      }
    }
  }

  return {
    dryRun,
    filePath: positional[0],
    locale,
    overwrite,
    sheetName: positional[1],
    status,
    translate,
  }
}

const normalizeHeader = (value: string) =>
  value
    .trim()
    .replace(HEADER_WHITESPACE_PATTERN, "_")
    .replaceAll("-", "_")
    .toLowerCase()

const normalizeRow = (row: Row): Row => {
  const normalized: Row = {}

  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeader(key)] = value
  }

  return normalized
}

const serializeCellObject = (value: object): string =>
  JSON.stringify(value) ?? ""

const isPrimitiveCellValue = (value: ExcelJS.CellValue): value is RowValue => {
  if (value === null || typeof value === "string") {
    return true
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return true
  }
  return value instanceof Date
}

const getCellValue = (cell: ExcelJS.Cell): RowValue => {
  const { value } = cell
  if (isPrimitiveCellValue(value)) {
    return value
  }

  if ("result" in value) {
    const { result } = value
    if (result instanceof Date || typeof result !== "object") {
      return result
    }

    return serializeCellObject(result ?? {})
  }

  if ("text" in value && typeof value.text === "string") {
    return value.text
  }

  if ("richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((item) => item.text).join("")
  }

  return serializeCellObject(value)
}

const firstValue = (row: Row, keys: string[]): RowValue => {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value
    }
  }

  return undefined
}

const toText = (value: RowValue) => String(value ?? "").trim()
const normalizeText = (value: string) => value.trim().replaceAll(/\s+/gu, " ")

const sanitizeTitle = (value: string, rowIndex: number) => {
  const normalized = normalizeText(value)
  if (normalized.length <= TITLE_MAX_LENGTH) {
    return normalized
  }

  const truncated = normalized.slice(0, TITLE_MAX_LENGTH - 3).trimEnd()
  const safeTitle = `${truncated}...`
  console.warn(
    `Truncated title at row ${rowIndex + 2}: ${normalized.length} -> ${safeTitle.length} chars`,
  )

  return safeTitle
}

const getText = (row: Row, keys: string[]) => toText(firstValue(row, keys))

const slugifyImportValue = (value: string) =>
  value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^(?<leading>-)|(?<trailing>-)$/gu, "")

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted === true) {
    throw new ArticleImportError("ABORTED", "Article import aborted")
  }
}

const getCliPayload = async () => {
  const { default: config } = await import("../payload.config")
  return await getPayload({ config })
}

const toRichText = (value: string): ArticleContent => {
  const lines = value
    .split(NEWLINE_PATTERN)
    .map((line) => line.trim())
    .filter(Boolean)

  const paragraphs = (lines.length > 0 ? lines : [" "]).map((line) => ({
    children: [
      {
        detail: 0,
        format: 0,
        mode: "normal",
        style: "",
        text: line,
        type: "text",
        version: 1,
      },
    ],
    format: "",
    indent: 0,
    textFormat: 0,
    textStyle: "",
    type: "paragraph",
    version: 1,
  }))

  return {
    root: {
      children: paragraphs,
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
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
  locale: PayloadLocale,
) => {
  if (locale === undefined) {
    return false
  }

  if (value === undefined || value === "") {
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
  const { PAYLOAD_LOCALES: payloadLocales } = process.env
  const locales = payloadLocales
    ?.split(",")
    .map((locale) => locale.trim().toLowerCase())
    .filter((locale) => locale !== "")

  return locales !== undefined && locales.length > 0 ? locales : DEFAULT_LOCALES
}

const toWriteLocale = (locale: string): WriteLocale | undefined => {
  if (locale === "all" || locale === "") {
    return undefined
  }
  if (locale === "en") {
    return "en"
  }
  if (locale === "cs") {
    return "cs"
  }
  return locale === "sk" ? "sk" : undefined
}

const resolvePayloadLocale = (
  locale: string | undefined,
  supportedLocales: string[],
): ResolvedLocale => {
  const normalized = locale?.trim().toLowerCase()
  if (normalized === undefined || normalized === "") {
    return (
      toWriteLocale(supportedLocales[0] ?? DEFAULT_LOCALE) ?? DEFAULT_LOCALE
    )
  }

  if (normalized === "all") {
    return normalized
  }

  if (supportedLocales.includes(normalized)) {
    return toWriteLocale(normalized) ?? DEFAULT_LOCALE
  }

  throw new Error(
    `Invalid locale ${locale}. Supported values: ${supportedLocales.join(", ")}`,
  )
}

interface ArticlePayloadData {
  title: string
  slug: string
  excerpt: string
  content: ArticleContent
  featuredImage: number
  category: number
  tags: string[]
  author?: number
  publishedDate: string
  status: ImportStatus
  translationSync: boolean
}

interface UpsertArticleParams {
  payload: Payload
  existingArticle:
    | { id: number; title?: string | Record<string, string> }
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
  supportedLocales: string[],
): WriteLocale => {
  if (value !== "all" && value !== undefined) {
    return value
  }

  return toWriteLocale(supportedLocales[0] ?? DEFAULT_LOCALE) ?? DEFAULT_LOCALE
}

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
    const writePromise = existingArticle
      ? payload.update({
          collection: "articles",
          data,
          id: existingArticle.id,
          locale: writeLocale,
          overrideAccess: true,
        })
      : payload.create({
          collection: "articles",
          data,
          locale: writeLocale,
          overrideAccess: true,
        })
    await writePromise
  } catch (error) {
    console.error(`Failed import row ${index + 2} (${data.slug})`)
    console.error(error)
    return "skipped"
  }

  console.log(`Imported: ${data.title} (${data.slug})`)
  return "imported"
}

const parseStatus = (value: string): ImportStatus => {
  const status = value.toLowerCase()
  if (isImportStatus(status)) {
    return status
  }

  if (value !== "") {
    console.warn(
      `Unknown status value "${value}", defaulting to "draft". Allowed: ${STATUS_VALUES.join(", ")}`,
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
  collection: "articles" | typeof ARTICLE_CATEGORIES_COLLECTION,
  slug: string,
  locale: PayloadLocale = "all",
) => {
  const result = await payload.find({
    collection,
    limit: 1,
    locale,
    overrideAccess: true,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs[0]
}

interface EnsureCategoryParams {
  payload: Payload
  title: string
  slug: string
  dryRun: boolean
  locale: PayloadLocale
  supportedLocales: string[]
  translate: boolean
  overwrite: boolean
  categoryCache: Map<string, number>
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

  const existing = await findExistingBySlug(
    payload,
    ARTICLE_CATEGORIES_COLLECTION,
    slug,
  )
  if (existing !== undefined) {
    const writeLocale = resolveWriteLocale(locale, supportedLocales)
    const { id } = existing
    if (!overwrite && hasLocaleValue(existing.title, locale)) {
      categoryCache.set(cacheKey, id)
      return id
    }

    if (!dryRun) {
      await payload.update({
        collection: ARTICLE_CATEGORIES_COLLECTION,
        data: {
          slug,
          title,
          translationSync: translate,
        },
        id: existing.id,
        locale: writeLocale,
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
    collection: ARTICLE_CATEGORIES_COLLECTION,
    data: {
      slug,
      title,
      translationSync: translate,
    },
    locale: resolveWriteLocale(locale, supportedLocales),
    overrideAccess: true,
  })

  const { id } = category
  categoryCache.set(cacheKey, id)
  return id
}

const ensureFallbackMedia = async (payload: Payload, dryRun: boolean) => {
  const existing = await payload.find({
    collection: "media",
    limit: 1,
    overrideAccess: true,
    pagination: false,
  })

  const [existingMedia] = existing.docs
  if (existingMedia !== undefined) {
    return existingMedia.id
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

  return media.id
}

const ensureFeaturedImage = (imagePath: string, fallbackMediaId: number) => {
  if (!imagePath) {
    return fallbackMediaId
  }

  console.warn("Image import from XLSX is disabled, using fallback media.")
  return fallbackMediaId
}

const findAuthor = async (
  payload: Payload,
  email: string,
): Promise<number | undefined> => {
  if (email === "") {
    return undefined
  }

  const result = await payload.find({
    collection: "users",
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: {
      email: {
        equals: email,
      },
    },
  })

  return result.docs[0]?.id
}

const readRows = async (filePath: string, sheetName?: string) => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const selectedSheetName = sheetName ?? workbook.worksheets[0]?.name
  if (selectedSheetName === undefined || selectedSheetName === "") {
    throw new ArticleImportError(
      "NO_SHEETS",
      "XLSX file does not contain any sheets",
    )
  }

  const worksheet = workbook.getWorksheet(selectedSheetName)
  if (!worksheet) {
    throw new ArticleImportError(
      "SHEET_NOT_FOUND",
      `Sheet not found: ${selectedSheetName}`,
    )
  }

  const headerRow = worksheet.getRow(1)
  const rows: Row[] = []

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return
    }

    const data: Row = {}
    for (
      let columnIndex = 1;
      columnIndex <= headerRow.cellCount;
      columnIndex += 1
    ) {
      const header = toText(getCellValue(headerRow.getCell(columnIndex)))
      if (header !== "") {
        data[header] = getCellValue(row.getCell(columnIndex))
      }
    }
    rows.push(data)
  })

  return {
    rows: rows.map(normalizeRow),
    selectedSheetName,
  }
}

const assertRequiredColumns = (rows: Row[]) => {
  const [firstRow] = rows
  if (firstRow === undefined) {
    throw new ArticleImportError("NO_ROWS", "No rows found in XLSX file")
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
    throw new ArticleImportError(
      "MISSING_REQUIRED_COLUMNS",
      `Missing required columns: ${missing.join(", ")}`,
    )
  }
}

const processArticleRow = async (
  row: Row,
  index: number,
  context: ImportContext,
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
    index,
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
    slugifyImportValue(categoryTitle)
  const categoryId = await ensureCategory({
    categoryCache: context.categoryCache,
    dryRun,
    locale,
    overwrite,
    payload,
    slug: categorySlug,
    supportedLocales: context.supportedLocales,
    title: categoryTitle,
    translate,
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
    fallbackMediaId,
  )

  const author = await findAuthor(
    payload,
    getText(row, ["author_email", "author", "email"]),
  )
  const tags = parseTags(
    getText(row, ["tags", "tagy", "keywords", "klicova_slova"]),
  )
  const status =
    statusOverride ?? parseStatus(getText(row, ["status", "state", "stav"]))
  const excerpt =
    getText(row, ["excerpt", "perex", "summary", "description", "popis"]) ||
    content.slice(0, 300)
  const rawSlug = getText(row, ["slug", "url_slug", "url", "post_url_href"])
  const slug = rawSlug ? slugifyImportValue(rawSlug) : slugifyImportValue(title)

  const data: ArticlePayloadData = {
    ...(author === undefined ? {} : { author }),
    category: categoryId,
    content: toRichText(content),
    excerpt,
    featuredImage,
    publishedDate: parseDate(
      firstValue(row, ["publishedDate", "published_date", "date", "datum"]),
    ),
    slug,
    status,
    tags,
    title,
    translationSync: translate,
  }

  const existingArticle = await findExistingBySlug(payload, "articles", slug)

  return await upsertArticle({
    data,
    dryRun,
    existingArticle,
    index,
    locale,
    overwrite,
    payload,
    supportedLocales: context.supportedLocales,
  })
}

interface ProcessRowsParams {
  context: ImportContext
  rows: Row[]
  signal?: AbortSignal
}

const processRows = async ({
  context,
  rows,
  signal,
}: ProcessRowsParams): Promise<{ imported: number; skipped: number }> => {
  let imported = 0
  let skipped = 0

  const processAtIndex = async (index: number): Promise<void> => {
    const row = rows[index]
    if (row === undefined) {
      return
    }

    throwIfAborted(signal)
    const result = await processArticleRow(row, index, context)
    if (result === "imported") {
      imported += 1
    } else {
      skipped += 1
    }
    throwIfAborted(signal)
    await processAtIndex(index + 1)
  }

  await processAtIndex(0)
  return { imported, skipped }
}

export const runImportFromFile = async (
  options: ArticleImportOptions,
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
  } = options

  throwIfAborted(signal)
  const supportedLocales = resolveSupportedLocales()
  const locale = resolvePayloadLocale(requestedLocale, supportedLocales)

  const resolvedFilePath = path.resolve(process.cwd(), filePath)
  debugLog(`Resolved file path: ${resolvedFilePath}`)
  throwIfAborted(signal)
  const { selectedSheetName, rows } = await readRows(
    resolvedFilePath,
    sheetName,
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

  const categoryCache = new Map<string, number>()

  console.log(
    `${dryRun ? "Dry-run import" : "Importing"} ${rows.length} rows from ${resolvedFilePath} (${selectedSheetName})`,
  )

  const { imported, skipped } = await processRows({
    context: {
      categoryCache,
      dryRun,
      fallbackMediaId,
      locale,
      overwrite,
      payload,
      statusOverride,
      supportedLocales,
      translate,
    },
    rows,
    ...(signal === undefined ? {} : { signal }),
  })

  return {
    filePath: resolvedFilePath,
    imported,
    locale,
    sheetName: selectedSheetName,
    skipped,
    total: rows.length,
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
  if (filePath === undefined || filePath === "") {
    console.log(usage)
    throw new Error("Missing XLSX file path")
  }

  const result = await runImportFromFile({
    dryRun,
    filePath,
    locale,
    overwrite,
    ...(sheetName === undefined ? {} : { sheetName }),
    ...(statusOverride === undefined ? {} : { status: statusOverride }),
    translate,
  })

  console.log(
    `Finished. Imported: ${result.imported}. Skipped: ${result.skipped}.`,
  )
}

const runCliEntryPoint = async (): Promise<void> => {
  try {
    await runImportFromCli()
  } catch (error: unknown) {
    console.error(error)
    process.exitCode = 1
  }
}

const isDirectCliInvocation = (
  currentScriptFile: unknown,
  invokedScriptFile: unknown,
): boolean => {
  if (typeof currentScriptFile !== "string" || currentScriptFile.length === 0) {
    return false
  }
  if (typeof invokedScriptFile !== "string" || invokedScriptFile.length === 0) {
    return false
  }
  return path.resolve(invokedScriptFile) === path.resolve(currentScriptFile)
}

const currentScriptFile: unknown = import.meta.filename
if (isDirectCliInvocation(currentScriptFile, process.argv[1])) {
  await runCliEntryPoint()
}

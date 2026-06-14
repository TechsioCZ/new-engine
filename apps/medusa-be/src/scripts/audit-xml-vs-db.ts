import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"
import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sql } from "drizzle-orm"
import { sqlRaw } from "../utils/db"
import { isHttpXmlSource, readXmlSource } from "./herbatica-xml-utils"

const CANONICAL_URL_QUERY_REGEX = /\?.*$/

type XmlElement = {
  attributes: Record<string, string>
  inner: string
}

type XmlShopItem = {
  id: string
  name: string
  guid?: string
  categoryPathsSeed: string[]
  categoryPathsStrict: string[]
  images: string[]
}

type DbProductRaw = {
  product_id: string
  handle: string
  title: string
  status: string
  thumbnail: string | null
  source_shopitem_id: string | null
  source_guid: string | null
  metadata_category_paths: unknown
  image_urls: unknown
  category_handles: unknown
  variant_thumbnails: unknown
  variant_image_refs: unknown
  variant_count: number | string | null
}

type DbProductRecord = {
  productId: string
  handle: string
  title: string
  status: string
  thumbnail?: string
  sourceShopitemId?: string
  sourceGuid?: string
  metadataCategoryPaths: string[]
  imageUrls: string[]
  categoryHandles: string[]
  variantThumbnails: string[]
  variantImageRefs: string[]
  variantCount: number
}

type CategoryDuplicateRaw = {
  parent_category_id: string
  normalized_name: string
  duplicate_count: number | string
  handles: unknown
}

type CategoryHandleDuplicateRaw = {
  base_handle: string
  duplicate_count: number | string
  handles: unknown
}

type ProductSourceDuplicateRaw = {
  source_id: string
  duplicate_count: number | string
  handles: unknown
}

type DuplicateImageRaw = {
  source_shopitem_id: string | null
  handle: string
  canonical_url: string
  duplicate_count: number | string
}

type ScriptOptions = {
  xmlPath: string
  outputDir: string
  sampleSize: number
  sourceId?: string
}

type RawScriptOptions = {
  outputDirArg?: string
  sampleSize: number
  sourceId?: string
  xmlPathArg?: string
}

type MismatchType =
  | "duplicate_xml_source_id"
  | "duplicate_db_source_id"
  | "handle_mismatch"
  | "title_mismatch"
  | "guid_mismatch"
  | "metadata_category_paths_mismatch"
  | "missing_db_category_links"
  | "image_count_mismatch"
  | "image_urls_missing_in_db"
  | "image_urls_extra_in_db"
  | "image_query_only_mismatch"
  | "missing_source_shopitem_id_on_db_product"

type ProductMismatch = {
  sourceId: string
  productId: string
  handle: string
  types: MismatchType[]
  xml: {
    name: string
    guid?: string
    categoryPathsSeed: string[]
    categoryPathsStrict: string[]
    imageCount: number
    images: string[]
  }
  db: {
    title: string
    status: string
    sourceGuid?: string
    categoryPathCount: number
    categoryPaths: string[]
    categoryLinkCount: number
    categoryHandles: string[]
    imageCount: number
    images: string[]
  }
  deltas: {
    missingImagesByCanonical: string[]
    extraImagesByCanonical: string[]
    categoryPathsOnlyInXml: string[]
    categoryPathsOnlyInDbMetadata: string[]
  }
}

type SourceIdIndex<T> = Map<string, T[]>

type ProductComparison = {
  dbOnlySourceIds: string[]
  matchedSourceIdCount: number
  mismatches: ProductMismatch[]
  mismatchTypeCounts: Map<MismatchType, number>
  xmlOnlySourceIds: string[]
}

type CategoryPathComparison = {
  categoryPathsOnlyInDbMetadata: string[]
  categoryPathsOnlyInXml: string[]
  dbMetadataCategoryPaths: string[]
  xmlCategoryPaths: string[]
}

type ImageComparison = {
  dbImagesStrict: string[]
  extraImagesByCanonical: string[]
  missingImagesByCanonical: string[]
  xmlImagesStrict: string[]
}

type XmlCategoryPathNormalizationIssue = {
  seedPaths: string[]
  sourceId: string
  strictPaths: string[]
}

type CollectMismatchTypeInput = {
  categoryComparison: CategoryPathComparison
  dbEntries: DbProductRecord[]
  dbEntry: DbProductRecord
  sourceId: string
  xmlEntries: XmlShopItem[]
}

const DEFAULT_XML_PATHS = [
  resolve(__dirname, "seed-files/productsComplete.xml"),
] as const
const DEFAULT_OUTPUT_DIR = resolve(__dirname, "../../local/xml-db-audit")
const DEFAULT_SAMPLE_SIZE = 25

const ENTITY_MAP: Record<string, string> = {
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&nbsp;": " ",
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      const parsed = Number.parseInt(hex, 16)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replace(/&#([0-9]+);/g, (match, num) => {
      const parsed = Number.parseInt(num, 10)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replace(
      /&quot;|&apos;|&lt;|&gt;|&amp;|&nbsp;/g,
      (entity) => ENTITY_MAP[entity] ?? entity
    )
}

function normalizeText(value?: string): string | undefined {
  if (value === undefined) {
    return
  }
  const decoded = decodeXml(value).replace(/\r\n/g, "\n").trim()
  return decoded === "" ? undefined : decoded
}

function normalizeInlineText(value?: string): string | undefined {
  const normalized = normalizeText(value)
  if (normalized === undefined) {
    return
  }
  return normalized.replace(/\s+/g, " ").trim()
}

function normalizeCategoryPathSeed(path: string): string {
  return path
    .replace(/\s*>{2,}\s*/g, " > ")
    .replace(/\s*>\s*/g, " > ")
    .replace(/\s+/g, " ")
    .trim()
}

function splitCategoryPath(path: string): string[] {
  return normalizeCategoryPathSeed(path)
    .split(" > ")
    .map((part) => part.trim())
    .filter((part) => part !== "")
}

function normalizeCategoryPathStrict(path: string): string {
  return splitCategoryPath(path).join(" > ")
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

function parseAttributes(raw?: string): Record<string, string> {
  if (!raw) {
    return {}
  }

  const attributes: Record<string, string> = {}
  const regex = /([:\w-]+)\s*=\s*"([^"]*)"/g
  for (const match of raw.matchAll(regex)) {
    const key = normalizeInlineText(match[1])
    if (!key) {
      continue
    }
    attributes[key] = normalizeText(match[2]) ?? ""
  }
  return attributes
}

function extractElements(source: string, tag: string): XmlElement[] {
  const regex = new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "g")
  const result: XmlElement[] = []
  for (const match of source.matchAll(regex)) {
    result.push({
      attributes: parseAttributes(match[1]),
      inner: match[2] ?? "",
    })
  }
  return result
}

function extractFirstElementContent(
  source: string,
  tag: string
): string | undefined {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`)
  const match = source.match(regex)
  return match?.[1]
}

function extractFirstText(source: string, tag: string): string | undefined {
  return normalizeText(extractFirstElementContent(source, tag))
}

function parseCategoryPaths(source: string): {
  seedPaths: string[]
  strictPaths: string[]
} {
  const categoriesRaw = extractFirstElementContent(source, "CATEGORIES")
  if (!categoriesRaw) {
    return {
      seedPaths: [],
      strictPaths: [],
    }
  }

  const rawPaths = dedupeStrings([
    ...extractElements(categoriesRaw, "CATEGORY").map(
      (category) => normalizeInlineText(category.inner) ?? ""
    ),
    normalizeInlineText(
      extractFirstElementContent(categoriesRaw, "DEFAULT_CATEGORY")
    ),
  ])

  return {
    seedPaths: rawPaths.map((path) => normalizeCategoryPathSeed(path)),
    strictPaths: rawPaths.map((path) => normalizeCategoryPathStrict(path)),
  }
}

function parseImageUrls(source: string): string[] {
  const imagesRaw = extractFirstElementContent(source, "IMAGES")
  const variantRaw = extractFirstElementContent(source, "VARIANTS")
  const variantImageRefs = variantRaw
    ? extractElements(variantRaw, "VARIANT").map((variant) =>
        extractFirstText(variant.inner, "IMAGE_REF")
      )
    : []

  return dedupeStrings([
    ...(imagesRaw
      ? extractElements(imagesRaw, "IMAGE").map((image) =>
          normalizeText(image.inner)
        )
      : []),
    ...variantImageRefs,
    extractFirstText(source, "IMAGE_REF"),
  ])
}

function parseShopItems(xml: string): XmlShopItem[] {
  return extractElements(xml, "SHOPITEM").map((shopItem) => {
    const categories = parseCategoryPaths(shopItem.inner)
    return {
      id: shopItem.attributes.id ?? "",
      name: extractFirstText(shopItem.inner, "NAME") ?? "",
      guid: extractFirstText(shopItem.inner, "GUID"),
      categoryPathsSeed: categories.seedPaths,
      categoryPathsStrict: categories.strictPaths,
      images: parseImageUrls(shopItem.inner),
    }
  })
}

function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return fallback
}

function parseJsonLikeString(value: string): string[] | undefined {
  if (
    !(
      (value.startsWith("[") && value.endsWith("]")) ||
      (value.startsWith("{") && value.endsWith("}"))
    )
  ) {
    return
  }

  try {
    return toStringArray(JSON.parse(value))
  } catch {
    return [value]
  }
}

function parseSerializedStringArray(value: object): string[] {
  try {
    const parsed = JSON.parse(JSON.stringify(value))
    return Array.isArray(parsed) ? toStringArray(parsed) : []
  } catch {
    return []
  }
}

function toStringArray(value: unknown): string[] {
  if (value === null || value === undefined) {
    return []
  }

  if (Array.isArray(value)) {
    return dedupeStrings(
      value.map((entry) =>
        typeof entry === "string" ? normalizeText(entry) : undefined
      )
    )
  }

  if (typeof value === "string") {
    const normalized = normalizeText(value)
    if (!normalized) {
      return []
    }

    const parsed = parseJsonLikeString(normalized)
    if (parsed) {
      return parsed
    }

    return [normalized]
  }

  if (typeof value === "object") {
    return parseSerializedStringArray(value)
  }

  return []
}

function normalizeTitle(value?: string): string {
  return (
    normalizeInlineText(value)
      ?.normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase() ?? ""
  )
}

function normalizeUrlForStrictCompare(url: string): string {
  return normalizeInlineText(url) ?? ""
}

function normalizeUrlForCanonicalCompare(url: string): string {
  const normalized = normalizeInlineText(url) ?? ""
  return normalized.replace(CANONICAL_URL_QUERY_REGEX, "")
}

function diffSets(reference: string[], compared: string[]): string[] {
  const comparedSet = new Set(compared)
  return reference.filter((entry) => !comparedSet.has(entry))
}

function sortStrings(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b))
}

function stringifyCsvCell(value: string | number): string {
  const asString = String(value)
  if (
    asString.includes(",") ||
    asString.includes('"') ||
    asString.includes("\n")
  ) {
    return `"${asString.replaceAll('"', '""')}"`
  }
  return asString
}

function buildCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) {
    return ""
  }

  const firstRow = rows[0]
  if (!firstRow) {
    return ""
  }

  const headers = Object.keys(firstRow)
  const lines = [
    headers.map((header) => stringifyCsvCell(header)).join(","),
    ...rows.map((row) =>
      headers.map((header) => stringifyCsvCell(row[header] ?? "")).join(",")
    ),
  ]

  return `${lines.join("\n")}\n`
}

function parseSampleSize(value: string, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback
}

function collectRawOptions(args?: string[]): RawScriptOptions {
  const options: RawScriptOptions = {
    sampleSize: DEFAULT_SAMPLE_SIZE,
  }

  for (const arg of args ?? []) {
    if (!(arg.startsWith("--") || options.xmlPathArg)) {
      options.xmlPathArg = arg
    } else if (arg.startsWith("--xml=")) {
      options.xmlPathArg = arg.slice("--xml=".length)
    } else if (arg.startsWith("--output=")) {
      options.outputDirArg = arg.slice("--output=".length)
    } else if (arg.startsWith("--sample=")) {
      options.sampleSize = parseSampleSize(
        arg.slice("--sample=".length),
        options.sampleSize
      )
    } else if (arg.startsWith("--source-id=")) {
      const parsedSource = normalizeInlineText(arg.slice("--source-id=".length))
      options.sourceId = parsedSource || undefined
    }
  }

  return options
}

function resolveXmlPath(xmlPathArg?: string): string {
  const xmlPathCandidate = normalizeInlineText(xmlPathArg)
  let resolvedXmlPath = DEFAULT_XML_PATHS.find((path) => existsSync(path))
  if (xmlPathCandidate) {
    resolvedXmlPath =
      isHttpXmlSource(xmlPathCandidate) || isAbsolute(xmlPathCandidate)
        ? xmlPathCandidate
        : resolve(process.cwd(), xmlPathCandidate)
  }

  if (!resolvedXmlPath) {
    throw new Error(
      `Could not find XML feed. Checked: ${DEFAULT_XML_PATHS.join(", ")}`
    )
  }
  if (!(isHttpXmlSource(resolvedXmlPath) || existsSync(resolvedXmlPath))) {
    throw new Error(`XML feed does not exist at path: ${resolvedXmlPath}`)
  }

  return resolvedXmlPath
}

function resolveOutputDir(outputDirArg?: string): string {
  const outputCandidate = normalizeInlineText(outputDirArg)
  if (!outputCandidate) {
    return DEFAULT_OUTPUT_DIR
  }

  return isAbsolute(outputCandidate)
    ? outputCandidate
    : resolve(process.cwd(), outputCandidate)
}

function parseOptions(args?: string[]): ScriptOptions {
  const rawOptions = collectRawOptions(args)

  return {
    xmlPath: resolveXmlPath(rawOptions.xmlPathArg),
    outputDir: resolveOutputDir(rawOptions.outputDirArg),
    sampleSize: rawOptions.sampleSize,
    sourceId: rawOptions.sourceId,
  }
}

async function loadDbProducts(): Promise<DbProductRecord[]> {
  const rows = await sqlRaw<DbProductRaw>(sql`
    SELECT
      p.id AS product_id,
      p.handle,
      p.title,
      p.status,
      p.thumbnail,
      p.metadata ->> 'source_shopitem_id' AS source_shopitem_id,
      p.metadata ->> 'source_guid' AS source_guid,
      p.metadata -> 'category_paths' AS metadata_category_paths,
      COALESCE(
        jsonb_agg(DISTINCT i.url) FILTER (WHERE i.url IS NOT NULL),
        '[]'::jsonb
      ) AS image_urls,
      COALESCE(
        jsonb_agg(DISTINCT c.handle) FILTER (WHERE c.handle IS NOT NULL),
        '[]'::jsonb
      ) AS category_handles,
      COALESCE(
        jsonb_agg(DISTINCT v.thumbnail) FILTER (WHERE v.thumbnail IS NOT NULL),
        '[]'::jsonb
      ) AS variant_thumbnails,
      COALESCE(
        jsonb_agg(DISTINCT v.metadata ->> 'image_ref')
          FILTER (
            WHERE v.metadata ? 'image_ref'
            AND v.metadata ->> 'image_ref' IS NOT NULL
          ),
        '[]'::jsonb
      ) AS variant_image_refs,
      COUNT(DISTINCT v.id) FILTER (WHERE v.id IS NOT NULL) AS variant_count
    FROM product p
    LEFT JOIN image i
      ON i.product_id = p.id
      AND i.deleted_at IS NULL
    LEFT JOIN product_category_product pcp
      ON pcp.product_id = p.id
    LEFT JOIN product_category c
      ON c.id = pcp.product_category_id
      AND c.deleted_at IS NULL
    LEFT JOIN product_variant v
      ON v.product_id = p.id
      AND v.deleted_at IS NULL
    WHERE p.deleted_at IS NULL
      AND (
        p.metadata ? 'source_shopitem_id'
        OR p.handle LIKE 'shopitem-%'
      )
    GROUP BY p.id
  `)

  return rows.map((row) => ({
    productId: row.product_id,
    handle: row.handle,
    title: row.title,
    status: row.status,
    thumbnail: normalizeText(row.thumbnail ?? undefined),
    sourceShopitemId: normalizeInlineText(row.source_shopitem_id ?? undefined),
    sourceGuid: normalizeInlineText(row.source_guid ?? undefined),
    metadataCategoryPaths: toStringArray(row.metadata_category_paths).map((p) =>
      normalizeCategoryPathSeed(p)
    ),
    imageUrls: toStringArray(row.image_urls),
    categoryHandles: toStringArray(row.category_handles),
    variantThumbnails: toStringArray(row.variant_thumbnails),
    variantImageRefs: toStringArray(row.variant_image_refs),
    variantCount: parseNumber(row.variant_count, 0),
  }))
}

async function loadCategoryNameDuplicates() {
  const rows = await sqlRaw<CategoryDuplicateRaw>(sql`
    SELECT
      COALESCE(parent_category_id, 'ROOT') AS parent_category_id,
      LOWER(TRIM(name)) AS normalized_name,
      COUNT(*) AS duplicate_count,
      jsonb_agg(handle ORDER BY handle) AS handles
    FROM product_category
    WHERE deleted_at IS NULL
    GROUP BY 1, 2
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC, normalized_name ASC
  `)

  return rows.map((row) => ({
    parentCategoryId: row.parent_category_id,
    normalizedName: row.normalized_name,
    duplicateCount: parseNumber(row.duplicate_count, 0),
    handles: toStringArray(row.handles),
  }))
}

async function loadCategoryHandleDuplicates() {
  const rows = await sqlRaw<CategoryHandleDuplicateRaw>(sql`
    SELECT
      REGEXP_REPLACE(handle, '-[0-9]+$', '') AS base_handle,
      COUNT(*) AS duplicate_count,
      jsonb_agg(handle ORDER BY handle) AS handles
    FROM product_category
    WHERE deleted_at IS NULL
    GROUP BY 1
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC, base_handle ASC
  `)

  return rows.map((row) => ({
    baseHandle: row.base_handle,
    duplicateCount: parseNumber(row.duplicate_count, 0),
    handles: toStringArray(row.handles),
  }))
}

async function loadProductSourceDuplicates() {
  const rows = await sqlRaw<ProductSourceDuplicateRaw>(sql`
    SELECT
      p.metadata ->> 'source_shopitem_id' AS source_id,
      COUNT(*) AS duplicate_count,
      jsonb_agg(p.handle ORDER BY p.handle) AS handles
    FROM product p
    WHERE p.deleted_at IS NULL
      AND p.metadata ? 'source_shopitem_id'
    GROUP BY 1
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC, source_id ASC
  `)

  return rows.map((row) => ({
    sourceId: row.source_id,
    duplicateCount: parseNumber(row.duplicate_count, 0),
    handles: toStringArray(row.handles),
  }))
}

async function loadDuplicateImageRows() {
  const rows = await sqlRaw<DuplicateImageRaw>(sql`
    SELECT
      p.metadata ->> 'source_shopitem_id' AS source_shopitem_id,
      p.handle,
      REGEXP_REPLACE(i.url, '\\?.*$', '') AS canonical_url,
      COUNT(*) AS duplicate_count
    FROM image i
    JOIN product p ON p.id = i.product_id
    WHERE i.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND p.metadata ? 'source_shopitem_id'
    GROUP BY 1, 2, 3
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC, p.handle ASC
  `)

  return rows.map((row) => ({
    sourceId: normalizeInlineText(row.source_shopitem_id ?? undefined),
    handle: row.handle,
    canonicalUrl: row.canonical_url,
    duplicateCount: parseNumber(row.duplicate_count, 0),
  }))
}

function takeSample<T>(items: T[], sampleSize: number): T[] {
  return items.slice(0, sampleSize)
}

function writeJson(filePath: string, value: unknown) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

async function loadXmlItems(xmlPath: string): Promise<XmlShopItem[]> {
  const xml = await readXmlSource(xmlPath)
  return parseShopItems(xml).filter((item) => item.id !== "")
}

function addToSourceIdIndex<T>(
  index: SourceIdIndex<T>,
  sourceId: string,
  value: T
) {
  if (!index.has(sourceId)) {
    index.set(sourceId, [])
  }
  index.get(sourceId)?.push(value)
}

function indexXmlItems(xmlItems: XmlShopItem[]): SourceIdIndex<XmlShopItem> {
  const xmlBySourceId = new Map<string, XmlShopItem[]>()
  for (const item of xmlItems) {
    addToSourceIdIndex(xmlBySourceId, item.id, item)
  }
  return xmlBySourceId
}

function indexDbProducts(dbProducts: DbProductRecord[]): {
  dbBySourceId: SourceIdIndex<DbProductRecord>
  dbMissingSourceId: DbProductRecord[]
} {
  const dbBySourceId = new Map<string, DbProductRecord[]>()
  const dbMissingSourceId = dbProducts.filter(
    (product) => !product.sourceShopitemId
  )
  for (const product of dbProducts) {
    if (!product.sourceShopitemId) {
      continue
    }
    addToSourceIdIndex(dbBySourceId, product.sourceShopitemId, product)
  }
  return { dbBySourceId, dbMissingSourceId }
}

function collectSourceIds(
  xmlBySourceId: SourceIdIndex<XmlShopItem>,
  dbBySourceId: SourceIdIndex<DbProductRecord>,
  sourceIdFilter?: string
): string[] {
  return sortStrings(
    [...new Set([...xmlBySourceId.keys(), ...dbBySourceId.keys()])]
      .filter((sourceId) => sourceId !== "")
      .filter((sourceId) =>
        sourceIdFilter ? sourceId === sourceIdFilter : true
      )
  )
}

function noteMismatchType(
  mismatchTypeCounts: Map<MismatchType, number>,
  type: MismatchType
) {
  mismatchTypeCounts.set(type, (mismatchTypeCounts.get(type) ?? 0) + 1)
}

function compareCategoryPaths(
  xmlEntry: XmlShopItem,
  dbEntry: DbProductRecord
): CategoryPathComparison {
  const xmlCategoryPaths = sortStrings(
    dedupeStrings(xmlEntry.categoryPathsSeed.map((path) => path))
  )
  const dbMetadataCategoryPaths = sortStrings(
    dedupeStrings(dbEntry.metadataCategoryPaths.map((path) => path))
  )

  return {
    categoryPathsOnlyInXml: diffSets(xmlCategoryPaths, dbMetadataCategoryPaths),
    categoryPathsOnlyInDbMetadata: diffSets(
      dbMetadataCategoryPaths,
      xmlCategoryPaths
    ),
    dbMetadataCategoryPaths,
    xmlCategoryPaths,
  }
}

function compareImages(
  xmlEntry: XmlShopItem,
  dbEntry: DbProductRecord
): ImageComparison {
  const xmlImagesStrict = sortStrings(
    dedupeStrings(
      xmlEntry.images.map((url) => normalizeUrlForStrictCompare(url))
    )
  )
  const xmlImagesCanonical = sortStrings(
    dedupeStrings(
      xmlEntry.images.map((url) => normalizeUrlForCanonicalCompare(url))
    )
  )
  const dbGalleryImages = dedupeStrings([
    dbEntry.thumbnail,
    ...dbEntry.imageUrls,
    ...dbEntry.variantThumbnails,
    ...dbEntry.variantImageRefs,
  ])
  const dbImagesStrict = sortStrings(
    dedupeStrings(
      dbGalleryImages.map((url) => normalizeUrlForStrictCompare(url))
    )
  )
  const dbImagesCanonical = sortStrings(
    dedupeStrings(
      dbGalleryImages.map((url) => normalizeUrlForCanonicalCompare(url))
    )
  )

  return {
    dbImagesStrict,
    extraImagesByCanonical: diffSets(dbImagesCanonical, xmlImagesCanonical),
    missingImagesByCanonical: diffSets(xmlImagesCanonical, dbImagesCanonical),
    xmlImagesStrict,
  }
}

function collectMismatchTypes({
  categoryComparison,
  dbEntries,
  dbEntry,
  sourceId,
  xmlEntries,
}: CollectMismatchTypeInput): MismatchType[] {
  const mismatchTypes: MismatchType[] = []
  const expectedHandle = `shopitem-${sourceId}`

  if (xmlEntries.length > 1) {
    mismatchTypes.push("duplicate_xml_source_id")
  }
  if (dbEntries.length > 1) {
    mismatchTypes.push("duplicate_db_source_id")
  }
  if (dbEntry.handle !== expectedHandle) {
    mismatchTypes.push("handle_mismatch")
  }
  if (
    categoryComparison.xmlCategoryPaths.length > 0 &&
    dbEntry.categoryHandles.length === 0
  ) {
    mismatchTypes.push("missing_db_category_links")
  }

  return mismatchTypes
}

function addTextAndMetadataMismatchTypes(
  mismatchTypes: MismatchType[],
  xmlEntry: XmlShopItem,
  dbEntry: DbProductRecord,
  categoryComparison: CategoryPathComparison
) {
  if (normalizeTitle(xmlEntry.name) !== normalizeTitle(dbEntry.title)) {
    mismatchTypes.push("title_mismatch")
  }
  if (
    xmlEntry.guid &&
    dbEntry.sourceGuid &&
    normalizeInlineText(xmlEntry.guid) !==
      normalizeInlineText(dbEntry.sourceGuid)
  ) {
    mismatchTypes.push("guid_mismatch")
  }
  if (
    categoryComparison.categoryPathsOnlyInXml.length > 0 ||
    categoryComparison.categoryPathsOnlyInDbMetadata.length > 0
  ) {
    mismatchTypes.push("metadata_category_paths_mismatch")
  }
}

function addImageMismatchTypes(
  mismatchTypes: MismatchType[],
  imageComparison: ImageComparison
) {
  if (
    imageComparison.xmlImagesStrict.length !==
    imageComparison.dbImagesStrict.length
  ) {
    mismatchTypes.push("image_count_mismatch")
  }
  if (imageComparison.missingImagesByCanonical.length > 0) {
    mismatchTypes.push("image_urls_missing_in_db")
  }
  if (imageComparison.extraImagesByCanonical.length > 0) {
    mismatchTypes.push("image_urls_extra_in_db")
  }
  if (
    imageComparison.missingImagesByCanonical.length === 0 &&
    imageComparison.extraImagesByCanonical.length === 0 &&
    (diffSets(imageComparison.xmlImagesStrict, imageComparison.dbImagesStrict)
      .length > 0 ||
      diffSets(imageComparison.dbImagesStrict, imageComparison.xmlImagesStrict)
        .length > 0)
  ) {
    mismatchTypes.push("image_query_only_mismatch")
  }
}

function buildProductMismatch(
  sourceId: string,
  xmlEntries: XmlShopItem[],
  dbEntries: DbProductRecord[],
  dbEntry: DbProductRecord
): ProductMismatch | undefined {
  const xmlEntry = xmlEntries[0]
  if (!xmlEntry) {
    return
  }

  const categoryComparison = compareCategoryPaths(xmlEntry, dbEntry)
  const imageComparison = compareImages(xmlEntry, dbEntry)
  const mismatchTypes = collectMismatchTypes({
    categoryComparison,
    dbEntries,
    dbEntry,
    sourceId,
    xmlEntries,
  })
  addTextAndMetadataMismatchTypes(
    mismatchTypes,
    xmlEntry,
    dbEntry,
    categoryComparison
  )
  addImageMismatchTypes(mismatchTypes, imageComparison)

  if (mismatchTypes.length === 0) {
    return
  }

  return {
    sourceId,
    productId: dbEntry.productId,
    handle: dbEntry.handle,
    types: mismatchTypes,
    xml: {
      name: xmlEntry.name,
      guid: xmlEntry.guid,
      categoryPathsSeed: xmlEntry.categoryPathsSeed,
      categoryPathsStrict: xmlEntry.categoryPathsStrict,
      imageCount: imageComparison.xmlImagesStrict.length,
      images: imageComparison.xmlImagesStrict,
    },
    db: {
      title: dbEntry.title,
      status: dbEntry.status,
      sourceGuid: dbEntry.sourceGuid,
      categoryPathCount: categoryComparison.dbMetadataCategoryPaths.length,
      categoryPaths: categoryComparison.dbMetadataCategoryPaths,
      categoryLinkCount: dbEntry.categoryHandles.length,
      categoryHandles: sortStrings(dbEntry.categoryHandles),
      imageCount: imageComparison.dbImagesStrict.length,
      images: imageComparison.dbImagesStrict,
    },
    deltas: {
      missingImagesByCanonical: imageComparison.missingImagesByCanonical,
      extraImagesByCanonical: imageComparison.extraImagesByCanonical,
      categoryPathsOnlyInXml: categoryComparison.categoryPathsOnlyInXml,
      categoryPathsOnlyInDbMetadata:
        categoryComparison.categoryPathsOnlyInDbMetadata,
    },
  }
}

function compareProducts(
  allSourceIds: string[],
  xmlBySourceId: SourceIdIndex<XmlShopItem>,
  dbBySourceId: SourceIdIndex<DbProductRecord>
): ProductComparison {
  const result: ProductComparison = {
    dbOnlySourceIds: [],
    matchedSourceIdCount: 0,
    mismatches: [],
    mismatchTypeCounts: new Map<MismatchType, number>(),
    xmlOnlySourceIds: [],
  }

  for (const sourceId of allSourceIds) {
    const xmlEntries = xmlBySourceId.get(sourceId) ?? []
    const dbEntries = dbBySourceId.get(sourceId) ?? []

    if (xmlEntries.length === 0) {
      result.dbOnlySourceIds.push(sourceId)
      continue
    }
    if (dbEntries.length === 0) {
      result.xmlOnlySourceIds.push(sourceId)
      continue
    }

    result.matchedSourceIdCount += 1

    for (const dbEntry of dbEntries) {
      const mismatch = buildProductMismatch(
        sourceId,
        xmlEntries,
        dbEntries,
        dbEntry
      )
      if (!mismatch) {
        continue
      }

      for (const mismatchType of mismatch.types) {
        noteMismatchType(result.mismatchTypeCounts, mismatchType)
      }
      result.mismatches.push(mismatch)
    }
  }

  return result
}

function findXmlCategoryPathNormalizationIssues(
  xmlItems: XmlShopItem[]
): XmlCategoryPathNormalizationIssue[] {
  return xmlItems
    .filter((item) =>
      item.categoryPathsSeed.some((seedPath, index) => {
        const strictPath = item.categoryPathsStrict[index]
        return seedPath !== strictPath
      })
    )
    .map((item) => ({
      sourceId: item.id,
      seedPaths: item.categoryPathsSeed,
      strictPaths: item.categoryPathsStrict,
    }))
}

async function loadDuplicateReports() {
  const [
    categoryNameDuplicates,
    categoryHandleDuplicates,
    dbProductSourceDuplicates,
    duplicateImageRows,
  ] = await Promise.all([
    loadCategoryNameDuplicates(),
    loadCategoryHandleDuplicates(),
    loadProductSourceDuplicates(),
    loadDuplicateImageRows(),
  ])

  return {
    categoryNameDuplicates,
    categoryHandleDuplicates,
    dbProductSourceDuplicates,
    duplicateImageRows,
  }
}

function buildMismatchCsvRows(mismatches: ProductMismatch[]) {
  return mismatches.map((mismatch) => ({
    source_id: mismatch.sourceId,
    product_id: mismatch.productId,
    handle: mismatch.handle,
    mismatch_types: mismatch.types.join("|"),
    xml_name: mismatch.xml.name,
    db_title: mismatch.db.title,
    xml_images: mismatch.xml.imageCount,
    db_images: mismatch.db.imageCount,
    missing_images: mismatch.deltas.missingImagesByCanonical.length,
    extra_images: mismatch.deltas.extraImagesByCanonical.length,
    xml_category_paths: mismatch.xml.categoryPathsSeed.length,
    db_metadata_category_paths: mismatch.db.categoryPathCount,
    db_linked_categories: mismatch.db.categoryLinkCount,
  }))
}

function buildSummary({
  allSourceIds,
  comparison,
  dbBySourceId,
  dbMissingSourceId,
  dbProducts,
  duplicateReports,
  options,
  xmlBySourceId,
  xmlCategoryPathNormalizationIssues,
  xmlItems,
}: {
  allSourceIds: string[]
  comparison: ProductComparison
  dbBySourceId: SourceIdIndex<DbProductRecord>
  dbMissingSourceId: DbProductRecord[]
  dbProducts: DbProductRecord[]
  duplicateReports: Awaited<ReturnType<typeof loadDuplicateReports>>
  options: ScriptOptions
  xmlBySourceId: SourceIdIndex<XmlShopItem>
  xmlCategoryPathNormalizationIssues: XmlCategoryPathNormalizationIssue[]
  xmlItems: XmlShopItem[]
}) {
  return {
    generatedAt: new Date().toISOString(),
    xmlPath: options.xmlPath,
    outputDir: options.outputDir,
    filters: {
      sourceId: options.sourceId ?? null,
      sampleSize: options.sampleSize,
    },
    totals: {
      xmlShopItems: xmlItems.length,
      xmlUniqueSourceIds: xmlBySourceId.size,
      dbProductsCompared: dbProducts.length,
      dbProductsMissingSourceId: dbMissingSourceId.length,
      dbUniqueSourceIds: dbBySourceId.size,
      sourceIdsCompared: allSourceIds.length,
      matchedSourceIds: comparison.matchedSourceIdCount,
      xmlOnlySourceIds: comparison.xmlOnlySourceIds.length,
      dbOnlySourceIds: comparison.dbOnlySourceIds.length,
      mismatchRows: comparison.mismatches.length,
      sourceIdsWithAnyMismatch: new Set(
        comparison.mismatches.map((m) => m.sourceId)
      ).size,
    },
    mismatchTypeCounts: Object.fromEntries(
      [...comparison.mismatchTypeCounts.entries()].sort(([a], [b]) =>
        a.localeCompare(b)
      )
    ),
    redundancy: {
      duplicateXmlSourceIds: [...xmlBySourceId.entries()]
        .filter(([, entries]) => entries.length > 1)
        .map(([sourceId, entries]) => ({
          sourceId,
          count: entries.length,
        })),
      duplicateDbSourceIds: duplicateReports.dbProductSourceDuplicates,
      categoryNameDuplicates: duplicateReports.categoryNameDuplicates.length,
      categoryHandleSuffixDuplicates:
        duplicateReports.categoryHandleDuplicates.length,
      duplicateImageRows: duplicateReports.duplicateImageRows.length,
    },
    potentialMappingRisks: {
      xmlCategoryPathNormalizationIssues:
        xmlCategoryPathNormalizationIssues.length,
    },
    sample: {
      xmlOnlySourceIds: takeSample(
        comparison.xmlOnlySourceIds,
        options.sampleSize
      ),
      dbOnlySourceIds: takeSample(
        comparison.dbOnlySourceIds,
        options.sampleSize
      ),
      mismatches: takeSample(comparison.mismatches, options.sampleSize),
      productsMissingSourceId: takeSample(
        dbMissingSourceId.map((product) => ({
          productId: product.productId,
          handle: product.handle,
          title: product.title,
        })),
        options.sampleSize
      ),
      xmlCategoryPathNormalizationIssues: takeSample(
        xmlCategoryPathNormalizationIssues,
        options.sampleSize
      ),
      duplicateDbSourceIds: takeSample(
        duplicateReports.dbProductSourceDuplicates,
        options.sampleSize
      ),
      categoryNameDuplicates: takeSample(
        duplicateReports.categoryNameDuplicates,
        options.sampleSize
      ),
      categoryHandleSuffixDuplicates: takeSample(
        duplicateReports.categoryHandleDuplicates,
        options.sampleSize
      ),
      duplicateImageRows: takeSample(
        duplicateReports.duplicateImageRows,
        options.sampleSize
      ),
    },
  }
}

function writeAuditReports({
  comparison,
  dbMissingSourceId,
  duplicateReports,
  options,
  summary,
  xmlCategoryPathNormalizationIssues,
}: {
  comparison: ProductComparison
  dbMissingSourceId: DbProductRecord[]
  duplicateReports: Awaited<ReturnType<typeof loadDuplicateReports>>
  options: ScriptOptions
  summary: ReturnType<typeof buildSummary>
  xmlCategoryPathNormalizationIssues: XmlCategoryPathNormalizationIssue[]
}) {
  mkdirSync(options.outputDir, { recursive: true })
  writeJson(resolve(options.outputDir, "summary.json"), summary)
  writeJson(
    resolve(options.outputDir, "mismatches.json"),
    comparison.mismatches
  )
  writeJson(
    resolve(options.outputDir, "xml-only-source-ids.json"),
    comparison.xmlOnlySourceIds
  )
  writeJson(
    resolve(options.outputDir, "db-only-source-ids.json"),
    comparison.dbOnlySourceIds
  )
  writeJson(
    resolve(options.outputDir, "products-missing-source-id.json"),
    dbMissingSourceId.map((product) => ({
      productId: product.productId,
      handle: product.handle,
      title: product.title,
      status: product.status,
    }))
  )
  writeJson(
    resolve(options.outputDir, "category-path-normalization-issues.json"),
    xmlCategoryPathNormalizationIssues
  )
  writeJson(resolve(options.outputDir, "redundancy.json"), {
    duplicateDbSourceIds: duplicateReports.dbProductSourceDuplicates,
    categoryNameDuplicates: duplicateReports.categoryNameDuplicates,
    categoryHandleSuffixDuplicates: duplicateReports.categoryHandleDuplicates,
    duplicateImageRows: duplicateReports.duplicateImageRows,
  })
  writeFileSync(
    resolve(options.outputDir, "mismatches.csv"),
    buildCsv(buildMismatchCsvRows(comparison.mismatches)),
    "utf8"
  )
}

export default async function auditXmlVsDb({ container, args }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const options = parseOptions(args)

  logger.info("Starting XML vs DB audit...")
  logger.info(`Using XML feed: ${options.xmlPath}`)
  logger.info(`Output directory: ${options.outputDir}`)

  const xmlItems = await loadXmlItems(options.xmlPath)
  const xmlBySourceId = indexXmlItems(xmlItems)
  const dbProducts = await loadDbProducts()
  const { dbBySourceId, dbMissingSourceId } = indexDbProducts(dbProducts)
  const allSourceIds = collectSourceIds(
    xmlBySourceId,
    dbBySourceId,
    options.sourceId
  )
  const comparison = compareProducts(allSourceIds, xmlBySourceId, dbBySourceId)

  if (dbMissingSourceId.length > 0) {
    noteMismatchType(
      comparison.mismatchTypeCounts,
      "missing_source_shopitem_id_on_db_product"
    )
  }

  const xmlCategoryPathNormalizationIssues =
    findXmlCategoryPathNormalizationIssues(xmlItems)
  const duplicateReports = await loadDuplicateReports()
  const summary = buildSummary({
    allSourceIds,
    comparison,
    dbBySourceId,
    dbMissingSourceId,
    dbProducts,
    duplicateReports,
    options,
    xmlBySourceId,
    xmlCategoryPathNormalizationIssues,
    xmlItems,
  })
  writeAuditReports({
    comparison,
    dbMissingSourceId,
    duplicateReports,
    options,
    summary,
    xmlCategoryPathNormalizationIssues,
  })

  logger.info(
    `Audit completed. Compared source IDs: ${allSourceIds.length}, mismatches: ${comparison.mismatches.length}`
  )
  logger.info(`Reports written to: ${options.outputDir}`)
  logger.info(`Summary file: ${resolve(options.outputDir, "summary.json")}`)
}

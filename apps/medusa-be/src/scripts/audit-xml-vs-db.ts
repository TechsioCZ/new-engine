import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import type { ExecArgs, Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { sql } from "drizzle-orm"

import { sqlRaw } from "../utils/db"
import { isHttpXmlSource, readXmlSource } from "./herbatica-xml-utils"

const CATEGORY_DUPLICATE_ROW = "category duplicate"
const DUPLICATE_IMAGE_ROW = "duplicate image"
const PRODUCT_AUDIT_ROW = "product audit"
const DUPLICATE_COUNT_FIELD = "duplicate_count"
const SOURCE_SHOPITEM_ID_FIELD = "source_shopitem_id"
const CANONICAL_URL_QUERY_REGEX = /\?.*$/u
const MEDUSA_ROOT = existsSync(path.resolve(process.cwd(), "src/scripts"))
  ? process.cwd()
  : path.resolve(process.cwd(), "apps/medusa-be")

interface XmlElement {
  attributes: Record<string, string>
  inner: string
}

interface XmlShopItem {
  id: string
  name: string
  guid?: string | undefined
  categoryPathsSeed: string[]
  categoryPathsStrict: string[]
  images: string[]
}

interface DbProductRaw {
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

interface DbProductRecord {
  productId: string
  handle: string
  title: string
  status: string
  thumbnail?: string | undefined
  sourceShopitemId?: string | undefined
  sourceGuid?: string | undefined
  metadataCategoryPaths: string[]
  imageUrls: string[]
  categoryHandles: string[]
  variantThumbnails: string[]
  variantImageRefs: string[]
  variantCount: number
}

interface CategoryDuplicateRaw {
  parent_category_id: string
  normalized_name: string
  duplicate_count: number | string
  handles: unknown
}

interface CategoryHandleDuplicateRaw {
  base_handle: string
  duplicate_count: number | string
  handles: unknown
}

interface ProductSourceDuplicateRaw {
  source_id: string
  duplicate_count: number | string
  handles: unknown
}

interface DuplicateImageRaw {
  source_shopitem_id: string | null
  handle: string
  canonical_url: string
  duplicate_count: number | string
}

const invalidDatabaseRow = (
  rowName: string,
  index: number,
  key: string,
): never => {
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `${rowName} row ${index} has invalid ${key}`,
  )
}

const getRequiredString = (
  row: Readonly<Record<string, unknown>>,
  key: string,
  rowName: string,
  index: number,
): string => {
  const value = row[key]
  return typeof value === "string"
    ? value
    : invalidDatabaseRow(rowName, index, key)
}

const getNullableString = (
  row: Readonly<Record<string, unknown>>,
  key: string,
  rowName: string,
  index: number,
): string | null => {
  const value = row[key]
  return value === null || typeof value === "string"
    ? value
    : invalidDatabaseRow(rowName, index, key)
}

const getCount = (
  row: Readonly<Record<string, unknown>>,
  key: string,
  rowName: string,
  index: number,
): number | string => {
  const value = row[key]
  return typeof value === "number" || typeof value === "string"
    ? value
    : invalidDatabaseRow(rowName, index, key)
}

const decodeDbProductRaw = (
  row: Readonly<Record<string, unknown>>,
  index: number,
): DbProductRaw => ({
  category_handles: row["category_handles"],
  handle: getRequiredString(row, "handle", PRODUCT_AUDIT_ROW, index),
  image_urls: row["image_urls"],
  metadata_category_paths: row["metadata_category_paths"],
  product_id: getRequiredString(row, "product_id", PRODUCT_AUDIT_ROW, index),
  source_guid: getNullableString(row, "source_guid", PRODUCT_AUDIT_ROW, index),
  source_shopitem_id: getNullableString(
    row,
    SOURCE_SHOPITEM_ID_FIELD,
    PRODUCT_AUDIT_ROW,
    index,
  ),
  status: getRequiredString(row, "status", PRODUCT_AUDIT_ROW, index),
  thumbnail: getNullableString(row, "thumbnail", PRODUCT_AUDIT_ROW, index),
  title: getRequiredString(row, "title", PRODUCT_AUDIT_ROW, index),
  variant_count:
    row["variant_count"] === null
      ? null
      : getCount(row, "variant_count", PRODUCT_AUDIT_ROW, index),
  variant_image_refs: row["variant_image_refs"],
  variant_thumbnails: row["variant_thumbnails"],
})

const decodeCategoryDuplicateRaw = (
  row: Readonly<Record<string, unknown>>,
  index: number,
): CategoryDuplicateRaw => ({
  duplicate_count: getCount(
    row,
    DUPLICATE_COUNT_FIELD,
    CATEGORY_DUPLICATE_ROW,
    index,
  ),
  handles: row["handles"],
  normalized_name: getRequiredString(
    row,
    "normalized_name",
    CATEGORY_DUPLICATE_ROW,
    index,
  ),
  parent_category_id: getRequiredString(
    row,
    "parent_category_id",
    CATEGORY_DUPLICATE_ROW,
    index,
  ),
})

const decodeCategoryHandleDuplicateRaw = (
  row: Readonly<Record<string, unknown>>,
  index: number,
): CategoryHandleDuplicateRaw => ({
  base_handle: getRequiredString(
    row,
    "base_handle",
    "category handle duplicate",
    index,
  ),
  duplicate_count: getCount(
    row,
    DUPLICATE_COUNT_FIELD,
    "category handle duplicate",
    index,
  ),
  handles: row["handles"],
})

const decodeProductSourceDuplicateRaw = (
  row: Readonly<Record<string, unknown>>,
  index: number,
): ProductSourceDuplicateRaw => ({
  duplicate_count: getCount(
    row,
    DUPLICATE_COUNT_FIELD,
    "product source duplicate",
    index,
  ),
  handles: row["handles"],
  source_id: getRequiredString(
    row,
    "source_id",
    "product source duplicate",
    index,
  ),
})

const decodeDuplicateImageRaw = (
  row: Readonly<Record<string, unknown>>,
  index: number,
): DuplicateImageRaw => ({
  canonical_url: getRequiredString(
    row,
    "canonical_url",
    DUPLICATE_IMAGE_ROW,
    index,
  ),
  duplicate_count: getCount(
    row,
    DUPLICATE_COUNT_FIELD,
    DUPLICATE_IMAGE_ROW,
    index,
  ),
  handle: getRequiredString(row, "handle", DUPLICATE_IMAGE_ROW, index),
  source_shopitem_id: getNullableString(
    row,
    SOURCE_SHOPITEM_ID_FIELD,
    DUPLICATE_IMAGE_ROW,
    index,
  ),
})

interface ScriptOptions {
  xmlPath: string
  outputDir: string
  sampleSize: number
  sourceId?: string | undefined
}

interface RawScriptOptions {
  outputDirArg?: string | undefined
  sampleSize: number
  sourceId?: string | undefined
  xmlPathArg?: string | undefined
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

interface ProductMismatch {
  sourceId: string
  productId: string
  handle: string
  types: MismatchType[]
  xml: {
    name: string
    guid?: string | undefined
    categoryPathsSeed: string[]
    categoryPathsStrict: string[]
    imageCount: number
    images: string[]
  }
  db: {
    title: string
    status: string
    sourceGuid?: string | undefined
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

interface ProductComparison {
  dbOnlySourceIds: string[]
  matchedSourceIdCount: number
  mismatches: ProductMismatch[]
  mismatchTypeCounts: Map<MismatchType, number>
  xmlOnlySourceIds: string[]
}

interface CategoryPathComparison {
  categoryPathsOnlyInDbMetadata: string[]
  categoryPathsOnlyInXml: string[]
  dbMetadataCategoryPaths: string[]
  xmlCategoryPaths: string[]
}

interface ImageComparison {
  dbImagesStrict: string[]
  extraImagesByCanonical: string[]
  missingImagesByCanonical: string[]
  xmlImagesStrict: string[]
}

interface XmlCategoryPathNormalizationIssue {
  seedPaths: string[]
  sourceId: string
  strictPaths: string[]
}

interface CollectMismatchTypeInput {
  categoryComparison: CategoryPathComparison
  dbEntries: DbProductRecord[]
  dbEntry: DbProductRecord
  sourceId: string
  xmlEntries: XmlShopItem[]
}

const DEFAULT_XML_PATHS = [
  path.resolve(MEDUSA_ROOT, "src/scripts/seed-files/productsComplete.xml"),
] as const
const DEFAULT_OUTPUT_DIR = path.resolve(MEDUSA_ROOT, "local/xml-db-audit")
const DEFAULT_SAMPLE_SIZE = 25

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&apos;": "'",
  "&gt;": ">",
  "&lt;": "<",
  "&nbsp;": " ",
  "&quot;": '"',
}

const decodeXml = (value: string): string =>
  value
    .replaceAll(/<!\[CDATA\[[\s\S]*?\]\]>/gu, (match: string) =>
      match.slice("<![CDATA[".length, -"]]>".length),
    )
    .replaceAll(/&#x[0-9a-fA-F]+;/gu, (match: string) => {
      const parsed = Number.parseInt(match.slice("&#x".length, -1), 16)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replaceAll(/&#[0-9]+;/gu, (match: string) => {
      const parsed = Math.trunc(Number(match.slice("&#".length, -1)))
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : match
    })
    .replaceAll(
      /&quot;|&apos;|&lt;|&gt;|&amp;|&nbsp;/gu,
      (entity) => ENTITY_MAP[entity] ?? entity,
    )
const normalizeText = (value?: string): string | undefined => {
  if (value === undefined) {
    return undefined
  }
  const decoded = decodeXml(value).replaceAll("\r\n", "\n").trim()
  return decoded === "" ? undefined : decoded
}

const normalizeInlineText = (value?: string): string | undefined => {
  const normalized = normalizeText(value)
  if (normalized === undefined) {
    return undefined
  }
  return normalized.replaceAll(/\s+/gu, " ").trim()
}

const normalizeCategoryPathSeed = (categoryPath: string): string =>
  categoryPath
    .replaceAll(/\s*>{2,}\s*/gu, " > ")
    .replaceAll(/\s*>\s*/gu, " > ")
    .replaceAll(/\s+/gu, " ")
    .trim()

const splitCategoryPath = (categoryPath: string): string[] =>
  normalizeCategoryPathSeed(categoryPath)
    .split(" > ")
    .map((part) => part.trim())
    .filter((part) => part !== "")

const normalizeCategoryPathStrict = (categoryPath: string): string =>
  splitCategoryPath(categoryPath).join(" > ")

const dedupeStrings = (values: (string | undefined)[]): string[] => {
  const result: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const normalized = normalizeText(value)
    if (normalized === undefined || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

const parseAttributes = (raw?: string): Record<string, string> => {
  if (raw === undefined || raw === "") {
    return {}
  }

  const attributes: Record<string, string> = {}
  const regex = /(?<key>[:\w-]+)\s*=\s*"(?<value>[^"]*)"/gu
  for (const match of raw.matchAll(regex)) {
    const key = normalizeInlineText(match.groups?.["key"])
    if (key === undefined || key === "") {
      continue
    }
    attributes[key] = normalizeText(match.groups?.["value"]) ?? ""
  }
  return attributes
}

const extractElements = (source: string, tag: string): XmlElement[] => {
  const regex = new RegExp(
    `<${tag}(?<attributes>\\s[^>]*)?>(?<content>[\\s\\S]*?)<\\/${tag}>`,
    "gu",
  )
  const result: XmlElement[] = []
  for (const match of source.matchAll(regex)) {
    result.push({
      attributes: parseAttributes(match.groups?.["attributes"]),
      inner: match.groups?.["content"] ?? "",
    })
  }
  return result
}

const extractFirstElementContent = (
  source: string,
  tag: string,
): string | undefined => {
  const regex = new RegExp(
    `<${tag}(?:\\s[^>]*)?>(?<content>[\\s\\S]*?)<\\/${tag}>`,
    "u",
  )
  const match = source.match(regex)
  return match?.groups?.["content"]
}

const extractFirstText = (source: string, tag: string): string | undefined =>
  normalizeText(extractFirstElementContent(source, tag))

const parseCategoryPaths = (
  source: string,
): {
  seedPaths: string[]
  strictPaths: string[]
} => {
  const categoriesRaw = extractFirstElementContent(source, "CATEGORIES")
  if (categoriesRaw === undefined || categoriesRaw === "") {
    return {
      seedPaths: [],
      strictPaths: [],
    }
  }

  const rawPaths = dedupeStrings([
    ...extractElements(categoriesRaw, "CATEGORY").map(
      (category) => normalizeInlineText(category.inner) ?? "",
    ),
    normalizeInlineText(
      extractFirstElementContent(categoriesRaw, "DEFAULT_CATEGORY"),
    ),
  ])

  return {
    seedPaths: rawPaths.map((categoryPath) =>
      normalizeCategoryPathSeed(categoryPath),
    ),
    strictPaths: rawPaths.map((categoryPath) =>
      normalizeCategoryPathStrict(categoryPath),
    ),
  }
}

const parseImageUrls = (source: string): string[] => {
  const imagesRaw = extractFirstElementContent(source, "IMAGES")
  const variantRaw = extractFirstElementContent(source, "VARIANTS")
  const variantImageRefs =
    variantRaw !== undefined && variantRaw !== ""
      ? extractElements(variantRaw, "VARIANT").map((variant) =>
          extractFirstText(variant.inner, "IMAGE_REF"),
        )
      : []

  return dedupeStrings([
    ...(imagesRaw !== undefined && imagesRaw !== ""
      ? extractElements(imagesRaw, "IMAGE").map((image) =>
          normalizeText(image.inner),
        )
      : []),
    ...variantImageRefs,
    extractFirstText(source, "IMAGE_REF"),
  ])
}

const parseShopItems = (xml: string): XmlShopItem[] =>
  extractElements(xml, "SHOPITEM").map((shopItem) => {
    const categories = parseCategoryPaths(shopItem.inner)
    return {
      categoryPathsSeed: categories.seedPaths,
      categoryPathsStrict: categories.strictPaths,
      guid: extractFirstText(shopItem.inner, "GUID"),
      id: shopItem.attributes["id"] ?? "",
      images: parseImageUrls(shopItem.inner),
      name: extractFirstText(shopItem.inner, "NAME") ?? "",
    }
  })

const parseNumber = (value: unknown, fallback = 0): number => {
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

const toStringArray = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return []
  }

  if (Array.isArray(value)) {
    return dedupeStrings(
      value.map((entry) =>
        typeof entry === "string" ? normalizeText(entry) : undefined,
      ),
    )
  }

  if (typeof value === "string") {
    const normalized = normalizeText(value)
    if (normalized === undefined || normalized === "") {
      return []
    }

    const looksSerialized =
      (normalized.startsWith("[") && normalized.endsWith("]")) ||
      (normalized.startsWith("{") && normalized.endsWith("}"))
    if (!looksSerialized) {
      return [normalized]
    }

    try {
      const parsed: unknown = JSON.parse(normalized)
      return toStringArray(parsed)
    } catch {
      return [normalized]
    }
  }

  if (typeof value === "object") {
    return Array.isArray(value) ? toStringArray(value) : []
  }

  return []
}

const normalizeTitle = (value?: string): string =>
  normalizeInlineText(value)
    ?.normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLowerCase() ?? ""

const normalizeUrlForStrictCompare = (url: string): string =>
  normalizeInlineText(url) ?? ""

const normalizeUrlForCanonicalCompare = (url: string): string => {
  const normalized = normalizeInlineText(url) ?? ""
  return normalized.replace(CANONICAL_URL_QUERY_REGEX, "")
}

const diffSets = (reference: string[], compared: string[]): string[] => {
  const comparedSet = new Set(compared)
  return reference.filter((entry) => !comparedSet.has(entry))
}

const sortStrings = (values: string[]): string[] =>
  values.toSorted((a, b) => a.localeCompare(b))

const stringifyCsvCell = (value: string | number): string => {
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

const buildCsv = (rows: Record<string, string | number>[]): string => {
  if (rows.length === 0) {
    return ""
  }

  const [firstRow] = rows
  if (firstRow === undefined) {
    return ""
  }

  const headers = Object.keys(firstRow)
  const lines = [
    headers.map((header) => stringifyCsvCell(header)).join(","),
    ...rows.map((row) =>
      headers.map((header) => stringifyCsvCell(row[header] ?? "")).join(","),
    ),
  ]

  return `${lines.join("\n")}\n`
}

const parseSampleSize = (value: string, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback
}

const collectRawOptions = (args?: string[]): RawScriptOptions => {
  const options: RawScriptOptions = {
    sampleSize: DEFAULT_SAMPLE_SIZE,
  }

  for (const arg of args ?? []) {
    if (
      !arg.startsWith("--") &&
      (options.xmlPathArg === undefined || options.xmlPathArg === "")
    ) {
      options.xmlPathArg = arg
    } else if (arg.startsWith("--xml=")) {
      options.xmlPathArg = arg.slice("--xml=".length)
    } else if (arg.startsWith("--output=")) {
      options.outputDirArg = arg.slice("--output=".length)
    } else if (arg.startsWith("--sample=")) {
      options.sampleSize = parseSampleSize(
        arg.slice("--sample=".length),
        options.sampleSize,
      )
    } else if (arg.startsWith("--source-id=")) {
      const parsedSource = normalizeInlineText(arg.slice("--source-id=".length))
      options.sourceId = parsedSource === "" ? undefined : parsedSource
    }
  }

  return options
}

const resolveXmlPath = (xmlPathArg?: string): string => {
  const xmlPathCandidate = normalizeInlineText(xmlPathArg)
  let resolvedXmlPath = DEFAULT_XML_PATHS.find((candidate) =>
    existsSync(candidate),
  )
  if (xmlPathCandidate !== undefined && xmlPathCandidate !== "") {
    resolvedXmlPath =
      isHttpXmlSource(xmlPathCandidate) || path.isAbsolute(xmlPathCandidate)
        ? xmlPathCandidate
        : path.resolve(process.cwd(), xmlPathCandidate)
  }

  if (resolvedXmlPath === undefined || resolvedXmlPath === "") {
    throw new Error(
      `Could not find XML feed. Checked: ${DEFAULT_XML_PATHS.join(", ")}`,
    )
  }
  if (!(isHttpXmlSource(resolvedXmlPath) || existsSync(resolvedXmlPath))) {
    throw new Error(`XML feed does not exist at path: ${resolvedXmlPath}`)
  }

  return resolvedXmlPath
}

const resolveOutputDir = (outputDirArg?: string): string => {
  const outputCandidate = normalizeInlineText(outputDirArg)
  if (outputCandidate === undefined || outputCandidate === "") {
    return DEFAULT_OUTPUT_DIR
  }

  return path.isAbsolute(outputCandidate)
    ? outputCandidate
    : path.resolve(process.cwd(), outputCandidate)
}

const parseOptions = (args?: string[]): ScriptOptions => {
  const rawOptions = collectRawOptions(args)

  return {
    outputDir: resolveOutputDir(rawOptions.outputDirArg),
    sampleSize: rawOptions.sampleSize,
    sourceId: rawOptions.sourceId,
    xmlPath: resolveXmlPath(rawOptions.xmlPathArg),
  }
}

const loadDbProducts = async (): Promise<DbProductRecord[]> => {
  const rows = await sqlRaw(
    sql`
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
  `,
    decodeDbProductRaw,
  )

  return rows.map((row) => ({
    categoryHandles: toStringArray(row.category_handles),
    handle: row.handle,
    imageUrls: toStringArray(row.image_urls),
    metadataCategoryPaths: toStringArray(row.metadata_category_paths).map((p) =>
      normalizeCategoryPathSeed(p),
    ),
    productId: row.product_id,
    sourceGuid: normalizeInlineText(row.source_guid ?? undefined),
    sourceShopitemId: normalizeInlineText(row.source_shopitem_id ?? undefined),
    status: row.status,
    thumbnail: normalizeText(row.thumbnail ?? undefined),
    title: row.title,
    variantCount: parseNumber(row.variant_count, 0),
    variantImageRefs: toStringArray(row.variant_image_refs),
    variantThumbnails: toStringArray(row.variant_thumbnails),
  }))
}

const loadCategoryNameDuplicates = async () => {
  const rows = await sqlRaw(
    sql`
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
  `,
    decodeCategoryDuplicateRaw,
  )

  return rows.map((row) => ({
    duplicateCount: parseNumber(row.duplicate_count, 0),
    handles: toStringArray(row.handles),
    normalizedName: row.normalized_name,
    parentCategoryId: row.parent_category_id,
  }))
}

const loadCategoryHandleDuplicates = async () => {
  const rows = await sqlRaw(
    sql`
    SELECT
      REGEXP_REPLACE(handle, '-[0-9]+$', '') AS base_handle,
      COUNT(*) AS duplicate_count,
      jsonb_agg(handle ORDER BY handle) AS handles
    FROM product_category
    WHERE deleted_at IS NULL
    GROUP BY 1
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC, base_handle ASC
  `,
    decodeCategoryHandleDuplicateRaw,
  )

  return rows.map((row) => ({
    baseHandle: row.base_handle,
    duplicateCount: parseNumber(row.duplicate_count, 0),
    handles: toStringArray(row.handles),
  }))
}

const loadProductSourceDuplicates = async () => {
  const rows = await sqlRaw(
    sql`
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
  `,
    decodeProductSourceDuplicateRaw,
  )

  return rows.map((row) => ({
    duplicateCount: parseNumber(row.duplicate_count, 0),
    handles: toStringArray(row.handles),
    sourceId: row.source_id,
  }))
}

const loadDuplicateImageRows = async () => {
  const rows = await sqlRaw(
    sql`
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
  `,
    decodeDuplicateImageRaw,
  )

  return rows.map((row) => ({
    canonicalUrl: row.canonical_url,
    duplicateCount: parseNumber(row.duplicate_count, 0),
    handle: row.handle,
    sourceId: normalizeInlineText(row.source_shopitem_id ?? undefined),
  }))
}

const takeSample = <T>(items: T[], sampleSize: number): T[] =>
  items.slice(0, sampleSize)

const writeJson = (filePath: string, value: unknown) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8")
}

const loadXmlItems = async (xmlPath: string): Promise<XmlShopItem[]> => {
  const xml = await readXmlSource(xmlPath)
  return parseShopItems(xml).filter((item) => item.id !== "")
}

const addToSourceIdIndex = <T>(
  index: SourceIdIndex<T>,
  sourceId: string,
  value: T,
) => {
  if (!index.has(sourceId)) {
    index.set(sourceId, [])
  }
  index.get(sourceId)?.push(value)
}

const indexXmlItems = (xmlItems: XmlShopItem[]): SourceIdIndex<XmlShopItem> => {
  const xmlBySourceId = new Map<string, XmlShopItem[]>()
  for (const item of xmlItems) {
    addToSourceIdIndex(xmlBySourceId, item.id, item)
  }
  return xmlBySourceId
}

const indexDbProducts = (
  dbProducts: DbProductRecord[],
): {
  dbBySourceId: SourceIdIndex<DbProductRecord>
  dbMissingSourceId: DbProductRecord[]
} => {
  const dbBySourceId = new Map<string, DbProductRecord[]>()
  const dbMissingSourceId = dbProducts.filter(
    (product) =>
      product.sourceShopitemId === undefined || product.sourceShopitemId === "",
  )
  for (const product of dbProducts) {
    if (
      product.sourceShopitemId === undefined ||
      product.sourceShopitemId === ""
    ) {
      continue
    }
    addToSourceIdIndex(dbBySourceId, product.sourceShopitemId, product)
  }
  return { dbBySourceId, dbMissingSourceId }
}

const collectSourceIds = (
  xmlBySourceId: SourceIdIndex<XmlShopItem>,
  dbBySourceId: SourceIdIndex<DbProductRecord>,
  sourceIdFilter?: string,
): string[] =>
  sortStrings(
    [...new Set([...xmlBySourceId.keys(), ...dbBySourceId.keys()])]
      .filter((sourceId) => sourceId !== "")
      .filter((sourceId) =>
        sourceIdFilter === undefined || sourceIdFilter === ""
          ? true
          : sourceId === sourceIdFilter,
      ),
  )

const noteMismatchType = (
  mismatchTypeCounts: Map<MismatchType, number>,
  type: MismatchType,
) => {
  mismatchTypeCounts.set(type, (mismatchTypeCounts.get(type) ?? 0) + 1)
}

const compareCategoryPaths = (
  xmlEntry: XmlShopItem,
  dbEntry: DbProductRecord,
): CategoryPathComparison => {
  const xmlCategoryPaths = sortStrings(
    dedupeStrings(
      xmlEntry.categoryPathsSeed.map((categoryPath) => categoryPath),
    ),
  )
  const dbMetadataCategoryPaths = sortStrings(
    dedupeStrings(
      dbEntry.metadataCategoryPaths.map((categoryPath) => categoryPath),
    ),
  )

  return {
    categoryPathsOnlyInDbMetadata: diffSets(
      dbMetadataCategoryPaths,
      xmlCategoryPaths,
    ),
    categoryPathsOnlyInXml: diffSets(xmlCategoryPaths, dbMetadataCategoryPaths),
    dbMetadataCategoryPaths,
    xmlCategoryPaths,
  }
}

const compareImages = (
  xmlEntry: XmlShopItem,
  dbEntry: DbProductRecord,
): ImageComparison => {
  const xmlImagesStrict = sortStrings(
    dedupeStrings(
      xmlEntry.images.map((url) => normalizeUrlForStrictCompare(url)),
    ),
  )
  const xmlImagesCanonical = sortStrings(
    dedupeStrings(
      xmlEntry.images.map((url) => normalizeUrlForCanonicalCompare(url)),
    ),
  )
  const dbGalleryImages = dedupeStrings([
    dbEntry.thumbnail,
    ...dbEntry.imageUrls,
    ...dbEntry.variantThumbnails,
    ...dbEntry.variantImageRefs,
  ])
  const dbImagesStrict = sortStrings(
    dedupeStrings(
      dbGalleryImages.map((url) => normalizeUrlForStrictCompare(url)),
    ),
  )
  const dbImagesCanonical = sortStrings(
    dedupeStrings(
      dbGalleryImages.map((url) => normalizeUrlForCanonicalCompare(url)),
    ),
  )

  return {
    dbImagesStrict,
    extraImagesByCanonical: diffSets(dbImagesCanonical, xmlImagesCanonical),
    missingImagesByCanonical: diffSets(xmlImagesCanonical, dbImagesCanonical),
    xmlImagesStrict,
  }
}

const collectMismatchTypes = ({
  categoryComparison,
  dbEntries,
  dbEntry,
  sourceId,
  xmlEntries,
}: CollectMismatchTypeInput): MismatchType[] => {
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

const addTextAndMetadataMismatchTypes = (
  mismatchTypes: MismatchType[],
  xmlEntry: XmlShopItem,
  dbEntry: DbProductRecord,
  categoryComparison: CategoryPathComparison,
) => {
  if (normalizeTitle(xmlEntry.name) !== normalizeTitle(dbEntry.title)) {
    mismatchTypes.push("title_mismatch")
  }
  const normalizedXmlGuid = normalizeInlineText(xmlEntry.guid)
  const normalizedDbGuid = normalizeInlineText(dbEntry.sourceGuid)
  if (
    normalizedXmlGuid !== undefined &&
    normalizedDbGuid !== undefined &&
    normalizedXmlGuid !== normalizedDbGuid
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

const addImageMismatchTypes = (
  mismatchTypes: MismatchType[],
  imageComparison: ImageComparison,
) => {
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

const buildProductMismatch = (
  sourceId: string,
  xmlEntries: XmlShopItem[],
  dbEntries: DbProductRecord[],
  dbEntry: DbProductRecord,
): ProductMismatch | undefined => {
  const [xmlEntry] = xmlEntries
  if (xmlEntry === undefined) {
    return undefined
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
    categoryComparison,
  )
  addImageMismatchTypes(mismatchTypes, imageComparison)

  if (mismatchTypes.length === 0) {
    return undefined
  }

  return {
    db: {
      categoryHandles: sortStrings(dbEntry.categoryHandles),
      categoryLinkCount: dbEntry.categoryHandles.length,
      categoryPathCount: categoryComparison.dbMetadataCategoryPaths.length,
      categoryPaths: categoryComparison.dbMetadataCategoryPaths,
      imageCount: imageComparison.dbImagesStrict.length,
      images: imageComparison.dbImagesStrict,
      sourceGuid: dbEntry.sourceGuid,
      status: dbEntry.status,
      title: dbEntry.title,
    },
    deltas: {
      categoryPathsOnlyInDbMetadata:
        categoryComparison.categoryPathsOnlyInDbMetadata,
      categoryPathsOnlyInXml: categoryComparison.categoryPathsOnlyInXml,
      extraImagesByCanonical: imageComparison.extraImagesByCanonical,
      missingImagesByCanonical: imageComparison.missingImagesByCanonical,
    },
    handle: dbEntry.handle,
    productId: dbEntry.productId,
    sourceId,
    types: mismatchTypes,
    xml: {
      categoryPathsSeed: xmlEntry.categoryPathsSeed,
      categoryPathsStrict: xmlEntry.categoryPathsStrict,
      guid: xmlEntry.guid,
      imageCount: imageComparison.xmlImagesStrict.length,
      images: imageComparison.xmlImagesStrict,
      name: xmlEntry.name,
    },
  }
}

const compareProducts = (
  allSourceIds: string[],
  xmlBySourceId: SourceIdIndex<XmlShopItem>,
  dbBySourceId: SourceIdIndex<DbProductRecord>,
): ProductComparison => {
  const result: ProductComparison = {
    dbOnlySourceIds: [],
    matchedSourceIdCount: 0,
    mismatchTypeCounts: new Map<MismatchType, number>(),
    mismatches: [],
    xmlOnlySourceIds: [],
  }

  for (const sourceId of allSourceIds) {
    const xmlEntries = xmlBySourceId.get(sourceId) ?? []
    const dbEntries = dbBySourceId.get(sourceId) ?? []

    if (xmlEntries.length === 0) {
      result.dbOnlySourceIds.push(sourceId)
    } else if (dbEntries.length === 0) {
      result.xmlOnlySourceIds.push(sourceId)
    } else {
      result.matchedSourceIdCount += 1

      for (const dbEntry of dbEntries) {
        const mismatch = buildProductMismatch(
          sourceId,
          xmlEntries,
          dbEntries,
          dbEntry,
        )
        if (mismatch === undefined) {
          continue
        }

        for (const mismatchType of mismatch.types) {
          noteMismatchType(result.mismatchTypeCounts, mismatchType)
        }
        result.mismatches.push(mismatch)
      }
    }
  }

  return result
}

const findXmlCategoryPathNormalizationIssues = (
  xmlItems: XmlShopItem[],
): XmlCategoryPathNormalizationIssue[] =>
  xmlItems
    .filter((item) =>
      item.categoryPathsSeed.some((seedPath, index) => {
        const strictPath = item.categoryPathsStrict[index]
        return seedPath !== strictPath
      }),
    )
    .map((item) => ({
      seedPaths: item.categoryPathsSeed,
      sourceId: item.id,
      strictPaths: item.categoryPathsStrict,
    }))

const loadDuplicateReports = async () => {
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
    categoryHandleDuplicates,
    categoryNameDuplicates,
    dbProductSourceDuplicates,
    duplicateImageRows,
  }
}

const buildMismatchCsvRows = (mismatches: ProductMismatch[]) =>
  mismatches.map((mismatch) => ({
    db_images: mismatch.db.imageCount,
    db_linked_categories: mismatch.db.categoryLinkCount,
    db_metadata_category_paths: mismatch.db.categoryPathCount,
    db_title: mismatch.db.title,
    extra_images: mismatch.deltas.extraImagesByCanonical.length,
    handle: mismatch.handle,
    mismatch_types: mismatch.types.join("|"),
    missing_images: mismatch.deltas.missingImagesByCanonical.length,
    product_id: mismatch.productId,
    source_id: mismatch.sourceId,
    xml_category_paths: mismatch.xml.categoryPathsSeed.length,
    xml_images: mismatch.xml.imageCount,
    xml_name: mismatch.xml.name,
  }))

const buildSummary = ({
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
}) => ({
  filters: {
    sampleSize: options.sampleSize,
    sourceId: options.sourceId ?? null,
  },
  generatedAt: new Date().toISOString(),
  mismatchTypeCounts: Object.fromEntries(
    [...comparison.mismatchTypeCounts.entries()].toSorted(([a], [b]) =>
      a.localeCompare(b),
    ),
  ),
  outputDir: options.outputDir,
  potentialMappingRisks: {
    xmlCategoryPathNormalizationIssues:
      xmlCategoryPathNormalizationIssues.length,
  },
  redundancy: {
    categoryHandleSuffixDuplicates:
      duplicateReports.categoryHandleDuplicates.length,
    categoryNameDuplicates: duplicateReports.categoryNameDuplicates.length,
    duplicateDbSourceIds: duplicateReports.dbProductSourceDuplicates,
    duplicateImageRows: duplicateReports.duplicateImageRows.length,
    duplicateXmlSourceIds: [...xmlBySourceId.entries()]
      .filter(([, entries]) => entries.length > 1)
      .map(([sourceId, entries]) => ({
        count: entries.length,
        sourceId,
      })),
  },
  sample: {
    categoryHandleSuffixDuplicates: takeSample(
      duplicateReports.categoryHandleDuplicates,
      options.sampleSize,
    ),
    categoryNameDuplicates: takeSample(
      duplicateReports.categoryNameDuplicates,
      options.sampleSize,
    ),
    dbOnlySourceIds: takeSample(comparison.dbOnlySourceIds, options.sampleSize),
    duplicateDbSourceIds: takeSample(
      duplicateReports.dbProductSourceDuplicates,
      options.sampleSize,
    ),
    duplicateImageRows: takeSample(
      duplicateReports.duplicateImageRows,
      options.sampleSize,
    ),
    mismatches: takeSample(comparison.mismatches, options.sampleSize),
    productsMissingSourceId: takeSample(
      dbMissingSourceId.map((product) => ({
        handle: product.handle,
        productId: product.productId,
        title: product.title,
      })),
      options.sampleSize,
    ),
    xmlCategoryPathNormalizationIssues: takeSample(
      xmlCategoryPathNormalizationIssues,
      options.sampleSize,
    ),
    xmlOnlySourceIds: takeSample(
      comparison.xmlOnlySourceIds,
      options.sampleSize,
    ),
  },
  totals: {
    dbOnlySourceIds: comparison.dbOnlySourceIds.length,
    dbProductsCompared: dbProducts.length,
    dbProductsMissingSourceId: dbMissingSourceId.length,
    dbUniqueSourceIds: dbBySourceId.size,
    matchedSourceIds: comparison.matchedSourceIdCount,
    mismatchRows: comparison.mismatches.length,
    sourceIdsCompared: allSourceIds.length,
    sourceIdsWithAnyMismatch: new Set(
      comparison.mismatches.map((m) => m.sourceId),
    ).size,
    xmlOnlySourceIds: comparison.xmlOnlySourceIds.length,
    xmlShopItems: xmlItems.length,
    xmlUniqueSourceIds: xmlBySourceId.size,
  },
  xmlPath: options.xmlPath,
})

const writeAuditReports = ({
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
}) => {
  mkdirSync(options.outputDir, { recursive: true })
  writeJson(path.resolve(options.outputDir, "summary.json"), summary)
  writeJson(
    path.resolve(options.outputDir, "mismatches.json"),
    comparison.mismatches,
  )
  writeJson(
    path.resolve(options.outputDir, "xml-only-source-ids.json"),
    comparison.xmlOnlySourceIds,
  )
  writeJson(
    path.resolve(options.outputDir, "db-only-source-ids.json"),
    comparison.dbOnlySourceIds,
  )
  writeJson(
    path.resolve(options.outputDir, "products-missing-source-id.json"),
    dbMissingSourceId.map((product) => ({
      handle: product.handle,
      productId: product.productId,
      status: product.status,
      title: product.title,
    })),
  )
  writeJson(
    path.resolve(options.outputDir, "category-path-normalization-issues.json"),
    xmlCategoryPathNormalizationIssues,
  )
  writeJson(path.resolve(options.outputDir, "redundancy.json"), {
    categoryHandleSuffixDuplicates: duplicateReports.categoryHandleDuplicates,
    categoryNameDuplicates: duplicateReports.categoryNameDuplicates,
    duplicateDbSourceIds: duplicateReports.dbProductSourceDuplicates,
    duplicateImageRows: duplicateReports.duplicateImageRows,
  })
  writeFileSync(
    path.resolve(options.outputDir, "mismatches.csv"),
    buildCsv(buildMismatchCsvRows(comparison.mismatches)),
    "utf-8",
  )
}

const auditXmlVsDb = async ({ container, args }: ExecArgs) => {
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
    options.sourceId,
  )
  const comparison = compareProducts(allSourceIds, xmlBySourceId, dbBySourceId)

  if (dbMissingSourceId.length > 0) {
    noteMismatchType(
      comparison.mismatchTypeCounts,
      "missing_source_shopitem_id_on_db_product",
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
    `Audit completed. Compared source IDs: ${allSourceIds.length}, mismatches: ${comparison.mismatches.length}`,
  )
  logger.info(`Reports written to: ${options.outputDir}`)
  logger.info(
    `Summary file: ${path.resolve(options.outputDir, "summary.json")}`,
  )
}

export default auditXmlVsDb

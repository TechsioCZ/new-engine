import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"
import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sql } from "drizzle-orm"
import { sqlRaw } from "../utils/db"

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
    .replace(/&quot;|&apos;|&lt;|&gt;|&amp;|&nbsp;/g, (entity) => {
      return ENTITY_MAP[entity] ?? entity
    })
}

function normalizeText(value?: string): string | undefined {
  if (value === undefined) {
    return undefined
  }
  const decoded = decodeXml(value).replace(/\r\n/g, "\n").trim()
  return decoded === "" ? undefined : decoded
}

function normalizeInlineText(value?: string): string | undefined {
  const normalized = normalizeText(value)
  if (normalized === undefined) {
    return undefined
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

    if (
      (normalized.startsWith("[") && normalized.endsWith("]")) ||
      (normalized.startsWith("{") && normalized.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(normalized)
        return toStringArray(parsed)
      } catch {
        return [normalized]
      }
    }

    return [normalized]
  }

  if (typeof value === "object") {
    try {
      const parsed = JSON.parse(JSON.stringify(value))
      if (Array.isArray(parsed)) {
        return toStringArray(parsed)
      }
      return []
    } catch {
      return []
    }
  }

  return []
}

function normalizeTitle(value?: string): string {
  return normalizeInlineText(value)
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase() ?? ""
}

function normalizeUrlForStrictCompare(url: string): string {
  return normalizeInlineText(url) ?? ""
}

function normalizeUrlForCanonicalCompare(url: string): string {
  const normalized = normalizeInlineText(url) ?? ""
  return normalized.replace(/\?.*$/, "")
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

function buildCsv(rows: Array<Record<string, string | number>>): string {
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

function parseOptions(args?: string[]): ScriptOptions {
  let xmlPathArg: string | undefined
  let outputDirArg: string | undefined
  let sampleSize = DEFAULT_SAMPLE_SIZE
  let sourceId: string | undefined

  for (const arg of args ?? []) {
    if (!arg.startsWith("--") && !xmlPathArg) {
      xmlPathArg = arg
      continue
    }

    if (arg.startsWith("--xml=")) {
      xmlPathArg = arg.slice("--xml=".length)
      continue
    }
    if (arg.startsWith("--output=")) {
      outputDirArg = arg.slice("--output=".length)
      continue
    }
    if (arg.startsWith("--sample=")) {
      const parsed = Number(arg.slice("--sample=".length))
      if (Number.isFinite(parsed) && parsed > 0) {
        sampleSize = Math.trunc(parsed)
      }
      continue
    }
    if (arg.startsWith("--source-id=")) {
      const parsedSource = normalizeInlineText(arg.slice("--source-id=".length))
      sourceId = parsedSource || undefined
      continue
    }
  }

  const xmlPathCandidate = normalizeInlineText(xmlPathArg)
  const resolvedXmlPath = xmlPathCandidate
    ? isAbsolute(xmlPathCandidate)
      ? xmlPathCandidate
      : resolve(process.cwd(), xmlPathCandidate)
    : DEFAULT_XML_PATHS.find((path) => existsSync(path))

  if (!resolvedXmlPath) {
    throw new Error(
      `Could not find XML feed. Checked: ${DEFAULT_XML_PATHS.join(", ")}`
    )
  }
  if (!existsSync(resolvedXmlPath)) {
    throw new Error(`XML feed does not exist at path: ${resolvedXmlPath}`)
  }

  const outputCandidate = normalizeInlineText(outputDirArg)
  const outputDir = outputCandidate
    ? isAbsolute(outputCandidate)
      ? outputCandidate
      : resolve(process.cwd(), outputCandidate)
    : DEFAULT_OUTPUT_DIR

  return {
    xmlPath: resolvedXmlPath,
    outputDir,
    sampleSize,
    sourceId,
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

export default async function auditXmlVsDb({ container, args }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const options = parseOptions(args)

  logger.info("Starting XML vs DB audit...")
  logger.info(`Using XML feed: ${options.xmlPath}`)
  logger.info(`Output directory: ${options.outputDir}`)

  const xml = readFileSync(options.xmlPath, "utf8")
  const xmlItems = parseShopItems(xml).filter((item) => item.id !== "")
  const xmlBySourceId = new Map<string, XmlShopItem[]>()
  for (const item of xmlItems) {
    if (!xmlBySourceId.has(item.id)) {
      xmlBySourceId.set(item.id, [])
    }
    xmlBySourceId.get(item.id)?.push(item)
  }

  const dbProducts = await loadDbProducts()
  const dbBySourceId = new Map<string, DbProductRecord[]>()
  const dbMissingSourceId = dbProducts.filter((product) => !product.sourceShopitemId)
  for (const product of dbProducts) {
    if (!product.sourceShopitemId) {
      continue
    }
    if (!dbBySourceId.has(product.sourceShopitemId)) {
      dbBySourceId.set(product.sourceShopitemId, [])
    }
    dbBySourceId.get(product.sourceShopitemId)?.push(product)
  }

  const allSourceIds = sortStrings(
    [...new Set([...xmlBySourceId.keys(), ...dbBySourceId.keys()])]
      .filter((sourceId) => sourceId !== "")
      .filter((sourceId) =>
        options.sourceId ? sourceId === options.sourceId : true
      )
  )

  const xmlOnlySourceIds: string[] = []
  const dbOnlySourceIds: string[] = []
  const mismatches: ProductMismatch[] = []
  const mismatchTypeCounts = new Map<MismatchType, number>()
  let matchedSourceIdCount = 0

  const noteMismatchType = (type: MismatchType) => {
    mismatchTypeCounts.set(type, (mismatchTypeCounts.get(type) ?? 0) + 1)
  }

  for (const sourceId of allSourceIds) {
    const xmlEntries = xmlBySourceId.get(sourceId) ?? []
    const dbEntries = dbBySourceId.get(sourceId) ?? []

    if (xmlEntries.length === 0) {
      dbOnlySourceIds.push(sourceId)
      continue
    }
    if (dbEntries.length === 0) {
      xmlOnlySourceIds.push(sourceId)
      continue
    }

    matchedSourceIdCount += 1
    const xmlEntry = xmlEntries[0]
    if (!xmlEntry) {
      continue
    }

    for (const dbEntry of dbEntries) {
      const mismatchTypes: MismatchType[] = []

      if (xmlEntries.length > 1) {
        mismatchTypes.push("duplicate_xml_source_id")
      }
      if (dbEntries.length > 1) {
        mismatchTypes.push("duplicate_db_source_id")
      }

      const expectedHandle = `shopitem-${sourceId}`
      if (dbEntry.handle !== expectedHandle) {
        mismatchTypes.push("handle_mismatch")
      }

      if (normalizeTitle(xmlEntry.name) !== normalizeTitle(dbEntry.title)) {
        mismatchTypes.push("title_mismatch")
      }

      if (
        xmlEntry.guid &&
        dbEntry.sourceGuid &&
        normalizeInlineText(xmlEntry.guid) !== normalizeInlineText(dbEntry.sourceGuid)
      ) {
        mismatchTypes.push("guid_mismatch")
      }

      const xmlCategoryPaths = sortStrings(
        dedupeStrings(xmlEntry.categoryPathsSeed.map((path) => path))
      )
      const dbMetadataCategoryPaths = sortStrings(
        dedupeStrings(dbEntry.metadataCategoryPaths.map((path) => path))
      )
      const categoryPathsOnlyInXml = diffSets(
        xmlCategoryPaths,
        dbMetadataCategoryPaths
      )
      const categoryPathsOnlyInDbMetadata = diffSets(
        dbMetadataCategoryPaths,
        xmlCategoryPaths
      )
      if (
        categoryPathsOnlyInXml.length > 0 ||
        categoryPathsOnlyInDbMetadata.length > 0
      ) {
        mismatchTypes.push("metadata_category_paths_mismatch")
      }

      if (xmlCategoryPaths.length > 0 && dbEntry.categoryHandles.length === 0) {
        mismatchTypes.push("missing_db_category_links")
      }

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

      if (xmlImagesStrict.length !== dbImagesStrict.length) {
        mismatchTypes.push("image_count_mismatch")
      }

      const missingImagesByCanonical = diffSets(
        xmlImagesCanonical,
        dbImagesCanonical
      )
      const extraImagesByCanonical = diffSets(
        dbImagesCanonical,
        xmlImagesCanonical
      )

      if (missingImagesByCanonical.length > 0) {
        mismatchTypes.push("image_urls_missing_in_db")
      }
      if (extraImagesByCanonical.length > 0) {
        mismatchTypes.push("image_urls_extra_in_db")
      }

      if (
        missingImagesByCanonical.length === 0 &&
        extraImagesByCanonical.length === 0 &&
        (diffSets(xmlImagesStrict, dbImagesStrict).length > 0 ||
          diffSets(dbImagesStrict, xmlImagesStrict).length > 0)
      ) {
        mismatchTypes.push("image_query_only_mismatch")
      }

      if (mismatchTypes.length === 0) {
        continue
      }

      for (const mismatchType of mismatchTypes) {
        noteMismatchType(mismatchType)
      }

      mismatches.push({
        sourceId,
        productId: dbEntry.productId,
        handle: dbEntry.handle,
        types: mismatchTypes,
        xml: {
          name: xmlEntry.name,
          guid: xmlEntry.guid,
          categoryPathsSeed: xmlEntry.categoryPathsSeed,
          categoryPathsStrict: xmlEntry.categoryPathsStrict,
          imageCount: xmlImagesStrict.length,
          images: xmlImagesStrict,
        },
        db: {
          title: dbEntry.title,
          status: dbEntry.status,
          sourceGuid: dbEntry.sourceGuid,
          categoryPathCount: dbMetadataCategoryPaths.length,
          categoryPaths: dbMetadataCategoryPaths,
          categoryLinkCount: dbEntry.categoryHandles.length,
          categoryHandles: sortStrings(dbEntry.categoryHandles),
          imageCount: dbImagesStrict.length,
          images: dbImagesStrict,
        },
        deltas: {
          missingImagesByCanonical,
          extraImagesByCanonical,
          categoryPathsOnlyInXml,
          categoryPathsOnlyInDbMetadata,
        },
      })
    }
  }

  if (dbMissingSourceId.length > 0) {
    noteMismatchType("missing_source_shopitem_id_on_db_product")
  }

  const xmlCategoryPathNormalizationIssues = xmlItems
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

  mkdirSync(options.outputDir, { recursive: true })

  const summary = {
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
      matchedSourceIds: matchedSourceIdCount,
      xmlOnlySourceIds: xmlOnlySourceIds.length,
      dbOnlySourceIds: dbOnlySourceIds.length,
      mismatchRows: mismatches.length,
      sourceIdsWithAnyMismatch: new Set(mismatches.map((m) => m.sourceId)).size,
    },
    mismatchTypeCounts: Object.fromEntries(
      [...mismatchTypeCounts.entries()].sort(([a], [b]) => a.localeCompare(b))
    ),
    redundancy: {
      duplicateXmlSourceIds: [...xmlBySourceId.entries()]
        .filter(([, entries]) => entries.length > 1)
        .map(([sourceId, entries]) => ({
          sourceId,
          count: entries.length,
        })),
      duplicateDbSourceIds: dbProductSourceDuplicates,
      categoryNameDuplicates: categoryNameDuplicates.length,
      categoryHandleSuffixDuplicates: categoryHandleDuplicates.length,
      duplicateImageRows: duplicateImageRows.length,
    },
    potentialMappingRisks: {
      xmlCategoryPathNormalizationIssues: xmlCategoryPathNormalizationIssues.length,
    },
    sample: {
      xmlOnlySourceIds: takeSample(xmlOnlySourceIds, options.sampleSize),
      dbOnlySourceIds: takeSample(dbOnlySourceIds, options.sampleSize),
      mismatches: takeSample(mismatches, options.sampleSize),
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
      duplicateDbSourceIds: takeSample(dbProductSourceDuplicates, options.sampleSize),
      categoryNameDuplicates: takeSample(categoryNameDuplicates, options.sampleSize),
      categoryHandleSuffixDuplicates: takeSample(
        categoryHandleDuplicates,
        options.sampleSize
      ),
      duplicateImageRows: takeSample(duplicateImageRows, options.sampleSize),
    },
  }

  const mismatchCsvRows = mismatches.map((mismatch) => ({
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

  writeJson(resolve(options.outputDir, "summary.json"), summary)
  writeJson(resolve(options.outputDir, "mismatches.json"), mismatches)
  writeJson(
    resolve(options.outputDir, "xml-only-source-ids.json"),
    xmlOnlySourceIds
  )
  writeJson(
    resolve(options.outputDir, "db-only-source-ids.json"),
    dbOnlySourceIds
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
  writeJson(
    resolve(options.outputDir, "redundancy.json"),
    {
      duplicateDbSourceIds: dbProductSourceDuplicates,
      categoryNameDuplicates,
      categoryHandleSuffixDuplicates: categoryHandleDuplicates,
      duplicateImageRows,
    }
  )
  writeFileSync(
    resolve(options.outputDir, "mismatches.csv"),
    buildCsv(mismatchCsvRows),
    "utf8"
  )

  logger.info(
    `Audit completed. Compared source IDs: ${allSourceIds.length}, mismatches: ${mismatches.length}`
  )
  logger.info(`Reports written to: ${options.outputDir}`)
  logger.info(`Summary file: ${resolve(options.outputDir, "summary.json")}`)
}

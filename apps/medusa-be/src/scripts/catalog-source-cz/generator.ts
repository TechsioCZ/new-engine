// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: exact-source assembly intentionally keeps all partition gates in one auditable transaction.
import { createHash } from "node:crypto"
import { mkdir, open, readFile, stat } from "node:fs/promises"
import { basename, join, resolve } from "node:path"
import {
  hashCatalogTranslationBytes,
  hashCatalogTranslationValue,
  stableCatalogTranslationJson,
} from "../catalog-translation-pipeline/canonical"
import type {
  CatalogTranslationInput,
  CatalogTranslationInputEntry,
  CatalogTranslationProvenance,
} from "../catalog-translation-pipeline/types"
import {
  decodeXml,
  extractElements,
  extractFirstElementContent,
  extractFirstText,
} from "../herbatica-xml-utils"
import { buildTemporaryCzechTranslation } from "./temporary-czech"
import type {
  CzechCatalogBundleSummary,
  CzechCatalogEnvironment,
  CzechCatalogSourceLedgerRow,
  CzechCatalogSourcePaths,
} from "./types"

const EXPECTED = {
  brands: 128,
  categories: 209,
  entries: 4639,
  officialBrandAliases: 1,
  officialBrandExactSlugs: 102,
  officialProducts: 1994,
  productContents: 2151,
  products: 2151,
} as const

export const CZ_OFFICIAL_FEED_SHA256 =
  "bf05673d19e38665ae8d5867e1060e4382e73c310a33bdc6eb5e76e8241a44f4"

const EXPLICIT_BRAND_ALIASES: Readonly<Record<string, string>> = {
  "sungitove-kameny": "sungitove-kamene",
}
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/
const TRAILING_SLASHES = /\/+$/

type BlueProduct = Readonly<{
  product_id: string
  sk: Readonly<{
    content?: Readonly<{
      content_sections_map?: Readonly<Record<string, unknown>>
    }>
    description_html?: unknown
    title?: unknown
    variants?: readonly Readonly<{ ean?: unknown }>[]
  }>
}>

type RawInventory = Readonly<{
  products: readonly Readonly<{
    id: string
    productContentId: string
    subtitle: string | null
  }>[]
}>

type BlueCategory = Readonly<{
  id: string
  locales: Readonly<{
    sk: Readonly<{
      description?: unknown
      metadata?: Readonly<Record<string, unknown>>
      name?: unknown
      rich_content?: Readonly<Record<string, unknown>>
      seo?: Readonly<Record<string, unknown>>
    }>
  }>
}>

type BlueBrand = Readonly<{
  blue: Readonly<{
    sk: Readonly<{ handle: string; title: string }>
  }>
  medusa_id: string
}>

type OfficialFeedGroup = Readonly<{
  descriptions: readonly string[]
  eans: readonly string[]
  manufacturers: readonly string[]
  titles: readonly string[]
  url: string
}>

const requiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

const optionalString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null

const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex")

const parseJsonl = <Value>(bytes: Buffer, label: string): Value[] => {
  const text = bytes.toString("utf8")
  if (!text.endsWith("\n")) {
    throw new Error(`${label} must end with LF`)
  }
  return text
    .trimEnd()
    .split("\n")
    .map((line, index) => {
      try {
        return JSON.parse(line) as Value
      } catch (error) {
        throw new Error(
          `${label} line ${index + 1} is invalid JSON: ${(error as Error).message}`
        )
      }
    })
}

const canonicalOfficialUrl = (value: string) => {
  const parsed = new URL(value)
  if (
    parsed.protocol !== "https:" ||
    (parsed.hostname !== "www.herbatica.cz" &&
      parsed.hostname !== "herbatica.cz")
  ) {
    throw new Error(`official feed URL is outside herbatica.cz: ${value}`)
  }
  parsed.hostname = "www.herbatica.cz"
  parsed.search = ""
  parsed.hash = ""
  parsed.pathname = `${parsed.pathname.replace(TRAILING_SLASHES, "")}/`
  return parsed.toString()
}

const sortedUnique = (values: readonly string[]) =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"))

export const parseCzechOfficialFeed = (xml: string): OfficialFeedGroup[] => {
  const groups = new Map<
    string,
    {
      descriptions: string[]
      eans: string[]
      manufacturers: string[]
      titles: string[]
    }
  >()
  for (const [index, item] of extractElements(xml, "SHOPITEM").entries()) {
    const url = canonicalOfficialUrl(
      requiredString(
        extractFirstText(item.inner, "URL"),
        `SHOPITEM ${index}.URL`
      )
    )
    const group = groups.get(url) ?? {
      descriptions: [],
      eans: [],
      manufacturers: [],
      titles: [],
    }
    const descriptionInner = extractFirstElementContent(
      item.inner,
      "DESCRIPTION"
    )
    const description = descriptionInner
      ? decodeXml(descriptionInner).trim()
      : ""
    const ean = extractFirstText(item.inner, "EAN")
    const manufacturer = extractFirstText(item.inner, "MANUFACTURER")
    const title =
      extractFirstText(item.inner, "PRODUCTNAME") ||
      extractFirstText(item.inner, "PRODUCT")
    if (description) {
      group.descriptions.push(description)
    }
    if (ean) {
      group.eans.push(ean)
    }
    if (manufacturer) {
      group.manufacturers.push(manufacturer)
    }
    if (title) {
      group.titles.push(title)
    }
    groups.set(url, group)
  }
  return [...groups.entries()]
    .map(([url, group]) => ({
      descriptions: sortedUnique(group.descriptions),
      eans: sortedUnique(group.eans),
      manufacturers: sortedUnique(group.manufacturers),
      titles: sortedUnique(group.titles),
      url,
    }))
    .sort((left, right) => left.url.localeCompare(right.url, "en"))
}

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("cs-CZ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const compactSlug = (value: string) => slugify(value).replaceAll("-", "")

const buildOfficialBrandMatches = (
  brands: readonly BlueBrand[],
  manufacturers: readonly string[]
) => {
  const matches = new Map<
    string,
    Readonly<{
      manufacturer: string
      method: "official-explicit-brand-alias" | "official-exact-brand-slug"
    }>
  >()
  const remainingManufacturers = new Set(manufacturers)
  const remainingBrands = new Set(brands.map((brand) => brand.blue.sk.handle))
  for (const manufacturer of manufacturers) {
    const target = brands.filter(
      (brand) => brand.blue.sk.handle === slugify(manufacturer)
    )
    if (target.length === 1) {
      const handle = target[0]?.blue.sk.handle as string
      matches.set(handle, {
        manufacturer,
        method: "official-exact-brand-slug",
      })
      remainingManufacturers.delete(manufacturer)
      remainingBrands.delete(handle)
    }
  }
  for (const manufacturer of [...remainingManufacturers]) {
    const targetHandles = [...remainingBrands].filter(
      (handle) => compactSlug(handle) === compactSlug(manufacturer)
    )
    const competingManufacturers = [...remainingManufacturers].filter(
      (candidate) => compactSlug(candidate) === compactSlug(manufacturer)
    )
    if (targetHandles.length === 1 && competingManufacturers.length === 1) {
      const handle = targetHandles[0] as string
      matches.set(handle, {
        manufacturer,
        method: "official-exact-brand-slug",
      })
      remainingBrands.delete(handle)
      remainingManufacturers.delete(manufacturer)
    }
  }
  for (const [sourceSlug, targetSlug] of Object.entries(
    EXPLICIT_BRAND_ALIASES
  )) {
    const manufacturer = [...remainingManufacturers].find(
      (candidate) => slugify(candidate) === sourceSlug
    )
    if (manufacturer && remainingBrands.has(targetSlug)) {
      matches.set(targetSlug, {
        manufacturer,
        method: "official-explicit-brand-alias",
      })
      remainingBrands.delete(targetSlug)
      remainingManufacturers.delete(manufacturer)
    }
  }
  return matches
}

const chooseShortest = (values: readonly string[], label: string) => {
  const selected = [...values].sort(
    (left, right) =>
      left.length - right.length || left.localeCompare(right, "cs-CZ")
  )[0]
  return requiredString(selected, label)
}

const chooseLongest = (values: readonly string[], label: string) => {
  const selected = [...values].sort(
    (left, right) =>
      right.length - left.length || left.localeCompare(right, "cs-CZ")
  )[0]
  return requiredString(selected, label)
}

const temporaryProvenance = (
  sourceArtifactSha256: string,
  sourceReference: string
): CatalogTranslationProvenance => ({
  artifactSha256: sourceArtifactSha256,
  method: "ai-generated",
  sourceReference: `temporary-ai-translation-from-sk-SK:${sourceReference}`,
})

const officialProvenance = (
  sourceArtifactSha256: string,
  sourceReference: string
): CatalogTranslationProvenance => ({
  artifactSha256: sourceArtifactSha256,
  method: "existing-reviewed-artifact",
  sourceReference,
})

const ledgerRow = (
  entry: CatalogTranslationInputEntry,
  method: CzechCatalogSourceLedgerRow["method"],
  sourceArtifactSha256: string,
  sourceRecord: unknown
): CzechCatalogSourceLedgerRow => ({
  localeCode: "cs-CZ",
  method,
  reference: entry.reference,
  referenceId: entry.referenceId,
  sourceArtifactSha256,
  sourceRecordSha256: hashCatalogTranslationValue(sourceRecord),
  sourceReference: entry.provenance.sourceReference,
})

const normalizeEntries = (entries: readonly CatalogTranslationInputEntry[]) =>
  [...entries].sort((left, right) =>
    `${left.reference}\u0000${left.referenceId}`.localeCompare(
      `${right.reference}\u0000${right.referenceId}`,
      "en"
    )
  )

const writeExclusive = async (path: string, bytes: Uint8Array) => {
  const handle = await open(path, "wx", 0o600)
  try {
    await handle.writeFile(bytes)
    await handle.sync()
  } finally {
    await handle.close()
  }
}

const assertCount = (actual: number, expected: number, label: string) => {
  if (actual !== expected) {
    throw new Error(`${label} must be exactly ${expected}; got ${actual}`)
  }
}

export const buildCzechCatalogBundle = async ({
  environment,
  outputDirectory,
  sources,
}: Readonly<{
  environment: CzechCatalogEnvironment
  outputDirectory: string
  sources: CzechCatalogSourcePaths
}>): Promise<CzechCatalogBundleSummary> => {
  if (!LOWERCASE_SHA256.test(environment.databaseInstanceFingerprint)) {
    throw new Error("database instance fingerprint must be a lowercase SHA-256")
  }
  const sourceEntries = await Promise.all(
    Object.entries(sources).map(async ([key, path]) => {
      const absolutePath = resolve(path)
      const metadata = await stat(absolutePath)
      if (!metadata.isFile() || metadata.nlink !== 1) {
        throw new Error(`${key} must be a regular single-link source artifact`)
      }
      return [
        key,
        { absolutePath, bytes: await readFile(absolutePath) },
      ] as const
    })
  )
  const loaded = Object.fromEntries(sourceEntries) as Record<
    keyof CzechCatalogSourcePaths,
    { absolutePath: string; bytes: Buffer }
  >
  const sourceHashes = Object.fromEntries(
    Object.entries(loaded).map(([key, value]) => [key, sha256(value.bytes)])
  ) as Record<keyof CzechCatalogSourcePaths, string>
  if (sourceHashes.officialFeedXml !== CZ_OFFICIAL_FEED_SHA256) {
    throw new Error("official CZ feed does not match the frozen audited bytes")
  }

  const products = parseJsonl<BlueProduct>(
    loaded.productsJsonl.bytes,
    "products"
  )
  const categories = parseJsonl<BlueCategory>(
    loaded.categoriesJsonl.bytes,
    "categories"
  )
  const brands = parseJsonl<BlueBrand>(loaded.brandsJsonl.bytes, "brands")
  const rawInventory = JSON.parse(
    loaded.rawInventoryJson.bytes.toString("utf8")
  ) as RawInventory
  assertCount(products.length, EXPECTED.products, "product inventory")
  assertCount(categories.length, EXPECTED.categories, "category inventory")
  assertCount(brands.length, EXPECTED.brands, "brand inventory")
  assertCount(
    rawInventory.products.length,
    EXPECTED.productContents,
    "raw product inventory"
  )

  const rawProductsById = new Map(
    rawInventory.products.map((product) => [product.id, product])
  )
  const productsByEan = new Map<string, string[]>()
  for (const product of products) {
    for (const ean of sortedUnique(
      (product.sk.variants ?? []).flatMap((variant) =>
        typeof variant.ean === "string" && variant.ean ? [variant.ean] : []
      )
    )) {
      productsByEan.set(ean, [
        ...(productsByEan.get(ean) ?? []),
        product.product_id,
      ])
    }
  }
  const officialGroups = parseCzechOfficialFeed(
    loaded.officialFeedXml.bytes.toString("utf8")
  )
  const groupsByEan = new Map<string, OfficialFeedGroup[]>()
  for (const group of officialGroups) {
    for (const ean of group.eans) {
      groupsByEan.set(ean, [...(groupsByEan.get(ean) ?? []), group])
    }
  }
  const officialByProductId = new Map<string, OfficialFeedGroup>()
  for (const product of products) {
    const groups = new Set<OfficialFeedGroup>()
    for (const ean of (product.sk.variants ?? []).flatMap((variant) =>
      typeof variant.ean === "string" && variant.ean ? [variant.ean] : []
    )) {
      if ((productsByEan.get(ean) ?? []).length !== 1) {
        continue
      }
      const feedGroups = groupsByEan.get(ean) ?? []
      if (feedGroups.length === 1) {
        groups.add(feedGroups[0] as OfficialFeedGroup)
      }
    }
    if (groups.size === 1) {
      const group = [...groups][0] as OfficialFeedGroup
      const candidateProductIds = new Set(
        group.eans.flatMap((ean) =>
          (productsByEan.get(ean) ?? []).length === 1
            ? (productsByEan.get(ean) ?? [])
            : []
        )
      )
      if (
        candidateProductIds.size === 1 &&
        candidateProductIds.has(product.product_id)
      ) {
        officialByProductId.set(product.product_id, group)
      }
    }
  }
  assertCount(
    officialByProductId.size,
    EXPECTED.officialProducts,
    "official exact-unique-EAN product matches"
  )

  const entries: CatalogTranslationInputEntry[] = []
  const ledger: CzechCatalogSourceLedgerRow[] = []
  for (const product of [...products].sort((left, right) =>
    left.product_id.localeCompare(right.product_id, "en")
  )) {
    const rawProduct = rawProductsById.get(product.product_id)
    if (!rawProduct) {
      throw new Error(`missing raw inventory product ${product.product_id}`)
    }
    const sourceProduct = {
      description: optionalString(product.sk.description_html),
      subtitle: optionalString(rawProduct.subtitle),
      title: requiredString(product.sk.title, `${product.product_id}.title`),
    }
    const official = officialByProductId.get(product.product_id)
    const productEntry: CatalogTranslationInputEntry = official
      ? {
          localeCode: "cs-CZ",
          provenance: officialProvenance(
            sourceHashes.officialFeedXml,
            `official-herbatica-cz-feed:${CZ_OFFICIAL_FEED_SHA256}:${official.url}`
          ),
          reference: "product",
          referenceId: product.product_id,
          translations: {
            description: chooseLongest(
              official.descriptions,
              `${product.product_id}.official.description`
            ),
            subtitle: buildTemporaryCzechTranslation(sourceProduct.subtitle),
            title: chooseShortest(
              official.titles,
              `${product.product_id}.official.title`
            ),
          },
        }
      : {
          localeCode: "cs-CZ",
          provenance: temporaryProvenance(
            sourceHashes.productsJsonl,
            product.product_id
          ),
          reference: "product",
          referenceId: product.product_id,
          translations: {
            description: buildTemporaryCzechTranslation(
              sourceProduct.description
            ),
            subtitle: buildTemporaryCzechTranslation(sourceProduct.subtitle),
            title: buildTemporaryCzechTranslation(sourceProduct.title),
          },
        }
    entries.push(productEntry)
    ledger.push(
      ledgerRow(
        productEntry,
        official ? "official-exact-unique-ean" : "temporary-ai-from-sk",
        official ? sourceHashes.officialFeedXml : sourceHashes.productsJsonl,
        official ?? sourceProduct
      )
    )

    const contentMap = product.sk.content?.content_sections_map ?? {}
    const sourceContent = {
      composition: optionalString(contentMap.composition),
      other: optionalString(contentMap.other),
      usage: optionalString(contentMap.usage),
      warning: optionalString(contentMap.warning),
    }
    const contentEntry: CatalogTranslationInputEntry = {
      localeCode: "cs-CZ",
      provenance: temporaryProvenance(
        sourceHashes.productsJsonl,
        `${product.product_id}:${rawProduct.productContentId}`
      ),
      reference: "product_content",
      referenceId: rawProduct.productContentId,
      translations: {
        composition: buildTemporaryCzechTranslation(sourceContent.composition),
        other: buildTemporaryCzechTranslation(sourceContent.other),
        usage: buildTemporaryCzechTranslation(sourceContent.usage),
        warning: buildTemporaryCzechTranslation(sourceContent.warning),
      },
    }
    entries.push(contentEntry)
    ledger.push(
      ledgerRow(
        contentEntry,
        "temporary-ai-from-sk",
        sourceHashes.productsJsonl,
        sourceContent
      )
    )
  }

  for (const category of [...categories].sort((left, right) =>
    left.id.localeCompare(right.id, "en")
  )) {
    const source = {
      bottom_description_html: optionalString(
        category.locales.sk.rich_content?.bottom_description_html ??
          category.locales.sk.metadata?.bottom_description_html
      ),
      description: optionalString(category.locales.sk.description),
      meta_description: optionalString(
        category.locales.sk.seo?.meta_description ??
          category.locales.sk.metadata?.meta_description
      ),
      meta_title: optionalString(
        category.locales.sk.seo?.meta_title ??
          category.locales.sk.metadata?.meta_title
      ),
      name: requiredString(category.locales.sk.name, `${category.id}.name`),
      top_description_html: optionalString(
        category.locales.sk.rich_content?.top_description_html ??
          category.locales.sk.metadata?.top_description_html
      ),
    }
    const entry: CatalogTranslationInputEntry = {
      localeCode: "cs-CZ",
      provenance: temporaryProvenance(
        sourceHashes.categoriesJsonl,
        category.id
      ),
      reference: "product_category",
      referenceId: category.id,
      translations: Object.fromEntries(
        Object.entries(source).map(([key, value]) => [
          key,
          buildTemporaryCzechTranslation(value),
        ])
      ),
    }
    entries.push(entry)
    ledger.push(
      ledgerRow(
        entry,
        "temporary-ai-from-sk",
        sourceHashes.categoriesJsonl,
        source
      )
    )
  }

  const officialBrandMatches = buildOfficialBrandMatches(
    brands,
    sortedUnique(officialGroups.flatMap((group) => group.manufacturers))
  )
  let officialExactBrandCount = 0
  let officialAliasBrandCount = 0
  for (const brand of [...brands].sort((left, right) =>
    left.medusa_id.localeCompare(right.medusa_id, "en")
  )) {
    const officialMatch = officialBrandMatches.get(brand.blue.sk.handle)
    const officialMethod = officialMatch?.method ?? null
    if (officialMethod === "official-exact-brand-slug") {
      officialExactBrandCount += 1
    }
    if (officialMethod === "official-explicit-brand-alias") {
      officialAliasBrandCount += 1
    }
    const source = officialMethod
      ? {
          officialManufacturer: officialMatch?.manufacturer,
          targetBrandSlug: brand.blue.sk.handle,
          ...(officialMethod === "official-explicit-brand-alias"
            ? { aliasSourceSlug: slugify(officialMatch.manufacturer) }
            : {}),
        }
      : { title: brand.blue.sk.title }
    const entry: CatalogTranslationInputEntry = {
      localeCode: "cs-CZ",
      provenance: officialMethod
        ? officialProvenance(
            sourceHashes.officialFeedXml,
            `official-herbatica-cz-feed:${CZ_OFFICIAL_FEED_SHA256}:manufacturer:${officialMatch?.manufacturer}`
          )
        : temporaryProvenance(sourceHashes.brandsJsonl, brand.medusa_id),
      reference: "brand",
      referenceId: brand.medusa_id,
      translations: {
        title: officialMethod
          ? requiredString(
              officialMatch?.manufacturer,
              `${brand.medusa_id}.manufacturer`
            )
          : buildTemporaryCzechTranslation(brand.blue.sk.title),
      },
    }
    entries.push(entry)
    ledger.push(
      ledgerRow(
        entry,
        officialMethod ?? "temporary-ai-from-sk",
        officialMethod
          ? sourceHashes.officialFeedXml
          : sourceHashes.brandsJsonl,
        source
      )
    )
  }
  assertCount(
    officialExactBrandCount,
    EXPECTED.officialBrandExactSlugs,
    "official exact brand slug matches"
  )
  assertCount(
    officialAliasBrandCount,
    EXPECTED.officialBrandAliases,
    "official explicit brand aliases"
  )

  const normalizedEntries = normalizeEntries(entries)
  assertCount(normalizedEntries.length, EXPECTED.entries, "translation entries")
  const input: CatalogTranslationInput = {
    entries: normalizedEntries,
    environment: { ...environment, kind: "test" },
    inventory: {
      brands: EXPECTED.brands,
      categories: EXPECTED.categories,
      productContents: EXPECTED.productContents,
      products: EXPECTED.products,
    },
    mode: "replace",
    schemaVersion: 1,
    sourceLocale: "sk-SK",
    sourceArtifacts: Object.values(loaded)
      .map(({ absolutePath, bytes }) => ({
        path: absolutePath,
        sha256: sha256(bytes),
      }))
      .sort((left, right) => left.path.localeCompare(right.path, "en")),
    targetLocale: "cs-CZ",
  }
  const inputBytes = Buffer.from(`${stableCatalogTranslationJson(input)}\n`)
  const normalizedLedger = [...ledger].sort((left, right) =>
    `${left.reference}\u0000${left.referenceId}`.localeCompare(
      `${right.reference}\u0000${right.referenceId}`,
      "en"
    )
  )
  const ledgerBytes = Buffer.from(
    `${normalizedLedger.map((row) => stableCatalogTranslationJson(row)).join("\n")}\n`
  )
  const summary: CzechCatalogBundleSummary = {
    artifacts: {
      inputSha256: hashCatalogTranslationBytes(inputBytes),
      ledgerSha256: hashCatalogTranslationBytes(ledgerBytes),
    },
    counts: {
      brands: {
        officialExplicitAlias: officialAliasBrandCount,
        officialExactSlug: officialExactBrandCount,
        temporaryAi:
          EXPECTED.brands - officialExactBrandCount - officialAliasBrandCount,
        total: EXPECTED.brands,
      },
      categories: {
        temporaryAi: EXPECTED.categories,
        total: EXPECTED.categories,
      },
      entries: EXPECTED.entries,
      productContents: {
        temporaryAi: EXPECTED.productContents,
        total: EXPECTED.productContents,
      },
      products: {
        officialExactUniqueEan: officialByProductId.size,
        temporaryAi: EXPECTED.products - officialByProductId.size,
        total: EXPECTED.products,
      },
    },
    environment,
    kind: "herbatika-cz-test-catalog-translation-bundle",
    schemaVersion: 1,
    sources: {
      brandsJsonlSha256: sourceHashes.brandsJsonl,
      categoriesJsonlSha256: sourceHashes.categoriesJsonl,
      officialFeedSha256: sourceHashes.officialFeedXml,
      productsJsonlSha256: sourceHashes.productsJsonl,
      rawInventoryJsonSha256: sourceHashes.rawInventoryJson,
    },
  }
  const summaryBytes = Buffer.from(`${stableCatalogTranslationJson(summary)}\n`)
  const absoluteOutput = resolve(outputDirectory)
  await mkdir(absoluteOutput, { mode: 0o700, recursive: false })
  await Promise.all([
    writeExclusive(
      join(absoluteOutput, "cz-catalog-translation-input.json"),
      inputBytes
    ),
    writeExclusive(
      join(absoluteOutput, "cz-catalog-source-ledger.jsonl"),
      ledgerBytes
    ),
    writeExclusive(join(absoluteOutput, "summary.json"), summaryBytes),
  ])
  return summary
}

export const describeCzechCatalogSources = (sources: CzechCatalogSourcePaths) =>
  Object.fromEntries(
    Object.entries(sources).map(([key, value]) => [key, basename(value)])
  )

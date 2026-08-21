// biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: exact-source assembly intentionally keeps all partition gates in one auditable transaction.
import { createHash } from "node:crypto"
import { lstat, mkdir, open, readFile } from "node:fs/promises"
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
  CzechCatalogFieldAttestation,
  CzechCatalogFieldAttestations,
  CzechCatalogSourceAttestation,
  CzechCatalogSourceAttestationRecord,
  CzechCatalogSourceLedgerRow,
  CzechCatalogSourceMethod,
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
export const CZ_OFFICIAL_PAGES_SHA256 =
  "e79d15a5c3bba61550301fcf47be3b8e6cebe1d9a180cfcd4e707da5b75cdb19"

const EXPLICIT_BRAND_ALIASES: Readonly<Record<string, string>> = {
  "sungitove-kameny": "sungitove-kamene",
}
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/
const TRAILING_SLASHES = /\/+$/
const CZECH_FIELDS_BY_REFERENCE = {
  brand: ["title"],
  product: ["description", "subtitle", "title"],
  product_category: [
    "bottom_description_html",
    "description",
    "meta_description",
    "meta_title",
    "name",
    "top_description_html",
  ],
  product_content: ["composition", "other", "usage", "warning"],
} as const satisfies Readonly<
  Record<CatalogTranslationInputEntry["reference"], readonly string[]>
>
const CZECH_SOURCE_METHODS = new Set<CzechCatalogSourceMethod>([
  "official-explicit-brand-alias",
  "official-exact-brand-slug",
  "official-exact-unique-ean",
  "source-null",
  "temporary-ai-from-sk",
])

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

type OfficialPage = Readonly<{
  eanMatchesFeed: boolean | null
  feedEans: readonly string[]
  fullDescriptionHtml: string | null
  h1: string | null
  pageCanonicalUrl: string | null
  result: "error" | "ok"
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

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string
) => {
  const actual = Object.keys(value)
  if (
    actual.length !== expected.length ||
    expected.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error(`${label} fields are invalid`)
  }
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

const fieldAttestation = (
  method: CzechCatalogSourceMethod,
  sourceArtifactSha256: string,
  sourceReference: string,
  sourceRecord: unknown
): CzechCatalogFieldAttestation => ({
  method,
  sourceArtifactSha256,
  sourceRecordSha256: hashCatalogTranslationValue(sourceRecord),
  sourceReference,
})

const isPublicationGradeMethod = (method: CzechCatalogSourceMethod) =>
  method !== "source-null" && method !== "temporary-ai-from-sk"

const parseCzechSourceAttestationRecord = (
  value: unknown,
  index: number
): CzechCatalogSourceAttestationRecord => {
  const label = `CZ source attestation records[${index}]`
  const record = asRecord(value, label)
  exactKeys(
    record,
    [
      "fields",
      "publicationGrade",
      "reference",
      "referenceId",
      "sourceReference",
      "translations",
    ],
    label
  )
  if (
    typeof record.reference !== "string" ||
    !Object.hasOwn(CZECH_FIELDS_BY_REFERENCE, record.reference)
  ) {
    throw new Error(`${label}.reference is invalid`)
  }
  const reference =
    record.reference as CatalogTranslationInputEntry["reference"]
  const expectedFields = CZECH_FIELDS_BY_REFERENCE[reference]
  const translations = asRecord(record.translations, `${label}.translations`)
  const fields = asRecord(record.fields, `${label}.fields`)
  exactKeys(translations, expectedFields, `${label}.translations`)
  exactKeys(fields, expectedFields, `${label}.fields`)

  const parsedFields = Object.fromEntries(
    expectedFields.map((field) => {
      const translation = translations[field]
      if (
        translation !== null &&
        !(typeof translation === "string" && translation.trim())
      ) {
        throw new Error(`${label}.translations.${field} is invalid`)
      }
      const fieldLabel = `${label}.fields.${field}`
      const attestation = asRecord(fields[field], fieldLabel)
      exactKeys(
        attestation,
        [
          "method",
          "sourceArtifactSha256",
          "sourceRecordSha256",
          "sourceReference",
        ],
        fieldLabel
      )
      if (
        typeof attestation.method !== "string" ||
        !CZECH_SOURCE_METHODS.has(
          attestation.method as CzechCatalogSourceMethod
        ) ||
        !LOWERCASE_SHA256.test(String(attestation.sourceArtifactSha256)) ||
        !LOWERCASE_SHA256.test(String(attestation.sourceRecordSha256))
      ) {
        throw new Error(`${fieldLabel} is invalid`)
      }
      if ((translation === null) !== (attestation.method === "source-null")) {
        throw new Error(`${fieldLabel} null value and source method disagree`)
      }
      return [
        field,
        {
          method: attestation.method as CzechCatalogSourceMethod,
          sourceArtifactSha256: String(attestation.sourceArtifactSha256),
          sourceRecordSha256: String(attestation.sourceRecordSha256),
          sourceReference: requiredString(
            attestation.sourceReference,
            `${fieldLabel}.sourceReference`
          ),
        },
      ] as const
    })
  )
  const publicationGrade = Object.values(parsedFields).every(({ method }) =>
    isPublicationGradeMethod(method)
  )
  if (record.publicationGrade !== publicationGrade) {
    throw new Error(`${label}.publicationGrade does not match field evidence`)
  }
  return {
    fields: parsedFields,
    publicationGrade,
    reference,
    referenceId: requiredString(record.referenceId, `${label}.referenceId`),
    sourceReference: requiredString(
      record.sourceReference,
      `${label}.sourceReference`
    ),
    translations: translations as Record<string, string | null>,
  }
}

export const parseCzechCatalogSourceAttestation = (
  value: unknown
): CzechCatalogSourceAttestation => {
  const attestation = asRecord(value, "CZ source attestation")
  exactKeys(attestation, ["records", "schemaVersion"], "CZ source attestation")
  if (attestation.schemaVersion !== 2 || !Array.isArray(attestation.records)) {
    throw new Error("CZ source attestation header is invalid")
  }
  const records = attestation.records.map(parseCzechSourceAttestationRecord)
  const keys = records.map(
    ({ reference, referenceId }) => `${reference}\u0000${referenceId}`
  )
  if (
    new Set(keys).size !== keys.length ||
    keys.some((key, index) => index > 0 && key <= (keys[index - 1] as string))
  ) {
    throw new Error("CZ source attestation records must be unique and sorted")
  }
  return { records, schemaVersion: 2 }
}

export const assertCzechCatalogPublicationGrade = (
  fields: CzechCatalogFieldAttestations,
  requiredFields: readonly string[],
  label: string
) => {
  for (const field of requiredFields) {
    const attestation = fields[field]
    if (!attestation) {
      throw new Error(`${label}.${field} has no field source attestation`)
    }
    if (!isPublicationGradeMethod(attestation.method)) {
      throw new Error(
        `${label}.${field} is not publication-grade: ${attestation.method}`
      )
    }
  }
}

export const buildCzechCatalogEntry = ({
  fields,
  reference,
  referenceId,
  translations,
}: Readonly<{
  fields: CzechCatalogFieldAttestations
  reference: CatalogTranslationInputEntry["reference"]
  referenceId: string
  translations: CatalogTranslationInputEntry["translations"]
}>): CatalogTranslationInputEntry => {
  const translationFields = Object.keys(translations).sort()
  const attestedFields = Object.keys(fields).sort()
  if (
    translationFields.length !== attestedFields.length ||
    translationFields.some((field, index) => field !== attestedFields[index])
  ) {
    throw new Error(
      `${reference}:${referenceId} translations and field attestations differ`
    )
  }
  for (const [field, value] of Object.entries(translations)) {
    const method = fields[field]?.method
    if ((value === null) !== (method === "source-null")) {
      throw new Error(
        `${reference}:${referenceId}.${field} null value and source method disagree`
      )
    }
  }
  const populatedFields = translationFields.filter(
    (field) => translations[field] !== null
  )
  const reviewed =
    populatedFields.length > 0 &&
    populatedFields.every((field) =>
      isPublicationGradeMethod(fields[field]?.method ?? "source-null")
    )
  const primaryField = populatedFields[0] ?? translationFields[0]
  const primaryAttestation = primaryField ? fields[primaryField] : undefined
  if (!primaryAttestation) {
    throw new Error(
      `${reference}:${referenceId} has no field source attestation`
    )
  }
  const provenance: CatalogTranslationProvenance = {
    artifactSha256: primaryAttestation.sourceArtifactSha256,
    method: reviewed ? "existing-reviewed-artifact" : "ai-generated",
    sourceReference: `cz-field-source-attestation:${reference}:${referenceId}:${reviewed ? "reviewed" : "contains-temporary"}`,
  }
  return {
    localeCode: "cs-CZ",
    provenance,
    reference,
    referenceId,
    translations,
  }
}

const ledgerRow = (
  entry: CatalogTranslationInputEntry,
  fields: CzechCatalogFieldAttestations
): CzechCatalogSourceLedgerRow => {
  const populatedMethods = Object.entries(entry.translations)
    .filter(([, value]) => value !== null)
    .map(([field]) => fields[field]?.method ?? "source-null")
  const publicationGrade = Object.values(fields).every(({ method }) =>
    isPublicationGradeMethod(method)
  )
  const aggregateMethod = populatedMethods.includes("temporary-ai-from-sk")
    ? "temporary-ai-from-sk"
    : (populatedMethods[0] ?? "source-null")
  return {
    fields,
    localeCode: "cs-CZ",
    method: aggregateMethod,
    publicationGrade,
    reference: entry.reference,
    referenceId: entry.referenceId,
    sourceArtifactSha256: entry.provenance.artifactSha256,
    sourceRecordSha256: hashCatalogTranslationValue({
      fields,
      translations: entry.translations,
    }),
    sourceReference: entry.provenance.sourceReference,
  }
}

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
      const before = await lstat(absolutePath)
      if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
        throw new Error(`${key} must be a regular single-link source artifact`)
      }
      const bytes = await readFile(absolutePath)
      const after = await lstat(absolutePath)
      if (before.dev !== after.dev || before.ino !== after.ino) {
        throw new Error(`${key} changed while it was read`)
      }
      return [key, { absolutePath, bytes }] as const
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
  if (sourceHashes.officialPagesJsonl !== CZ_OFFICIAL_PAGES_SHA256) {
    throw new Error("official CZ pages do not match the frozen audited bytes")
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
  const officialPages = parseJsonl<OfficialPage>(
    loaded.officialPagesJsonl.bytes,
    "official pages"
  )
  const officialPagesByUrl = new Map(
    officialPages.map((page) => [canonicalOfficialUrl(page.url), page])
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
  let officialPageCount = 0
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
    const officialPage = official
      ? officialPagesByUrl.get(official.url)
      : undefined
    const verifiedOfficialPage =
      official &&
      officialPage?.result === "ok" &&
      officialPage.eanMatchesFeed === true &&
      officialPage.pageCanonicalUrl === official.url &&
      officialPage.feedEans.some((ean) => official?.eans.includes(ean)) &&
      officialPage.h1 &&
      officialPage.fullDescriptionHtml
        ? officialPage
        : undefined
    if (verifiedOfficialPage) {
      officialPageCount += 1
    }
    const officialSourceArtifactSha256 = verifiedOfficialPage
      ? sourceHashes.officialPagesJsonl
      : sourceHashes.officialFeedXml
    const officialSourceReference = verifiedOfficialPage
      ? `official-herbatica-cz-page:${CZ_OFFICIAL_PAGES_SHA256}:${official?.url}:identity-feed:${CZ_OFFICIAL_FEED_SHA256}`
      : `official-herbatica-cz-feed:${CZ_OFFICIAL_FEED_SHA256}:${official?.url}`
    const productTranslations = official
      ? {
          description:
            verifiedOfficialPage?.fullDescriptionHtml ??
            chooseLongest(
              official.descriptions,
              `${product.product_id}.official.description`
            ),
          subtitle: buildTemporaryCzechTranslation(sourceProduct.subtitle),
          title:
            verifiedOfficialPage?.h1 ??
            chooseShortest(
              official.titles,
              `${product.product_id}.official.title`
            ),
        }
      : {
          description: buildTemporaryCzechTranslation(
            sourceProduct.description
          ),
          subtitle: buildTemporaryCzechTranslation(sourceProduct.subtitle),
          title: buildTemporaryCzechTranslation(sourceProduct.title),
        }
    let descriptionMethod: CzechCatalogSourceMethod = "temporary-ai-from-sk"
    if (productTranslations.description === null) {
      descriptionMethod = "source-null"
    } else if (official) {
      descriptionMethod = "official-exact-unique-ean"
    }
    let descriptionSourceReference =
      `temporary-ai-translation-from-sk-SK:${product.product_id}:field:description`
    if (descriptionMethod === "source-null") {
      descriptionSourceReference =
        `sk-SK-source-null:${product.product_id}:field:description`
    } else if (official) {
      descriptionSourceReference = `${officialSourceReference}:field:description`
    }
    const subtitleSourceReference =
      productTranslations.subtitle === null
        ? `sk-SK-source-null:${product.product_id}:field:subtitle`
        : `temporary-ai-translation-from-sk-SK:${product.product_id}:field:subtitle`
    const productFields: CzechCatalogFieldAttestations = {
      description: fieldAttestation(
        descriptionMethod,
        official ? officialSourceArtifactSha256 : sourceHashes.productsJsonl,
        descriptionSourceReference,
        official ? productTranslations.description : sourceProduct.description
      ),
      subtitle: fieldAttestation(
        productTranslations.subtitle === null
          ? "source-null"
          : "temporary-ai-from-sk",
        sourceHashes.rawInventoryJson,
        subtitleSourceReference,
        sourceProduct.subtitle
      ),
      title: fieldAttestation(
        official ? "official-exact-unique-ean" : "temporary-ai-from-sk",
        official ? officialSourceArtifactSha256 : sourceHashes.productsJsonl,
        official
          ? `${officialSourceReference}:field:title`
          : `temporary-ai-translation-from-sk-SK:${product.product_id}:field:title`,
        official ? productTranslations.title : sourceProduct.title
      ),
    }
    const productEntry = buildCzechCatalogEntry({
      fields: productFields,
      reference: "product",
      referenceId: product.product_id,
      translations: productTranslations,
    })
    entries.push(productEntry)
    ledger.push(ledgerRow(productEntry, productFields))

    const contentMap = product.sk.content?.content_sections_map ?? {}
    const sourceContent = {
      composition: optionalString(contentMap.composition),
      other: optionalString(contentMap.other),
      usage: optionalString(contentMap.usage),
      warning: optionalString(contentMap.warning),
    }
    const contentTranslations = {
      composition: buildTemporaryCzechTranslation(sourceContent.composition),
      other: buildTemporaryCzechTranslation(sourceContent.other),
      usage: buildTemporaryCzechTranslation(sourceContent.usage),
      warning: buildTemporaryCzechTranslation(sourceContent.warning),
    }
    const contentFields = Object.fromEntries(
      Object.entries(sourceContent).map(([field, value]) => {
        const prefix =
          value === null
            ? "sk-SK-source-null"
            : "temporary-ai-translation-from-sk-SK"
        return [
          field,
          fieldAttestation(
            value === null ? "source-null" : "temporary-ai-from-sk",
            sourceHashes.productsJsonl,
            `${prefix}:${product.product_id}:${rawProduct.productContentId}:field:${field}`,
            value
          ),
        ]
      })
    )
    const contentEntry = buildCzechCatalogEntry({
      fields: contentFields,
      reference: "product_content",
      referenceId: rawProduct.productContentId,
      translations: contentTranslations,
    })
    entries.push(contentEntry)
    ledger.push(ledgerRow(contentEntry, contentFields))
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
    const translations = Object.fromEntries(
      Object.entries(source).map(([key, value]) => [
        key,
        buildTemporaryCzechTranslation(value),
      ])
    )
    const fields = Object.fromEntries(
      Object.entries(source).map(([field, value]) => {
        const prefix =
          value === null
            ? "sk-SK-source-null"
            : "temporary-ai-translation-from-sk-SK"
        return [
          field,
          fieldAttestation(
            value === null ? "source-null" : "temporary-ai-from-sk",
            sourceHashes.categoriesJsonl,
            `${prefix}:${category.id}:field:${field}`,
            value
          ),
        ]
      })
    )
    const entry = buildCzechCatalogEntry({
      fields,
      reference: "product_category",
      referenceId: category.id,
      translations,
    })
    entries.push(entry)
    ledger.push(ledgerRow(entry, fields))
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
    const translations = {
      title: officialMethod
        ? requiredString(
            officialMatch?.manufacturer,
            `${brand.medusa_id}.manufacturer`
          )
        : buildTemporaryCzechTranslation(brand.blue.sk.title),
    }
    const fields = {
      title: fieldAttestation(
        officialMethod ?? "temporary-ai-from-sk",
        officialMethod
          ? sourceHashes.officialFeedXml
          : sourceHashes.brandsJsonl,
        officialMethod
          ? `official-herbatica-cz-feed:${CZ_OFFICIAL_FEED_SHA256}:manufacturer:${officialMatch?.manufacturer}:field:title`
          : `temporary-ai-translation-from-sk-SK:${brand.medusa_id}:field:title`,
        officialMethod ? officialMatch?.manufacturer : brand.blue.sk.title
      ),
    }
    const entry = buildCzechCatalogEntry({
      fields,
      reference: "brand",
      referenceId: brand.medusa_id,
      translations,
    })
    entries.push(entry)
    ledger.push(ledgerRow(entry, fields))
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
  const normalizedLedger = [...ledger].sort((left, right) =>
    `${left.reference}\u0000${left.referenceId}`.localeCompare(
      `${right.reference}\u0000${right.referenceId}`,
      "en"
    )
  )
  const ledgerByReference = new Map(
    normalizedLedger.map((row) => [
      `${row.reference}\u0000${row.referenceId}`,
      row,
    ])
  )
  const sourceAttestation: CzechCatalogSourceAttestation = {
    records: normalizedEntries.map((entry) => {
      const row = ledgerByReference.get(
        `${entry.reference}\u0000${entry.referenceId}`
      )
      if (!row) {
        throw new Error(
          `missing source ledger row ${entry.reference}:${entry.referenceId}`
        )
      }
      return {
        fields: row.fields,
        publicationGrade: row.publicationGrade,
        reference: entry.reference,
        referenceId: entry.referenceId,
        sourceReference: entry.provenance.sourceReference,
        translations: entry.translations,
      }
    }),
    schemaVersion: 2 as const,
  }
  parseCzechCatalogSourceAttestation(sourceAttestation)
  const sourceAttestationBytes = Buffer.from(
    `${stableCatalogTranslationJson(sourceAttestation)}\n`
  )
  const sourceAttestationSha256 = hashCatalogTranslationBytes(
    sourceAttestationBytes
  )
  const attestedEntries = normalizedEntries.map((entry) => ({
    ...entry,
    provenance: {
      ...entry.provenance,
      artifactSha256: sourceAttestationSha256,
    },
  }))
  const absoluteOutput = resolve(outputDirectory)
  const input: CatalogTranslationInput = {
    entries: attestedEntries,
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
    sourceArtifacts: [
      {
        path: join(absoluteOutput, "cz-catalog-source-attestation.json"),
        sha256: sourceAttestationSha256,
      },
    ],
    targetLocale: "cs-CZ",
  }
  const inputBytes = Buffer.from(`${stableCatalogTranslationJson(input)}\n`)
  const ledgerBytes = Buffer.from(
    `${normalizedLedger.map((row) => stableCatalogTranslationJson(row)).join("\n")}\n`
  )
  const summary: CzechCatalogBundleSummary = {
    artifacts: {
      inputSha256: hashCatalogTranslationBytes(inputBytes),
      ledgerSha256: hashCatalogTranslationBytes(ledgerBytes),
      sourceAttestationSha256,
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
        officialFeedOnly: officialByProductId.size - officialPageCount,
        officialExactUniqueEan: officialByProductId.size,
        officialPage: officialPageCount,
        temporaryAi: EXPECTED.products - officialByProductId.size,
        total: EXPECTED.products,
      },
    },
    environment,
    kind: "herbatica-cz-test-catalog-translation-bundle",
    schemaVersion: 1,
    sources: {
      brandsJsonlSha256: sourceHashes.brandsJsonl,
      categoriesJsonlSha256: sourceHashes.categoriesJsonl,
      officialFeedSha256: sourceHashes.officialFeedXml,
      officialPagesJsonlSha256: sourceHashes.officialPagesJsonl,
      productsJsonlSha256: sourceHashes.productsJsonl,
      rawInventoryJsonSha256: sourceHashes.rawInventoryJson,
    },
  }
  const summaryBytes = Buffer.from(`${stableCatalogTranslationJson(summary)}\n`)
  await mkdir(absoluteOutput, { mode: 0o700, recursive: false })
  await Promise.all([
    writeExclusive(
      join(absoluteOutput, "cz-catalog-source-attestation.json"),
      sourceAttestationBytes
    ),
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

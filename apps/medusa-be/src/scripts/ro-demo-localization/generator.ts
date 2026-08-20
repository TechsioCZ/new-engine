import { createHash } from "node:crypto"
import { parseRoCatalogJson } from "../ro-catalog-import/manifest"
import type {
  RoCatalogBrandEntry,
  RoCatalogCategoryEntry,
  RoCatalogExcludedBrandEntry,
  RoCatalogExcludedCategoryEntry,
  RoCatalogExcludedProductEntry,
  RoCatalogProductEntry,
  RoCatalogSourceEvidence,
} from "../ro-catalog-import/types"
import {
  DEMO_AUTHORIZATION,
  type DemoExclusionLedger,
  type DemoFieldProvenance,
  type DemoInventoryProduct,
  type DemoLocalizationBundle,
  type DemoLocalizationInput,
  type DemoLocalizationWarning,
  type DemoOfficialCategory,
  type DemoOfficialJsonlRecord,
  type DemoOfficialProduct,
  type DemoOmissionLedger,
  type DemoWarningCode,
} from "./types"

const PRODUCT_SLUG_LIMIT = 200
const CATEGORY_SLUG_LIMIT = 80
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LINE_BREAK = /\r?\n/
const SHA_256 = /^[a-f0-9]{64}$/
const MANIFEST_IDENTIFIER = /^[\x21-\x7e]{1,255}$/
const HREF_ATTRIBUTE = /\s+href\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const HTML_TAG = /<[^>]*>/g
const SK_CATEGORY_CANARY =
  /[ľĺŕôýä]|\b(?:doplnok|kozmetika|nevhodné|prírodná|produktov|užívajte|výživy|zdravie)\b/iu
const SAFETY_FIELDS = ["composition", "usage", "warning", "other"] as const
const OMISSION_FIELDS = ["usage", "composition", "warning", "other"] as const

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .map(stableValue)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right), "en")
      )
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, entry]) => [key, stableValue(entry)])
    )
  }
  return value
}

export const stableDemoJson = (value: unknown): string =>
  JSON.stringify(stableValue(value))

export const demoSha256 = (value: unknown): string =>
  createHash("sha256").update(stableDemoJson(value)).digest("hex")

const rawTextSha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex")

const normalizedText = (value: null | string | undefined): null | string => {
  const normalized = value?.replace(/\s+/g, " ").trim()
  return normalized ? normalized : null
}

const categoryHtmlWithoutLinks = (value: null | string | undefined) =>
  value?.trim().replace(HREF_ATTRIBUTE, "") ?? null

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
  label: string
) => {
  const allowedSet = new Set(allowed)
  const unexpected = Object.keys(value).find((key) => !allowedSet.has(key))
  const missing = required.find((key) => !Object.hasOwn(value, key))
  if (unexpected || missing) {
    throw new Error(
      unexpected
        ? `${label} contains unexpected field ${unexpected}`
        : `${label} is missing field ${missing}`
    )
  }
}

const assertOptionalText = (value: unknown, label: string) => {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new Error(`${label} must be a string, null, or omitted`)
  }
}

const assertOfficialEvidence = (
  value: unknown,
  label: string,
  hashFields: readonly ("contentSha256" | "htmlSha256")[]
) => {
  const source = asRecord(value, label)
  exactKeys(
    source,
    [...hashFields, "evidenceKind", "retrievedAt", "url"],
    ["retrievedAt", "url"],
    label
  )
  if (
    source.evidenceKind !== undefined &&
    source.evidenceKind !== "official-page" &&
    source.evidenceKind !== "merged-record"
  ) {
    throw new Error(`${label}.evidenceKind is invalid`)
  }
  const presentHashes = hashFields.filter(
    (field) => source[field] !== undefined
  )
  if (
    presentHashes.length === 0 ||
    presentHashes.some(
      (field) =>
        typeof source[field] !== "string" ||
        !SHA_256.test(source[field] as string)
    )
  ) {
    throw new Error(`${label} must contain a valid lowercase source SHA-256`)
  }
  if (typeof source.retrievedAt !== "string") {
    throw new Error(`${label}.retrievedAt must be a string`)
  }
  const timestamp = new Date(source.retrievedAt)
  if (
    Number.isNaN(timestamp.getTime()) ||
    timestamp.toISOString() !== source.retrievedAt
  ) {
    throw new Error(`${label}.retrievedAt must be an ISO-8601 UTC timestamp`)
  }
  if (typeof source.url !== "string") {
    throw new Error(`${label}.url must be a string`)
  }
  let url: URL
  try {
    url = new URL(source.url)
  } catch {
    throw new Error(`${label}.url must be a valid URL`)
  }
  if (
    url.protocol !== "https:" ||
    !(url.hostname === "herbatica.ro" || url.hostname.endsWith(".herbatica.ro"))
  ) {
    throw new Error(`${label}.url must be an official HTTPS herbatica.ro URL`)
  }
}

const validateOfficialProduct = (
  value: DemoOfficialProduct,
  label: string
): DemoOfficialProduct => {
  const record = asRecord(value, label)
  exactKeys(
    record,
    [
      "canonicalSlug",
      "description",
      "descriptions",
      "ean",
      "matchingStatus",
      "medusaProductId",
      "productContent",
      "publicSlug",
      "sku",
      "source",
      "title",
    ],
    ["source"],
    label
  )
  assertOptionalText(record.sku, `${label}.sku`)
  assertOptionalText(record.ean, `${label}.ean`)
  assertOptionalText(record.medusaProductId, `${label}.medusaProductId`)
  if (
    record.matchingStatus !== undefined &&
    record.matchingStatus !== "exact-bijective" &&
    record.matchingStatus !== "excluded"
  ) {
    throw new Error(`${label}.matchingStatus is invalid`)
  }
  for (const field of ["sku", "ean"] as const) {
    if (
      typeof record[field] === "string" &&
      record[field] !== record[field].trim()
    ) {
      throw new Error(`${label}.${field} must not contain outer whitespace`)
    }
  }
  if (!(normalizedText(value.sku) || normalizedText(value.ean))) {
    throw new Error(`${label} must contain an SKU or EAN identity`)
  }
  for (const field of [
    "canonicalSlug",
    "description",
    "publicSlug",
    "title",
  ] as const) {
    assertOptionalText(record[field], `${label}.${field}`)
  }
  assertOfficialEvidence(record.source, `${label}.source`, [
    "contentSha256",
    "htmlSha256",
  ])
  const evidenceKind = asRecord(record.source, `${label}.source`).evidenceKind
  if (evidenceKind === "merged-record" && record.matchingStatus === undefined) {
    throw new Error(
      `${label} merged-record evidence requires an explicit matchingStatus`
    )
  }
  if (
    record.matchingStatus === "exact-bijective" &&
    !(
      typeof record.medusaProductId === "string" &&
      record.medusaProductId.trim()
    )
  ) {
    throw new Error(
      `${label} exact-bijective evidence requires a medusaProductId binding`
    )
  }
  if (record.descriptions !== undefined) {
    const descriptions = asRecord(record.descriptions, `${label}.descriptions`)
    exactKeys(descriptions, ["long", "short"], [], `${label}.descriptions`)
    for (const field of ["long", "short"] as const) {
      if (descriptions[field] === undefined) {
        continue
      }
      const description = asRecord(
        descriptions[field],
        `${label}.descriptions.${field}`
      )
      exactKeys(
        description,
        ["text"],
        ["text"],
        `${label}.descriptions.${field}`
      )
      if (typeof description.text !== "string") {
        throw new Error(`${label}.descriptions.${field}.text must be a string`)
      }
    }
  }
  if (record.productContent !== undefined) {
    const content = asRecord(record.productContent, `${label}.productContent`)
    exactKeys(content, SAFETY_FIELDS, [], `${label}.productContent`)
    for (const field of SAFETY_FIELDS) {
      assertOptionalText(content[field], `${label}.productContent.${field}`)
    }
  }
  return value
}

const validateOfficialCategory = (
  value: DemoOfficialCategory,
  label: string
): DemoOfficialCategory => {
  const record = asRecord(value, label)
  exactKeys(
    record,
    ["copySource", "key", "publicSlug", "source", "translation"],
    ["copySource", "key", "source"],
    label
  )
  if (
    record.copySource !== "official-ro" &&
    record.copySource !== "agent-generated-unreviewed"
  ) {
    throw new Error(`${label}.copySource is invalid`)
  }
  const key = asRecord(record.key, `${label}.key`)
  exactKeys(key, ["kind", "value"], ["kind", "value"], `${label}.key`)
  if (
    key.kind !== "medusa_id" ||
    typeof key.value !== "string" ||
    !key.value.trim()
  ) {
    throw new Error(`${label}.key is invalid`)
  }
  assertOptionalText(record.publicSlug, `${label}.publicSlug`)
  assertOfficialEvidence(record.source, `${label}.source`, ["contentSha256"])
  if (record.translation !== undefined) {
    const translation = asRecord(record.translation, `${label}.translation`)
    const fields = [
      "bottom_description_html",
      "description",
      "meta_description",
      "meta_title",
      "name",
      "top_description_html",
    ] as const
    exactKeys(translation, fields, [], `${label}.translation`)
    for (const field of fields) {
      assertOptionalText(translation[field], `${label}.translation.${field}`)
    }
  }
  return value
}

const assertCanonicalTimestamp = (value: unknown, label: string) => {
  if (typeof value !== "string") {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp`)
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp`)
  }
}

const assertNonblank = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a nonblank string`)
  }
}

const validateDecision = (value: unknown, label: string) => {
  const decision = asRecord(value, label)
  exactKeys(
    decision,
    ["approvedAt", "approvedBy", "reason", "reference"],
    ["approvedAt", "approvedBy", "reason", "reference"],
    label
  )
  assertCanonicalTimestamp(decision.approvedAt, `${label}.approvedAt`)
  for (const field of ["approvedBy", "reason", "reference"] as const) {
    assertNonblank(decision[field], `${label}.${field}`)
  }
}

const validateCategoryKey = (value: unknown, label: string) => {
  const key = asRecord(value, label)
  exactKeys(key, ["kind", "value"], ["kind", "value"], label)
  if (key.kind !== "medusa_id") {
    throw new Error(`${label}.kind must be medusa_id`)
  }
  assertNonblank(key.value, `${label}.value`)
}

export const validateDemoLocalizationInput = (
  value: DemoLocalizationInput
): DemoLocalizationInput => {
  const input = asRecord(value, "input")
  exactKeys(
    input,
    [
      "fallbackSource",
      "generatedAt",
      "inventory",
      "officialCategories",
      "officialProducts",
      "postCommerceInventoryEvidence",
      "readiness",
      "salesChannelId",
    ],
    [
      "fallbackSource",
      "generatedAt",
      "inventory",
      "officialCategories",
      "officialProducts",
      "readiness",
      "salesChannelId",
    ],
    "input"
  )
  assertCanonicalTimestamp(input.generatedAt, "generatedAt")
  assertNonblank(input.salesChannelId, "salesChannelId")
  assertOfficialEvidence(input.fallbackSource, "fallbackSource", [
    "contentSha256",
  ])
  const inventory = asRecord(input.inventory, "inventory")
  exactKeys(
    inventory,
    ["brands", "categories", "products"],
    ["brands", "categories", "products"],
    "inventory"
  )
  if (
    !(
      Array.isArray(inventory.brands) &&
      Array.isArray(inventory.categories) &&
      Array.isArray(inventory.products)
    )
  ) {
    throw new Error("inventory brands, categories and products must be arrays")
  }
  for (const [index, candidate] of inventory.brands.entries()) {
    const label = `inventory.brands[${index}]`
    const brand = asRecord(candidate, label)
    exactKeys(
      brand,
      [
        "copySource",
        "id",
        "publicSlug",
        "roExclusionDecision",
        "source",
        "title",
      ],
      ["copySource", "id", "publicSlug", "source", "title"],
      label
    )
    if (
      brand.copySource !== "official-ro" &&
      brand.copySource !== "agent-generated-unreviewed"
    ) {
      throw new Error(`${label}.copySource is invalid`)
    }
    for (const field of ["id", "publicSlug", "title"] as const) {
      assertNonblank(brand[field], `${label}.${field}`)
    }
    assertOfficialEvidence(brand.source, `${label}.source`, ["contentSha256"])
    if (brand.roExclusionDecision !== undefined) {
      validateDecision(
        brand.roExclusionDecision,
        `${label}.roExclusionDecision`
      )
    }
  }
  for (const [index, candidate] of inventory.products.entries()) {
    const product = asRecord(candidate, `inventory.products[${index}]`)
    exactKeys(
      product,
      [
        "description",
        "exclusionSource",
        "externalId",
        "id",
        "productContent",
        "productContentId",
        "roExclusionDecision",
        "title",
        "variants",
      ],
      [
        "description",
        "externalId",
        "id",
        "productContent",
        "productContentId",
        "title",
        "variants",
      ],
      `inventory.products[${index}]`
    )
    assertNonblank(product.id, `inventory.products[${index}].id`)
    assertNonblank(
      product.productContentId,
      `inventory.products[${index}].productContentId`
    )
    assertNonblank(product.title, `inventory.products[${index}].title`)
    assertOptionalText(
      product.description,
      `inventory.products[${index}].description`
    )
    assertOptionalText(
      product.externalId,
      `inventory.products[${index}].externalId`
    )
    const content = asRecord(
      product.productContent,
      `inventory.products[${index}].productContent`
    )
    exactKeys(
      content,
      SAFETY_FIELDS,
      SAFETY_FIELDS,
      `inventory.products[${index}].productContent`
    )
    for (const field of SAFETY_FIELDS) {
      if (typeof content[field] !== "string") {
        throw new Error(
          `inventory.products[${index}].productContent.${field} must be a string`
        )
      }
    }
    if (product.roExclusionDecision !== undefined) {
      validateDecision(
        product.roExclusionDecision,
        `inventory.products[${index}].roExclusionDecision`
      )
    }
    if (!Array.isArray(product.variants) || product.variants.length === 0) {
      throw new Error(`inventory.products[${index}].variants must be non-empty`)
    }
    for (const [variantIndex, candidateVariant] of product.variants.entries()) {
      const label = `inventory.products[${index}].variants[${variantIndex}]`
      const variant = asRecord(candidateVariant, label)
      exactKeys(variant, ["ean", "ronPrice", "sku"], ["ean", "sku"], label)
      assertOptionalText(variant.ean, `${label}.ean`)
      assertOptionalText(variant.sku, `${label}.sku`)
      if (
        !(
          normalizedText(variant.ean as null | string) ||
          normalizedText(variant.sku as null | string)
        ) &&
        product.roExclusionDecision === undefined
      ) {
        throw new Error(`${label} must contain an SKU or EAN`)
      }
    }
    if (product.exclusionSource !== undefined) {
      assertOfficialEvidence(
        product.exclusionSource,
        `inventory.products[${index}].exclusionSource`,
        ["contentSha256"]
      )
    }
  }
  for (const [index, candidate] of inventory.categories.entries()) {
    const label = `inventory.categories[${index}]`
    const category = asRecord(candidate, label)
    exactKeys(
      category,
      [
        "description",
        "directChildCount",
        "directProductCount",
        "key",
        "name",
        "parentKey",
        "roExclusionDecision",
      ],
      [
        "description",
        "directChildCount",
        "directProductCount",
        "key",
        "name",
        "parentKey",
      ],
      label
    )
    validateCategoryKey(category.key, `${label}.key`)
    if (category.parentKey !== null) {
      validateCategoryKey(category.parentKey, `${label}.parentKey`)
    }
    assertNonblank(category.name, `${label}.name`)
    assertOptionalText(category.description, `${label}.description`)
    for (const field of ["directChildCount", "directProductCount"] as const) {
      if (
        !(Number.isInteger(category[field]) && Number(category[field]) >= 0)
      ) {
        throw new Error(`${label}.${field} must be a nonnegative integer`)
      }
    }
    if (category.roExclusionDecision !== undefined) {
      validateDecision(
        category.roExclusionDecision,
        `${label}.roExclusionDecision`
      )
    }
  }
  if (
    !(
      Array.isArray(input.officialCategories) &&
      Array.isArray(input.officialProducts)
    )
  ) {
    throw new Error("official categories and products must be arrays")
  }
  return value
}

const ascii = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")

export const romanianDemoSlug = (value: string, maxLength: number): string => {
  const slug = ascii(value)
    .toLocaleLowerCase("ro-RO")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "")
  return slug || "produs-herbatica"
}

const categoryKey = (key: Readonly<{ kind: string; value: string }>): string =>
  `${key.kind}:${key.value}`

const auditKey = (
  value: Pick<DemoFieldProvenance, "fieldPath" | "recordKey">
): string => `${value.recordKey}:${value.fieldPath}`

const officialSource = (
  product: DemoOfficialProduct | undefined,
  fallback: RoCatalogSourceEvidence
): RoCatalogSourceEvidence => {
  if (!product) {
    return fallback
  }
  return {
    contentSha256:
      product.source.contentSha256 ?? (product.source.htmlSha256 as string),
    retrievedAt: product.source.retrievedAt,
    url: product.source.url,
  }
}

const uniqueOfficialProducts = (
  official: readonly DemoOfficialProduct[]
): Readonly<{
  byEan: ReadonlyMap<string, DemoOfficialProduct>
  byMedusaId: ReadonlyMap<string, DemoOfficialProduct>
}> => {
  const eanGroups = new Map<string, DemoOfficialProduct[]>()
  const byMedusaId = new Map<string, DemoOfficialProduct>()
  for (const [index, candidate] of official.entries()) {
    const product = validateOfficialProduct(
      candidate,
      `officialProducts[${index}]`
    )
    if (product.matchingStatus === "excluded") {
      continue
    }
    if (product.matchingStatus !== "exact-bijective") {
      throw new Error(
        `officialProducts[${index}] is not authorized as exact-bijective`
      )
    }
    const medusaProductId = normalizedText(product.medusaProductId)
    const ean = normalizedText(product.ean)
    if (!(medusaProductId && ean)) {
      throw new Error(
        `officialProducts[${index}] exact-bijective evidence requires both medusaProductId and EAN`
      )
    }
    if (byMedusaId.has(medusaProductId)) {
      throw new Error(
        `Official source binds multiple products to Medusa product ${medusaProductId}`
      )
    }
    byMedusaId.set(medusaProductId, product)
    const group = eanGroups.get(ean) ?? []
    group.push(product)
    eanGroups.set(ean, group)
  }
  const duplicateEan = [...eanGroups].find(([, group]) => group.length !== 1)
  if (duplicateEan) {
    throw new Error(
      `Official exact-bijective source reuses EAN ${duplicateEan[0]}`
    )
  }
  const byEan = new Map(
    [...eanGroups].map(([value, group]) => [
      value,
      group[0] as DemoOfficialProduct,
    ])
  )
  return { byEan, byMedusaId }
}

const matchOfficialProduct = (
  inventory: DemoInventoryProduct,
  indexes: ReturnType<typeof uniqueOfficialProducts>
): DemoOfficialProduct | undefined => {
  const match = indexes.byMedusaId.get(inventory.id)
  if (!match) {
    return
  }
  const eanMatches = inventory.variants.filter(({ ean }) =>
    Boolean(match.ean && ean === match.ean)
  )
  if (
    eanMatches.length !== 1 ||
    indexes.byEan.get(match.ean as string) !== match
  ) {
    throw new Error(
      `Official EAN does not identify exactly one variant for bound inventory product ${inventory.id}`
    )
  }
  return match
}

const productRecordKey = (
  product: DemoInventoryProduct,
  official?: DemoOfficialProduct
): string => {
  const entryKey = productEntryKey(product, official)
  return `${entryKey.kind}:${entryKey.value}`
}

const productEntryKey = (
  product: DemoInventoryProduct,
  official?: DemoOfficialProduct
) => {
  if (!official) {
    return { kind: "medusa_id", value: product.id } as const
  }
  if (
    official.ean &&
    MANIFEST_IDENTIFIER.test(official.ean) &&
    product.variants.some((variant) => variant.ean === official.ean)
  ) {
    return { kind: "ean", value: official.ean } as const
  }
  return { kind: "medusa_id", value: product.id } as const
}

const variantEntryKey = (
  variant: DemoInventoryProduct["variants"][number],
  productKey: string
) => {
  if (variant.sku) {
    return { kind: "sku", value: variant.sku } as const
  }
  if (variant.ean) {
    return { kind: "ean", value: variant.ean } as const
  }
  throw new Error(`Variant in ${productKey} has neither SKU nor EAN`)
}

const collisionSafeSlugs = (
  candidates: readonly Readonly<{ key: string; preferred: string }>[],
  limit: number
): ReadonlyMap<string, Readonly<{ collided: boolean; slug: string }>> => {
  const result = new Map<
    string,
    Readonly<{ collided: boolean; slug: string }>
  >()
  const used = new Set<string>()
  for (const candidate of [...candidates].sort((left, right) =>
    left.key.localeCompare(right.key, "en")
  )) {
    const base = romanianDemoSlug(candidate.preferred, limit)
    let slug = base
    let collided = false
    if (used.has(slug)) {
      collided = true
      const suffix = demoSha256(candidate.key).slice(0, 8)
      slug = `${base.slice(0, Math.max(1, limit - suffix.length - 1)).replace(/-+$/g, "")}-${suffix}`
    }
    if (used.has(slug)) {
      throw new Error(
        `Unable to deterministically resolve slug for ${candidate.key}`
      )
    }
    used.add(slug)
    result.set(candidate.key, { collided, slug })
  }
  return result
}

const addFieldAudit = (
  provenance: DemoFieldProvenance[],
  warnings: DemoLocalizationWarning[],
  args: Omit<DemoFieldProvenance, "warningCodes"> & {
    message?: string
    warningCodes?: readonly DemoWarningCode[]
  }
) => {
  const warningCodes = args.warningCodes ?? []
  provenance.push({
    fieldPath: args.fieldPath,
    generated: args.generated,
    ...(args.inputValueSha256
      ? { inputValueSha256: args.inputValueSha256 }
      : {}),
    inputSha256: args.inputSha256,
    ...(args.outputValueSha256
      ? { outputValueSha256: args.outputValueSha256 }
      : {}),
    recordKey: args.recordKey,
    source: args.source,
    warningCodes,
  })
  for (const code of warningCodes) {
    warnings.push({
      code,
      fieldPath: args.fieldPath,
      message: args.message ?? code,
      recordKey: args.recordKey,
    })
  }
}

export const parseDemoOfficialJsonl = (
  contents: string
): Readonly<{
  categories: readonly DemoOfficialCategory[]
  products: readonly DemoOfficialProduct[]
}> => {
  const categories: DemoOfficialCategory[] = []
  const products: DemoOfficialProduct[] = []
  for (const [index, line] of contents.split(LINE_BREAK).entries()) {
    if (!line.trim()) {
      continue
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      throw new Error(`Official JSONL line ${index + 1} is not valid JSON`)
    }
    const rawRecord = asRecord(parsed, `Official JSONL line ${index + 1}`)
    exactKeys(
      rawRecord,
      ["category", "kind", "product"],
      ["kind"],
      `Official JSONL line ${index + 1}`
    )
    const record = rawRecord as DemoOfficialJsonlRecord
    if (record.kind === "product" && record.product) {
      exactKeys(
        rawRecord,
        ["kind", "product"],
        ["kind", "product"],
        `Official JSONL line ${index + 1}`
      )
      products.push(
        validateOfficialProduct(
          record.product,
          `Official JSONL line ${index + 1}.product`
        )
      )
    } else if (record.kind === "category" && record.category) {
      exactKeys(
        rawRecord,
        ["category", "kind"],
        ["category", "kind"],
        `Official JSONL line ${index + 1}`
      )
      categories.push(
        validateOfficialCategory(
          record.category,
          `Official JSONL line ${index + 1}.category`
        )
      )
    } else {
      throw new Error(`Official JSONL line ${index + 1} has an invalid kind`)
    }
  }
  return { categories, products }
}

export const buildRomanianDemoLocalization = (
  input: DemoLocalizationInput
): DemoLocalizationBundle => {
  validateDemoLocalizationInput(input)
  if (!input.postCommerceInventoryEvidence) {
    throw new Error(
      "Final demo localization requires validated post-commerce inventory evidence"
    )
  }
  const provenance: DemoFieldProvenance[] = []
  const warnings: DemoLocalizationWarning[] = []
  const omissionEntries: DemoOmissionLedger["entries"][number][] = []
  const excludedInventoryProducts: DemoExclusionLedger["inventoryProducts"][number][] =
    []
  const productIndexes = uniqueOfficialProducts(input.officialProducts)
  const officialCategories = new Map<string, DemoOfficialCategory>()
  for (const [index, candidate] of input.officialCategories.entries()) {
    const category = validateOfficialCategory(
      candidate,
      `officialCategories[${index}]`
    )
    const key = categoryKey(category.key)
    if (officialCategories.has(key)) {
      throw new Error(`Official source contains duplicate category ${key}`)
    }
    officialCategories.set(key, category)
  }

  const inventoryCategoryKeys = new Set(
    input.inventory.categories.map(({ key }) => categoryKey(key))
  )
  const unmatchedOfficialCategory = [...officialCategories.keys()].find(
    (key) => !inventoryCategoryKeys.has(key)
  )
  if (unmatchedOfficialCategory) {
    throw new Error(
      `Official category ${unmatchedOfficialCategory} does not match Medusa inventory`
    )
  }

  const usedOfficialProducts = new Set<DemoOfficialProduct>()
  const claimedOfficialProducts = new Set<DemoOfficialProduct>()
  const productDrafts = input.inventory.products.map((product) => {
    const official = matchOfficialProduct(product, productIndexes)
    if (official && claimedOfficialProducts.has(official)) {
      throw new Error(
        `Official product ${official.sku ?? official.ean} matches multiple Medusa products`
      )
    }
    if (official) {
      claimedOfficialProducts.add(official)
    }
    const officialTitle = normalizedText(official?.title)
    const officialDescription =
      normalizedText(official?.description) ??
      normalizedText(official?.descriptions?.short?.text) ??
      normalizedText(official?.descriptions?.long?.text)
    const publishableOfficial =
      official && officialTitle && officialDescription ? official : undefined
    if (publishableOfficial) {
      usedOfficialProducts.add(publishableOfficial)
    }
    const key = productRecordKey(product, publishableOfficial)
    return {
      key,
      official: publishableOfficial,
      preferredSlug:
        normalizedText(publishableOfficial?.canonicalSlug) ??
        normalizedText(publishableOfficial?.publicSlug) ??
        officialTitle ??
        product.id,
      product,
      title: officialTitle,
      description: officialDescription,
    }
  })
  const publishedDrafts = productDrafts.filter(
    (
      draft
    ): draft is typeof draft & Readonly<{ official: DemoOfficialProduct }> =>
      Boolean(draft.official)
  )
  const excludedProducts: RoCatalogExcludedProductEntry[] = productDrafts
    .filter(({ official }) => !official)
    .map(({ key, product }) => {
      const decision = product.roExclusionDecision
      if (!decision) {
        throw new Error(
          `Medusa product ${product.id} requires a decision-backed RO exclusion`
        )
      }
      const inputSha256 = demoSha256(product)
      excludedInventoryProducts.push({
        inputSha256,
        productId: product.id,
        reason: "no-bijective-official-identity",
        recordKey: key,
      })
      return {
        decision: {
          approvedAt: decision.approvedAt,
          approvedBy: decision.approvedBy,
          reference: decision.reference,
        },
        key: { kind: "medusa_id" as const, value: product.id },
        reason: decision.reason,
        source: product.exclusionSource ?? input.fallbackSource,
      }
    })
    .sort((left, right) => left.key.value.localeCompare(right.key.value, "en"))
  const productSlugs = collisionSafeSlugs(
    publishedDrafts.map(({ key, preferredSlug }) => ({
      key,
      preferred: preferredSlug,
    })),
    PRODUCT_SLUG_LIMIT
  )

  const products: RoCatalogProductEntry[] = publishedDrafts
    .map(({ description, key, official, product, title }) => {
      if (!(title && description)) {
        throw new Error(
          `Published product ${product.id} lacks official RO copy`
        )
      }
      const inputSha256 = demoSha256({ official, product })
      addFieldAudit(provenance, warnings, {
        fieldPath: "translation.title",
        generated: false,
        inputSha256,
        recordKey: key,
        source: "official-ro",
      })
      addFieldAudit(provenance, warnings, {
        fieldPath: "translation.description",
        generated: false,
        inputSha256,
        recordKey: key,
        source: "official-ro",
      })
      const omittedFields: (typeof SAFETY_FIELDS)[number][] = []
      const productContent = Object.fromEntries(
        SAFETY_FIELDS.map((field) => {
          omittedFields.push(field)
          addFieldAudit(provenance, warnings, {
            fieldPath: `productContent.${field}`,
            generated: false,
            inputSha256,
            recordKey: key,
            source: "official-ro",
            warningCodes: [
              "unsupported-official-safety-field",
              "unreviewed-demo-content",
            ],
            message:
              "Official Romanian source has no reviewed structured value; the unsupported field is intentionally empty",
          })
          return [field, ""]
        })
      ) as RoCatalogProductEntry["productContent"]
      if (official && omittedFields.length > 0) {
        const source = officialSource(official, input.fallbackSource)
        omissionEntries.push({
          omittedFields: [...OMISSION_FIELDS],
          productContentId: product.productContentId,
          productId: product.id,
          roDescriptionSha256: rawTextSha256(description),
          sourceContentSha256: source.contentSha256,
          sourceUrl: source.url,
        })
      }
      const slugResult = productSlugs.get(key)
      if (!slugResult) {
        throw new Error(`Missing generated product slug for ${key}`)
      }
      const officialSlug =
        normalizedText(official?.canonicalSlug) ??
        normalizedText(official?.publicSlug)
      const normalizedOfficialSlug = officialSlug
        ? romanianDemoSlug(officialSlug, PRODUCT_SLUG_LIMIT)
        : null
      const slugNormalized = Boolean(
        officialSlug && normalizedOfficialSlug !== officialSlug
      )
      addFieldAudit(provenance, warnings, {
        fieldPath: "publicSlug",
        generated: !officialSlug || slugNormalized || slugResult.collided,
        ...(officialSlug ? { inputValueSha256: demoSha256(officialSlug) } : {}),
        inputSha256,
        outputValueSha256: demoSha256(slugResult.slug),
        recordKey: key,
        source: officialSlug ? "official-ro" : "demo-template",
        warningCodes: [
          ...(slugNormalized ? (["slug-normalized"] as const) : []),
          ...(slugResult.collided
            ? (["slug-collision-resolved"] as const)
            : []),
        ],
      })
      return {
        key: productEntryKey(product, official),
        productContent,
        publicSlug: slugResult.slug,
        publicationStatus: "published" as const,
        source: officialSource(official, input.fallbackSource),
        translation: { description, title },
        variants: product.variants
          .map((variant) => {
            const isOfficialVariant = Boolean(
              official.ean && variant.ean === official.ean
            )
            return {
              key: variantEntryKey(variant, key),
              ...(isOfficialVariant && variant.ronPrice
                ? {
                    roAvailability: "sellable" as const,
                    ronPrice: {
                      amount: variant.ronPrice.amount,
                      approval: variant.ronPrice.approval,
                      currencyCode: "ron" as const,
                    },
                  }
                : { roAvailability: "unavailable" as const }),
            }
          })
          .sort((left, right) =>
            `${left.key.kind}:${left.key.value}`.localeCompare(
              `${right.key.kind}:${right.key.value}`,
              "en"
            )
          ),
      }
    })
    .sort((left, right) =>
      `${left.key.kind}:${left.key.value}`.localeCompare(
        `${right.key.kind}:${right.key.value}`,
        "en"
      )
    )

  const categoryDrafts = input.inventory.categories.map((category) => {
    const key = categoryKey(category.key)
    const official = officialCategories.get(key)
    const translation = official?.translation
    if (!translation) {
      throw new Error(
        `Category ${key} requires an explicit fluent RO six-field record`
      )
    }
    const requiredFields = [
      "bottom_description_html",
      "description",
      "meta_description",
      "meta_title",
      "name",
      "top_description_html",
    ] as const
    const missingField = requiredFields.find(
      (field) => !Object.hasOwn(translation, field)
    )
    const name = normalizedText(translation.name)
    if (missingField || !name) {
      throw new Error(
        `Category ${key} requires an explicit fluent RO six-field record`
      )
    }
    const categoryCopy = requiredFields
      .map((field) => translation[field])
      .filter((field): field is string => typeof field === "string")
      .join(" ")
      .replace(HTML_TAG, " ")
    if (SK_CATEGORY_CANARY.test(categoryCopy)) {
      throw new Error(`Category ${key} contains a Slovak copy canary`)
    }
    return {
      category,
      key,
      name,
      official: official as DemoOfficialCategory & {
        translation: NonNullable<DemoOfficialCategory["translation"]>
      },
      preferredSlug: normalizedText(official?.publicSlug) ?? name,
    }
  })
  const categorySlugs = collisionSafeSlugs(
    categoryDrafts.map(({ key, preferredSlug }) => ({
      key,
      preferred: preferredSlug,
    })),
    CATEGORY_SLUG_LIMIT
  )
  const translatedCategories = categoryDrafts
    .map(({ category, key, name, official }) => {
      const inputSha256 = demoSha256({ category, official })
      const description = official.translation.description?.trim() ?? null
      for (const fieldPath of [
        "translation.name",
        "translation.description",
        "translation.meta_title",
        "translation.meta_description",
      ] as const) {
        addFieldAudit(provenance, warnings, {
          fieldPath,
          generated: official.copySource === "agent-generated-unreviewed",
          inputSha256,
          recordKey: key,
          source: official.copySource,
          warningCodes:
            official.copySource === "agent-generated-unreviewed"
              ? ["generated-category-copy", "unreviewed-demo-content"]
              : [],
        })
      }
      const slugResult = categorySlugs.get(key)
      if (!slugResult) {
        throw new Error(`Missing generated category slug for ${key}`)
      }
      const officialSlug = normalizedText(official?.publicSlug)
      const normalizedOfficialSlug = officialSlug
        ? romanianDemoSlug(officialSlug, CATEGORY_SLUG_LIMIT)
        : null
      const slugNormalized = Boolean(
        officialSlug && normalizedOfficialSlug !== officialSlug
      )
      addFieldAudit(provenance, warnings, {
        fieldPath: "publicSlug",
        generated: !officialSlug || slugNormalized || slugResult.collided,
        ...(officialSlug ? { inputValueSha256: demoSha256(officialSlug) } : {}),
        inputSha256,
        outputValueSha256: demoSha256(slugResult.slug),
        recordKey: key,
        source: officialSlug ? "official-ro" : "demo-template",
        warningCodes: [
          ...(slugNormalized ? (["slug-normalized"] as const) : []),
          ...(slugResult.collided
            ? (["slug-collision-resolved"] as const)
            : []),
        ],
      })
      const topDescription = categoryHtmlWithoutLinks(
        official.translation.top_description_html
      )
      const bottomDescription = categoryHtmlWithoutLinks(
        official.translation.bottom_description_html
      )
      for (const [fieldPath, inputValue, outputValue] of [
        [
          "translation.top_description_html",
          official.translation.top_description_html,
          topDescription,
        ],
        [
          "translation.bottom_description_html",
          official.translation.bottom_description_html,
          bottomDescription,
        ],
      ] as const) {
        const linksStripped = (inputValue?.trim() ?? null) !== outputValue
        addFieldAudit(provenance, warnings, {
          fieldPath,
          generated: linksStripped,
          ...(inputValue !== undefined
            ? { inputValueSha256: demoSha256(inputValue) }
            : {}),
          inputSha256,
          outputValueSha256: demoSha256(outputValue),
          recordKey: key,
          source: official.copySource,
          warningCodes: [
            ...(official.copySource === "agent-generated-unreviewed"
              ? ([
                  "generated-category-copy",
                  "unreviewed-demo-content",
                ] as const)
              : []),
            ...(linksStripped ? (["category-links-stripped"] as const) : []),
          ],
        })
      }
      return {
        expectedDirectChildCount: category.directChildCount,
        expectedDirectProductCount: category.directProductCount,
        key: category.key,
        parentKey: category.parentKey,
        publicSlug: slugResult.slug,
        publicationStatus: category.roExclusionDecision
          ? ("draft" as const)
          : ("published" as const),
        salesChannelId: input.salesChannelId,
        source: official.source,
        translation: {
          bottom_description_html: bottomDescription,
          description,
          meta_description:
            official.translation.meta_description?.trim() ?? null,
          meta_title: official.translation.meta_title?.trim() ?? null,
          name,
          top_description_html: topDescription,
        },
      }
    })
    .sort((left, right) =>
      categoryKey(left.key).localeCompare(categoryKey(right.key), "en")
    )

  const excludedCategories: RoCatalogExcludedCategoryEntry[] = categoryDrafts
    .filter(({ category }) => Boolean(category.roExclusionDecision))
    .map(({ category, key }) => {
      const translated = translatedCategories.find(
        (entry) => categoryKey(entry.key) === key
      )
      const decision = category.roExclusionDecision
      if (!(translated && decision)) {
        throw new Error(`Missing excluded category translation for ${key}`)
      }
      return {
        decision: {
          approvedAt: decision.approvedAt,
          approvedBy: decision.approvedBy,
          reference: decision.reference,
        },
        key: translated.key,
        reason: decision.reason,
        source: translated.source,
        translation: translated.translation,
      }
    })
    .sort((left, right) =>
      categoryKey(left.key).localeCompare(categoryKey(right.key), "en")
    )
  const categories: RoCatalogCategoryEntry[] = translatedCategories.filter(
    ({ key }) =>
      !excludedCategories.some(
        (excluded) => categoryKey(excluded.key) === categoryKey(key)
      )
  )

  const brandSlugs = collisionSafeSlugs(
    input.inventory.brands
      .filter((brand) => !brand.roExclusionDecision)
      .map((brand) => ({
        key: `medusa_id:${brand.id}`,
        preferred: brand.publicSlug,
      })),
    CATEGORY_SLUG_LIMIT
  )
  const brands: RoCatalogBrandEntry[] = input.inventory.brands
    .filter((brand) => !brand.roExclusionDecision)
    .map((brand) => {
      const key = `medusa_id:${brand.id}`
      const slug = brandSlugs.get(key)
      if (!slug) {
        throw new Error(`Missing generated brand slug for ${key}`)
      }
      if (slug.collided || slug.slug !== brand.publicSlug) {
        throw new Error(`Brand ${brand.id} does not have an exact safe RO slug`)
      }
      addFieldAudit(provenance, warnings, {
        fieldPath: "translation.title",
        generated: brand.copySource === "agent-generated-unreviewed",
        inputSha256: demoSha256(brand),
        recordKey: key,
        source: brand.copySource,
        warningCodes:
          brand.copySource === "agent-generated-unreviewed"
            ? ["unreviewed-demo-content"]
            : [],
      })
      return {
        key: { kind: "medusa_id" as const, value: brand.id },
        publicationStatus: "published" as const,
        publicSlug: slug.slug,
        salesChannelId: input.salesChannelId,
        source: brand.source,
        translation: { title: brand.title },
      }
    })
    .sort((left, right) => left.key.value.localeCompare(right.key.value, "en"))
  const excludedBrands: RoCatalogExcludedBrandEntry[] = input.inventory.brands
    .filter(
      (
        brand
      ): brand is typeof brand & {
        roExclusionDecision: NonNullable<typeof brand.roExclusionDecision>
      } => Boolean(brand.roExclusionDecision)
    )
    .map((brand) => ({
      decision: {
        approvedAt: brand.roExclusionDecision.approvedAt,
        approvedBy: brand.roExclusionDecision.approvedBy,
        reference: brand.roExclusionDecision.reference,
      },
      key: { kind: "medusa_id" as const, value: brand.id },
      reason: brand.roExclusionDecision.reason,
      source: brand.source,
    }))
    .sort((left, right) => left.key.value.localeCompare(right.key.value, "en"))

  const manifest = parseRoCatalogJson(
    JSON.stringify({
      brandInventory: { count: input.inventory.brands.length },
      brands,
      categories,
      categoryInventory: {
        activeCount: input.inventory.categories.length,
        rootCount: input.inventory.categories.filter(
          ({ parentKey }) => parentKey === null
        ).length,
      },
      excludedCategories,
      excludedProducts,
      collectionInventory: { count: 0 },
      excludedBrands,
      locale: "ro-RO",
      market: "ro",
      omissionMode: "official-ro-description-only",
      postCommerceInventoryEvidence: input.postCommerceInventoryEvidence,
      products,
      readiness: {
        ...input.readiness,
        paymentProviderIds: [...input.readiness.paymentProviderIds].sort(),
        shippingOptionIds: [...input.readiness.shippingOptionIds].sort(),
        taxRegionIds: [...input.readiness.taxRegionIds].sort(),
      },
      schemaVersion: 1,
    })
  )
  provenance.sort((left, right) =>
    auditKey(left).localeCompare(auditKey(right), "en")
  )
  warnings.sort((left, right) =>
    `${left.recordKey}:${left.fieldPath}:${left.code}`.localeCompare(
      `${right.recordKey}:${right.fieldPath}:${right.code}`,
      "en"
    )
  )
  omissionEntries.sort((left, right) =>
    left.productId.localeCompare(right.productId, "en")
  )
  excludedInventoryProducts.sort((left, right) =>
    left.productId.localeCompare(right.productId, "en")
  )
  const excludedOfficialProducts: DemoExclusionLedger["officialProducts"][number][] =
    input.officialProducts
      .filter((product) => !usedOfficialProducts.has(product))
      .map((product) => {
        const source = officialSource(product, input.fallbackSource)
        return {
          ean: normalizedText(product.ean),
          reason: "ambiguous-or-unmatched-official-identity" as const,
          sku: normalizedText(product.sku),
          sourceContentSha256: source.contentSha256,
          sourceUrl: source.url,
        }
      })
      .sort((left, right) =>
        `${left.sku ?? ""}:${left.ean ?? ""}:${left.sourceUrl}`.localeCompare(
          `${right.sku ?? ""}:${right.ean ?? ""}:${right.sourceUrl}`,
          "en"
        )
      )
  const generatedProductKeys = new Set(
    provenance
      .filter(
        ({ generated, recordKey }) =>
          generated && !inventoryCategoryKeys.has(recordKey)
      )
      .map(({ recordKey }) => recordKey)
  )
  const generatedCategoryKeys = new Set(
    provenance
      .filter(
        ({ generated, recordKey }) =>
          generated && inventoryCategoryKeys.has(recordKey)
      )
      .map(({ recordKey }) => recordKey)
  )
  const inputSha256 = demoSha256(input)
  const manifestSha256 = demoSha256(manifest)
  const demoOmissionLedger = {
    entries: omissionEntries,
    mode: "official-ro-description-only" as const,
    schemaVersion: 1 as const,
  }
  const planWithoutHash = {
    authorization: DEMO_AUTHORIZATION,
    bootstrap: {
      commercePlanSha256: input.postCommerceInventoryEvidence.commercePlanHash,
      observedCommerceSnapshotSha256:
        input.postCommerceInventoryEvidence.observedCommerceSnapshotSha256,
      postCommerceEnvelopeSha256:
        input.postCommerceInventoryEvidence.postCommerceEnvelopeSha256,
      priceAuthoritySha256:
        input.postCommerceInventoryEvidence.priceAuthoritySha256,
      sourceInventoryEnvelopeSha256:
        input.postCommerceInventoryEvidence.sourceInventoryEnvelopeSha256,
    },
    coverage: {
      agentGeneratedCategories: input.officialCategories.filter(
        ({ copySource }) => copySource === "agent-generated-unreviewed"
      ).length,
      generatedCategories: generatedCategoryKeys.size,
      generatedProducts: generatedProductKeys.size,
      inventoryCategories: input.inventory.categories.length,
      inventoryProducts: input.inventory.products.length,
      matchedOfficialCategories: input.officialCategories.filter(
        ({ copySource }) => copySource === "official-ro"
      ).length,
      matchedOfficialProducts: usedOfficialProducts.size,
      officialCategories: input.officialCategories.filter(
        ({ copySource }) => copySource === "official-ro"
      ).length,
      officialProducts: input.officialProducts.length,
      sellableVariants: products.reduce(
        (count, product) =>
          count +
          product.variants.filter(
            ({ roAvailability }) => roAvailability === "sellable"
          ).length,
        0
      ),
      unmatchedInventoryProducts: excludedInventoryProducts.length,
      unmatchedOfficialCategories: 0,
      unmatchedOfficialProducts: excludedOfficialProducts.length,
      unavailableVariants: products.reduce(
        (count, product) =>
          count +
          product.variants.filter(
            ({ roAvailability }) => roAvailability === "unavailable"
          ).length,
        0
      ),
    },
    demoOmissionLedger,
    demoOmissionLedgerSha256: demoSha256(demoOmissionLedger),
    exclusions: {
      inventoryProducts: excludedInventoryProducts,
      officialProducts: excludedOfficialProducts,
    },
    generatedAt: input.generatedAt,
    inputSha256,
    manifest,
    manifestSha256,
    provenance,
    warnings,
  }
  return {
    ...planWithoutHash,
    generationPlanSha256: demoSha256(planWithoutHash),
  }
}

export const isImporterSafeSlug = (slug: string): boolean =>
  slug.length <= PRODUCT_SLUG_LIMIT && SAFE_SLUG.test(slug)

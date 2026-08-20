import { createHash } from "node:crypto"

const AUTHORIZATION = "demo-generated-unreviewed" as const
const CURRENCY = "ron" as const
const KIND = "ro-demo-precommerce-price-authority" as const
const LINE_BREAK = /\r?\n/
const SHA_256 = /^[a-f0-9]{64}$/

export type PrecommerceExpectedCounts = Readonly<{
  excludedProducts: number
  excludedVariants: number
  inventoryProducts: number
  inventoryVariants: number
  publishedProducts: number
  publishedVariants: number
  sellableVariants: number
  unavailableVariants: number
}>

export const RO_DEMO_FROZEN_PRECOMMERCE_COUNTS = {
  excludedProducts: 149,
  excludedVariants: 160,
  inventoryProducts: 2151,
  inventoryVariants: 2191,
  publishedProducts: 2002,
  publishedVariants: 2031,
  sellableVariants: 2002,
  unavailableVariants: 29,
} as const satisfies PrecommerceExpectedCounts

export type PrecommerceExpectedSourceRoots = Readonly<{
  inventoryEnvelopeSha256: string
  mergedProductsSha256: string
  rawLiveInventorySha256: string
}>

export const RO_DEMO_FROZEN_PRECOMMERCE_SOURCE_ROOTS = {
  inventoryEnvelopeSha256:
    "cae8e22d0132dd62edfe2db329fab42fd0e33013529c506ccca1578b694c9404",
  mergedProductsSha256:
    "60baf88e7510f7022afd7f6aceaaeb0beb1c1abadd1023636c755b53568a98b2",
  rawLiveInventorySha256:
    "4dde2abeb131172c60a6aeb733f64130bfdc6750cba7d1cc67d97101dd737b86",
} as const satisfies PrecommerceExpectedSourceRoots

export type PrecommerceInventoryIdentityProduct = Readonly<{
  productId: string
  variants: readonly Readonly<{
    ean: null | string
    liveSku: null | string
    variantId: string
  }>[]
}>

type ExclusionDecision = Readonly<{
  approvedAt: string
  approvedBy: string
  reason: string
  reference: string
}>

type Evidence = Readonly<{
  mergedLine: number
  mergedRecordSha256: string
  officialContentSha256: null | string
  retrievedAt: null | string
  sourceUrl: string
}>

type SellableVariant = Readonly<{
  ean: string
  evidence: Evidence
  liveSku: null | string
  officialSku: null | string
  price: Readonly<{
    amount: number
    approval: Readonly<{
      approvedAt: string
      approvedBy: "user-demo-authorization"
      reference: string
    }>
    currencyCode: typeof CURRENCY
  }>
  roAvailability: "sellable"
  variantId: string
}>

type UnavailableVariant = Readonly<{
  ean: null | string
  liveSku: null | string
  officialSku: null
  roAvailability: "unavailable"
  variantId: string
}>

export type PrecommercePriceAuthorityArtifact = Readonly<{
  amountUnit: "major"
  authorization: typeof AUTHORIZATION
  counts: PrecommerceExpectedCounts
  currencyCode: typeof CURRENCY
  exclusions: readonly Readonly<{
    decision: ExclusionDecision
    productId: string
    variants: readonly Readonly<{
      ean: null | string
      liveSku: null | string
      variantId: string
    }>[]
  }>[]
  inventoryIdentitySha256: string
  kind: typeof KIND
  locale: "ro-RO"
  market: "ro"
  products: readonly Readonly<{
    productId: string
    variants: readonly (SellableVariant | UnavailableVariant)[]
  }>[]
  schemaVersion: 1
  sourceRoots: PrecommerceExpectedSourceRoots
}>

export type PrecommercePriceAuthorityBuild = Readonly<{
  artifact: PrecommercePriceAuthorityArtifact
  canonicalJson: string
  sha256: string
}>

export type PrecommercePriceAuthorityInput = Readonly<{
  inventoryEnvelopeJson: string
  mergedProductsJsonl: string
  rawLiveInventoryJson: string
}>

type JsonRecord = Record<string, unknown>
type LiveVariant = Readonly<{
  ean: null | string
  id: string
  sku: null | string
}>
type LiveProduct = Readonly<{ id: string; variants: readonly LiveVariant[] }>

const compareText = (left: string, right: string) => {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}
const hashBytes = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex")
const record = (value: unknown, label: string): JsonRecord => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as JsonRecord
}
const array = (value: unknown, label: string): readonly unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  return value
}
const text = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new Error(`${label} must be a nonblank trimmed string`)
  }
  return value
}
const nullableText = (value: unknown, label: string): null | string =>
  value === null ? null : text(value, label)
const timestamp = (value: unknown, label: string): string => {
  const parsed = new Date(text(value, label))
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be an ISO-8601 timestamp`)
  }
  return parsed.toISOString()
}
const nullableTimestamp = (value: unknown, label: string): null | string =>
  value === null ? null : timestamp(value, label)
const sha256 = (value: unknown, label: string): string => {
  const parsed = text(value, label)
  if (!SHA_256.test(parsed)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
  return parsed
}
const count = (value: unknown, label: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a non-negative safe integer`)
  }
  return value as number
}
const ronAmount = (value: unknown, label: string): number => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 1e-9
  ) {
    throw new Error(`${label} must be a positive RON major-unit amount`)
  }
  return value
}
const objectJson = (contents: string, label: string): JsonRecord => {
  try {
    return record(JSON.parse(contents), label)
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${(error as Error).message}`)
  }
}
const exactKeys = (
  value: JsonRecord,
  expected: readonly string[],
  label: string
) => {
  const actual = Object.keys(value).sort(compareText)
  const wanted = [...expected].sort(compareText)
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label} fields must be exactly ${wanted.join(",")}`)
  }
}
const unique = <Value>(
  values: readonly Value[],
  getKey: (value: Value) => string,
  label: string
): Map<string, Value> => {
  const result = new Map<string, Value>()
  for (const value of values) {
    const key = getKey(value)
    if (result.has(key)) {
      throw new Error(`${label} contains duplicate ${key}`)
    }
    result.set(key, value)
  }
  return result
}
const assertSorted = <Value>(
  values: readonly Value[],
  getKey: (value: Value) => string,
  label: string
) => {
  if (
    values.some((value, index) => {
      const previous = values[index - 1]
      return (
        index > 0 &&
        previous !== undefined &&
        compareText(getKey(previous), getKey(value)) >= 0
      )
    })
  ) {
    throw new Error(`${label} must be uniquely sorted`)
  }
}
const assertCounts = (
  actual: PrecommerceExpectedCounts,
  expected: PrecommerceExpectedCounts
) => {
  for (const field of Object.keys(
    expected
  ) as (keyof PrecommerceExpectedCounts)[]) {
    if (actual[field] !== expected[field]) {
      throw new Error(
        `pre-commerce ${field} must be ${expected[field]}; observed ${actual[field]}`
      )
    }
  }
}
const assertRoots = (
  actual: PrecommerceExpectedSourceRoots,
  expected: PrecommerceExpectedSourceRoots
) => {
  for (const field of Object.keys(
    expected
  ) as (keyof PrecommerceExpectedSourceRoots)[]) {
    sha256(expected[field], `expectedSourceRoots.${field}`)
    if (actual[field] !== expected[field]) {
      throw new Error(
        `pre-commerce ${field} does not match the reviewed source root`
      )
    }
  }
}
const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as JsonRecord)
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(",")}}`
  }
  const serialized = JSON.stringify(value)
  if (serialized === undefined) {
    throw new Error("pre-commerce authority contains a non-JSON value")
  }
  return serialized
}

export const serializePrecommercePriceAuthority = (
  artifact: PrecommercePriceAuthorityArtifact
): string => `${stableJson(artifact)}\n`
export const sha256PrecommercePriceAuthority = (
  artifact: PrecommercePriceAuthorityArtifact
): string => hashBytes(serializePrecommercePriceAuthority(artifact))
export const sha256PrecommerceInventoryIdentity = (
  products: readonly PrecommerceInventoryIdentityProduct[]
): string => hashBytes(`${stableJson(products)}\n`)

const canonicalInventoryIdentity = (
  liveProducts: readonly LiveProduct[]
): readonly PrecommerceInventoryIdentityProduct[] =>
  liveProducts
    .map((product) => ({
      productId: product.id,
      variants: product.variants
        .map((variant) => ({
          ean: variant.ean,
          liveSku: variant.sku,
          variantId: variant.id,
        }))
        .sort((left, right) => compareText(left.variantId, right.variantId)),
    }))
    .sort((left, right) => compareText(left.productId, right.productId))

const parseLiveProducts = (raw: JsonRecord): readonly LiveProduct[] => {
  const products = array(raw.products, "rawLiveInventory.products").map(
    (item, productIndex) => {
      const product = record(item, `rawLiveInventory.products[${productIndex}]`)
      const id = text(
        product.id,
        `rawLiveInventory.products[${productIndex}].id`
      )
      const variants = array(
        product.variants,
        `raw live product ${id}.variants`
      ).map((itemVariant, variantIndex) => {
        const variant = record(
          itemVariant,
          `raw live product ${id}.variants[${variantIndex}]`
        )
        return {
          ean: nullableText(variant.ean, `raw live product ${id} ean`),
          id: text(variant.id, `raw live product ${id} variant id`),
          sku: nullableText(variant.sku, `raw live product ${id} sku`),
        }
      })
      unique(
        variants,
        ({ id: variantId }) => variantId,
        `product ${id} variants`
      )
      return { id, variants }
    }
  )
  unique(products, ({ id }) => id, "raw live products")
  unique(
    products.flatMap(({ variants }) => variants),
    ({ id }) => id,
    "raw live variants"
  )
  return products
}

const parseEnvelopeProducts = (raw: JsonRecord) => {
  const inventory = record(raw.inventory, "inventoryEnvelope.inventory")
  return array(inventory.products, "inventoryEnvelope.inventory.products").map(
    (item, index) => {
      const product = record(
        item,
        `inventoryEnvelope.inventory.products[${index}]`
      )
      const id = text(
        product.id,
        `inventoryEnvelope.inventory.products[${index}].id`
      )
      const variants = array(
        product.variants,
        `inventory product ${id}.variants`
      ).map((itemVariant) => {
        const variant = record(itemVariant, `inventory product ${id} variant`)
        return {
          ean: nullableText(variant.ean, `inventory product ${id} ean`),
          sku: nullableText(variant.sku, `inventory product ${id} sku`),
        }
      })
      let decision: ExclusionDecision | null = null
      if (product.roExclusionDecision !== undefined) {
        const source = record(
          product.roExclusionDecision,
          `inventory product ${id}.roExclusionDecision`
        )
        decision = {
          approvedAt: timestamp(
            source.approvedAt,
            `inventory product ${id}.approvedAt`
          ),
          approvedBy: text(
            source.approvedBy,
            `inventory product ${id}.approvedBy`
          ),
          reason: text(source.reason, `inventory product ${id}.reason`),
          reference: text(
            source.reference,
            `inventory product ${id}.reference`
          ),
        }
      }
      return { decision, id, variants }
    }
  )
}
const identity = (variant: { ean: null | string; sku: null | string }) =>
  JSON.stringify([variant.ean, variant.sku])

export const buildPrecommercePriceAuthority = (
  input: PrecommercePriceAuthorityInput,
  expected: PrecommerceExpectedCounts = RO_DEMO_FROZEN_PRECOMMERCE_COUNTS,
  expectedMergedProducts = 2099,
  expectedSourceRoots: PrecommerceExpectedSourceRoots = RO_DEMO_FROZEN_PRECOMMERCE_SOURCE_ROOTS
): PrecommercePriceAuthorityBuild => {
  const roots = {
    inventoryEnvelopeSha256: hashBytes(input.inventoryEnvelopeJson),
    mergedProductsSha256: hashBytes(input.mergedProductsJsonl),
    rawLiveInventorySha256: hashBytes(input.rawLiveInventoryJson),
  }
  assertRoots(roots, expectedSourceRoots)
  const envelope = objectJson(input.inventoryEnvelopeJson, "inventoryEnvelope")
  const rawInventory = objectJson(
    input.rawLiveInventoryJson,
    "rawLiveInventory"
  )
  const approvalTimestamp = timestamp(
    envelope.mergedEvidenceCapturedAt,
    "inventoryEnvelope.mergedEvidenceCapturedAt"
  )
  const liveProducts = parseLiveProducts(rawInventory)
  const liveById = unique(liveProducts, ({ id }) => id, "raw live products")
  const envelopeProducts = parseEnvelopeProducts(envelope)
  const envelopeById = unique(
    envelopeProducts,
    ({ id }) => id,
    "inventory envelope products"
  )
  if (
    liveById.size !== envelopeById.size ||
    [...liveById.keys()].some((id) => !envelopeById.has(id))
  ) {
    throw new Error(
      "inventory envelope and raw live product identities disagree"
    )
  }
  for (const live of liveProducts) {
    const projected = envelopeById.get(live.id)
    if (!projected) {
      throw new Error(`inventory envelope is missing product ${live.id}`)
    }
    const rawIdentities = live.variants.map(identity).sort(compareText)
    const envelopeIdentities = projected.variants
      .map(identity)
      .sort(compareText)
    if (
      rawIdentities.length !== envelopeIdentities.length ||
      rawIdentities.some((value, index) => value !== envelopeIdentities[index])
    ) {
      throw new Error(
        `inventory envelope variants disagree for product ${live.id}`
      )
    }
  }
  const exclusions = envelopeProducts
    .filter(
      (product): product is typeof product & { decision: ExclusionDecision } =>
        product.decision !== null
    )
    .map(({ decision, id }) => ({
      decision,
      productId: id,
      variants: (liveById.get(id)?.variants ?? [])
        .map((variant) => ({
          ean: variant.ean,
          liveSku: variant.sku,
          variantId: variant.id,
        }))
        .sort((left, right) => compareText(left.variantId, right.variantId)),
    }))
    .sort((left, right) => compareText(left.productId, right.productId))
  const excludedIds = new Set(exclusions.map(({ productId }) => productId))
  const mergedLines = input.mergedProductsJsonl
    .split(LINE_BREAK)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim())
  if (mergedLines.length !== expectedMergedProducts) {
    throw new Error(
      `merged official product count must be ${expectedMergedProducts}; observed ${mergedLines.length}`
    )
  }
  const sellableByProduct = new Map<string, SellableVariant>()
  let mergedExcluded = 0
  for (const { line, lineNumber } of mergedLines) {
    const merged = objectJson(line, `merged product line ${lineNumber}`)
    if (merged.schema_version !== 1 || merged.approval !== AUTHORIZATION) {
      throw new Error(`merged product line ${lineNumber} authority is invalid`)
    }
    const scope = record(
      merged.demo_scope,
      `merged product line ${lineNumber}.demo_scope`
    )
    if (scope.decision === "exclude-unreviewed") {
      mergedExcluded += 1
      continue
    }
    if (
      scope.decision !== "publish-candidate" ||
      merged.matchingStatus !== "matched"
    ) {
      throw new Error(`merged product line ${lineNumber} scope is invalid`)
    }
    const matching = record(
      merged.medusa_match,
      `merged product line ${lineNumber}.medusa_match`
    )
    if (matching.status !== "matched" || matching.method !== "exact_ean") {
      throw new Error(
        `merged product line ${lineNumber} is not an exact EAN match`
      )
    }
    const medusa = record(
      matching.medusa,
      `merged product line ${lineNumber}.medusa_match.medusa`
    )
    const productId = text(
      medusa.product_id,
      `merged line ${lineNumber} product id`
    )
    if (merged.medusaProductId !== productId || excludedIds.has(productId)) {
      throw new Error(
        `merged product line ${lineNumber} product binding disagrees`
      )
    }
    if (sellableByProduct.has(productId)) {
      throw new Error(`published product ${productId} is duplicated`)
    }
    const variantIds = array(
      medusa.matching_variant_ids,
      `merged product line ${lineNumber} matching variants`
    ).map((value, index) =>
      text(value, `merged line ${lineNumber} variant ${index}`)
    )
    if (variantIds.length !== 1) {
      throw new Error(
        `published product ${productId} must bind exactly one variant`
      )
    }
    const [variantId] = variantIds
    if (!variantId) {
      throw new Error(
        `published product ${productId} variant binding is missing`
      )
    }
    const official = record(
      matching.official_identity,
      `merged product line ${lineNumber}.official_identity`
    )
    const ean = text(merged.ean, `merged product line ${lineNumber}.ean`)
    const officialSku = nullableText(
      merged.sku,
      `merged product line ${lineNumber}.sku`
    )
    if (official.ean !== ean || official.sku !== officialSku) {
      throw new Error(
        `merged product line ${lineNumber} official identity disagrees`
      )
    }
    const price = record(
      merged.price,
      `merged product line ${lineNumber}.price`
    )
    if (price.currency !== "RON") {
      throw new Error(
        `merged product line ${lineNumber} price must be official RON`
      )
    }
    const liveProduct = liveById.get(productId)
    const liveVariant = liveProduct?.variants.find(({ id }) => id === variantId)
    if (!(liveProduct && liveVariant) || liveVariant.ean !== ean) {
      throw new Error(`published variant ${variantId} live binding disagrees`)
    }
    if (
      liveProduct.variants.filter(({ ean: candidate }) => candidate === ean)
        .length !== 1
    ) {
      throw new Error(`published product ${productId} live EAN is ambiguous`)
    }
    const source = record(
      merged.source,
      `merged product line ${lineNumber}.source`
    )
    const sourceUrl = text(
      merged.canonical_url,
      `merged line ${lineNumber}.canonical_url`
    )
    const url = new URL(sourceUrl)
    if (
      url.protocol !== "https:" ||
      !(
        url.hostname === "herbatica.ro" ||
        url.hostname.endsWith(".herbatica.ro")
      )
    ) {
      throw new Error(
        `merged product line ${lineNumber} source URL is not official`
      )
    }
    const mergedRecordSha256 = hashBytes(line)
    sellableByProduct.set(productId, {
      ean,
      evidence: {
        mergedLine: lineNumber,
        mergedRecordSha256,
        officialContentSha256:
          source.content_sha256 === null
            ? null
            : sha256(
                source.content_sha256,
                `merged line ${lineNumber} content hash`
              ),
        retrievedAt: nullableTimestamp(
          source.retrieved_at,
          `merged line ${lineNumber} retrievedAt`
        ),
        sourceUrl,
      },
      liveSku: liveVariant.sku,
      officialSku,
      price: {
        amount: ronAmount(
          price.amount,
          `merged product line ${lineNumber}.price.amount`
        ),
        approval: {
          approvedAt: approvalTimestamp,
          approvedBy: "user-demo-authorization",
          reference: `${AUTHORIZATION}:official-ron:${lineNumber}:${mergedRecordSha256}`,
        },
        currencyCode: CURRENCY,
      },
      roAvailability: "sellable",
      variantId,
    })
  }
  if (mergedExcluded !== mergedLines.length - sellableByProduct.size) {
    throw new Error("merged official publication partition is invalid")
  }
  const publishedIds = new Set(sellableByProduct.keys())
  for (const live of liveProducts) {
    if (!(publishedIds.has(live.id) || excludedIds.has(live.id))) {
      throw new Error(`live product ${live.id} has no RO publication decision`)
    }
  }
  if (publishedIds.size + excludedIds.size !== liveProducts.length) {
    throw new Error("RO product partitions overlap or are not exhaustive")
  }
  const products = [...publishedIds].sort(compareText).map((productId) => {
    const live = liveById.get(productId)
    const sellable = sellableByProduct.get(productId)
    if (!(live && sellable)) {
      throw new Error(`published product ${productId} binding is incomplete`)
    }
    const variants: (SellableVariant | UnavailableVariant)[] = [
      sellable,
      ...live.variants
        .filter(({ id }) => id !== sellable.variantId)
        .map((variant) => ({
          ean: variant.ean,
          liveSku: variant.sku,
          officialSku: null,
          roAvailability: "unavailable" as const,
          variantId: variant.id,
        })),
    ]
    variants.sort((left, right) => compareText(left.variantId, right.variantId))
    return { productId, variants }
  })
  const publishedVariants = products.flatMap(({ variants }) => variants)
  const counts: PrecommerceExpectedCounts = {
    excludedProducts: exclusions.length,
    excludedVariants: exclusions.reduce(
      (total, exclusion) => total + exclusion.variants.length,
      0
    ),
    inventoryProducts: liveProducts.length,
    inventoryVariants: liveProducts.reduce(
      (total, product) => total + product.variants.length,
      0
    ),
    publishedProducts: products.length,
    publishedVariants: publishedVariants.length,
    sellableVariants: publishedVariants.filter(
      ({ roAvailability }) => roAvailability === "sellable"
    ).length,
    unavailableVariants: publishedVariants.filter(
      ({ roAvailability }) => roAvailability === "unavailable"
    ).length,
  }
  assertCounts(counts, expected)
  if (
    counts.publishedVariants + counts.excludedVariants !==
    counts.inventoryVariants
  ) {
    throw new Error("RO variant partitions are not exhaustive")
  }
  const artifact: PrecommercePriceAuthorityArtifact = {
    amountUnit: "major",
    authorization: AUTHORIZATION,
    counts,
    currencyCode: CURRENCY,
    exclusions,
    inventoryIdentitySha256: sha256PrecommerceInventoryIdentity(
      canonicalInventoryIdentity(liveProducts)
    ),
    kind: KIND,
    locale: "ro-RO",
    market: "ro",
    products,
    schemaVersion: 1,
    sourceRoots: roots,
  }
  const canonicalJson = serializePrecommercePriceAuthority(artifact)
  return { artifact, canonicalJson, sha256: hashBytes(canonicalJson) }
}

const parseEvidence = (value: unknown, label: string): Evidence => {
  const source = record(value, label)
  exactKeys(
    source,
    [
      "mergedLine",
      "mergedRecordSha256",
      "officialContentSha256",
      "retrievedAt",
      "sourceUrl",
    ],
    label
  )
  const mergedLine = count(source.mergedLine, `${label}.mergedLine`)
  const sourceUrl = text(source.sourceUrl, `${label}.sourceUrl`)
  const url = new URL(sourceUrl)
  if (
    mergedLine < 1 ||
    url.protocol !== "https:" ||
    !(url.hostname === "herbatica.ro" || url.hostname.endsWith(".herbatica.ro"))
  ) {
    throw new Error(`${label} is invalid`)
  }
  return {
    mergedLine,
    mergedRecordSha256: sha256(
      source.mergedRecordSha256,
      `${label}.mergedRecordSha256`
    ),
    officialContentSha256:
      source.officialContentSha256 === null
        ? null
        : sha256(
            source.officialContentSha256,
            `${label}.officialContentSha256`
          ),
    retrievedAt: nullableTimestamp(source.retrievedAt, `${label}.retrievedAt`),
    sourceUrl,
  }
}

const parseIdentityVariant = (
  value: unknown,
  label: string
): PrecommerceInventoryIdentityProduct["variants"][number] => {
  const variant = record(value, label)
  exactKeys(variant, ["ean", "liveSku", "variantId"], label)
  return {
    ean: nullableText(variant.ean, `${label}.ean`),
    liveSku: nullableText(variant.liveSku, `${label}.liveSku`),
    variantId: text(variant.variantId, `${label}.variantId`),
  }
}

export const parsePrecommercePriceAuthority = (
  contents: string,
  expected: PrecommerceExpectedCounts = RO_DEMO_FROZEN_PRECOMMERCE_COUNTS,
  expectedSourceRoots: PrecommerceExpectedSourceRoots = RO_DEMO_FROZEN_PRECOMMERCE_SOURCE_ROOTS
): PrecommercePriceAuthorityArtifact => {
  const raw = objectJson(contents, "pre-commerce price authority")
  exactKeys(
    raw,
    [
      "amountUnit",
      "authorization",
      "counts",
      "currencyCode",
      "exclusions",
      "inventoryIdentitySha256",
      "kind",
      "locale",
      "market",
      "products",
      "schemaVersion",
      "sourceRoots",
    ],
    "pre-commerce price authority"
  )
  if (
    raw.schemaVersion !== 1 ||
    raw.kind !== KIND ||
    raw.authorization !== AUTHORIZATION ||
    raw.market !== "ro" ||
    raw.locale !== "ro-RO" ||
    raw.currencyCode !== CURRENCY ||
    raw.amountUnit !== "major"
  ) {
    throw new Error("pre-commerce price authority identity is invalid")
  }
  const countSource = record(raw.counts, "counts")
  exactKeys(countSource, Object.keys(expected), "counts")
  const counts = Object.fromEntries(
    Object.keys(expected).map((field) => [
      field,
      count(countSource[field], `counts.${field}`),
    ])
  ) as PrecommerceExpectedCounts
  assertCounts(counts, expected)
  const rootSource = record(raw.sourceRoots, "sourceRoots")
  exactKeys(rootSource, Object.keys(expectedSourceRoots), "sourceRoots")
  const roots = {
    inventoryEnvelopeSha256: sha256(
      rootSource.inventoryEnvelopeSha256,
      "sourceRoots.inventoryEnvelopeSha256"
    ),
    mergedProductsSha256: sha256(
      rootSource.mergedProductsSha256,
      "sourceRoots.mergedProductsSha256"
    ),
    rawLiveInventorySha256: sha256(
      rootSource.rawLiveInventorySha256,
      "sourceRoots.rawLiveInventorySha256"
    ),
  }
  assertRoots(roots, expectedSourceRoots)
  const products = array(raw.products, "products").map((item, productIndex) => {
    const product = record(item, `products[${productIndex}]`)
    exactKeys(product, ["productId", "variants"], `products[${productIndex}]`)
    const productId = text(
      product.productId,
      `products[${productIndex}].productId`
    )
    const variants = array(
      product.variants,
      `product ${productId}.variants`
    ).map((itemVariant, variantIndex): SellableVariant | UnavailableVariant => {
      const label = `product ${productId}.variants[${variantIndex}]`
      const variant = record(itemVariant, label)
      if (variant.roAvailability === "unavailable") {
        exactKeys(
          variant,
          ["ean", "liveSku", "officialSku", "roAvailability", "variantId"],
          label
        )
        if (variant.officialSku !== null) {
          throw new Error(`${label}.officialSku must be null`)
        }
        return {
          ean: nullableText(variant.ean, `${label}.ean`),
          liveSku: nullableText(variant.liveSku, `${label}.liveSku`),
          officialSku: null,
          roAvailability: "unavailable",
          variantId: text(variant.variantId, `${label}.variantId`),
        }
      }
      exactKeys(
        variant,
        [
          "ean",
          "evidence",
          "liveSku",
          "officialSku",
          "price",
          "roAvailability",
          "variantId",
        ],
        label
      )
      if (variant.roAvailability !== "sellable") {
        throw new Error(`${label}.roAvailability is invalid`)
      }
      const evidence = parseEvidence(variant.evidence, `${label}.evidence`)
      const price = record(variant.price, `${label}.price`)
      exactKeys(price, ["amount", "approval", "currencyCode"], `${label}.price`)
      if (price.currencyCode !== CURRENCY) {
        throw new Error(`${label}.price must be ron`)
      }
      const approval = record(price.approval, `${label}.price.approval`)
      exactKeys(
        approval,
        ["approvedAt", "approvedBy", "reference"],
        `${label}.price.approval`
      )
      if (approval.approvedBy !== "user-demo-authorization") {
        throw new Error(`${label}.price approval authority is invalid`)
      }
      const reference = text(
        approval.reference,
        `${label}.price.approval.reference`
      )
      if (
        reference !==
        `${AUTHORIZATION}:official-ron:${evidence.mergedLine}:${evidence.mergedRecordSha256}`
      ) {
        throw new Error(`${label}.price approval reference disagrees`)
      }
      return {
        ean: text(variant.ean, `${label}.ean`),
        evidence,
        liveSku: nullableText(variant.liveSku, `${label}.liveSku`),
        officialSku: nullableText(variant.officialSku, `${label}.officialSku`),
        price: {
          amount: ronAmount(price.amount, `${label}.price.amount`),
          approval: {
            approvedAt: timestamp(
              approval.approvedAt,
              `${label}.price.approvedAt`
            ),
            approvedBy: "user-demo-authorization",
            reference,
          },
          currencyCode: CURRENCY,
        },
        roAvailability: "sellable",
        variantId: text(variant.variantId, `${label}.variantId`),
      }
    })
    if (
      variants.filter(({ roAvailability }) => roAvailability === "sellable")
        .length !== 1
    ) {
      throw new Error(
        `product ${productId} must have exactly one sellable variant`
      )
    }
    assertSorted(
      variants,
      ({ variantId }) => variantId,
      `product ${productId} variants`
    )
    return { productId, variants }
  })
  assertSorted(products, ({ productId }) => productId, "products")
  const exclusions = array(raw.exclusions, "exclusions").map((item, index) => {
    const exclusion = record(item, `exclusions[${index}]`)
    exactKeys(
      exclusion,
      ["decision", "productId", "variants"],
      `exclusions[${index}]`
    )
    const productId = text(
      exclusion.productId,
      `exclusions[${index}].productId`
    )
    const decisionSource = record(
      exclusion.decision,
      `exclusion ${productId}.decision`
    )
    exactKeys(
      decisionSource,
      ["approvedAt", "approvedBy", "reason", "reference"],
      `exclusion ${productId}.decision`
    )
    const variants = array(
      exclusion.variants,
      `exclusion ${productId}.variants`
    ).map((variant, variantIndex) =>
      parseIdentityVariant(
        variant,
        `exclusion ${productId}.variants[${variantIndex}]`
      )
    )
    assertSorted(
      variants,
      ({ variantId }) => variantId,
      `exclusion ${productId} variants`
    )
    return {
      decision: {
        approvedAt: timestamp(
          decisionSource.approvedAt,
          `exclusion ${productId}.approvedAt`
        ),
        approvedBy: text(
          decisionSource.approvedBy,
          `exclusion ${productId}.approvedBy`
        ),
        reason: text(decisionSource.reason, `exclusion ${productId}.reason`),
        reference: text(
          decisionSource.reference,
          `exclusion ${productId}.reference`
        ),
      },
      productId,
      variants,
    }
  })
  assertSorted(exclusions, ({ productId }) => productId, "exclusions")
  const publishedVariants = products.flatMap(({ variants }) => variants)
  const allVariantIds = [
    ...publishedVariants.map(({ variantId }) => variantId),
    ...exclusions.flatMap(({ variants }) =>
      variants.map(({ variantId }) => variantId)
    ),
  ]
  unique(allVariantIds, (variantId) => variantId, "authority variants")
  const publishedIds = new Set(products.map(({ productId }) => productId))
  if (exclusions.some(({ productId }) => publishedIds.has(productId))) {
    throw new Error("pre-commerce product partitions overlap")
  }
  const observed: PrecommerceExpectedCounts = {
    excludedProducts: exclusions.length,
    excludedVariants: exclusions.reduce(
      (total, exclusion) => total + exclusion.variants.length,
      0
    ),
    inventoryProducts: products.length + exclusions.length,
    inventoryVariants: allVariantIds.length,
    publishedProducts: products.length,
    publishedVariants: publishedVariants.length,
    sellableVariants: publishedVariants.filter(
      ({ roAvailability }) => roAvailability === "sellable"
    ).length,
    unavailableVariants: publishedVariants.filter(
      ({ roAvailability }) => roAvailability === "unavailable"
    ).length,
  }
  assertCounts(observed, counts)
  const inventoryIdentity = [
    ...products.map(({ productId, variants }) => ({
      productId,
      variants: variants.map(({ ean, liveSku, variantId }) => ({
        ean,
        liveSku,
        variantId,
      })),
    })),
    ...exclusions.map(({ productId, variants }) => ({ productId, variants })),
  ].sort((left, right) => compareText(left.productId, right.productId))
  const inventoryIdentitySha256 = sha256(
    raw.inventoryIdentitySha256,
    "inventoryIdentitySha256"
  )
  if (
    sha256PrecommerceInventoryIdentity(inventoryIdentity) !==
    inventoryIdentitySha256
  ) {
    throw new Error(
      "inventoryIdentitySha256 disagrees with full authority identity"
    )
  }
  const artifact: PrecommercePriceAuthorityArtifact = {
    amountUnit: "major",
    authorization: AUTHORIZATION,
    counts,
    currencyCode: CURRENCY,
    exclusions,
    inventoryIdentitySha256,
    kind: KIND,
    locale: "ro-RO",
    market: "ro",
    products,
    schemaVersion: 1,
    sourceRoots: roots,
  }
  if (serializePrecommercePriceAuthority(artifact) !== contents) {
    throw new Error(
      "pre-commerce price authority must be canonical JSON with LF"
    )
  }
  return artifact
}

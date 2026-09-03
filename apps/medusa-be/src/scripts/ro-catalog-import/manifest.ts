import { readFile } from "node:fs/promises"
import { extname, isAbsolute, resolve } from "node:path"
import {
  RO_CATALOG_LOCALE,
  RO_CATALOG_MARKET,
  type RoCatalogBrandEntry,
  type RoCatalogCategoryEntry,
  type RoCatalogCategoryInventory,
  type RoCatalogCliOptions,
  type RoCatalogExcludedBrandEntry,
  type RoCatalogExcludedCategoryEntry,
  type RoCatalogExcludedProductEntry,
  type RoCatalogManifest,
  type RoCatalogPostCommerceInventoryEvidence,
  type RoCatalogProductEntry,
  type RoCatalogReadinessRequirements,
} from "./types"

const IDENTIFIER = /^[\x21-\x7e]{1,255}$/
const SHA_256 = /^[a-f0-9]{64}$/
const GIT_SHA = /^[a-f0-9]{40}$/
const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const LINE_BREAK = /\r?\n/
const MAX_SLUG_LENGTH = 200
const MAX_CATEGORY_SLUG_LENGTH = 80

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const exactKeys = (
  record: Record<string, unknown>,
  allowed: readonly string[],
  required: readonly string[],
  label: string
) => {
  const allowedSet = new Set(allowed)
  const unexpected = Object.keys(record).find((key) => !allowedSet.has(key))
  const missing = required.find((key) => !Object.hasOwn(record, key))
  if (unexpected || missing) {
    throw new Error(
      unexpected
        ? `${label} contains unexpected field ${unexpected}`
        : `${label} is missing field ${missing}`
    )
  }
}

const requiredString = (
  value: unknown,
  label: string,
  options: { allowEmpty?: boolean } = {}
) => {
  if (
    typeof value !== "string" ||
    (!options.allowEmpty && value.trim().length === 0) ||
    value !== value.trim()
  ) {
    throw new Error(`${label} must be a normalized string`)
  }
  return value
}

const nullableString = (value: unknown, label: string): null | string =>
  value === null ? null : requiredString(value, label)

const nonNegativeInteger = (value: unknown, label: string) => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a non-negative integer`)
  }
  return value as number
}

const sha256 = (value: unknown, label: string) => {
  const parsed = requiredString(value, label)
  if (!SHA_256.test(parsed)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
  return parsed
}

const isoTimestamp = (value: unknown, label: string) => {
  const parsed = requiredString(value, label)
  const timestamp = new Date(parsed)
  if (Number.isNaN(timestamp.getTime()) || timestamp.toISOString() !== parsed) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp`)
  }
  return parsed
}

const stateFingerprint = (value: unknown, label: string) => {
  const record = asRecord(value, label)
  exactKeys(record, ["count", "sha256"], ["count", "sha256"], label)
  return {
    count: nonNegativeInteger(record.count, `${label}.count`),
    sha256: sha256(record.sha256, `${label}.sha256`),
  }
}

const skStateProof = (value: unknown, label: string) => {
  const record = asRecord(value, label)
  exactKeys(
    record,
    ["count", "errors", "sha256"],
    ["count", "errors", "sha256"],
    label
  )
  if (!Array.isArray(record.errors)) {
    throw new Error(`${label}.errors must be an array`)
  }
  const errors = record.errors.map((error, index) =>
    requiredString(error, `${label}.errors[${index}]`)
  )
  if (errors.length > 0) {
    throw new Error(`${label} contains SK publication errors`)
  }
  return {
    count: nonNegativeInteger(record.count, `${label}.count`),
    errors,
    sha256: sha256(record.sha256, `${label}.sha256`),
  }
}

const postCommerceInventoryEvidence = (
  value: unknown,
  label: string
): RoCatalogPostCommerceInventoryEvidence => {
  const record = asRecord(value, label)
  const fields = [
    "capturedAt",
    "commerceApplyReceiptSha256",
    "commerceManifestSha256",
    "commercePlanFileSha256",
    "commercePlanHash",
    "commerceRestoreArtifactSha256",
    "environment",
    "kind",
    "observedCommerceSnapshotSha256",
    "payloadSha256",
    "postCommerceEnvelopeSha256",
    "postCommerceSharedInventoryFingerprint",
    "postCommerceSkBaseline",
    "preCommerceSharedInventoryFingerprint",
    "preCommerceSkBaseline",
    "preCommerceSkBaselineArtifactSha256",
    "priceAuthoritySha256",
    "rawLiveInventorySha256",
    "schemaVersion",
    "sourceInventoryEnvelopeSha256",
  ] as const
  exactKeys(record, fields, fields, label)
  if (
    record.schemaVersion !== 1 ||
    record.kind !== "ro-demo-post-commerce-envelope"
  ) {
    throw new Error(`${label} header is invalid`)
  }
  const environment = asRecord(record.environment, `${label}.environment`)
  const environmentFields = [
    "backendBuildHash",
    "backendDeploymentId",
    "backendReleaseSha",
    "backendSlot",
    "databaseFingerprint",
    "databaseInstanceFingerprint",
    "environmentId",
    "locale",
    "marketCode",
    "salesChannelId",
  ] as const
  exactKeys(
    environment,
    environmentFields,
    environmentFields,
    `${label}.environment`
  )
  if (
    environment.locale !== RO_CATALOG_LOCALE ||
    environment.marketCode !== RO_CATALOG_MARKET ||
    typeof environment.backendReleaseSha !== "string" ||
    !GIT_SHA.test(environment.backendReleaseSha) ||
    (environment.backendSlot !== "blue" && environment.backendSlot !== "green")
  ) {
    throw new Error(`${label}.environment market/locale is invalid`)
  }
  const preCommerceSkBaseline = skStateProof(
    record.preCommerceSkBaseline,
    `${label}.preCommerceSkBaseline`
  )
  const postCommerceSkBaseline = skStateProof(
    record.postCommerceSkBaseline,
    `${label}.postCommerceSkBaseline`
  )
  const preCommerceSharedInventoryFingerprint = stateFingerprint(
    record.preCommerceSharedInventoryFingerprint,
    `${label}.preCommerceSharedInventoryFingerprint`
  )
  const postCommerceSharedInventoryFingerprint = stateFingerprint(
    record.postCommerceSharedInventoryFingerprint,
    `${label}.postCommerceSharedInventoryFingerprint`
  )
  if (
    JSON.stringify(preCommerceSkBaseline) !==
      JSON.stringify(postCommerceSkBaseline) ||
    JSON.stringify(preCommerceSharedInventoryFingerprint) !==
      JSON.stringify(postCommerceSharedInventoryFingerprint)
  ) {
    throw new Error(`${label} pre/post protected state does not match`)
  }
  return {
    capturedAt: isoTimestamp(record.capturedAt, `${label}.capturedAt`),
    commerceApplyReceiptSha256: sha256(
      record.commerceApplyReceiptSha256,
      `${label}.commerceApplyReceiptSha256`
    ),
    commerceManifestSha256: sha256(
      record.commerceManifestSha256,
      `${label}.commerceManifestSha256`
    ),
    commercePlanFileSha256: sha256(
      record.commercePlanFileSha256,
      `${label}.commercePlanFileSha256`
    ),
    commercePlanHash: sha256(
      record.commercePlanHash,
      `${label}.commercePlanHash`
    ),
    commerceRestoreArtifactSha256: sha256(
      record.commerceRestoreArtifactSha256,
      `${label}.commerceRestoreArtifactSha256`
    ),
    environment: {
      backendBuildHash: requiredString(
        environment.backendBuildHash,
        `${label}.environment.backendBuildHash`
      ),
      backendDeploymentId: requiredString(
        environment.backendDeploymentId,
        `${label}.environment.backendDeploymentId`
      ),
      backendReleaseSha: environment.backendReleaseSha,
      backendSlot: environment.backendSlot,
      databaseFingerprint: sha256(
        environment.databaseFingerprint,
        `${label}.environment.databaseFingerprint`
      ),
      databaseInstanceFingerprint: sha256(
        environment.databaseInstanceFingerprint,
        `${label}.environment.databaseInstanceFingerprint`
      ),
      environmentId: requiredString(
        environment.environmentId,
        `${label}.environment.environmentId`
      ),
      locale: RO_CATALOG_LOCALE,
      marketCode: RO_CATALOG_MARKET,
      salesChannelId: requiredString(
        environment.salesChannelId,
        `${label}.environment.salesChannelId`
      ),
    },
    kind: "ro-demo-post-commerce-envelope",
    observedCommerceSnapshotSha256: sha256(
      record.observedCommerceSnapshotSha256,
      `${label}.observedCommerceSnapshotSha256`
    ),
    payloadSha256: sha256(record.payloadSha256, `${label}.payloadSha256`),
    postCommerceEnvelopeSha256: sha256(
      record.postCommerceEnvelopeSha256,
      `${label}.postCommerceEnvelopeSha256`
    ),
    postCommerceSharedInventoryFingerprint,
    postCommerceSkBaseline,
    preCommerceSharedInventoryFingerprint,
    preCommerceSkBaseline,
    preCommerceSkBaselineArtifactSha256: sha256(
      record.preCommerceSkBaselineArtifactSha256,
      `${label}.preCommerceSkBaselineArtifactSha256`
    ),
    priceAuthoritySha256: sha256(
      record.priceAuthoritySha256,
      `${label}.priceAuthoritySha256`
    ),
    rawLiveInventorySha256: sha256(
      record.rawLiveInventorySha256,
      `${label}.rawLiveInventorySha256`
    ),
    schemaVersion: 1,
    sourceInventoryEnvelopeSha256: sha256(
      record.sourceInventoryEnvelopeSha256,
      `${label}.sourceInventoryEnvelopeSha256`
    ),
  }
}

const sourceEvidence = (value: unknown, label: string) => {
  const record = asRecord(value, label)
  exactKeys(
    record,
    ["contentSha256", "retrievedAt", "url"],
    ["contentSha256", "retrievedAt", "url"],
    label
  )
  const rawUrl = requiredString(record.url, `${label}.url`)
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error(`${label}.url must be a valid URL`)
  }
  if (
    url.protocol !== "https:" ||
    !(url.hostname === "herbatica.ro" || url.hostname.endsWith(".herbatica.ro"))
  ) {
    throw new Error(`${label}.url must be an official HTTPS herbatica.ro URL`)
  }
  const retrievedAt = requiredString(record.retrievedAt, `${label}.retrievedAt`)
  const parsedTimestamp = new Date(retrievedAt)
  if (
    Number.isNaN(parsedTimestamp.getTime()) ||
    parsedTimestamp.toISOString() !== retrievedAt
  ) {
    throw new Error(`${label}.retrievedAt must be an ISO-8601 UTC timestamp`)
  }
  const contentSha256 = requiredString(
    record.contentSha256,
    `${label}.contentSha256`
  )
  if (!SHA_256.test(contentSha256)) {
    throw new Error(`${label}.contentSha256 must be a lowercase SHA-256`)
  }
  return { contentSha256, retrievedAt, url: url.toString() }
}

const identifierList = (value: unknown, label: string) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`)
  }
  const parsed = value.map((candidate, index) => {
    const result = requiredString(candidate, `${label}[${index}]`)
    if (!IDENTIFIER.test(result)) {
      throw new Error(`${label}[${index}] is invalid`)
    }
    return result
  })
  if (new Set(parsed).size !== parsed.length) {
    throw new Error(`${label} must not contain duplicates`)
  }
  return parsed
}

const readinessRequirements = (
  value: unknown,
  label: string
): RoCatalogReadinessRequirements => {
  const record = asRecord(value, label)
  const fields = [
    "currencyCode",
    "paymentProviderIds",
    "regionId",
    "shippingOptionIds",
    "taxRegionIds",
  ] as const
  exactKeys(record, fields, fields, label)
  if (record.currencyCode !== "ron") {
    throw new Error(`${label}.currencyCode must be ron`)
  }
  const regionId = requiredString(record.regionId, `${label}.regionId`)
  if (!IDENTIFIER.test(regionId)) {
    throw new Error(`${label}.regionId is invalid`)
  }
  return {
    currencyCode: "ron",
    paymentProviderIds: identifierList(
      record.paymentProviderIds,
      `${label}.paymentProviderIds`
    ),
    regionId,
    shippingOptionIds: identifierList(
      record.shippingOptionIds,
      `${label}.shippingOptionIds`
    ),
    taxRegionIds: identifierList(record.taxRegionIds, `${label}.taxRegionIds`),
  }
}

const productVariants = (value: unknown, label: string) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`)
  }
  const identities = new Set<string>()
  return value.map((candidate, index) => {
    const variantLabel = `${label}[${index}]`
    const record = asRecord(candidate, variantLabel)
    exactKeys(
      record,
      ["key", "roAvailability", "ronPrice"],
      ["key", "roAvailability"],
      variantLabel
    )
    const key = asRecord(record.key, `${variantLabel}.key`)
    exactKeys(key, ["kind", "value"], ["kind", "value"], `${variantLabel}.key`)
    if (key.kind !== "sku" && key.kind !== "ean") {
      throw new Error(`${variantLabel}.key.kind must be sku or ean`)
    }
    const keyValue = requiredString(key.value, `${variantLabel}.key.value`)
    if (!IDENTIFIER.test(keyValue)) {
      throw new Error(`${variantLabel}.key.value is invalid`)
    }
    const identity = `${key.kind}:${keyValue}`
    if (identities.has(identity)) {
      throw new Error(`${label} contains duplicate key ${identity}`)
    }
    identities.add(identity)
    if (
      record.roAvailability !== "sellable" &&
      record.roAvailability !== "unavailable"
    ) {
      throw new Error(`${variantLabel}.roAvailability is invalid`)
    }
    if (record.roAvailability === "unavailable") {
      if (record.ronPrice !== undefined) {
        throw new Error(
          `${variantLabel}.ronPrice must be omitted when unavailable`
        )
      }
      return {
        key: { kind: key.kind, value: keyValue },
        roAvailability: record.roAvailability,
      } as const
    }
    const price = asRecord(record.ronPrice, `${variantLabel}.ronPrice`)
    exactKeys(
      price,
      ["amount", "approval", "currencyCode"],
      ["amount", "approval", "currencyCode"],
      `${variantLabel}.ronPrice`
    )
    if (price.currencyCode !== "ron") {
      throw new Error(`${variantLabel}.ronPrice.currencyCode must be ron`)
    }
    if (
      typeof price.amount !== "number" ||
      !Number.isSafeInteger(price.amount) ||
      price.amount < 0
    ) {
      throw new Error(
        `${variantLabel}.ronPrice.amount must be a non-negative integer`
      )
    }
    const approval = asRecord(
      price.approval,
      `${variantLabel}.ronPrice.approval`
    )
    exactKeys(
      approval,
      ["approvedAt", "approvedBy", "reference"],
      ["approvedAt", "approvedBy", "reference"],
      `${variantLabel}.ronPrice.approval`
    )
    const approvedAt = requiredString(
      approval.approvedAt,
      `${variantLabel}.ronPrice.approval.approvedAt`
    )
    const approvedTimestamp = new Date(approvedAt)
    if (
      Number.isNaN(approvedTimestamp.getTime()) ||
      approvedTimestamp.toISOString() !== approvedAt
    ) {
      throw new Error(
        `${variantLabel}.ronPrice.approval.approvedAt must be an ISO-8601 UTC timestamp`
      )
    }
    return {
      key: { kind: key.kind, value: keyValue },
      roAvailability: record.roAvailability,
      ronPrice: {
        amount: price.amount,
        approval: {
          approvedAt,
          approvedBy: requiredString(
            approval.approvedBy,
            `${variantLabel}.ronPrice.approval.approvedBy`
          ),
          reference: requiredString(
            approval.reference,
            `${variantLabel}.ronPrice.approval.reference`
          ),
        },
        currencyCode: "ron" as const,
      },
    } as const
  })
}

const productEntry = (value: unknown, label: string): RoCatalogProductEntry => {
  const record = asRecord(value, label)
  exactKeys(
    record,
    [
      "key",
      "productContent",
      "publicationStatus",
      "publicSlug",
      "source",
      "translation",
      "variants",
    ],
    [
      "key",
      "productContent",
      "publicationStatus",
      "publicSlug",
      "source",
      "translation",
      "variants",
    ],
    label
  )

  const key = asRecord(record.key, `${label}.key`)
  exactKeys(key, ["kind", "value"], ["kind", "value"], `${label}.key`)
  if (
    key.kind !== "sku" &&
    key.kind !== "ean" &&
    key.kind !== "external_id" &&
    key.kind !== "medusa_id"
  ) {
    throw new Error(
      `${label}.key.kind must be sku, ean, external_id, or medusa_id`
    )
  }
  const keyValue = requiredString(key.value, `${label}.key.value`)
  if (!IDENTIFIER.test(keyValue)) {
    throw new Error(`${label}.key.value is invalid`)
  }

  const translation = asRecord(record.translation, `${label}.translation`)
  exactKeys(
    translation,
    ["description", "subtitle", "title"],
    ["description", "title"],
    `${label}.translation`
  )
  const subtitle =
    translation.subtitle === undefined || translation.subtitle === null
      ? translation.subtitle
      : requiredString(translation.subtitle, `${label}.translation.subtitle`, {
          allowEmpty: true,
        })

  const productContent = asRecord(
    record.productContent,
    `${label}.productContent`
  )
  const contentKeys = ["composition", "other", "usage", "warning"] as const
  exactKeys(productContent, contentKeys, contentKeys, `${label}.productContent`)
  const parsedContent = Object.fromEntries(
    contentKeys.map((field) => [
      field,
      requiredString(
        productContent[field],
        `${label}.productContent.${field}`,
        { allowEmpty: true }
      ),
    ])
  ) as RoCatalogProductEntry["productContent"]

  const publicSlug = requiredString(record.publicSlug, `${label}.publicSlug`)
  if (publicSlug.length > MAX_SLUG_LENGTH || !PUBLIC_SLUG.test(publicSlug)) {
    throw new Error(`${label}.publicSlug is invalid`)
  }
  if (
    record.publicationStatus !== "draft" &&
    record.publicationStatus !== "published"
  ) {
    throw new Error(`${label}.publicationStatus is invalid`)
  }

  return {
    key: { kind: key.kind, value: keyValue },
    productContent: parsedContent,
    publicationStatus: record.publicationStatus,
    publicSlug,
    source: sourceEvidence(record.source, `${label}.source`),
    translation: {
      description: requiredString(
        translation.description,
        `${label}.translation.description`
      ),
      ...(subtitle !== undefined ? { subtitle } : {}),
      title: requiredString(translation.title, `${label}.translation.title`),
    },
    variants: productVariants(record.variants, `${label}.variants`),
  }
}

const excludedProductEntry = (
  value: unknown,
  label: string
): RoCatalogExcludedProductEntry => {
  const record = asRecord(value, label)
  const fields = ["decision", "key", "reason", "source"] as const
  exactKeys(record, fields, fields, label)
  const key = asRecord(record.key, `${label}.key`)
  exactKeys(key, ["kind", "value"], ["kind", "value"], `${label}.key`)
  if (
    key.kind !== "sku" &&
    key.kind !== "ean" &&
    key.kind !== "external_id" &&
    key.kind !== "medusa_id"
  ) {
    throw new Error(`${label}.key.kind is invalid`)
  }
  const keyValue = requiredString(key.value, `${label}.key.value`)
  if (!IDENTIFIER.test(keyValue)) {
    throw new Error(`${label}.key.value is invalid`)
  }
  const decision = asRecord(record.decision, `${label}.decision`)
  const decisionFields = ["approvedAt", "approvedBy", "reference"] as const
  exactKeys(decision, decisionFields, decisionFields, `${label}.decision`)
  const approvedAt = requiredString(
    decision.approvedAt,
    `${label}.decision.approvedAt`
  )
  const timestamp = new Date(approvedAt)
  if (
    Number.isNaN(timestamp.getTime()) ||
    timestamp.toISOString() !== approvedAt
  ) {
    throw new Error(
      `${label}.decision.approvedAt must be an ISO-8601 UTC timestamp`
    )
  }
  return {
    decision: {
      approvedAt,
      approvedBy: requiredString(
        decision.approvedBy,
        `${label}.decision.approvedBy`
      ),
      reference: requiredString(
        decision.reference,
        `${label}.decision.reference`
      ),
    },
    key: { kind: key.kind, value: keyValue },
    reason: requiredString(record.reason, `${label}.reason`),
    source: sourceEvidence(record.source, `${label}.source`),
  }
}

const categoryKey = (
  value: unknown,
  label: string
): RoCatalogCategoryEntry["key"] => {
  const record = asRecord(value, label)
  exactKeys(record, ["kind", "value"], ["kind", "value"], label)
  if (
    record.kind !== "source_category_id" &&
    record.kind !== "source_guid" &&
    record.kind !== "medusa_id"
  ) {
    throw new Error(
      `${label}.kind must be source_category_id, source_guid, or medusa_id`
    )
  }
  const keyValue = requiredString(record.value, `${label}.value`)
  if (!IDENTIFIER.test(keyValue)) {
    throw new Error(`${label}.value is invalid`)
  }
  return { kind: record.kind, value: keyValue }
}

const categoryEntry = (
  value: unknown,
  label: string
): RoCatalogCategoryEntry => {
  const record = asRecord(value, label)
  const fields = [
    "expectedDirectChildCount",
    "expectedDirectProductCount",
    "key",
    "parentKey",
    "publicationStatus",
    "publicSlug",
    "salesChannelId",
    "source",
    "translation",
  ] as const
  exactKeys(record, fields, fields, label)
  if (
    record.publicationStatus !== "draft" &&
    record.publicationStatus !== "published"
  ) {
    throw new Error(`${label}.publicationStatus is invalid`)
  }
  const publicSlug = requiredString(record.publicSlug, `${label}.publicSlug`)
  if (
    publicSlug.length > MAX_CATEGORY_SLUG_LENGTH ||
    !PUBLIC_SLUG.test(publicSlug)
  ) {
    throw new Error(`${label}.publicSlug is invalid`)
  }
  const salesChannelId = requiredString(
    record.salesChannelId,
    `${label}.salesChannelId`
  )
  if (!IDENTIFIER.test(salesChannelId)) {
    throw new Error(`${label}.salesChannelId is invalid`)
  }
  const translation = categoryTranslation(
    record.translation,
    `${label}.translation`
  )
  return {
    expectedDirectChildCount: nonNegativeInteger(
      record.expectedDirectChildCount,
      `${label}.expectedDirectChildCount`
    ),
    expectedDirectProductCount: nonNegativeInteger(
      record.expectedDirectProductCount,
      `${label}.expectedDirectProductCount`
    ),
    key: categoryKey(record.key, `${label}.key`),
    parentKey:
      record.parentKey === null
        ? null
        : categoryKey(record.parentKey, `${label}.parentKey`),
    publicationStatus: record.publicationStatus,
    publicSlug,
    salesChannelId,
    source: sourceEvidence(record.source, `${label}.source`),
    translation,
  }
}

const categoryTranslation = (
  value: unknown,
  label: string
): RoCatalogCategoryEntry["translation"] => {
  const translation = asRecord(value, label)
  const translationFields = [
    "bottom_description_html",
    "description",
    "meta_description",
    "meta_title",
    "name",
    "top_description_html",
  ] as const
  exactKeys(translation, translationFields, translationFields, label)
  return {
    bottom_description_html: nullableString(
      translation.bottom_description_html,
      `${label}.bottom_description_html`
    ),
    description: nullableString(
      translation.description,
      `${label}.description`
    ),
    meta_description: nullableString(
      translation.meta_description,
      `${label}.meta_description`
    ),
    meta_title: nullableString(translation.meta_title, `${label}.meta_title`),
    name: requiredString(translation.name, `${label}.name`),
    top_description_html: nullableString(
      translation.top_description_html,
      `${label}.top_description_html`
    ),
  }
}

const excludedCategoryEntry = (
  value: unknown,
  label: string
): RoCatalogExcludedCategoryEntry => {
  const record = asRecord(value, label)
  const fields = ["decision", "key", "reason", "source", "translation"] as const
  exactKeys(record, fields, fields, label)
  const decision = asRecord(record.decision, `${label}.decision`)
  const decisionFields = ["approvedAt", "approvedBy", "reference"] as const
  exactKeys(decision, decisionFields, decisionFields, `${label}.decision`)
  const approvedAt = requiredString(
    decision.approvedAt,
    `${label}.decision.approvedAt`
  )
  const timestamp = new Date(approvedAt)
  if (
    Number.isNaN(timestamp.getTime()) ||
    timestamp.toISOString() !== approvedAt
  ) {
    throw new Error(
      `${label}.decision.approvedAt must be an ISO-8601 UTC timestamp`
    )
  }
  return {
    decision: {
      approvedAt,
      approvedBy: requiredString(
        decision.approvedBy,
        `${label}.decision.approvedBy`
      ),
      reference: requiredString(
        decision.reference,
        `${label}.decision.reference`
      ),
    },
    key: categoryKey(record.key, `${label}.key`),
    reason: requiredString(record.reason, `${label}.reason`),
    source: sourceEvidence(record.source, `${label}.source`),
    translation: categoryTranslation(
      record.translation,
      `${label}.translation`
    ),
  }
}

const categoryInventory = (
  value: unknown,
  label: string
): RoCatalogCategoryInventory => {
  const record = asRecord(value, label)
  const fields = ["activeCount", "rootCount"] as const
  exactKeys(record, fields, fields, label)
  return {
    activeCount: nonNegativeInteger(record.activeCount, `${label}.activeCount`),
    rootCount: nonNegativeInteger(record.rootCount, `${label}.rootCount`),
  }
}

const brandEntry = (value: unknown, label: string): RoCatalogBrandEntry => {
  const record = asRecord(value, label)
  const fields = [
    "key",
    "publicationStatus",
    "publicSlug",
    "salesChannelId",
    "source",
    "translation",
  ] as const
  exactKeys(record, fields, fields, label)
  const key = asRecord(record.key, `${label}.key`)
  exactKeys(key, ["kind", "value"], ["kind", "value"], `${label}.key`)
  if (key.kind !== "medusa_id") {
    throw new Error(`${label}.key.kind must be medusa_id`)
  }
  const translation = asRecord(record.translation, `${label}.translation`)
  exactKeys(translation, ["title"], ["title"], `${label}.translation`)
  const publicSlug = requiredString(record.publicSlug, `${label}.publicSlug`)
  if (
    publicSlug.length > MAX_CATEGORY_SLUG_LENGTH ||
    !PUBLIC_SLUG.test(publicSlug)
  ) {
    throw new Error(`${label}.publicSlug is invalid`)
  }
  if (
    record.publicationStatus !== "draft" &&
    record.publicationStatus !== "published"
  ) {
    throw new Error(`${label}.publicationStatus is invalid`)
  }
  return {
    key: {
      kind: "medusa_id",
      value: requiredString(key.value, `${label}.key.value`),
    },
    publicationStatus: record.publicationStatus,
    publicSlug,
    salesChannelId: requiredString(
      record.salesChannelId,
      `${label}.salesChannelId`
    ),
    source: sourceEvidence(record.source, `${label}.source`),
    translation: {
      title: requiredString(translation.title, `${label}.translation.title`),
    },
  }
}

const excludedBrandEntry = (
  value: unknown,
  label: string
): RoCatalogExcludedBrandEntry => {
  const parsed = excludedProductEntry(value, label)
  if (parsed.key.kind !== "medusa_id") {
    throw new Error(`${label}.key.kind must be medusa_id`)
  }
  return {
    decision: parsed.decision,
    key: { kind: "medusa_id", value: parsed.key.value },
    reason: parsed.reason,
    source: parsed.source,
  }
}

const assertManifestIdentity = (
  record: Record<string, unknown>,
  label: string
) => {
  if (record.schemaVersion !== 1) {
    throw new Error(`${label}.schemaVersion must be 1`)
  }
  if (record.market !== RO_CATALOG_MARKET) {
    throw new Error(`${label}.market must be ${RO_CATALOG_MARKET}`)
  }
  if (record.locale !== RO_CATALOG_LOCALE) {
    throw new Error(`${label}.locale must be ${RO_CATALOG_LOCALE}`)
  }
}

const optionalEntries = <Value>(
  value: unknown,
  label: string,
  parse: (candidate: unknown, candidateLabel: string) => Value
): Value[] => {
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  return value.map((candidate, index) => parse(candidate, `${label}[${index}]`))
}

const assertUniqueEntries = (products: readonly RoCatalogProductEntry[]) => {
  const keyOwners = new Set<string>()
  const slugOwners = new Set<string>()
  for (const product of products) {
    const key = `${product.key.kind}:${product.key.value}`
    if (keyOwners.has(key)) {
      throw new Error(`manifest contains duplicate product key ${key}`)
    }
    if (slugOwners.has(product.publicSlug)) {
      throw new Error(
        `manifest contains duplicate publicSlug ${product.publicSlug}`
      )
    }
    keyOwners.add(key)
    slugOwners.add(product.publicSlug)
  }
}

const assertUniqueExcludedProducts = (
  products: readonly RoCatalogProductEntry[],
  excludedProducts: readonly RoCatalogExcludedProductEntry[]
) => {
  const includedKeys = new Set(
    products.map(({ key }) => `${key.kind}:${key.value}`)
  )
  const excludedKeys = new Set<string>()
  for (const excluded of excludedProducts) {
    const key = `${excluded.key.kind}:${excluded.key.value}`
    if (includedKeys.has(key) || excludedKeys.has(key)) {
      throw new Error(
        `manifest contains duplicate included/excluded product key ${key}`
      )
    }
    excludedKeys.add(key)
  }
}

const assertUniqueCategories = (
  categories: readonly RoCatalogCategoryEntry[],
  excludedCategories: readonly RoCatalogExcludedCategoryEntry[],
  inventory?: RoCatalogCategoryInventory
) => {
  const keyOwners = new Set<string>()
  const slugOwners = new Set<string>()
  for (const category of categories) {
    const key = `${category.key.kind}:${category.key.value}`
    if (keyOwners.has(key)) {
      throw new Error(`manifest contains duplicate category key ${key}`)
    }
    if (slugOwners.has(category.publicSlug)) {
      throw new Error(
        `manifest contains duplicate category publicSlug ${category.publicSlug}`
      )
    }
    keyOwners.add(key)
    slugOwners.add(category.publicSlug)
  }
  for (const category of excludedCategories) {
    const key = `${category.key.kind}:${category.key.value}`
    if (keyOwners.has(key)) {
      throw new Error(
        `manifest contains duplicate included/excluded category key ${key}`
      )
    }
    keyOwners.add(key)
  }
  if (!inventory) {
    return
  }
  if (inventory.activeCount !== categories.length + excludedCategories.length) {
    throw new Error(
      `manifest.categoryInventory.activeCount must equal ${categories.length + excludedCategories.length}`
    )
  }
  const keyOf = (category: RoCatalogCategoryEntry) =>
    `${category.key.kind}:${category.key.value}`
  const parentOf = (category: RoCatalogCategoryEntry) =>
    category.parentKey
      ? `${category.parentKey.kind}:${category.parentKey.value}`
      : null
  const byKey = new Map(
    categories.map((category) => [keyOf(category), category])
  )
  const knownKeys = new Set(keyOwners)
  for (const category of categories) {
    const key = keyOf(category)
    const parent = parentOf(category)
    if (parent === key) {
      throw new Error(`category ${key} cannot be its own parent`)
    }
    if (parent && !knownKeys.has(parent)) {
      throw new Error(`category ${key} parent ${parent} is not in manifest`)
    }
    const visited = new Set([key])
    let cursor = parent
    while (cursor) {
      if (visited.has(cursor)) {
        throw new Error(`category hierarchy contains a cycle at ${cursor}`)
      }
      visited.add(cursor)
      const parentCategory = byKey.get(cursor)
      cursor = parentCategory ? parentOf(parentCategory) : null
    }
  }
}

export const parseRoCatalogJson = (text: string): RoCatalogManifest => {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (error) {
    throw new Error(`manifest is not valid JSON: ${(error as Error).message}`)
  }
  const record = asRecord(value, "manifest")
  exactKeys(
    record,
    [
      "categories",
      "brandInventory",
      "brands",
      "categoryInventory",
      "collectionInventory",
      "excludedCategories",
      "excludedBrands",
      "excludedProducts",
      "locale",
      "market",
      "omissionMode",
      "postCommerceInventoryEvidence",
      "products",
      "readiness",
      "schemaVersion",
    ],
    [
      "brandInventory",
      "brands",
      "collectionInventory",
      "locale",
      "market",
      "postCommerceInventoryEvidence",
      "products",
      "readiness",
      "schemaVersion",
    ],
    "manifest"
  )
  assertManifestIdentity(record, "manifest")
  if (
    record.omissionMode !== undefined &&
    record.omissionMode !== "official-ro-description-only"
  ) {
    throw new Error(
      "manifest.omissionMode must be official-ro-description-only"
    )
  }
  if (!Array.isArray(record.products) || record.products.length === 0) {
    throw new Error("manifest.products must be a non-empty array")
  }
  const products = record.products.map((entry, index) =>
    productEntry(entry, `manifest.products[${index}]`)
  )
  const rawBrandInventory = asRecord(
    record.brandInventory,
    "manifest.brandInventory"
  )
  exactKeys(rawBrandInventory, ["count"], ["count"], "manifest.brandInventory")
  if (!Array.isArray(record.brands)) {
    throw new Error("manifest.brands must be an array")
  }
  const brands = record.brands.map((entry, index) =>
    brandEntry(entry, `manifest.brands[${index}]`)
  )
  const excludedBrands = optionalEntries(
    record.excludedBrands,
    "manifest.excludedBrands",
    excludedBrandEntry
  )
  const brandCount = nonNegativeInteger(
    rawBrandInventory.count,
    "manifest.brandInventory.count"
  )
  if (brandCount !== brands.length + excludedBrands.length) {
    throw new Error(
      "manifest.brandInventory.count must equal brands plus excludedBrands"
    )
  }
  const rawCollectionInventory = asRecord(
    record.collectionInventory,
    "manifest.collectionInventory"
  )
  exactKeys(
    rawCollectionInventory,
    ["count"],
    ["count"],
    "manifest.collectionInventory"
  )
  if (rawCollectionInventory.count !== 0) {
    throw new Error("manifest.collectionInventory.count must be 0")
  }
  if (new Set(brands.map(({ key }) => key.value)).size !== brands.length) {
    throw new Error("manifest contains duplicate brand medusa_id")
  }
  const brandKeys = [
    ...brands.map(({ key }) => key.value),
    ...excludedBrands.map(({ key }) => key.value),
  ]
  if (new Set(brandKeys).size !== brandKeys.length) {
    throw new Error(
      "manifest contains duplicate included/excluded brand medusa_id"
    )
  }
  if (
    new Set(brands.map(({ publicSlug }) => publicSlug)).size !== brands.length
  ) {
    throw new Error("manifest contains duplicate brand publicSlug")
  }
  const excludedProducts = optionalEntries(
    record.excludedProducts,
    "manifest.excludedProducts",
    excludedProductEntry
  )
  const excludedCategories = optionalEntries(
    record.excludedCategories,
    "manifest.excludedCategories",
    excludedCategoryEntry
  )
  if (
    ((Array.isArray(record.categories) && record.categories.length > 0) ||
      excludedCategories.length > 0) !==
    (record.categoryInventory !== undefined)
  ) {
    throw new Error(
      "manifest.categories and manifest.categoryInventory must be supplied together"
    )
  }
  let categories: RoCatalogCategoryEntry[] = []
  if (record.categories !== undefined) {
    if (!Array.isArray(record.categories) || record.categories.length === 0) {
      throw new Error("manifest.categories must be a non-empty array")
    }
    categories = record.categories.map((entry, index) =>
      categoryEntry(entry, `manifest.categories[${index}]`)
    )
  }
  const parsedCategoryInventory =
    record.categoryInventory === undefined
      ? undefined
      : categoryInventory(
          record.categoryInventory,
          "manifest.categoryInventory"
        )
  assertUniqueEntries(products)
  assertUniqueExcludedProducts(products, excludedProducts)
  assertUniqueCategories(
    categories,
    excludedCategories,
    parsedCategoryInventory
  )
  return {
    brandInventory: { count: brandCount },
    brands,
    categories,
    collectionInventory: { count: 0 },
    ...(parsedCategoryInventory === undefined
      ? {}
      : {
          categoryInventory: parsedCategoryInventory,
        }),
    excludedProducts,
    excludedCategories,
    excludedBrands,
    locale: RO_CATALOG_LOCALE,
    market: RO_CATALOG_MARKET,
    ...(record.omissionMode === undefined
      ? {}
      : { omissionMode: record.omissionMode }),
    postCommerceInventoryEvidence: postCommerceInventoryEvidence(
      record.postCommerceInventoryEvidence,
      "manifest.postCommerceInventoryEvidence"
    ),
    products,
    readiness: readinessRequirements(record.readiness, "manifest.readiness"),
    schemaVersion: 1,
  }
}

export const parseRoCatalogJsonl = (text: string): RoCatalogManifest => {
  const lines = text
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) {
    throw new Error("JSONL manifest must contain at least one product")
  }
  let readiness: RoCatalogReadinessRequirements | undefined
  let evidence: RoCatalogPostCommerceInventoryEvidence | undefined
  const products = lines.map((line, index) => {
    let value: unknown
    try {
      value = JSON.parse(line)
    } catch (error) {
      throw new Error(
        `JSONL line ${index + 1} is invalid: ${(error as Error).message}`
      )
    }
    const record = asRecord(value, `JSONL line ${index + 1}`)
    exactKeys(
      record,
      [
        "locale",
        "market",
        "postCommerceInventoryEvidence",
        "product",
        "readiness",
        "schemaVersion",
      ],
      [
        "locale",
        "market",
        "postCommerceInventoryEvidence",
        "product",
        "readiness",
        "schemaVersion",
      ],
      `JSONL line ${index + 1}`
    )
    assertManifestIdentity(record, `JSONL line ${index + 1}`)
    const currentReadiness = readinessRequirements(
      record.readiness,
      `JSONL line ${index + 1}.readiness`
    )
    if (
      readiness &&
      JSON.stringify(readiness) !== JSON.stringify(currentReadiness)
    ) {
      throw new Error(
        "all JSONL lines must use identical readiness requirements"
      )
    }
    readiness = currentReadiness
    const currentEvidence = postCommerceInventoryEvidence(
      record.postCommerceInventoryEvidence,
      `JSONL line ${index + 1}.postCommerceInventoryEvidence`
    )
    if (
      evidence &&
      JSON.stringify(evidence) !== JSON.stringify(currentEvidence)
    ) {
      throw new Error(
        "all JSONL lines must use identical post-commerce inventory evidence"
      )
    }
    evidence = currentEvidence
    return productEntry(record.product, `JSONL line ${index + 1}.product`)
  })
  assertUniqueEntries(products)
  return {
    brandInventory: { count: 0 },
    brands: [],
    categories: [],
    collectionInventory: { count: 0 },
    excludedCategories: [],
    excludedBrands: [],
    excludedProducts: [],
    locale: RO_CATALOG_LOCALE,
    market: RO_CATALOG_MARKET,
    postCommerceInventoryEvidence:
      evidence as RoCatalogPostCommerceInventoryEvidence,
    products,
    readiness: readiness as RoCatalogReadinessRequirements,
    schemaVersion: 1,
  }
}

export const loadRoCatalogManifest = async (manifestPath: string) => {
  const absolutePath = resolve(manifestPath)
  const extension = extname(absolutePath).toLowerCase()
  if (extension !== ".json" && extension !== ".jsonl") {
    throw new Error("manifest path must end in .json or .jsonl")
  }
  const text = await readFile(absolutePath, "utf8")
  return {
    absolutePath,
    manifest:
      extension === ".json"
        ? parseRoCatalogJson(text)
        : parseRoCatalogJsonl(text),
  }
}

export const parseRoCatalogCliOptions = (
  args: readonly string[]
): RoCatalogCliOptions => {
  let apply = false
  let chunkSize = 25
  let confirmPlanHash: string | undefined
  let generationPlanPath: string | undefined
  let manifestPath: string | undefined
  let omissionLedgerOutputPath: string | undefined
  let planOutputPath: string | undefined
  let postCommerceEnvelopePath: string | undefined
  let salesChannelId: string | undefined
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === "--apply") {
      if (apply) {
        throw new Error("--apply may only be supplied once")
      }
      apply = true
      continue
    }
    if (
      argument !== "--generation-plan" &&
      argument !== "--manifest" &&
      argument !== "--omission-ledger-output" &&
      argument !== "--plan-output" &&
      argument !== "--post-commerce-envelope" &&
      argument !== "--chunk-size" &&
      argument !== "--confirm-plan-hash" &&
      argument !== "--sales-channel-id"
    ) {
      throw new Error(`unknown argument ${argument}`)
    }
    const value = args[index + 1]
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a value`)
    }
    index += 1
    if (argument === "--confirm-plan-hash") {
      if (confirmPlanHash || !SHA_256.test(value)) {
        throw new Error("--confirm-plan-hash is duplicated or invalid")
      }
      confirmPlanHash = value
    } else if (argument === "--generation-plan") {
      if (
        generationPlanPath ||
        !isAbsolute(value) ||
        extname(value).toLowerCase() !== ".json"
      ) {
        throw new Error(
          "--generation-plan must be supplied once as an absolute .json path"
        )
      }
      generationPlanPath = value
    } else if (argument === "--manifest") {
      if (manifestPath) {
        throw new Error("--manifest may only be supplied once")
      }
      manifestPath = value
    } else if (argument === "--omission-ledger-output") {
      if (omissionLedgerOutputPath || !isAbsolute(value)) {
        throw new Error(
          "--omission-ledger-output must be supplied once as an absolute path"
        )
      }
      omissionLedgerOutputPath = value
    } else if (argument === "--plan-output") {
      if (planOutputPath || !isAbsolute(value)) {
        throw new Error(
          "--plan-output must be supplied once as an absolute path"
        )
      }
      planOutputPath = value
    } else if (argument === "--post-commerce-envelope") {
      if (
        postCommerceEnvelopePath ||
        !isAbsolute(value) ||
        extname(value).toLowerCase() !== ".json"
      ) {
        throw new Error(
          "--post-commerce-envelope must be supplied once as an absolute .json path"
        )
      }
      postCommerceEnvelopePath = value
    } else if (argument === "--sales-channel-id") {
      if (salesChannelId || !IDENTIFIER.test(value)) {
        throw new Error("--sales-channel-id is duplicated or invalid")
      }
      salesChannelId = value
    } else {
      chunkSize = Number(value)
      if (
        !Number.isSafeInteger(chunkSize) ||
        chunkSize < 1 ||
        chunkSize > 100
      ) {
        throw new Error("--chunk-size must be an integer between 1 and 100")
      }
    }
  }
  if (!manifestPath) {
    throw new Error("--manifest is required")
  }
  if (!generationPlanPath) {
    throw new Error(
      "--generation-plan is required and must be an absolute .json path"
    )
  }
  if (!planOutputPath) {
    throw new Error("--plan-output is required and must be an absolute path")
  }
  if (!postCommerceEnvelopePath) {
    throw new Error(
      "--post-commerce-envelope is required and must be an absolute .json path"
    )
  }
  return {
    apply,
    chunkSize,
    confirmPlanHash,
    generationPlanPath,
    manifestPath,
    omissionLedgerOutputPath,
    planOutputPath,
    postCommerceEnvelopePath,
    salesChannelId,
  }
}

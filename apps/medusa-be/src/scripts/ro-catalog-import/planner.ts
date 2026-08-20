import { createHash } from "node:crypto"
import { salesChannelSupportsMarket } from "../../utils/notification-market-context"
import {
  createRoDemoOmissionAuthority,
  RO_DEMO_OMISSION_AUTHORITY_KEY,
} from "../../utils/ro-demo-omission-authority"
import { buildDemoOmissionLedgerHash } from "../ro-catalog-readiness"
import { hashRoCatalogImportScope } from "./scope"
import type {
  CatalogCategorySnapshot,
  CatalogProductSnapshot,
  CategoryUrlAssignmentSnapshot,
  ExistingTranslation,
  RoCatalogBrandPlanItem,
  RoCatalogCategoryEntry,
  RoCatalogCategoryPlanItem,
  RoCatalogExcludedBrandPlanItem,
  RoCatalogExcludedCategoryPlanItem,
  RoCatalogExcludedProductPlanItem,
  RoCatalogImportPlan,
  RoCatalogImportPlanItem,
  RoCatalogManifest,
  RoCatalogOmissionLedger,
  RoCatalogProductEntry,
  RoCatalogProductKey,
  RoCatalogSnapshot,
  TranslationMutation,
} from "./types"

const PUBLICATION_KEY = "url_registry_publication"
const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PUBLICATION_MARKETS = new Set(["cz", "hu", "ro", "sk"])
const CATEGORY_ASSIGNMENT_STATUSES = new Set(["draft", "published"])
const MAX_CATEGORY_SLUG_LENGTH = 80
const CATEGORY_KEY_METADATA_FIELD = {
  source_category_id: "source_category_id",
  source_guid: "source_guid",
} as const

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }
  const record = asRecord(value)
  if (record) {
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

const same = (left: unknown, right: unknown) =>
  stableJson(left) === stableJson(right)

const exactlyOne = <Value>(
  values: readonly Value[],
  errorMessage: string
): Value => {
  const [value, ...remaining] = values
  if (value === undefined || remaining.length !== 0) {
    throw new Error(errorMessage)
  }
  return value
}

const productMatches = (
  product: CatalogProductSnapshot,
  entry: Readonly<{ key: RoCatalogProductKey }>
) => {
  if (entry.key.kind === "medusa_id") {
    return product.id === entry.key.value
  }
  if (entry.key.kind === "external_id") {
    return product.externalId === entry.key.value
  }
  return product.variants.some((variant) =>
    entry.key.kind === "sku"
      ? variant.sku === entry.key.value
      : variant.ean === entry.key.value
  )
}

const productKeyLabel = (entry: Readonly<{ key: RoCatalogProductKey }>) =>
  `${entry.key.kind}:${entry.key.value}`

const categoryMatches = (
  category: CatalogCategorySnapshot,
  entry: Pick<RoCatalogCategoryEntry, "key">
) => {
  if (entry.key.kind === "medusa_id") {
    return category.id === entry.key.value
  }
  return (
    category.metadata[CATEGORY_KEY_METADATA_FIELD[entry.key.kind]] ===
    entry.key.value
  )
}

const categoryKeyLabel = (entry: RoCatalogCategoryEntry) =>
  `${entry.key.kind}:${entry.key.value}`

const existingRoAssignment = (product: CatalogProductSnapshot) => {
  const publication = asRecord(product.metadata[PUBLICATION_KEY])
  const markets = asRecord(publication?.markets)
  return markets?.ro ?? null
}

const assignmentSalesChannel = (value: unknown): string | null => {
  const assignment = asRecord(value)
  return typeof assignment?.salesChannelId === "string"
    ? assignment.salesChannelId
    : null
}

const assignmentSlug = (value: unknown): string | null => {
  const assignment = asRecord(value)
  return typeof assignment?.publicSlug === "string"
    ? assignment.publicSlug
    : null
}

const assignmentPublicationStatus = (value: unknown): string | null => {
  const assignment = asRecord(value)
  return typeof assignment?.publicationStatus === "string"
    ? assignment.publicationStatus
    : null
}

const assertPublicationShape = (
  product: CatalogProductSnapshot,
  label: string
) => {
  const publication = product.metadata[PUBLICATION_KEY]
  if (publication === undefined || publication === null) {
    return
  }
  const publicationRecord = asRecord(publication)
  const markets = asRecord(publicationRecord?.markets)
  if (
    publicationRecord?.schemaVersion !== 1 ||
    !markets ||
    Object.keys(publicationRecord).some(
      (key) => key !== "markets" && key !== "schemaVersion"
    )
  ) {
    throw new Error(`${label} has malformed URL publication metadata`)
  }
  const channelOwners = new Map<string, string>()
  for (const [market, rawAssignment] of Object.entries(markets)) {
    const assignment = asRecord(rawAssignment)
    if (
      !(PUBLICATION_MARKETS.has(market) && assignment) ||
      Object.keys(assignment).length !== 3 ||
      Object.keys(assignment).some(
        (key) =>
          key !== "publicationStatus" &&
          key !== "publicSlug" &&
          key !== "salesChannelId"
      ) ||
      (assignment.publicationStatus !== "draft" &&
        assignment.publicationStatus !== "published") ||
      typeof assignment.publicSlug !== "string" ||
      assignment.publicSlug.length > 200 ||
      !PUBLIC_SLUG.test(assignment.publicSlug) ||
      typeof assignment.salesChannelId !== "string" ||
      !product.salesChannelIds.includes(assignment.salesChannelId)
    ) {
      throw new Error(`${label} has malformed ${market} URL assignment`)
    }
    const previousMarket = channelOwners.get(assignment.salesChannelId)
    if (previousMarket) {
      throw new Error(
        `${label} assigns sales channel ${assignment.salesChannelId} to both ${previousMarket} and ${market}`
      )
    }
    channelOwners.set(assignment.salesChannelId, market)
  }
}

const oneTranslation = (
  translations: readonly ExistingTranslation[],
  reference: ExistingTranslation["reference"],
  referenceId: string
) => {
  const matches = translations.filter(
    (translation) =>
      translation.localeCode === "ro-RO" &&
      translation.reference === reference &&
      translation.referenceId === referenceId
  )
  if (matches.length > 1) {
    throw new Error(
      `ambiguous ro-RO ${reference} translations for ${referenceId}`
    )
  }
  return matches[0]
}

const translationMutation = ({
  desired,
  existing,
  reference,
  referenceId,
  removeKeys = [],
}: Readonly<{
  desired: Readonly<Record<string, unknown>>
  existing?: ExistingTranslation
  reference: ExistingTranslation["reference"]
  referenceId?: string
  removeKeys?: readonly string[]
}>): TranslationMutation => {
  const translations = { ...(existing?.translations ?? {}), ...desired }
  for (const key of removeKeys) {
    delete translations[key]
  }
  let action: TranslationMutation["action"] = "create"
  if (existing) {
    action = same(existing.translations, translations) ? "unchanged" : "update"
  }
  return {
    action,
    ...(existing ? { existingId: existing.id } : {}),
    ...(existing ? { previousTranslations: existing.translations } : {}),
    reference,
    ...(referenceId ? { referenceId } : {}),
    translations,
  }
}

const desiredAssignment = (
  entry: RoCatalogProductEntry,
  salesChannelId: string
) => ({
  publicationStatus: entry.publicationStatus,
  publicSlug: entry.publicSlug,
  salesChannelId,
})

const desiredCategoryAssignment = (entry: RoCatalogCategoryEntry) => ({
  publicationStatus: entry.publicationStatus,
  publicSlug: entry.publicSlug,
  salesChannelId: entry.salesChannelId,
})

const categoryAssignmentValue = (
  assignment: CategoryUrlAssignmentSnapshot | null
) =>
  assignment
    ? {
        publicationStatus: assignment.publicationStatus,
        publicSlug: assignment.publicSlug,
        salesChannelId: assignment.salesChannelId,
      }
    : null

const buildCategoryItems = (
  manifest: RoCatalogManifest,
  snapshot: RoCatalogSnapshot
): RoCatalogCategoryPlanItem[] => {
  if (manifest.categories.length === 0) {
    if (manifest.categoryInventory) {
      throw new Error("category inventory requires category entries")
    }
    return []
  }
  const inventory = manifest.categoryInventory
  if (!inventory) {
    throw new Error("category entries require category inventory")
  }
  const activeCategories = snapshot.categories.filter(
    ({ isActive }) => isActive
  )
  const rootCount = activeCategories.filter(
    ({ parentId }) => parentId === null
  ).length
  if (
    activeCategories.length !== inventory.activeCount ||
    manifest.categories.length + manifest.excludedCategories.length !==
      inventory.activeCount
  ) {
    throw new Error(
      `active category inventory mismatch: manifest=${inventory.activeCount}, included=${manifest.categories.length}, excluded=${manifest.excludedCategories.length}, catalog=${activeCategories.length}`
    )
  }
  if (rootCount !== inventory.rootCount) {
    throw new Error(
      `root category inventory mismatch: manifest=${inventory.rootCount}, catalog=${rootCount}`
    )
  }
  for (const assignment of snapshot.categoryAssignments) {
    if (
      assignment.entityId.length === 0 ||
      assignment.id.length === 0 ||
      assignment.marketCode.length === 0 ||
      !PUBLICATION_MARKETS.has(assignment.marketCode) ||
      !CATEGORY_ASSIGNMENT_STATUSES.has(assignment.publicationStatus) ||
      assignment.publicSlug.length === 0 ||
      assignment.publicSlug.length > MAX_CATEGORY_SLUG_LENGTH ||
      !PUBLIC_SLUG.test(assignment.publicSlug) ||
      assignment.salesChannelId.length === 0 ||
      !Number.isSafeInteger(assignment.sourceVersion) ||
      assignment.sourceVersion < 1
    ) {
      throw new Error("category URL assignment state is malformed")
    }
  }
  const activeIds = new Set(activeCategories.map(({ id }) => id))
  const claimedCategoryIds = new Set<string>()
  const items = manifest.categories.map((entry) => {
    const keyLabel = categoryKeyLabel(entry)
    const matches = activeCategories.filter((candidateCategory) =>
      categoryMatches(candidateCategory, entry)
    )
    const category = exactlyOne(
      matches,
      matches.length === 0
        ? `active category ${keyLabel} was not found`
        : `active category ${keyLabel} is ambiguous (${matches.map(({ id }) => id).join(", ")})`
    )
    if (claimedCategoryIds.has(category.id)) {
      throw new Error(`multiple category keys resolve to ${category.id}`)
    }
    claimedCategoryIds.add(category.id)
    const parentKey = entry.parentKey
    const expectedParent = parentKey
      ? exactlyOne(
          activeCategories.filter((candidate) =>
            categoryMatches(candidate, { key: parentKey })
          ),
          `category ${keyLabel} parent is missing or ambiguous`
        ).id
      : null
    if (category.parentId !== expectedParent) {
      throw new Error(
        `category ${keyLabel} parent mismatch: manifest=${expectedParent ?? "root"}, catalog=${category.parentId ?? "root"}`
      )
    }
    const directChildCount = activeCategories.filter(
      ({ parentId }) => parentId === category.id
    ).length
    if (directChildCount !== entry.expectedDirectChildCount) {
      throw new Error(
        `category ${keyLabel} child count mismatch: manifest=${entry.expectedDirectChildCount}, catalog=${directChildCount}`
      )
    }
    const directProductCount = new Set(category.directProductIds).size
    if (directProductCount !== category.directProductIds.length) {
      throw new Error(`category ${keyLabel} has duplicate direct product links`)
    }
    if (directProductCount !== entry.expectedDirectProductCount) {
      throw new Error(
        `category ${keyLabel} product count mismatch: manifest=${entry.expectedDirectProductCount}, catalog=${directProductCount}`
      )
    }
    if (category.parentId && !activeIds.has(category.parentId)) {
      throw new Error(`category ${keyLabel} has an inactive or missing parent`)
    }
    const categorySalesChannel = exactlyOne(
      snapshot.salesChannels.filter(({ id }) => id === entry.salesChannelId),
      `category ${keyLabel} sales channel ${entry.salesChannelId} is missing or ambiguous`
    )
    if (!salesChannelSupportsMarket(categorySalesChannel, "ro")) {
      throw new Error(
        `category ${keyLabel} sales channel ${entry.salesChannelId} is not configured for RO`
      )
    }
    const identityMatches = snapshot.categoryAssignments.filter(
      (assignment) =>
        assignment.entityId === category.id && assignment.marketCode === "ro"
    )
    if (identityMatches.length > 1) {
      throw new Error(`category ${keyLabel} has ambiguous RO URL assignments`)
    }
    const previous = identityMatches[0] ?? null
    const slugConflict = snapshot.categoryAssignments.find(
      (assignment) =>
        assignment.marketCode === "ro" &&
        assignment.publicSlug === entry.publicSlug &&
        assignment.entityId !== category.id
    )
    if (slugConflict) {
      throw new Error(
        `RO category publicSlug ${entry.publicSlug} is already owned by ${slugConflict.entityId}`
      )
    }
    const assignmentUnchanged = same(
      categoryAssignmentValue(previous),
      desiredCategoryAssignment(entry)
    )
    let assignmentAction: RoCatalogCategoryPlanItem["assignment"]["action"] =
      "create"
    let nextSourceVersion = 1
    if (previous) {
      assignmentAction = assignmentUnchanged ? "unchanged" : "update"
      nextSourceVersion = assignmentUnchanged
        ? previous.sourceVersion
        : previous.sourceVersion + 1
    }
    if (!Number.isSafeInteger(nextSourceVersion)) {
      throw new Error(`category ${keyLabel} source version is invalid`)
    }
    const translation = translationMutation({
      desired: entry.translation,
      existing: oneTranslation(
        snapshot.translations,
        "product_category",
        category.id
      ),
      reference: "product_category",
      referenceId: category.id,
    })
    if (
      previous?.publicationStatus === "published" &&
      translation.action !== "unchanged"
    ) {
      throw new Error(
        `category ${keyLabel} has a published RO route with a pending Translation mutation; retire it, verify URL-registry delivery, and rerun dry-run`
      )
    }
    return {
      assignment: {
        action: assignmentAction,
        nextSourceVersion,
        previous,
      },
      categoryId: category.id,
      entry,
      translation,
    } satisfies RoCatalogCategoryPlanItem
  })
  return items
}

const buildBrandItems = (
  manifest: RoCatalogManifest,
  snapshot: RoCatalogSnapshot
): RoCatalogBrandPlanItem[] => {
  if (
    manifest.brandInventory.count !==
      manifest.brands.length + manifest.excludedBrands.length ||
    snapshot.brands.length !== manifest.brandInventory.count
  ) {
    throw new Error(
      `brand inventory mismatch: manifest=${manifest.brandInventory.count}, included=${manifest.brands.length}, excluded=${manifest.excludedBrands.length}, catalog=${snapshot.brands.length}`
    )
  }
  for (const assignment of snapshot.brandAssignments) {
    if (
      assignment.entityId.length === 0 ||
      assignment.id.length === 0 ||
      assignment.marketCode.length === 0 ||
      !PUBLICATION_MARKETS.has(assignment.marketCode) ||
      !CATEGORY_ASSIGNMENT_STATUSES.has(assignment.publicationStatus) ||
      assignment.publicSlug.length === 0 ||
      assignment.publicSlug.length > MAX_CATEGORY_SLUG_LENGTH ||
      !PUBLIC_SLUG.test(assignment.publicSlug) ||
      assignment.salesChannelId.length === 0 ||
      !Number.isSafeInteger(assignment.sourceVersion) ||
      assignment.sourceVersion < 1
    ) {
      throw new Error("brand URL assignment state is malformed")
    }
  }
  const claimedIds = new Set<string>()
  return manifest.brands.map((entry) => {
    const brand = exactlyOne(
      snapshot.brands.filter(({ id }) => id === entry.key.value),
      `brand medusa_id:${entry.key.value} is missing or ambiguous`
    )
    if (claimedIds.has(brand.id)) {
      throw new Error(`multiple brand keys resolve to ${brand.id}`)
    }
    claimedIds.add(brand.id)
    const channel = exactlyOne(
      snapshot.salesChannels.filter(({ id }) => id === entry.salesChannelId),
      `brand ${brand.id} sales channel ${entry.salesChannelId} is missing or ambiguous`
    )
    if (!salesChannelSupportsMarket(channel, "ro")) {
      throw new Error(
        `brand ${brand.id} sales channel ${entry.salesChannelId} is not configured for RO`
      )
    }
    const identityMatches = snapshot.brandAssignments.filter(
      (assignment) =>
        assignment.entityId === brand.id && assignment.marketCode === "ro"
    )
    if (identityMatches.length > 1) {
      throw new Error(`brand ${brand.id} has ambiguous RO URL assignments`)
    }
    const previous = identityMatches[0] ?? null
    const conflict = snapshot.brandAssignments.find(
      (assignment) =>
        assignment.marketCode === "ro" &&
        assignment.publicSlug === entry.publicSlug &&
        assignment.entityId !== brand.id
    )
    if (conflict) {
      throw new Error(
        `RO brand publicSlug ${entry.publicSlug} is already owned by ${conflict.entityId}`
      )
    }
    const desired = {
      publicationStatus: entry.publicationStatus,
      publicSlug: entry.publicSlug,
      salesChannelId: entry.salesChannelId,
    }
    const unchanged = same(categoryAssignmentValue(previous), desired)
    let action: RoCatalogBrandPlanItem["assignment"]["action"] = "create"
    if (previous) {
      action = unchanged ? "unchanged" : "update"
    }
    const nextSourceVersion = previous
      ? previous.sourceVersion + (unchanged ? 0 : 1)
      : 1
    if (!Number.isSafeInteger(nextSourceVersion)) {
      throw new Error(`brand ${brand.id} source version is invalid`)
    }
    const translation = translationMutation({
      desired: entry.translation,
      existing: oneTranslation(snapshot.translations, "brand", brand.id),
      reference: "brand",
      referenceId: brand.id,
    })
    if (
      previous?.publicationStatus === "published" &&
      translation.action !== "unchanged"
    ) {
      throw new Error(
        `brand ${brand.id} has a published RO route with a pending Translation mutation; retire it, verify URL-registry delivery, and rerun dry-run`
      )
    }
    return {
      assignment: { action, nextSourceVersion, previous },
      brandId: brand.id,
      entry,
      translation,
    } satisfies RoCatalogBrandPlanItem
  })
}

const buildExcludedBrandItems = (
  manifest: RoCatalogManifest,
  snapshot: RoCatalogSnapshot,
  includedItems: readonly RoCatalogBrandPlanItem[]
): RoCatalogExcludedBrandPlanItem[] => {
  const claimedIds = new Set(includedItems.map(({ brandId }) => brandId))
  const items = manifest.excludedBrands.map((entry) => {
    const brand = exactlyOne(
      snapshot.brands.filter(({ id }) => id === entry.key.value),
      `excluded brand medusa_id:${entry.key.value} is missing or ambiguous`
    )
    if (claimedIds.has(brand.id)) {
      throw new Error(
        `multiple included/excluded brand keys resolve to ${brand.id}`
      )
    }
    claimedIds.add(brand.id)
    const matches = snapshot.brandAssignments.filter(
      (assignment) =>
        assignment.entityId === brand.id && assignment.marketCode === "ro"
    )
    if (matches.length > 1) {
      throw new Error(
        `excluded brand ${brand.id} has ambiguous RO URL assignments`
      )
    }
    const previous = matches[0] ?? null
    const action: RoCatalogExcludedBrandPlanItem["action"] =
      previous?.publicationStatus === "published" ? "draft" : "unchanged"
    const nextSourceVersion = previous
      ? previous.sourceVersion + (action === "draft" ? 1 : 0)
      : 1
    if (!Number.isSafeInteger(nextSourceVersion)) {
      throw new Error(
        `excluded brand ${brand.id} has invalid next source version`
      )
    }
    return {
      action,
      brandId: brand.id,
      entry,
      nextSourceVersion,
      previous,
    }
  })
  if (claimedIds.size !== snapshot.brands.length) {
    const missing = snapshot.brands
      .filter(({ id }) => !claimedIds.has(id))
      .map(({ id }) => id)
      .sort()
    throw new Error(
      `brand manifest does not partition every brand; missing=[${missing.join(",")}]`
    )
  }
  return items
}

const buildExcludedCategoryItems = (
  manifest: RoCatalogManifest,
  snapshot: RoCatalogSnapshot,
  includedItems: readonly RoCatalogCategoryPlanItem[]
): RoCatalogExcludedCategoryPlanItem[] => {
  const activeCategories = snapshot.categories.filter(
    ({ isActive }) => isActive
  )
  const claimedIds = new Set(includedItems.map(({ categoryId }) => categoryId))
  const items = manifest.excludedCategories.map((entry) => {
    const keyLabel = `${entry.key.kind}:${entry.key.value}`
    const matches = activeCategories.filter((candidate) =>
      categoryMatches(candidate, entry)
    )
    const category = exactlyOne(
      matches,
      matches.length === 0
        ? `excluded active category ${keyLabel} was not found`
        : `excluded active category ${keyLabel} is ambiguous (${matches.map(({ id }) => id).join(", ")})`
    )
    if (claimedIds.has(category.id)) {
      throw new Error(
        `multiple included/excluded category keys resolve to ${category.id}`
      )
    }
    claimedIds.add(category.id)
    const identityMatches = snapshot.categoryAssignments.filter(
      (assignment) =>
        assignment.entityId === category.id && assignment.marketCode === "ro"
    )
    if (identityMatches.length > 1) {
      throw new Error(
        `excluded category ${keyLabel} has ambiguous RO URL assignments`
      )
    }
    const previous = identityMatches[0] ?? null
    const action =
      previous?.publicationStatus === "published" ? "draft" : "unchanged"
    const nextSourceVersion = previous
      ? previous.sourceVersion + (action === "draft" ? 1 : 0)
      : 1
    if (!Number.isSafeInteger(nextSourceVersion)) {
      throw new Error(`excluded category ${keyLabel} source version is invalid`)
    }
    const translation = translationMutation({
      desired: entry.translation,
      existing: oneTranslation(
        snapshot.translations,
        "product_category",
        category.id
      ),
      reference: "product_category",
      referenceId: category.id,
    })
    if (
      previous?.publicationStatus === "published" &&
      translation.action !== "unchanged"
    ) {
      throw new Error(
        `excluded category ${keyLabel} has a published RO route with a pending Translation mutation; retire it, verify URL-registry delivery, and rerun dry-run`
      )
    }
    return {
      action,
      categoryId: category.id,
      entry,
      nextSourceVersion,
      previous,
      translation,
    } satisfies RoCatalogExcludedCategoryPlanItem
  })
  if (claimedIds.size !== activeCategories.length) {
    const missing = activeCategories
      .filter(({ id }) => !claimedIds.has(id))
      .map(({ id }) => id)
      .sort()
    throw new Error(
      `category manifest does not partition every active category; missing=[${missing.join(",")}]`
    )
  }
  return items
}

const assertCommerceReadiness = (
  manifest: RoCatalogManifest,
  snapshot: RoCatalogSnapshot
) => {
  const requirements = manifest.readiness
  const regions = snapshot.commerceReadiness.regions.filter(
    ({ id }) => id === requirements.regionId
  )
  const region = exactlyOne(
    regions,
    `RO region ${requirements.regionId} is missing or ambiguous`
  )
  if (
    region.currencyCode.toLowerCase() !== requirements.currencyCode ||
    !region.countryCodes.some((country) => country.toLowerCase() === "ro")
  ) {
    throw new Error(
      `RO region ${region.id} must use RON and contain country ro; refusing to reinterpret another currency`
    )
  }
  for (const id of requirements.shippingOptionIds) {
    const matches = snapshot.commerceReadiness.shippingOptions.filter(
      (candidateOption) => candidateOption.id === id
    )
    const option = exactlyOne(
      matches,
      `shipping option ${id} is not ready for Romania`
    )
    if (
      !option.countryCodes.some((country) => country.toLowerCase() === "ro")
    ) {
      throw new Error(`shipping option ${id} is not ready for Romania`)
    }
  }
  for (const id of requirements.taxRegionIds) {
    const matches = snapshot.commerceReadiness.taxRegions.filter(
      (candidateTaxRegion) => candidateTaxRegion.id === id
    )
    const taxRegion = exactlyOne(
      matches,
      `tax region ${id} is not ready for Romania`
    )
    if (taxRegion.countryCode.toLowerCase() !== "ro") {
      throw new Error(`tax region ${id} is not ready for Romania`)
    }
  }
  for (const id of requirements.paymentProviderIds) {
    const matches = snapshot.commerceReadiness.paymentProviders.filter(
      (candidateProvider) => candidateProvider.id === id
    )
    const provider = exactlyOne(
      matches,
      `payment provider ${id} is not enabled for RO region`
    )
    if (!(provider.enabled && provider.regionIds.includes(region.id))) {
      throw new Error(`payment provider ${id} is not enabled for RO region`)
    }
  }
}

const assertVariantReadiness = (
  product: CatalogProductSnapshot,
  entry: RoCatalogProductEntry
) => {
  if (entry.variants.length !== product.variants.length) {
    throw new Error(
      `product ${product.id} manifest covers ${entry.variants.length} variants, catalog has ${product.variants.length}`
    )
  }
  const resolvedIds = new Set<string>()
  const authorityEntries: RoCatalogImportPlanItem["variantAuthorityEntries"][number][] =
    []
  for (const expected of entry.variants) {
    const matches = product.variants.filter((candidateVariant) =>
      expected.key.kind === "sku"
        ? candidateVariant.sku === expected.key.value
        : candidateVariant.ean === expected.key.value
    )
    const variant = exactlyOne(
      matches,
      `product ${product.id} variant ${expected.key.kind}:${expected.key.value} is missing or ambiguous`
    )
    if (resolvedIds.has(variant.id)) {
      throw new Error(
        `product ${product.id} manifest resolves multiple keys to variant ${variant.id}`
      )
    }
    resolvedIds.add(variant.id)
    authorityEntries.push({
      approvalProvenance: expected.ronPrice?.approval ?? {
        decision: "reviewed-unavailable",
      },
      availability: expected.roAvailability,
      sourceProvenance: {
        key: expected.key,
        source: entry.source,
      },
      variantId: variant.id,
    })
    if (expected.roAvailability !== "sellable") {
      continue
    }
    const approvedPrice = expected.ronPrice
    if (!approvedPrice) {
      throw new Error(
        `sellable RO variant ${variant.id} has no approved RON price`
      )
    }
    const ronPrices = variant.prices.filter(
      (price) => price.currencyCode.toLowerCase() === "ron"
    )
    const ronPrice = exactlyOne(
      ronPrices,
      `sellable RO variant ${variant.id} does not have its exact business-approved RON price ${approvedPrice.amount}`
    )
    if (ronPrice.amount !== approvedPrice.amount) {
      throw new Error(
        `sellable RO variant ${variant.id} does not have its exact business-approved RON price ${approvedPrice.amount}`
      )
    }
  }
  return authorityEntries
}

const buildExcludedItems = (
  manifest: RoCatalogManifest,
  snapshot: RoCatalogSnapshot,
  claimedProductIds: Map<string, string>
): RoCatalogExcludedProductPlanItem[] =>
  manifest.excludedProducts.map((entry) => {
    const keyLabel = productKeyLabel(entry)
    const matches = snapshot.products.filter((candidate) =>
      productMatches(candidate, entry)
    )
    const product = exactlyOne(
      matches,
      matches.length === 0
        ? `excluded product ${keyLabel} was not found`
        : `excluded product ${keyLabel} is ambiguous (${matches.map(({ id }) => id).join(", ")})`
    )
    const previousKey = claimedProductIds.get(product.id)
    if (previousKey) {
      throw new Error(
        `manifest keys ${previousKey} and excluded ${keyLabel} resolve to the same product ${product.id}`
      )
    }
    claimedProductIds.set(product.id, `excluded ${keyLabel}`)
    const previousRoAssignment = existingRoAssignment(product)
    return {
      action:
        assignmentPublicationStatus(previousRoAssignment) === "published"
          ? "draft"
          : "unchanged",
      entry,
      previousRoAssignment,
      productId: product.id,
    }
  })

const assertExactPublishedProductPartition = (
  snapshot: RoCatalogSnapshot,
  claimedProductIds: ReadonlyMap<string, string>
) => {
  const publishedIds = new Set(
    snapshot.products
      .filter(({ status }) => status === "published")
      .map(({ id }) => id)
  )
  const extra = [...claimedProductIds.keys()].filter(
    (productId) => !publishedIds.has(productId)
  )
  const missing = [...publishedIds].filter(
    (productId) => !claimedProductIds.has(productId)
  )
  if (extra.length > 0 || missing.length > 0) {
    throw new Error(
      `RO manifest must exactly partition every globally published product; missing=[${missing.sort().join(",")}], extra=[${extra.sort().join(",")}]`
    )
  }
}

const buildOmissionLedger = (
  manifest: RoCatalogManifest,
  items: readonly RoCatalogImportPlanItem[]
): null | RoCatalogOmissionLedger => {
  if (!manifest.omissionMode) {
    return null
  }
  const omittedFields = ["usage", "composition", "warning", "other"] as const
  const entries = items.map((item) => {
    if (
      omittedFields.some((field) => item.entry.productContent[field] !== "")
    ) {
      throw new Error(
        `product ${item.productId} is not description-only but manifest omissionMode is enabled`
      )
    }
    if (!item.content.existingId) {
      throw new Error(
        `product ${item.productId} needs product_content backfill before a reviewed omission ledger can be emitted`
      )
    }
    return {
      omittedFields,
      productContentId: item.content.existingId,
      productId: item.productId,
      roDescriptionSha256: createHash("sha256")
        .update(item.entry.translation.description)
        .digest("hex"),
      sourceContentSha256: item.entry.source.contentSha256,
      sourceUrl: item.entry.source.url,
    }
  })
  return {
    entries: entries.sort((left, right) =>
      left.productId.localeCompare(right.productId)
    ),
    mode: manifest.omissionMode,
    schemaVersion: 1,
  }
}

const authorizeOmissionItems = (
  items: readonly RoCatalogImportPlanItem[],
  ledger: RoCatalogOmissionLedger,
  ledgerSha256: string
): RoCatalogImportPlanItem[] => {
  const ledgerByProductId = new Map(
    ledger.entries.map((entry) => [entry.productId, entry])
  )
  return items.map((item) => {
    const ledgerEntry = ledgerByProductId.get(item.productId)
    if (!(ledgerEntry && item.content.existingId)) {
      throw new Error(`product ${item.productId} is missing omission evidence`)
    }
    const previousTranslations = item.content.translation.previousTranslations
    const existing = item.content.translation.existingId
      ? {
          id: item.content.translation.existingId,
          localeCode: "ro-RO" as const,
          reference: "product_content" as const,
          referenceId: item.content.existingId,
          translations: previousTranslations ?? {},
        }
      : undefined
    const authority = createRoDemoOmissionAuthority({
      ...ledgerEntry,
      ledgerSha256,
      mode: ledger.mode,
      schemaVersion: ledger.schemaVersion,
    })
    return {
      ...item,
      content: {
        ...item.content,
        translation: translationMutation({
          desired: {
            ...item.entry.productContent,
            [RO_DEMO_OMISSION_AUTHORITY_KEY]: authority,
          },
          existing,
          reference: "product_content",
          referenceId: item.content.existingId,
        }),
      },
    }
  })
}

export const buildRoCatalogImportPlan = (
  manifest: RoCatalogManifest,
  snapshot: RoCatalogSnapshot,
  options: Readonly<{ salesChannelId?: string }> = {}
): RoCatalogImportPlan => {
  if (
    manifest.collectionInventory.count !== 0 ||
    snapshot.collectionIds.length !== 0
  ) {
    throw new Error(
      `collection inventory mismatch: manifest=${manifest.collectionInventory.count}, catalog=${snapshot.collectionIds.length}`
    )
  }
  const nonPublishedEntry = [
    ...manifest.products,
    ...manifest.categories,
    ...manifest.brands,
  ].find((entry) => entry.publicationStatus !== "published")
  if (nonPublishedEntry) {
    throw new Error(
      "localized products, categories, and brands must be published; use reviewed exclusion entries for RO-only drafts"
    )
  }
  assertCommerceReadiness(manifest, snapshot)
  const brandItems = buildBrandItems(manifest, snapshot)
  const excludedBrandItems = buildExcludedBrandItems(
    manifest,
    snapshot,
    brandItems
  )
  const categoryItems = buildCategoryItems(manifest, snapshot)
  const excludedCategoryItems = buildExcludedCategoryItems(
    manifest,
    snapshot,
    categoryItems
  )
  const contentsByProductId = new Map(
    snapshot.contents.map((content) => [content.productId, content])
  )
  const claimedProductIds = new Map<string, string>()
  const existingSlugOwners = new Map<string, string>()

  for (const product of snapshot.products) {
    assertPublicationShape(product, `product ${product.id}`)
    const slug = assignmentSlug(existingRoAssignment(product))
    if (slug) {
      const previousOwner = existingSlugOwners.get(slug)
      if (previousOwner && previousOwner !== product.id) {
        throw new Error(`existing RO publicSlug ${slug} has multiple owners`)
      }
      existingSlugOwners.set(slug, product.id)
    }
  }

  const items: RoCatalogImportPlanItem[] = manifest.products.map((entry) => {
    const matches = snapshot.products.filter((candidateProduct) =>
      productMatches(candidateProduct, entry)
    )
    const keyLabel = productKeyLabel(entry)
    const product = exactlyOne(
      matches,
      matches.length === 0
        ? `product ${keyLabel} was not found`
        : `product ${keyLabel} is ambiguous (${matches.map(({ id }) => id).join(", ")})`
    )
    const previousKey = claimedProductIds.get(product.id)
    if (previousKey) {
      throw new Error(
        `manifest keys ${previousKey} and ${keyLabel} resolve to the same product ${product.id}`
      )
    }
    claimedProductIds.set(product.id, keyLabel)
    const variantAuthorityEntries = assertVariantReadiness(product, entry)

    const slugOwner = existingSlugOwners.get(entry.publicSlug)
    if (slugOwner && slugOwner !== product.id) {
      throw new Error(
        `RO publicSlug ${entry.publicSlug} is already owned by product ${slugOwner}`
      )
    }

    const previousRoAssignment = existingRoAssignment(product)
    const salesChannelId =
      options.salesChannelId ?? assignmentSalesChannel(previousRoAssignment)
    if (!salesChannelId) {
      throw new Error(
        `product ${product.id} has no RO assignment; --sales-channel-id is required`
      )
    }
    if (!product.salesChannelIds.includes(salesChannelId)) {
      throw new Error(
        `product ${product.id} is not linked to sales channel ${salesChannelId}`
      )
    }
    const productSalesChannel = exactlyOne(
      snapshot.salesChannels.filter(({ id }) => id === salesChannelId),
      `product ${product.id} sales channel ${salesChannelId} is missing or ambiguous`
    )
    if (!salesChannelSupportsMarket(productSalesChannel, "ro")) {
      throw new Error(
        `product ${product.id} sales channel ${salesChannelId} is not configured for RO`
      )
    }
    const publicationRecord = asRecord(product.metadata[PUBLICATION_KEY])
    const markets = asRecord(publicationRecord?.markets)
    const otherMarket = Object.entries(markets ?? {}).find(
      ([market, assignment]) =>
        market !== "ro" && assignmentSalesChannel(assignment) === salesChannelId
    )
    if (otherMarket) {
      throw new Error(
        `product ${product.id} already assigns sales channel ${salesChannelId} to market ${otherMarket[0]}`
      )
    }

    const content = contentsByProductId.get(product.id)
    const currentPublication = asRecord(product.metadata[PUBLICATION_KEY])
    const currentMarkets = asRecord(currentPublication?.markets)
    if (
      !content &&
      assignmentPublicationStatus(currentMarkets?.sk) === "published"
    ) {
      throw new Error(
        `SK-published product ${product.id} has no product_content; backfill source content before RO import`
      )
    }
    const productTranslation = translationMutation({
      desired: entry.translation,
      existing: oneTranslation(snapshot.translations, "product", product.id),
      reference: "product",
      referenceId: product.id,
    })
    const contentTranslation = translationMutation({
      desired: entry.productContent,
      existing: content
        ? oneTranslation(snapshot.translations, "product_content", content.id)
        : undefined,
      reference: "product_content",
      ...(content ? { referenceId: content.id } : {}),
      ...(manifest.omissionMode
        ? {}
        : { removeKeys: [RO_DEMO_OMISSION_AUTHORITY_KEY] }),
    })
    if (
      assignmentPublicationStatus(previousRoAssignment) === "published" &&
      (productTranslation.action !== "unchanged" ||
        contentTranslation.action !== "unchanged" ||
        !content)
    ) {
      throw new Error(
        `product ${product.id} has a published RO route with a pending Translation/content mutation; retire it, verify URL-registry delivery, and rerun dry-run`
      )
    }
    const nextAssignment = desiredAssignment(entry, salesChannelId)

    return {
      content: {
        action: content ? "unchanged" : "create",
        baseValues: content
          ? {
              composition: content.composition,
              other: content.other,
              usage: content.usage,
              warning: content.warning,
            }
          : product.sourceContent,
        ...(content ? { existingId: content.id } : {}),
        translation: contentTranslation,
      },
      entry,
      productId: product.id,
      productTranslation,
      publication: {
        action: same(previousRoAssignment, nextAssignment)
          ? "unchanged"
          : "update",
        previousRoAssignment,
        salesChannelId,
      },
      variantAuthorityEntries,
    }
  })

  const excludedItems = buildExcludedItems(
    manifest,
    snapshot,
    claimedProductIds
  )
  assertExactPublishedProductPartition(snapshot, claimedProductIds)
  const omissionLedger = buildOmissionLedger(manifest, items)
  const omissionLedgerSha256 = omissionLedger
    ? buildDemoOmissionLedgerHash(omissionLedger.entries)
    : null
  const authorizedItems =
    omissionLedger && omissionLedgerSha256
      ? authorizeOmissionItems(items, omissionLedger, omissionLedgerSha256)
      : items
  const scope = {
    brandExcludedIds: excludedBrandItems.map(({ brandId }) => brandId).sort(),
    brandIds: brandItems.map(({ brandId }) => brandId).sort(),
    categoryExcludedIds: excludedCategoryItems
      .map(({ categoryId }) => categoryId)
      .sort(),
    categoryPublishedIds: categoryItems
      .map(({ categoryId }) => categoryId)
      .sort(),
    collectionIds: [] as string[],
    productExcludedIds: excludedItems.map(({ productId }) => productId).sort(),
    productPublishedIds: authorizedItems
      .map(({ productId }) => productId)
      .sort(),
  }
  const scopeSha256 = hashRoCatalogImportScope(scope)

  const mutations = authorizedItems.flatMap((item) => [
    item.productTranslation,
    item.content.translation,
  ])
  return {
    brandItems,
    categoryItems,
    excludedCategoryItems,
    excludedBrandItems,
    excludedItems,
    generationProof: null,
    expectedSharedInventoryBaseline:
      snapshot.skProtection.sharedInventoryBaseline,
    expectedSkBaseline: snapshot.skProtection.baseline,
    expectedSkIssues: snapshot.skProtection.issues,
    expectedSkPublication: snapshot.skProtection.publication,
    items: authorizedItems,
    omissionLedger,
    omissionLedgerSha256,
    postCommerceInventoryEvidence: manifest.postCommerceInventoryEvidence,
    scope,
    scopeSha256,
    summary: {
      brandAssignmentsToCreate: brandItems.filter(
        (item) => item.assignment.action === "create"
      ).length,
      brandAssignmentsToUpdate: brandItems.filter(
        (item) => item.assignment.action === "update"
      ).length,
      brands: brandItems.length,
      brandTranslationsToCreate: brandItems.filter(
        (item) => item.translation.action === "create"
      ).length,
      brandTranslationsToUpdate: brandItems.filter(
        (item) => item.translation.action === "update"
      ).length,
      brandExclusionsToDraft: excludedBrandItems.filter(
        (item) => item.action === "draft"
      ).length,
      categories: categoryItems.length,
      categoryExclusionsToDraft: excludedCategoryItems.filter(
        (item) => item.action === "draft"
      ).length,
      categoryAssignmentsToCreate: categoryItems.filter(
        (item) => item.assignment.action === "create"
      ).length,
      categoryAssignmentsToUpdate: categoryItems.filter(
        (item) => item.assignment.action === "update"
      ).length,
      categoryTranslationsToCreate: categoryItems.filter(
        (item) => item.translation.action === "create"
      ).length,
      categoryTranslationsToUpdate: categoryItems.filter(
        (item) => item.translation.action === "update"
      ).length,
      unchangedCategoryAssignments: categoryItems.filter(
        (item) => item.assignment.action === "unchanged"
      ).length,
      unchangedCategoryTranslations: categoryItems.filter(
        (item) => item.translation.action === "unchanged"
      ).length,
      contentRecordsToCreate: authorizedItems.filter(
        (item) => item.content.action === "create"
      ).length,
      excludedCategories: excludedCategoryItems.length,
      excludedBrands: excludedBrandItems.length,
      excludedCategoryTranslationsToCreate: excludedCategoryItems.filter(
        (item) => item.translation.action === "create"
      ).length,
      excludedCategoryTranslationsToUpdate: excludedCategoryItems.filter(
        (item) => item.translation.action === "update"
      ).length,
      excludedProducts: excludedItems.length,
      exclusionsToDraft: excludedItems.filter((item) => item.action === "draft")
        .length,
      products: authorizedItems.length,
      publicationsToUpdate: authorizedItems.filter(
        (item) => item.publication.action === "update"
      ).length,
      translationsToCreate: mutations.filter(
        (mutation) => mutation.action === "create"
      ).length,
      translationsToUpdate: mutations.filter(
        (mutation) => mutation.action === "update"
      ).length,
      unchangedTranslations: mutations.filter(
        (mutation) => mutation.action === "unchanged"
      ).length,
    },
  }
}

export const buildExcludedProductPublicationMetadata = (
  metadata: Readonly<Record<string, unknown>>,
  item: RoCatalogExcludedProductPlanItem
) => {
  const publication = asRecord(metadata[PUBLICATION_KEY])
  const markets = asRecord(publication?.markets)
  const ro = asRecord(markets?.ro)
  if (!(publication && markets && ro)) {
    throw new Error(
      `excluded product ${item.productId} has no RO publication to draft`
    )
  }
  return {
    ...metadata,
    [PUBLICATION_KEY]: {
      ...publication,
      markets: {
        ...markets,
        ro: { ...ro, publicationStatus: "draft" },
      },
    },
  }
}

export const buildProductPublicationMetadata = (
  metadata: Readonly<Record<string, unknown>>,
  item: RoCatalogImportPlanItem
) => {
  const publication = asRecord(metadata[PUBLICATION_KEY]) ?? {}
  const markets = asRecord(publication.markets) ?? {}
  return {
    ...metadata,
    [PUBLICATION_KEY]: {
      ...publication,
      markets: {
        ...markets,
        ro: desiredAssignment(item.entry, item.publication.salesChannelId),
      },
      schemaVersion: 1,
    },
  }
}

export const isSameImportValue = same

export const hashRoCatalogImportPlan = (plan: RoCatalogImportPlan) =>
  createHash("sha256").update(stableJson(plan)).digest("hex")

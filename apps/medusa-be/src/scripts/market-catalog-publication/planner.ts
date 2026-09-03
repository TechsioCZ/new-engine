import { salesChannelSupportsMarket } from "../../utils/notification-market-context"
import { hashCatalogTranslationValue } from "../catalog-translation-pipeline/canonical"
import { hashCatalogTranslationPlan } from "../catalog-translation-pipeline/planner"
import type {
  MarketCatalogAssignmentSnapshot,
  MarketCatalogEntityPlanItem,
  MarketCatalogProductPlanItem,
  MarketCatalogPublicationEntry,
  MarketCatalogPublicationManifest,
  MarketCatalogPublicationPlan,
  MarketCatalogPublicationSnapshot,
} from "./types"
import { MARKET_CATALOG_PUBLICATION_TARGETS } from "./types"

const same = (left: unknown, right: unknown) =>
  hashCatalogTranslationValue(left) === hashCatalogTranslationValue(right)

const sortedIds = (entries: readonly MarketCatalogPublicationEntry[]) =>
  entries.map(({ id }) => id).sort((left, right) => left.localeCompare(right))

const assertExactIds = (
  actual: readonly string[],
  expected: readonly string[],
  label: string
) => {
  const normalizedActual = [...new Set(actual)].sort((left, right) =>
    left.localeCompare(right)
  )
  const normalizedExpected = [...new Set(expected)].sort((left, right) =>
    left.localeCompare(right)
  )
  if (!same(normalizedActual, normalizedExpected)) {
    throw new Error(
      `${label} does not exactly match the translation-bound catalog scope`
    )
  }
}

const entityItems = (
  entries: readonly MarketCatalogPublicationEntry[],
  assignments: readonly MarketCatalogAssignmentSnapshot[],
  entityKind: "brand" | "category",
  salesChannelId: string
): MarketCatalogEntityPlanItem[] => {
  const targetAssignments = assignments.filter(
    (assignment) => assignment.entityKind === entityKind
  )
  const assignmentsByEntityId = new Map<
    string,
    MarketCatalogAssignmentSnapshot
  >()
  for (const assignment of targetAssignments) {
    if (assignmentsByEntityId.has(assignment.entityId)) {
      throw new Error(
        `${entityKind} ${assignment.entityId} has multiple target-market URL assignments`
      )
    }
    assignmentsByEntityId.set(assignment.entityId, assignment)
  }
  const desiredIds = new Set(entries.map(({ id }) => id))
  const unexpected = targetAssignments.find(
    (assignment) => !desiredIds.has(assignment.entityId)
  )
  if (unexpected) {
    throw new Error(
      `unexpected ${entityKind} URL assignment ${unexpected.entityId} is outside the exact catalog scope`
    )
  }
  const existingSlugOwners = new Map(
    targetAssignments.map((assignment) => [
      assignment.publicSlug,
      assignment.entityId,
    ])
  )
  return entries
    .map((entry) => {
      const previousAssignment = assignmentsByEntityId.get(entry.id) ?? null
      const conflictingOwner = existingSlugOwners.get(entry.publicSlug)
      if (conflictingOwner && conflictingOwner !== entry.id) {
        throw new Error(
          `${entityKind} publicSlug ${entry.publicSlug} is currently owned by ${conflictingOwner}; retire that assignment before publication`
        )
      }
      const desiredAssignment = {
        publicationStatus: entry.publicationStatus,
        publicSlug: entry.publicSlug,
        salesChannelId,
      } as const
      const previousProjection = previousAssignment
        ? {
            publicationStatus: previousAssignment.publicationStatus,
            publicSlug: previousAssignment.publicSlug,
            salesChannelId: previousAssignment.salesChannelId,
          }
        : null
      const nextSourceVersion = (previousAssignment?.sourceVersion ?? 0) + 1
      if (!Number.isSafeInteger(nextSourceVersion)) {
        throw new Error(`${entityKind} ${entry.id} source version is invalid`)
      }
      let action: MarketCatalogEntityPlanItem["action"] = "create"
      if (previousAssignment) {
        action = same(previousProjection, desiredAssignment)
          ? "unchanged"
          : "update"
      }
      return {
        action,
        desiredAssignment,
        entityId: entry.id,
        entityKind,
        nextSourceVersion,
        previousAssignment,
      }
    })
    .sort((left, right) => left.entityId.localeCompare(right.entityId))
}

const productItems = (
  entries: readonly MarketCatalogPublicationEntry[],
  snapshot: MarketCatalogPublicationSnapshot,
  manifest: MarketCatalogPublicationManifest
): MarketCatalogProductPlanItem[] => {
  const productsById = new Map(
    snapshot.products.map((product) => [product.productId, product])
  )
  assertExactIds(
    [...productsById.keys()],
    entries.map(({ id }) => id),
    "live product inventory"
  )
  const existingSlugOwners = new Map<string, string>()
  for (const product of snapshot.products) {
    const assignment = product.assignments[manifest.market]
    if (!assignment) {
      continue
    }
    const existingOwner = existingSlugOwners.get(assignment.publicSlug)
    if (existingOwner && existingOwner !== product.productId) {
      throw new Error(
        `product publicSlug ${assignment.publicSlug} has multiple owners`
      )
    }
    existingSlugOwners.set(assignment.publicSlug, product.productId)
  }
  return entries
    .map((entry) => {
      const product = productsById.get(entry.id)
      if (!product) {
        throw new Error(`product ${entry.id} is missing from the live catalog`)
      }
      if (!product.salesChannelIds.includes(manifest.salesChannelId)) {
        throw new Error(
          `product ${entry.id} is not linked to sales channel ${manifest.salesChannelId}`
        )
      }
      const otherMarket = Object.entries(product.assignments).find(
        ([market, assignment]) =>
          market !== manifest.market &&
          assignment?.salesChannelId === manifest.salesChannelId
      )
      if (otherMarket) {
        throw new Error(
          `product ${entry.id} assigns sales channel ${manifest.salesChannelId} to market ${otherMarket[0]}`
        )
      }
      const conflictingOwner = existingSlugOwners.get(entry.publicSlug)
      if (conflictingOwner && conflictingOwner !== entry.id) {
        throw new Error(
          `product publicSlug ${entry.publicSlug} is currently owned by ${conflictingOwner}; retire that assignment before publication`
        )
      }
      const previousAssignment = product.assignments[manifest.market]
      const desiredAssignment = {
        publicationStatus: entry.publicationStatus,
        publicSlug: entry.publicSlug,
        salesChannelId: manifest.salesChannelId,
      } as const
      const action: MarketCatalogProductPlanItem["action"] = same(
        previousAssignment,
        desiredAssignment
      )
        ? "unchanged"
        : "update"
      return {
        action,
        desiredAssignment,
        previousAssignment,
        productId: entry.id,
        sourceVersion: product.sourceVersion,
      }
    })
    .sort((left, right) => left.productId.localeCompare(right.productId))
}

export const buildMarketCatalogPublicationPlan = (
  manifest: MarketCatalogPublicationManifest,
  manifestSha256: string,
  snapshot: MarketCatalogPublicationSnapshot
): MarketCatalogPublicationPlan => {
  const translationPlan = snapshot.translationPlan
  const expectedLocale = MARKET_CATALOG_PUBLICATION_TARGETS[manifest.market]
  if (manifest.locale !== expectedLocale) {
    throw new Error(`${manifest.market} publication requires ${expectedLocale}`)
  }
  if (
    translationPlan.inputSha256 !== manifest.translationInputSha256 ||
    translationPlan.scope.targetLocales.length !== 1 ||
    translationPlan.scope.targetLocales[0] !== manifest.locale
  ) {
    throw new Error(
      "publication manifest is not bound to the exact target translation plan"
    )
  }
  if (
    translationPlan.summary.creates !== 0 ||
    translationPlan.summary.updates !== 0
  ) {
    throw new Error(
      "target catalog translations must be fully applied before publication"
    )
  }
  if (!same(manifest.environment, translationPlan.environment)) {
    throw new Error(
      "publication environment does not match the translation-bound environment"
    )
  }
  if (snapshot.salesChannel.id !== manifest.salesChannelId) {
    throw new Error("publication sales channel is missing or ambiguous")
  }
  if (!salesChannelSupportsMarket(snapshot.salesChannel, manifest.market)) {
    throw new Error(
      `sales channel ${manifest.salesChannelId} is not configured for market ${manifest.market}`
    )
  }
  const scope = {
    brandIds: sortedIds(manifest.brands),
    categoryIds: sortedIds(manifest.categories),
    productIds: sortedIds(manifest.products),
  }
  assertExactIds(
    scope.brandIds,
    translationPlan.scope.brandIds,
    "brand publication scope"
  )
  assertExactIds(
    scope.categoryIds,
    translationPlan.scope.categoryIds,
    "category publication scope"
  )
  assertExactIds(
    scope.productIds,
    translationPlan.scope.productIds,
    "product publication scope"
  )
  const brands = entityItems(
    manifest.brands,
    snapshot.assignments,
    "brand",
    manifest.salesChannelId
  )
  const categories = entityItems(
    manifest.categories,
    snapshot.assignments,
    "category",
    manifest.salesChannelId
  )
  const products = productItems(manifest.products, snapshot, manifest)
  return {
    environment: manifest.environment,
    items: { brands, categories, products },
    locale: manifest.locale,
    manifestSha256,
    market: manifest.market,
    protectedState: translationPlan.protectedState,
    salesChannelId: manifest.salesChannelId,
    schemaVersion: 1,
    scope,
    scopeSha256: hashCatalogTranslationValue(scope),
    summary: {
      brandAssignmentsToCreate: brands.filter(
        ({ action }) => action === "create"
      ).length,
      brandAssignmentsToUpdate: brands.filter(
        ({ action }) => action === "update"
      ).length,
      brands: brands.length,
      categoryAssignmentsToCreate: categories.filter(
        ({ action }) => action === "create"
      ).length,
      categoryAssignmentsToUpdate: categories.filter(
        ({ action }) => action === "update"
      ).length,
      categories: categories.length,
      productPublicationsToUpdate: products.filter(
        ({ action }) => action === "update"
      ).length,
      products: products.length,
    },
    translationInputSha256: manifest.translationInputSha256,
    translationPlanHash: hashCatalogTranslationPlan(translationPlan),
  }
}

export const hashMarketCatalogPublicationPlan = (
  plan: MarketCatalogPublicationPlan
) => hashCatalogTranslationValue(plan)

export const assertMarketCatalogPublicationClosed = (
  plan: MarketCatalogPublicationPlan
) => {
  const pending = [
    "brandAssignmentsToCreate",
    "brandAssignmentsToUpdate",
    "categoryAssignmentsToCreate",
    "categoryAssignmentsToUpdate",
    "productPublicationsToUpdate",
  ] as const satisfies readonly (keyof MarketCatalogPublicationPlan["summary"])[]
  const remaining = pending
    .filter((key) => plan.summary[key] !== 0)
    .map((key) => `${key}=${plan.summary[key]}`)
  if (remaining.length > 0) {
    throw new Error(
      `market catalog publication still has pending work: ${remaining.join(", ")}`
    )
  }
}

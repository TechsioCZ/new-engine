import { hashCatalogTranslationValue } from "./canonical"
import type {
  CatalogTranslationInput,
  CatalogTranslationPlan,
  CatalogTranslationPlanItem,
  CatalogTranslationProtectedState,
  ExistingCatalogTranslation,
} from "./types"

export type CatalogTranslationSnapshot = Readonly<{
  existingTranslations: readonly ExistingCatalogTranslation[]
  protectedState: CatalogTranslationProtectedState
  sourceRecords: readonly Readonly<{
    reference: CatalogTranslationPlanItem["reference"]
    referenceId: string
    values: Readonly<Record<string, unknown>>
  }>[]
}>

const sameValue = (left: unknown, right: unknown) =>
  hashCatalogTranslationValue(left) === hashCatalogTranslationValue(right)

const oneTranslation = (
  snapshot: CatalogTranslationSnapshot,
  localeCode: string,
  reference: string,
  referenceId: string
) => {
  const matches = snapshot.existingTranslations.filter(
    (translation) =>
      translation.localeCode === localeCode &&
      translation.reference === reference &&
      translation.referenceId === referenceId
  )
  if (matches.length > 1) {
    throw new Error(
      `ambiguous ${localeCode} ${reference} translation for ${referenceId}`
    )
  }
  return matches[0]
}

export const buildCatalogTranslationScope = (
  items: readonly Pick<
    CatalogTranslationPlanItem,
    "localeCode" | "reference" | "referenceId"
  >[]
): CatalogTranslationPlan["scope"] => ({
  brandIds: [
    ...new Set(
      items.flatMap((item) =>
        item.reference === "brand" ? [item.referenceId] : []
      )
    ),
  ].sort(),
  categoryIds: [
    ...new Set(
      items.flatMap((item) =>
        item.reference === "product_category" ? [item.referenceId] : []
      )
    ),
  ].sort(),
  productContentIds: [
    ...new Set(
      items.flatMap((item) =>
        item.reference === "product_content" ? [item.referenceId] : []
      )
    ),
  ].sort(),
  productIds: [
    ...new Set(
      items.flatMap((item) =>
        item.reference === "product" ? [item.referenceId] : []
      )
    ),
  ].sort(),
  targetLocales: [...new Set(items.map(({ localeCode }) => localeCode))].sort(),
})

const buildPlanItem = (
  snapshot: CatalogTranslationSnapshot,
  entry: CatalogTranslationInput["entries"][number],
  mode: CatalogTranslationInput["mode"]
): CatalogTranslationPlanItem => {
  const sourceMatches = snapshot.sourceRecords.filter(
    (candidate) =>
      candidate.reference === entry.reference &&
      candidate.referenceId === entry.referenceId
  )
  const source = sourceMatches[0]
  if (sourceMatches.length !== 1 || !source) {
    throw new Error(
      `missing or ambiguous source ${entry.reference} record for ${entry.referenceId}`
    )
  }
  const existing = oneTranslation(
    snapshot,
    entry.localeCode,
    entry.reference,
    entry.referenceId
  )
  const previousTranslations = existing?.translations ?? null
  const canonicalTranslations = Object.fromEntries(
    Object.entries(source.values).map(([field, value]) => {
      if (value === null || value === undefined || value === "") {
        return [field, null]
      }
      if (typeof value !== "string") {
        throw new Error(
          `canonical source ${entry.reference}:${entry.referenceId}.${field} is not text`
        )
      }
      return [field, value]
    })
  )
  if (
    mode === "normalize-source" &&
    !sameValue(entry.translations, canonicalTranslations)
  ) {
    throw new Error(
      `normalize-source payload differs from canonical ${entry.reference}:${entry.referenceId}`
    )
  }
  const desiredTranslations =
    mode === "normalize-source" ? canonicalTranslations : entry.translations
  const resultingTranslations: Record<string, unknown> = {
    ...desiredTranslations,
  }
  let action: CatalogTranslationPlanItem["action"] = "unchanged"
  if (!sameValue(previousTranslations, resultingTranslations)) {
    action = existing ? "update" : "create"
  }
  return {
    action,
    desiredTranslations,
    ...(existing ? { existingId: existing.id } : {}),
    localeCode: entry.localeCode,
    previousTranslations,
    provenance: entry.provenance,
    reference: entry.reference,
    referenceId: entry.referenceId,
    resultingTranslations,
    sourceRecordSha256: hashCatalogTranslationValue(source?.values),
  }
}

export const buildCatalogTranslationPlan = (
  input: CatalogTranslationInput,
  inputSha256: string,
  snapshot: CatalogTranslationSnapshot
): CatalogTranslationPlan => {
  const items = input.entries
    .map((entry) => buildPlanItem(snapshot, entry, input.mode))
    .sort((left, right) =>
      `${left.localeCode}\u0000${left.reference}\u0000${left.referenceId}`.localeCompare(
        `${right.localeCode}\u0000${right.reference}\u0000${right.referenceId}`,
        "en"
      )
    )
  const scope = buildCatalogTranslationScope(items)
  return {
    environment: input.environment,
    inputSha256,
    items,
    mode: input.mode,
    protectedState: snapshot.protectedState,
    schemaVersion: 1,
    scope,
    scopeSha256: hashCatalogTranslationValue(scope),
    sourceLocale: input.sourceLocale,
    summary: {
      creates: items.filter(({ action }) => action === "create").length,
      entries: items.length,
      unchanged: items.filter(({ action }) => action === "unchanged").length,
      updates: items.filter(({ action }) => action === "update").length,
    },
  }
}

export const hashCatalogTranslationPlan = (plan: CatalogTranslationPlan) =>
  hashCatalogTranslationValue(plan)

import { createHash } from "node:crypto"
import type { DemoInventoryBrand, DemoLocalizationInput } from "./types"

const SHA_256 = /^[a-f0-9]{64}$/

type BrandExclusionAuthority = Readonly<{
  approvedAt: string
  approvedBy: string
  referencePrefix: string
}>

const asRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

const nonblank = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a nonblank string`)
  }
  return value.trim()
}

const timestamp = (value: string, label: string): string => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be an ISO timestamp`)
  }
  return parsed.toISOString()
}

export const parseDemoCatalogEntitiesJson = (
  contents: string,
  fallbackSource: DemoLocalizationInput["fallbackSource"],
  exclusionAuthority: BrandExclusionAuthority
): Readonly<{
  artifactSha256: string
  brands: readonly DemoInventoryBrand[]
  collectionCount: 0
}> => {
  const exclusionApprovedAt = timestamp(
    nonblank(exclusionAuthority?.approvedAt, "brand exclusion approvedAt"),
    "brand exclusion approvedAt"
  )
  const exclusionApprovedBy = nonblank(
    exclusionAuthority?.approvedBy,
    "brand exclusion approvedBy"
  )
  const exclusionReferencePrefix = nonblank(
    exclusionAuthority?.referencePrefix,
    "brand exclusion referencePrefix"
  )
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch {
    throw new Error("Catalog entities artifact is not valid JSON")
  }
  const root = asRecord(parsed, "catalog entities")
  if (
    root.schema_version !== 1 ||
    root.approval !== "demo-generated-unreviewed"
  ) {
    throw new Error("Catalog entities artifact identity is invalid")
  }
  const collections = asRecord(
    root.collections_by_medusa_id,
    "catalog entities collections_by_medusa_id"
  )
  if (Object.keys(collections).length !== 0) {
    throw new Error(
      "Catalog entities collections must be authoritatively empty"
    )
  }
  const sourceEvidence = asRecord(
    root.source_evidence,
    "catalog entities source_evidence"
  )
  const officialEvidence = asRecord(
    sourceEvidence.official_ro,
    "catalog entities source_evidence.official_ro"
  )
  const officialHash = nonblank(
    officialEvidence.brand_index_html_sha256,
    "catalog entities official brand index hash"
  )
  if (!SHA_256.test(officialHash)) {
    throw new Error("Catalog entities official brand index hash is invalid")
  }
  const retrievedAt = timestamp(
    nonblank(officialEvidence.captured_at, "catalog entities captured_at"),
    "catalog entities captured_at"
  )
  const brandRecords = asRecord(
    root.brands_by_medusa_id,
    "catalog entities brands_by_medusa_id"
  )
  const brands = Object.entries(brandRecords)
    .map(([id, candidate]): DemoInventoryBrand => {
      const brand = asRecord(candidate, `brand ${id}`)
      if (brand.medusa_id !== id || brand.approval !== root.approval) {
        throw new Error(`Brand ${id} identity is invalid`)
      }
      const copy = asRecord(brand.candidate_ro, `brand ${id}.candidate_ro`)
      const official = asRecord(brand.official_ro, `brand ${id}.official_ro`)
      const publishable = copy.publishable
      if (typeof publishable !== "boolean") {
        throw new Error(`Brand ${id}.candidate_ro.publishable is invalid`)
      }
      if (publishable && official.matched !== true) {
        throw new Error(
          `Brand ${id} is publishable without an official RO match`
        )
      }
      const source = publishable
        ? {
            contentSha256: officialHash,
            retrievedAt,
            url: nonblank(
              official.source_url,
              `brand ${id}.official_ro.source_url`
            ),
          }
        : fallbackSource
      return {
        copySource: publishable ? "official-ro" : "agent-generated-unreviewed",
        id,
        publicSlug: nonblank(copy.slug, `brand ${id}.candidate_ro.slug`),
        ...(publishable
          ? {}
          : {
              roExclusionDecision: {
                approvedAt: exclusionApprovedAt,
                approvedBy: exclusionApprovedBy,
                reason: nonblank(
                  copy.publication_recommendation,
                  `brand ${id}.publication_recommendation`
                ),
                reference: `${exclusionReferencePrefix}:${id}`,
              },
            }),
        source,
        title: nonblank(copy.title, `brand ${id}.candidate_ro.title`),
      }
    })
    .sort((left, right) => left.id.localeCompare(right.id, "en"))
  const publishedCount = brands.filter(
    ({ roExclusionDecision }) => !roExclusionDecision
  ).length
  if (brands.length !== 128 || publishedCount !== 103) {
    throw new Error(
      `Catalog entities partition must be 128 total / 103 published / 25 excluded; observed ${brands.length}/${publishedCount}/${brands.length - publishedCount}`
    )
  }
  return {
    artifactSha256: createHash("sha256").update(contents).digest("hex"),
    brands,
    collectionCount: 0,
  }
}

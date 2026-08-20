import { createHash } from "node:crypto"
import type { RoCatalogScopePlanArtifact } from "../../../medusa-be/src/scripts/ro-catalog-readiness-contract"
import type {
  PopulationEntity,
  PopulationManifest,
} from "../../src/lib/url-registry/population/manifest-contracts"
import { canonicalCutoverValue } from "./cutover-receipt.mjs"

/** The actual producer identity normalized by the Medusa outbox. */
export const RO_CATALOG_IMPORTER_SOURCE = "medusa"
export const RO_MARKET_CODE = "ro"

export type UrlrEntityKind = "brand" | "category" | "product"

export type ExpectedUrlrEntity = Readonly<{
  entityId: string
  entityKey: string
  kind: UrlrEntityKind
  sourceVersion: string
  streamKey: string
}>

const KINDS = ["brand", "category", "product"] as const
const VISIBLE_TEXT = /^[\x21-\x7e]{1,255}$/

export const urlrEntityKey = (kind: UrlrEntityKind, entityId: string) =>
  `${kind}:${entityId}`

export const urlrStreamKey = (kind: UrlrEntityKind, entityId: string) =>
  `${RO_CATALOG_IMPORTER_SOURCE}|${kind}|${entityId}|${RO_MARKET_CODE}`

const scopeIds = (
  scope: Pick<
    RoCatalogScopePlanArtifact,
    "brandIds" | "categoryPublishedIds" | "productPublishedIds"
  >
) =>
  [
    ["brand", scope.brandIds],
    ["category", scope.categoryPublishedIds],
    ["product", scope.productPublishedIds],
  ] as const

const assertExactIds = (
  kind: UrlrEntityKind,
  ids: readonly string[]
): readonly string[] => {
  const seen = new Set<string>()
  for (const id of ids) {
    if (!VISIBLE_TEXT.test(id) || seen.has(id)) {
      throw new Error(
        `urlr-convergence: ${kind} scope contains an invalid or duplicate entity id`
      )
    }
    seen.add(id)
  }
  return [...ids].sort((left, right) => left.localeCompare(right, "en"))
}

const roCatalogEntities = (
  manifest: PopulationManifest
): readonly PopulationEntity[] =>
  manifest.entities.filter(
    (entity) =>
      entity.market === RO_MARKET_CODE &&
      KINDS.includes(entity.kind as UrlrEntityKind)
  )

/**
 * Binds the plan's independently hashed publication scope to the retained,
 * authoritative PopulationManifest. The manifest supplies the terminal source
 * version; event IDs remain producer-owned opaque values and are validated
 * from outbox rows instead of being invented here.
 */
export const buildExpectedUrlrEntities = (
  scope: Pick<
    RoCatalogScopePlanArtifact,
    "brandIds" | "categoryPublishedIds" | "productPublishedIds"
  >,
  manifest: PopulationManifest
): readonly ExpectedUrlrEntity[] => {
  const manifestByKey = new Map<string, PopulationEntity>()
  for (const entity of roCatalogEntities(manifest)) {
    const kind = entity.kind as UrlrEntityKind
    const key = urlrEntityKey(kind, entity.sourceId)
    if (manifestByKey.has(key)) {
      throw new Error(
        `urlr-convergence: population manifest duplicates entity ${key}`
      )
    }
    manifestByKey.set(key, entity)
  }

  const expected: ExpectedUrlrEntity[] = []
  for (const [kind, rawIds] of scopeIds(scope)) {
    for (const entityId of assertExactIds(kind, rawIds)) {
      const entityKey = urlrEntityKey(kind, entityId)
      const manifestEntity = manifestByKey.get(entityKey)
      if (!manifestEntity) {
        throw new Error(
          `urlr-convergence: ${entityKey} is absent from the retained population manifest`
        )
      }
      manifestByKey.delete(entityKey)
      expected.push({
        entityId,
        entityKey,
        kind,
        sourceVersion: manifestEntity.sourceVersion,
        streamKey: urlrStreamKey(kind, entityId),
      })
    }
  }
  if (manifestByKey.size > 0) {
    throw new Error(
      "urlr-convergence: retained population manifest contains RO catalog entities outside the import scope"
    )
  }
  return expected.sort((left, right) =>
    left.entityKey.localeCompare(right.entityKey, "en")
  )
}

/** SHA-256 over a JSON array of sorted strings. */
export const sha256OfSortedKeys = (values: readonly string[]): string =>
  createHash("sha256")
    .update(
      JSON.stringify(
        [...values].sort((left, right) => left.localeCompare(right, "en"))
      )
    )
    .digest("hex")

export const sha256OfCanonicalValue = (value: unknown): string =>
  createHash("sha256").update(canonicalCutoverValue(value)).digest("hex")

import { createHash } from "node:crypto"
import { writeFile } from "node:fs/promises"
import type { Market } from "../../src/lib/url/types"
import {
  hashPopulationManifest,
  parsePopulationManifest,
} from "../../src/lib/url-registry/population/manifest"
import {
  POPULATION_ENTITY_KINDS,
  POPULATION_MARKETS,
  type PopulationManifest,
  type TaxonomyApproval,
} from "../../src/lib/url-registry/population/manifest-contracts"
import { canonicalizePopulationValue } from "../../src/lib/url-registry/population/manifest-primitives"
import { hashPopulationStaticTaxonomy } from "../../src/lib/url-registry/population/static-taxonomy"
import {
  type PopulationSourceBinding,
  PopulationSourceExportError,
  type PopulationSourceExportItem,
  type PopulationSourceExportPage,
  type PopulationSourceKind,
  populationSourceGroupKey,
} from "./population-manifest-source-contracts"
import {
  assertRoDemoPopulationScope,
  type RO_DEMO_POPULATION_SCOPE,
} from "./static-taxonomy-population-manifest"

export const POPULATION_MANIFEST_GENERATOR =
  "medusa-payload-authoritative-export-v1"

export type PopulationSourceGroups = ReadonlyMap<
  string,
  readonly PopulationSourceExportPage[]
>

export type AssemblePopulationManifestOptions = Readonly<{
  generatedAt: string
  generator?: string
  groups: PopulationSourceGroups
  taxonomyApproval: TaxonomyApproval
}>

export type AssembledPopulationManifest = Readonly<{
  manifest: PopulationManifest
  manifestHash: `sha256:${string}`
  roPublicationScope: Readonly<
    Record<keyof typeof RO_DEMO_POPULATION_SCOPE, number>
  >
}>

const CATALOG_ASSIGNED_KINDS = new Set<PopulationSourceKind>([
  "brand",
  "category",
  "collection",
])
/**
 * Reorders a group's fetched pages into the canonical 1..pageCount
 * sequence, failing closed on any missing page, duplicate page, or
 * pageCount drift between pages of the same (market, kind) export.
 */
const assertCompletePagination = (
  pages: readonly PopulationSourceExportPage[],
  groupLabel: string
): readonly PopulationSourceExportPage[] => {
  const firstPage = pages[0]
  if (!firstPage) {
    throw new PopulationSourceExportError(`${groupLabel} produced no pages`)
  }
  const { pageCount } = firstPage
  const byPage = new Map<number, PopulationSourceExportPage>()
  for (const candidate of pages) {
    if (candidate.pageCount !== pageCount) {
      throw new PopulationSourceExportError(
        `${groupLabel} declared inconsistent pageCount across pages`
      )
    }
    if (byPage.has(candidate.page)) {
      throw new PopulationSourceExportError(
        `${groupLabel} page ${candidate.page} was returned more than once`
      )
    }
    byPage.set(candidate.page, candidate)
  }
  const ordered: PopulationSourceExportPage[] = []
  for (let page = 1; page <= pageCount; page += 1) {
    const found = byPage.get(page)
    if (!found) {
      throw new PopulationSourceExportError(
        `${groupLabel} is missing page ${page} of ${pageCount}`
      )
    }
    ordered.push(found)
  }
  if (ordered.length !== pages.length) {
    throw new PopulationSourceExportError(
      `${groupLabel} returned pages outside the declared pageCount`
    )
  }
  return ordered
}

const assertSameSnapshotAndBinding = (
  pages: readonly PopulationSourceExportPage[],
  groupLabel: string
): PopulationSourceExportPage => {
  const [firstPage, ...rest] = pages
  if (!firstPage) {
    throw new PopulationSourceExportError(`${groupLabel} produced no pages`)
  }
  for (const page of rest) {
    if (page.snapshotId !== firstPage.snapshotId) {
      throw new PopulationSourceExportError(
        `${groupLabel} declared inconsistent maintenance snapshot ids across its own pages`
      )
    }
    if (
      page.binding.locale !== firstPage.binding.locale ||
      page.binding.salesChannelId !== firstPage.binding.salesChannelId
    ) {
      throw new PopulationSourceExportError(
        `${groupLabel} declared inconsistent binding across its own pages`
      )
    }
  }
  return firstPage
}

const buildRawEntity = (
  item: PopulationSourceExportItem,
  kind: PopulationSourceKind,
  market: Market,
  binding: PopulationSourceBinding
): Record<string, unknown> => {
  const base = {
    equivalenceKey: item.equivalenceKey,
    indexPolicy: item.indexPolicy,
    kind,
    market,
    publicSlug: item.publicSlug,
    sourceEventId: `population-export:${kind}:${item.sourceId}:${market}:${item.sourceVersion}`,
    sourceId: item.sourceId,
    sourceVersion: item.sourceVersion,
  }
  if (kind === "product") {
    return {
      ...base,
      authority: {
        kind: "medusa-product-publication",
        locale: binding.locale,
        metadataSchemaVersion: 1,
        publicationStatus: "published",
        salesChannelId: binding.salesChannelId,
        sourceEntityExists: true,
        translationVerified: true,
      },
    }
  }
  if (CATALOG_ASSIGNED_KINDS.has(kind)) {
    if (item.assignmentId === null) {
      throw new PopulationSourceExportError(
        `${market}:${kind}:${item.sourceId} is missing its published assignment id`
      )
    }
    return {
      ...base,
      authority: {
        assignmentId: item.assignmentId,
        kind: "medusa-published-assignment",
        locale: binding.locale,
        publicationStatus: "published",
        salesChannelId: binding.salesChannelId,
        sourceEntityExists: true,
        translationVerified: true,
      },
    }
  }
  if (item.slugMappingId === null) {
    throw new PopulationSourceExportError(
      `${market}:${kind}:${item.sourceId} is missing its CMS slug mapping id`
    )
  }
  return {
    ...base,
    authority: {
      documentStatus: "published",
      kind: "payload-published-document",
      locale: binding.locale,
      slugMappingId: item.slugMappingId,
      stableIdVerified: true,
    },
  }
}

const sourceSnapshotHashOf = (
  snapshotByMarket: ReadonlyMap<Market, string>
): `sha256:${string}` => {
  const digestInput = POPULATION_MARKETS.map((market) => ({
    market,
    snapshotId: snapshotByMarket.get(market),
  }))
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalizePopulationValue(digestInput)))
    .digest("hex")}`
}

/**
 * Deterministically assembles the authoritative four-market URLR
 * PopulationManifest from already-fetched, already-validated
 * population-source export pages covering all six source kinds across
 * sk/cz/hu/ro. Fails closed on incomplete pagination, duplicate source
 * ids, snapshot/binding drift within a market, stale taxonomy approval,
 * or an RO publication scope other than 2002 products / 207 categories /
 * 103 brands / 0 collections. The final manifest shape is always
 * produced and re-validated by the existing `parsePopulationManifest`
 * contract, never a locally weakened copy of it.
 */
export const assemblePopulationManifest = (
  options: AssemblePopulationManifestOptions
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: this is one fail-closed cross-group audit with intentionally explicit invariants.
): AssembledPopulationManifest => {
  if (options.taxonomyApproval.hash !== hashPopulationStaticTaxonomy()) {
    throw new PopulationSourceExportError(
      "taxonomyApproval.hash does not match the current build taxonomy"
    )
  }
  const bindingsByMarket = new Map<Market, PopulationSourceBinding>()
  const snapshotByMarket = new Map<Market, string>()
  const seenSourceIds = new Set<string>()
  const entities: Readonly<{
    key: string
    value: Record<string, unknown>
  }>[] = []
  const expectedGroupKeys = new Set(
    POPULATION_MARKETS.flatMap((market) =>
      POPULATION_ENTITY_KINDS.map((kind) =>
        populationSourceGroupKey(market, kind)
      )
    )
  )
  if (
    options.groups.size !== expectedGroupKeys.size ||
    [...options.groups.keys()].some((key) => !expectedGroupKeys.has(key))
  ) {
    throw new PopulationSourceExportError(
      "population source groups must contain exactly every market/kind slot"
    )
  }

  for (const market of POPULATION_MARKETS) {
    for (const kind of POPULATION_ENTITY_KINDS) {
      const groupLabel = `population-exports/${market}/${kind}`
      const rawPages = options.groups.get(
        populationSourceGroupKey(market, kind)
      )
      if (!rawPages) {
        throw new PopulationSourceExportError(`${groupLabel} export is missing`)
      }
      const pages = assertCompletePagination(rawPages, groupLabel)
      const firstPage = assertSameSnapshotAndBinding(pages, groupLabel)

      const existingSnapshot = snapshotByMarket.get(market)
      if (existingSnapshot === undefined) {
        snapshotByMarket.set(market, firstPage.snapshotId)
      } else if (existingSnapshot !== firstPage.snapshotId) {
        throw new PopulationSourceExportError(
          `${market} population source exports declare inconsistent maintenance snapshot ids across source kinds`
        )
      }
      const existingBinding = bindingsByMarket.get(market)
      if (existingBinding === undefined) {
        bindingsByMarket.set(market, firstPage.binding)
      } else if (
        existingBinding.locale !== firstPage.binding.locale ||
        existingBinding.salesChannelId !== firstPage.binding.salesChannelId
      ) {
        throw new PopulationSourceExportError(
          `${market} population source exports declare inconsistent binding across source kinds`
        )
      }
      const binding = bindingsByMarket.get(market) as PopulationSourceBinding

      for (const page of pages) {
        for (const item of page.items) {
          const dedupKey = `${market}:${kind}:${item.sourceId}`
          if (seenSourceIds.has(dedupKey)) {
            throw new PopulationSourceExportError(
              `${groupLabel} duplicates source id ${item.sourceId}`
            )
          }
          seenSourceIds.add(dedupKey)
          entities.push({
            key: `${market}\0${kind}\0${item.sourceId}`,
            value: buildRawEntity(item, kind, market, binding),
          })
        }
      }
    }
  }

  const bindings = POPULATION_MARKETS.map((market) => {
    const binding = bindingsByMarket.get(market) as PopulationSourceBinding
    return {
      locale: binding.locale,
      market,
      salesChannelId: binding.salesChannelId,
    }
  })

  const rawManifest = {
    bindings,
    completeInventory: true,
    entities: entities
      .sort((left, right) => left.key.localeCompare(right.key, "en"))
      .map(({ value }) => value),
    generatedAt: options.generatedAt,
    generator: options.generator ?? POPULATION_MANIFEST_GENERATOR,
    schemaVersion: 1,
    sourceSnapshotHash: sourceSnapshotHashOf(snapshotByMarket),
    taxonomyApproval: options.taxonomyApproval,
  }

  const manifest = parsePopulationManifest(rawManifest)
  const roPublicationScope = assertRoDemoPopulationScope(manifest)
  return {
    manifest,
    manifestHash: hashPopulationManifest(manifest),
    roPublicationScope,
  }
}

export const canonicalPopulationManifestBytes = (
  manifest: PopulationManifest
): string => `${JSON.stringify(canonicalizePopulationValue(manifest))}\n`

/**
 * Writes the assembled manifest as canonical (sorted-key, compact) JSON
 * plus a trailing LF, privately (mode 0600) and never clobbering an
 * existing reservation at `outputPath`.
 */
export const writePopulationManifestOutput = async (
  outputPath: string,
  manifest: PopulationManifest,
  writer: typeof writeFile = writeFile
): Promise<void> => {
  await writer(outputPath, canonicalPopulationManifestBytes(manifest), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  })
}

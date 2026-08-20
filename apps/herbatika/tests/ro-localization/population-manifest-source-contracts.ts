import type { Market } from "../../src/lib/url/types"
import {
  POPULATION_ENTITY_KINDS,
  POPULATION_LOCALE_BY_MARKET,
  POPULATION_MARKETS,
  POPULATION_SLUG,
} from "../../src/lib/url-registry/population/manifest-contracts"
import {
  assertPopulationExactKeys,
  populationOneOf,
  populationRecord,
  populationText,
} from "../../src/lib/url-registry/population/manifest-primitives"

// The assembler is only correct for the current four-market/six-kind URLR
// population contract. Fail loudly at import time rather than silently
// assembling a partial manifest if that contract ever changes shape.
if (POPULATION_MARKETS.length !== 4) {
  throw new Error(
    "population manifest source assembler expects exactly four markets"
  )
}
if (POPULATION_ENTITY_KINDS.length !== 6) {
  throw new Error(
    "population manifest source assembler expects exactly six source kinds"
  )
}

export class PopulationSourceExportError extends Error {
  override readonly name = "PopulationSourceExportError"
}

export const POPULATION_SOURCE_SCHEMA_VERSION = 1

export const POPULATION_INDEX_POLICIES = ["indexable", "noindex"] as const

export type PopulationSourceKind = (typeof POPULATION_ENTITY_KINDS)[number]

const CATALOG_ASSIGNED_KINDS = new Set<PopulationSourceKind>([
  "brand",
  "category",
  "collection",
])
const CONTENT_KINDS = new Set<PopulationSourceKind>(["article", "page"])

export const populationSourceGroupKey = (
  market: Market,
  kind: PopulationSourceKind
) => `${market}:${kind}`

export type PopulationSourceExportItem = Readonly<{
  assignmentId: null | string
  equivalenceKey: string
  indexPolicy: (typeof POPULATION_INDEX_POLICIES)[number]
  publicSlug: string
  slugMappingId: null | string
  sourceId: string
  sourceVersion: string
}>

export type PopulationSourceBinding = Readonly<{
  locale: string
  salesChannelId: string
}>

export type PopulationSourceExportPage = Readonly<{
  binding: PopulationSourceBinding
  itemCount: number
  items: readonly PopulationSourceExportItem[]
  kind: PopulationSourceKind
  market: Market
  page: number
  pageCount: number
  schemaVersion: 1
  snapshotId: string
}>

const positiveInteger = (value: unknown, label: string): number => {
  if (!(Number.isSafeInteger(value) && (value as number) >= 1)) {
    throw new PopulationSourceExportError(`${label} must be an integer >= 1`)
  }
  return value as number
}

const publicSlugText = (value: unknown, label: string): string => {
  if (
    typeof value !== "string" ||
    value.length > 80 ||
    !POPULATION_SLUG.test(value)
  ) {
    throw new PopulationSourceExportError(`${label} is invalid`)
  }
  return value
}

const parseSourceItem = (
  value: unknown,
  index: number,
  kind: PopulationSourceKind,
  label: string
): PopulationSourceExportItem => {
  const itemLabel = `${label}.items[${index}]`
  const input = populationRecord(value, itemLabel)
  const isAssigned = CATALOG_ASSIGNED_KINDS.has(kind)
  const isContent = CONTENT_KINDS.has(kind)
  const keys = [
    "equivalenceKey",
    "indexPolicy",
    "publicSlug",
    "sourceId",
    "sourceVersion",
  ]
  if (isAssigned) {
    keys.push("assignmentId")
  }
  if (isContent) {
    keys.push("slugMappingId")
  }
  assertPopulationExactKeys(input, keys, itemLabel)
  return {
    assignmentId: isAssigned
      ? populationText(input.assignmentId, `${itemLabel}.assignmentId`)
      : null,
    equivalenceKey: populationText(
      input.equivalenceKey,
      `${itemLabel}.equivalenceKey`
    ),
    indexPolicy: populationOneOf(
      input.indexPolicy,
      POPULATION_INDEX_POLICIES,
      `${itemLabel}.indexPolicy`
    ),
    publicSlug: publicSlugText(input.publicSlug, `${itemLabel}.publicSlug`),
    slugMappingId: isContent
      ? populationText(input.slugMappingId, `${itemLabel}.slugMappingId`)
      : null,
    sourceId: populationText(input.sourceId, `${itemLabel}.sourceId`),
    sourceVersion: populationText(
      input.sourceVersion,
      `${itemLabel}.sourceVersion`
    ),
  }
}

const parseBinding = (
  value: unknown,
  market: Market,
  label: string
): PopulationSourceBinding => {
  const bindingLabel = `${label}.binding`
  const input = populationRecord(value, bindingLabel)
  assertPopulationExactKeys(input, ["locale", "salesChannelId"], bindingLabel)
  const locale = populationText(input.locale, `${bindingLabel}.locale`)
  if (locale !== POPULATION_LOCALE_BY_MARKET[market]) {
    throw new PopulationSourceExportError(
      `${bindingLabel}.locale does not match market ${market}`
    )
  }
  return {
    locale,
    salesChannelId: populationText(
      input.salesChannelId,
      `${bindingLabel}.salesChannelId`
    ),
  }
}

export type PopulationSourceExportExpectation = Readonly<{
  kind: PopulationSourceKind
  market: Market
}>

/**
 * Validates one page of a paginated, authenticated population-source
 * export. `expected` binds the page to the (market, kind) slot the caller
 * requested; any mismatch is treated as a tampered or misrouted response
 * and rejected fail-closed.
 */
export const parsePopulationSourceExportPage = (
  value: unknown,
  expected: PopulationSourceExportExpectation,
  label: string
): PopulationSourceExportPage => {
  const input = populationRecord(value, label)
  assertPopulationExactKeys(
    input,
    [
      "binding",
      "itemCount",
      "items",
      "kind",
      "market",
      "page",
      "pageCount",
      "schemaVersion",
      "snapshotId",
    ],
    label
  )
  if (input.schemaVersion !== POPULATION_SOURCE_SCHEMA_VERSION) {
    throw new PopulationSourceExportError(`${label}.schemaVersion is invalid`)
  }
  const kind = populationOneOf(
    input.kind,
    POPULATION_ENTITY_KINDS,
    `${label}.kind`
  )
  const market = populationOneOf(
    input.market,
    POPULATION_MARKETS,
    `${label}.market`
  )
  if (kind !== expected.kind || market !== expected.market) {
    throw new PopulationSourceExportError(
      `${label} returned an unexpected market/kind slot (possible tamper)`
    )
  }
  const page = positiveInteger(input.page, `${label}.page`)
  const pageCount = positiveInteger(input.pageCount, `${label}.pageCount`)
  if (page > pageCount) {
    throw new PopulationSourceExportError(
      `${label}.page must not exceed pageCount`
    )
  }
  if (
    !(Number.isSafeInteger(input.itemCount) && (input.itemCount as number) >= 0)
  ) {
    throw new PopulationSourceExportError(`${label}.itemCount must be >= 0`)
  }
  const snapshotId = populationText(input.snapshotId, `${label}.snapshotId`)
  const binding = parseBinding(input.binding, market, label)
  if (!Array.isArray(input.items)) {
    throw new PopulationSourceExportError(`${label}.items must be an array`)
  }
  if (input.items.length !== input.itemCount) {
    throw new PopulationSourceExportError(
      `${label}.itemCount does not match items.length`
    )
  }
  const items = input.items.map((item, index) =>
    parseSourceItem(item, index, kind, label)
  )
  return {
    binding,
    itemCount: items.length,
    items,
    kind,
    market,
    page,
    pageCount,
    schemaVersion: POPULATION_SOURCE_SCHEMA_VERSION,
    snapshotId,
  }
}

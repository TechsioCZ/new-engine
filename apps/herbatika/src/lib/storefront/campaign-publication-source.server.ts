import {
  CAMPAIGN_LOCALE_BY_MARKET,
  CAMPAIGN_SLUG_PATTERN,
  type ReviewedCampaignPublication,
  type ReviewedCampaignPublicationManifest,
  readReviewedCampaignPublicationManifest,
} from "@/lib/storefront/campaign-publication-contract"
import type { Market } from "@/lib/url/types"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import { readCurrentEntitySourceVersions } from "@/lib/url-registry/current-entity-source-versions"
import type { ActiveEntityRouteTarget } from "@/lib/url-registry/model"
import { getUrlRegistryRuntime } from "@/lib/url-registry/runtime/instance.server"
import { listPublicEntityProjections } from "@/lib/url-registry/runtime/public-projections.server"

export type CampaignPublicationPageValue = Readonly<{
  content: string
  description?: string
  id: string
  indexable: boolean
  publishedAt?: string
  publicSlug: string
  title: string
}>

export type CampaignPublicationIndexItem = Readonly<{
  id: string
  publicSlug: string
  title: string
}>

export type CampaignSourceCandidate = Readonly<{
  publicSlug: string
  routeId: string
  sourceId: string
  sourceVersion: string
}>

export type CampaignPublicationDependencies = Readonly<{
  listProjections(
    market: Market
  ): Promise<SourceReadResult<readonly ActiveEntityRouteTarget[]>>
  readManifest(): SourceReadResult<ReviewedCampaignPublicationManifest>
  readSourceVersions(
    projections: readonly ActiveEntityRouteTarget[]
  ): Promise<SourceReadResult<ReadonlyMap<string, string>>>
}>

const validCampaignProjection = (
  projection: ActiveEntityRouteTarget,
  market: Market
) =>
  projection.projectionType === "entity" &&
  projection.route.kind === "campaign" &&
  projection.route.market === market &&
  projection.route.sourceSystem === "medusa" &&
  projection.route.sourceType === "campaign" &&
  projection.route.status === "active" &&
  projection.currentSlug.kind === "campaign" &&
  projection.currentSlug.market === market &&
  projection.currentSlug.routeId === projection.route.id &&
  projection.currentSlug.disposition === "current" &&
  CAMPAIGN_SLUG_PATTERN.test(projection.currentSlug.normalizedSlug)

const readCampaignPublicationSet = async (
  market: Market,
  dependencies: CampaignPublicationDependencies
): Promise<
  SourceReadResult<
    readonly Readonly<{
      entry: ReviewedCampaignPublication
      projection: ActiveEntityRouteTarget
    }>[]
  >
> => {
  const manifest = dependencies.readManifest()
  if (manifest.kind !== "found") {
    return manifest
  }
  const marketEntries = manifest.value.entries.filter(
    (entry) => entry.market === market
  )
  if (marketEntries.length === 0) {
    return { kind: "missing" }
  }
  const projections = await dependencies.listProjections(market)
  if (projections.kind !== "found") {
    return projections
  }
  if (
    projections.value.some(
      (projection) => !validCampaignProjection(projection, market)
    )
  ) {
    return {
      causeCode: "INVALID_CAMPAIGN_PUBLIC_PROJECTION",
      kind: "invalid-response",
    }
  }
  const sourceVersions = await dependencies.readSourceVersions(
    projections.value
  )
  if (sourceVersions.kind !== "found") {
    return sourceVersions
  }
  const projectionBySourceId = new Map(
    projections.value.map((projection) => [
      projection.route.sourceId,
      projection,
    ])
  )
  if (projectionBySourceId.size !== projections.value.length) {
    return {
      causeCode: "DUPLICATE_CAMPAIGN_PUBLIC_PROJECTION",
      kind: "invalid-response",
    }
  }

  const values = marketEntries.map((entry) => {
    const projection = projectionBySourceId.get(entry.sourceId)
    return projection &&
      projection.currentSlug.normalizedSlug === entry.publicSlug &&
      sourceVersions.value.get(projection.route.id) === entry.sourceVersion
      ? { entry, projection }
      : null
  })
  return values.some((value) => value === null)
    ? {
        causeCode: "CAMPAIGN_PUBLICATION_PROOF_MISMATCH",
        kind: "invalid-response",
      }
    : {
        kind: "found",
        value: values as readonly Readonly<{
          entry: ReviewedCampaignPublication
          projection: ActiveEntityRouteTarget
        }>[],
      }
}

export const readCampaignPublicationIndex = async (
  market: Market,
  dependencies: CampaignPublicationDependencies
): Promise<SourceReadResult<readonly CampaignPublicationIndexItem[]>> => {
  const source = await readCampaignPublicationSet(market, dependencies)
  if (source.kind !== "found") {
    return source
  }
  const items = source.value
    .filter(({ projection }) => projection.route.indexPolicy === "indexable")
    .map(({ entry }) => ({
      id: entry.sourceId,
      publicSlug: entry.publicSlug,
      title: entry.title,
    }))
    .sort((left, right) =>
      left.title.localeCompare(right.title, CAMPAIGN_LOCALE_BY_MARKET[market])
    )
  return items.length > 0
    ? { kind: "found", value: items }
    : { kind: "missing" }
}

export const readCampaignPublicationDetail = async (
  input: Readonly<{ market: Market; sourceId: string }>,
  dependencies: CampaignPublicationDependencies
): Promise<SourceReadResult<CampaignPublicationPageValue>> => {
  const source = await readCampaignPublicationSet(input.market, dependencies)
  if (source.kind !== "found") {
    return source
  }
  const value = source.value.find(
    ({ entry }) => entry.sourceId === input.sourceId
  )
  if (!value) {
    return { kind: "missing" }
  }
  return {
    kind: "found",
    value: {
      content: value.entry.content,
      ...(value.entry.description
        ? { description: value.entry.description }
        : {}),
      id: value.entry.sourceId,
      indexable: value.projection.route.indexPolicy === "indexable",
      ...(value.entry.publishedAt
        ? { publishedAt: value.entry.publishedAt }
        : {}),
      publicSlug: value.entry.publicSlug,
      title: value.entry.title,
    },
  }
}

const readRuntimeSourceVersions = async (
  projections: readonly ActiveEntityRouteTarget[]
): Promise<SourceReadResult<ReadonlyMap<string, string>>> => {
  const runtime = await getUrlRegistryRuntime()
  if (!runtime.enabled) {
    return { kind: "unavailable" }
  }
  const sourceVersions = await readCurrentEntitySourceVersions(
    projections,
    runtime.registry
  )
  if (sourceVersions.kind !== "found") {
    return sourceVersions
  }
  return {
    kind: "found",
    value: new Map(
      sourceVersions.value.map(({ routeId, sourceVersion }) => [
        routeId,
        sourceVersion,
      ])
    ),
  }
}

const runtimeDependencies = (): CampaignPublicationDependencies => ({
  listProjections: (market) =>
    listPublicEntityProjections({ kind: "campaign", market }),
  readManifest: () => readReviewedCampaignPublicationManifest(),
  readSourceVersions: readRuntimeSourceVersions,
})

export const readCampaignPublicationIndexFromRuntime = (market: Market) =>
  readCampaignPublicationIndex(market, runtimeDependencies())

export const readCampaignPublicationDetailFromRuntime = (input: {
  market: Market
  sourceId: string
}) => readCampaignPublicationDetail(input, runtimeDependencies())

export const validateCampaignPublicationCandidates = (
  input: Readonly<{
    market: Market
    sources: readonly CampaignSourceCandidate[]
  }>,
  environment: Readonly<Record<string, string | undefined>> = process.env
): SourceReadResult<readonly Readonly<{ routeId: string }>[]> => {
  if (
    new Set(input.sources.map((source) => source.routeId)).size !==
      input.sources.length ||
    new Set(input.sources.map((source) => source.sourceId)).size !==
      input.sources.length ||
    new Set(input.sources.map((source) => source.publicSlug)).size !==
      input.sources.length
  ) {
    return {
      causeCode: "INVALID_CAMPAIGN_SOURCE_CANDIDATES",
      kind: "invalid-response",
    }
  }
  const manifest = readReviewedCampaignPublicationManifest(environment)
  if (manifest.kind === "missing") {
    return { kind: "found", value: [] }
  }
  if (manifest.kind !== "found") {
    return manifest
  }
  const entryBySourceId = new Map(
    manifest.value.entries
      .filter((entry) => entry.market === input.market)
      .map((entry) => [entry.sourceId, entry])
  )
  return {
    kind: "found",
    value: input.sources.flatMap((source) => {
      const entry = entryBySourceId.get(source.sourceId)
      return entry?.publicSlug === source.publicSlug &&
        entry.sourceVersion === source.sourceVersion
        ? [{ routeId: source.routeId }]
        : []
    }),
  }
}

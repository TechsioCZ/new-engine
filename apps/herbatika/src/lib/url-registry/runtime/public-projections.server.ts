// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import type { Market } from "@/lib/url/types"
import type {
  ActiveEntityRouteTarget,
  EntityUrlKind,
  StaticRouteSnapshot,
} from "@/lib/url-registry/model"
import type { SourceReadResult } from "@/lib/url-registry/reads"
import { createUrlRegistrySourceIdentity } from "@/lib/url-registry/source-identity"
import { getUrlRegistryRuntime } from "./instance.server"

const MAX_PUBLIC_PROJECTIONS = 20_000
const MAX_REQUIRED_PUBLIC_PROJECTIONS = 100
const REQUIRED_PROJECTION_READ_CONCURRENCY = 5

type PublicEntityProjectionRequest = Readonly<{
  kind: EntityUrlKind
  market: Market
  requiredSourceIds?: readonly string[]
}>

type PublicEntityProjectionPageRequest = Readonly<{
  kind: EntityUrlKind
  limit: number
  market: Market
  offset: number
}>

const findRequiredPublicEntityProjections = async (
  input: PublicEntityProjectionRequest,
  sourceIds: readonly string[]
): Promise<SourceReadResult<readonly ActiveEntityRouteTarget[]>> => {
  const runtime = await getUrlRegistryRuntime()
  if (!runtime.enabled) {
    return { kind: "unavailable" }
  }

  const projections: ActiveEntityRouteTarget[] = []

  for (
    let offset = 0;
    offset < sourceIds.length;
    offset += REQUIRED_PROJECTION_READ_CONCURRENCY
  ) {
    const results = await Promise.all(
      sourceIds
        .slice(offset, offset + REQUIRED_PROJECTION_READ_CONCURRENCY)
        .map((sourceId) =>
          runtime.registry.findActiveEntityRoute({
            ...createUrlRegistrySourceIdentity(input.kind, sourceId),
            market: input.market,
          })
        )
    )

    for (const result of results) {
      if (result.kind === "found") {
        projections.push(result.value)
      } else if (result.kind !== "missing") {
        return result
      }
    }
  }

  return { kind: "found", value: projections }
}

export const listPublicEntityProjections = async (
  input: PublicEntityProjectionRequest
): Promise<SourceReadResult<readonly ActiveEntityRouteTarget[]>> => {
  const requiredSourceIds = [
    ...new Set(input.requiredSourceIds?.filter(Boolean) ?? []),
  ]
  if (requiredSourceIds.length > MAX_REQUIRED_PUBLIC_PROJECTIONS) {
    return {
      causeCode: "REQUIRED_PUBLIC_PROJECTION_LIMIT_EXCEEDED",
      kind: "invalid-response",
    }
  }
  if (input.requiredSourceIds) {
    return findRequiredPublicEntityProjections(input, requiredSourceIds)
  }

  const runtime = await getUrlRegistryRuntime()
  if (!runtime.enabled) {
    return { kind: "unavailable" }
  }

  const items: ActiveEntityRouteTarget[] = []
  let cursor: string | undefined
  do {
    const page = await runtime.registry.listActiveEntityRoutes({
      ...(cursor ? { cursor } : {}),
      kind: input.kind,
      limit: 100,
      market: input.market,
    })
    if (page.kind !== "found") {
      return page
    }
    items.push(...page.value.items)
    if (items.length > MAX_PUBLIC_PROJECTIONS) {
      return {
        causeCode: "PUBLIC_PROJECTION_LIMIT_EXCEEDED",
        kind: "invalid-response",
      }
    }
    cursor = page.value.nextCursor ?? undefined
  } while (cursor)

  return { kind: "found", value: items }
}

export const countPublicIndexableEntityProjections = async (
  input: Pick<PublicEntityProjectionRequest, "kind" | "market">
): Promise<SourceReadResult<number>> => {
  const runtime = await getUrlRegistryRuntime()
  return runtime.enabled
    ? runtime.registry.countActiveEntityRoutes({
        ...input,
        indexPolicy: "indexable",
      })
    : { kind: "unavailable" }
}

export const listPublicIndexableEntityProjectionPage = async (
  input: PublicEntityProjectionPageRequest
): Promise<SourceReadResult<readonly ActiveEntityRouteTarget[]>> => {
  if (
    !Number.isSafeInteger(input.offset) ||
    input.offset < 0 ||
    !Number.isSafeInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > 100
  ) {
    return {
      causeCode: "INVALID_PUBLIC_PROJECTION_PAGE",
      kind: "invalid-response",
    }
  }
  const runtime = await getUrlRegistryRuntime()
  if (!runtime.enabled) {
    return { kind: "unavailable" }
  }
  const page = await runtime.registry.listActiveEntityRoutes({
    ...input,
    indexPolicy: "indexable",
  })
  return page.kind === "found"
    ? { kind: "found", value: page.value.items }
    : page
}

export const listPublicStaticProjections = async (
  market: Market
): Promise<SourceReadResult<readonly StaticRouteSnapshot[]>> => {
  const runtime = await getUrlRegistryRuntime()
  if (!runtime.enabled) {
    return { kind: "unavailable" }
  }

  const result = await runtime.registry.listStaticRouteSnapshots(market)
  if (result.kind !== "found") {
    return result
  }
  if (result.value.length > MAX_PUBLIC_PROJECTIONS) {
    return {
      causeCode: "PUBLIC_PROJECTION_LIMIT_EXCEEDED",
      kind: "invalid-response",
    }
  }
  return result
}

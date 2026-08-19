// Pages Router rejects the App-Router-only `server-only` marker. Keep this
// module reachable only from server entry points.

import type { Market } from "@/lib/url/types"
import type {
  ActiveEntityRouteTarget,
  EntityUrlKind,
  StaticRouteSnapshot,
} from "@/lib/url-registry/model"
import type { SourceReadResult } from "@/lib/url-registry/reads"
import { getUrlRegistryRuntime } from "./instance.server"

const MAX_PUBLIC_PROJECTIONS = 20_000

export const listPublicEntityProjections = async (input: {
  kind: EntityUrlKind
  market: Market
}): Promise<SourceReadResult<readonly ActiveEntityRouteTarget[]>> => {
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

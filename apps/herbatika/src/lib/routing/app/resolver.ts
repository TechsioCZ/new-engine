import { cache } from "react"
import { buildAbsoluteUrl } from "@/lib/url/builder"
import type { Market, UrlRecord } from "@/lib/url/types"
import type { UrlRegistry } from "@/lib/url-registry/contracts"
import { getUrlRegistry } from "@/lib/url-registry/factory"
import { upstreamError } from "./errors"
import { type ParsedStorefrontRoute, parseStorefrontPath } from "./route-parser"

export type ResolvedEntityRoute =
  | { type: "current"; record: UrlRecord; alternates: UrlRecord[] }
  | { type: "alias"; record: UrlRecord; destination: string }
  | { type: "missing" }
  | { type: "tombstone" }

export type ResolvedStorefrontRoute =
  | Exclude<ParsedStorefrontRoute, { type: "entity" }>
  | {
      type: "entity"
      kind: Extract<ParsedStorefrontRoute, { type: "entity" }>["kind"]
      slug: string
      resolution: ResolvedEntityRoute
    }

export async function resolveEntityWithRegistry(
  market: Market,
  route: Extract<ParsedStorefrontRoute, { type: "entity" }>,
  registry: UrlRegistry
): Promise<ResolvedEntityRoute> {
  const lookup = await registry.lookup(market, route.kind, route.slug)
  if (lookup.type === "missing") {
    return { type: "missing" }
  }
  if (lookup.type === "tombstone") {
    return { type: "tombstone" }
  }
  if (lookup.type === "alias") {
    return {
      type: "alias",
      record: lookup.currentRecord,
      destination: buildAbsoluteUrl({
        market,
        kind: route.kind,
        slug: lookup.currentRecord.slug,
      }),
    }
  }
  const alternates = await registry.findAlternates(lookup.record.equivalenceKey)
  return { type: "current", record: lookup.record, alternates }
}

const resolveCached = cache(
  async (market: Market, pathKey: string): Promise<ResolvedStorefrontRoute> => {
    const parsed = parseStorefrontPath(
      market,
      pathKey ? pathKey.split("/") : undefined
    )
    if (parsed.type !== "entity") {
      return parsed
    }
    let registry: UrlRegistry
    try {
      registry = await getUrlRegistry()
      const resolution = await resolveEntityWithRegistry(
        market,
        parsed,
        registry
      )
      return { ...parsed, resolution }
    } catch (cause) {
      throw upstreamError(
        "url-registry",
        "unavailable",
        "URL registry resolution failed",
        cause
      )
    }
  }
)

export const resolveStorefrontRoute = (
  market: Market,
  path: readonly string[] | undefined
) => resolveCached(market, (path ?? []).join("/"))

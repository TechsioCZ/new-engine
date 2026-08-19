import { SITEMAP_KINDS } from "@/lib/seo/sitemap-contract"
import { listSitemapEntries, shardSitemapEntries } from "@/lib/seo/sitemaps"
import {
  SYSTEM_NO_STORE,
  systemHostFailureResponse,
  systemOptionsResponse,
  systemResponse,
  systemSourceFailureResponse,
  toHeadResponse,
} from "@/lib/seo/system-response"
import {
  resolveSystemHostFromRequest,
  systemSitemapDependencies,
} from "@/lib/seo/system-runtime.server"
import { type SitemapUrl, serializeSitemapIndex } from "@/lib/seo/xml"

export const dynamic = "force-dynamic"

const maxLastModified = (urls: readonly SitemapUrl[]): string | undefined =>
  urls.reduce<string | undefined>((latest, entry) => {
    if (!entry.lastModified) {
      return latest
    }
    return !latest || entry.lastModified > latest ? entry.lastModified : latest
  }, undefined)

export const GET = async (request: Request): Promise<Response> => {
  const resolution = resolveSystemHostFromRequest(request)
  if (resolution.kind !== "found") {
    return systemHostFailureResponse(resolution)
  }

  const indexEntries: SitemapUrl[] = []
  try {
    for (const kind of SITEMAP_KINDS) {
      const result = await listSitemapEntries(
        resolution.binding,
        kind,
        systemSitemapDependencies
      )
      if (result.kind !== "found") {
        return systemSourceFailureResponse(
          result.kind === "unavailable" ? result.retryAfterSeconds : undefined
        )
      }
      const shards = shardSitemapEntries(result.value)
      for (const [index, shard] of shards.entries()) {
        indexEntries.push({
          lastModified: maxLastModified(shard),
          location: new URL(
            `/sitemaps/${kind}-${index + 1}.xml`,
            resolution.binding.canonicalOrigin
          ).href,
        })
      }
    }
  } catch {
    return systemSourceFailureResponse()
  }

  return systemResponse(
    serializeSitemapIndex(indexEntries),
    "application/xml; charset=utf-8",
    { headers: { "cache-control": SYSTEM_NO_STORE } }
  )
}

export const HEAD = async (request: Request): Promise<Response> =>
  toHeadResponse(await GET(request))

export const OPTIONS = systemOptionsResponse

import { parseSitemapShardName } from "@/lib/seo/sitemap-contract"
import {
  assertSitemapXmlBounded,
  listSitemapShardEntries,
} from "@/lib/seo/sitemaps"
import {
  SYSTEM_NO_STORE,
  systemHostFailureResponse,
  systemNotFoundResponse,
  systemOptionsResponse,
  systemResponse,
  systemSourceFailureResponse,
  toHeadResponse,
} from "@/lib/seo/system-response"
import {
  resolveSystemHostFromRequest,
  systemSitemapDependencies,
} from "@/lib/seo/system-runtime.server"
import { serializeUrlSet } from "@/lib/seo/xml"

export const dynamic = "force-dynamic"

type ShardContext = Readonly<{
  params: Promise<Readonly<{ shard: string }>>
}>

export const GET = async (
  request: Request,
  context: ShardContext
): Promise<Response> => {
  const resolution = resolveSystemHostFromRequest(request)
  if (resolution.kind !== "found") {
    return systemHostFailureResponse(resolution)
  }
  const parsed = parseSitemapShardName((await context.params).shard)
  if (!parsed) {
    return systemNotFoundResponse()
  }

  try {
    const result = await listSitemapShardEntries(
      resolution.binding,
      parsed.kind,
      parsed.shard,
      systemSitemapDependencies
    )
    if (result.kind === "missing") {
      return systemNotFoundResponse()
    }
    if (result.kind !== "found") {
      return systemSourceFailureResponse(
        result.kind === "unavailable" ? result.retryAfterSeconds : undefined
      )
    }
    const xml = serializeUrlSet(result.value)
    return assertSitemapXmlBounded(xml)
      ? systemResponse(xml, "application/xml; charset=utf-8", {
          headers: { "cache-control": SYSTEM_NO_STORE },
        })
      : systemSourceFailureResponse()
  } catch {
    return systemSourceFailureResponse()
  }
}

export const HEAD = async (
  request: Request,
  context: ShardContext
): Promise<Response> => toHeadResponse(await GET(request, context))

export const OPTIONS = systemOptionsResponse

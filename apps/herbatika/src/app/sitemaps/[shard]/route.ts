import { resolveMarketFromHost } from "@/lib/seo/market"
import { buildSitemapShardXml, parseSitemapShard } from "@/lib/seo/sitemap"
import { getUrlRegistry } from "@/lib/url-registry/factory"

type ShardContext = { params: Promise<{ shard: string }> }

export const dynamic = "force-dynamic"

async function handle(
  request: Request,
  context: ShardContext,
  headOnly: boolean
): Promise<Response> {
  const market = resolveMarketFromHost(request.headers.get("host"))
  if (market === null) {
    return new Response(headOnly ? null : "Misdirected Request\n", {
      status: 421,
    })
  }

  const shard = parseSitemapShard((await context.params).shard)
  if (shard === null) {
    return new Response(headOnly ? null : "Sitemap not found\n", {
      status: 404,
    })
  }

  try {
    const registry = await getUrlRegistry()
    const xml = await buildSitemapShardXml(registry, market, shard)
    if (xml === null) {
      return new Response(headOnly ? null : "Sitemap not found\n", {
        status: 404,
      })
    }
    return new Response(headOnly ? null : xml, {
      headers: {
        "cache-control": "no-store",
        "content-type": "application/xml; charset=utf-8",
      },
    })
  } catch {
    return new Response(headOnly ? null : "Sitemap unavailable\n", {
      status: 503,
      headers: { "retry-after": "60" },
    })
  }
}

export function GET(
  request: Request,
  context: ShardContext
): Promise<Response> {
  return handle(request, context, false)
}

export function HEAD(
  request: Request,
  context: ShardContext
): Promise<Response> {
  return handle(request, context, true)
}

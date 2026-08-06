import { resolveAllowedMarketParam } from "@/lib/seo/market"
import { buildSitemapShardXml, parseSitemapShard } from "@/lib/seo/sitemap"
import { getUrlRegistry } from "@/lib/url-registry/factory"

type ShardContext = {
  params: Promise<{ market: string; shard: string }>
}

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: ShardContext
): Promise<Response> {
  const params = await context.params
  const market = resolveAllowedMarketParam(params.market)
  const shard = parseSitemapShard(params.shard)
  if (market === null || shard === null) {
    return new Response("Not Found\n", { status: 404 })
  }

  try {
    const registry = await getUrlRegistry()
    const xml = await buildSitemapShardXml(registry, market, shard)
    if (xml === null) {
      return new Response("Sitemap not found\n", { status: 404 })
    }
    return new Response(xml, {
      headers: {
        "cache-control": "public, max-age=0, s-maxage=300",
        "content-type": "application/xml; charset=utf-8",
      },
    })
  } catch {
    return new Response("Sitemap unavailable\n", {
      status: 503,
      headers: { "retry-after": "60" },
    })
  }
}

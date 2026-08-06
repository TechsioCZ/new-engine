import { resolveAllowedMarketParam } from "@/lib/seo/market"
import { buildSitemapIndexXml } from "@/lib/seo/sitemap"
import { getUrlRegistry } from "@/lib/url-registry/factory"

type MarketContext = { params: Promise<{ market: string }> }

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: MarketContext
): Promise<Response> {
  const market = resolveAllowedMarketParam((await context.params).market)
  if (market === null) {
    return new Response("Not Found\n", { status: 404 })
  }

  try {
    const registry = await getUrlRegistry()
    return new Response(await buildSitemapIndexXml(registry, market), {
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

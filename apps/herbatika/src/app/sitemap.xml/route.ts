import { resolveMarketFromHost } from "@/lib/seo/market"
import { buildSitemapIndexXml } from "@/lib/seo/sitemap"
import { getUrlRegistry } from "@/lib/url-registry/factory"

export const dynamic = "force-dynamic"

async function handle(request: Request, headOnly: boolean): Promise<Response> {
  const market = resolveMarketFromHost(request.headers.get("host"))
  if (market === null) {
    return new Response(headOnly ? null : "Misdirected Request\n", {
      status: 421,
    })
  }

  try {
    const registry = await getUrlRegistry()
    const xml = await buildSitemapIndexXml(registry, market)
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

export function GET(request: Request): Promise<Response> {
  return handle(request, false)
}

export function HEAD(request: Request): Promise<Response> {
  return handle(request, true)
}

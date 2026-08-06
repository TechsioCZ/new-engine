import { resolveAllowedMarketParam } from "@/lib/seo/market"
import { buildRobotsTxt } from "@/lib/seo/robots"

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

  return new Response(buildRobotsTxt(market), {
    headers: {
      "cache-control": "public, max-age=0, s-maxage=300",
      "content-type": "text/plain; charset=utf-8",
    },
  })
}

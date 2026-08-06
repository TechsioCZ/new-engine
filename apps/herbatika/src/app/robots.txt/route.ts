import { resolveMarketFromHost } from "@/lib/seo/market"
import { buildRobotsTxt } from "@/lib/seo/robots"

export const dynamic = "force-dynamic"

const responseHeaders = {
  "cache-control": "public, max-age=0, s-maxage=300",
  "content-type": "text/plain; charset=utf-8",
}

function handle(request: Request, headOnly: boolean): Response {
  const market = resolveMarketFromHost(request.headers.get("host"))
  if (market === null) {
    return new Response(headOnly ? null : "Misdirected Request\n", {
      status: 421,
    })
  }

  return new Response(headOnly ? null : buildRobotsTxt(market), {
    headers: responseHeaders,
  })
}

export function GET(request: Request): Response {
  return handle(request, false)
}

export function HEAD(request: Request): Response {
  return handle(request, true)
}

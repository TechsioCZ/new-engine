import { NextResponse } from "next/server"
import { loadBlogQueryState } from "@/lib/storefront/blog-query-state.server"
import { fetchCmsBlogListing } from "@/lib/storefront/cms"
import { getCmsLocaleForMarket } from "@/lib/storefront/cms-locale"
import { resolveMarketContext } from "@/lib/storefront/market-context"

const CLIENT_CLOSED_REQUEST_STATUS = 499

export async function GET(request: Request) {
  const { category, page } = loadBlogQueryState(request)
  const marketContext = resolveMarketContext({
    acceptLanguage: request.headers.get("accept-language"),
    host:
      request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  })

  try {
    const listing = await fetchCmsBlogListing({
      category,
      locale: getCmsLocaleForMarket(marketContext.code),
      page,
      signal: request.signal,
    })

    return NextResponse.json(listing)
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: CLIENT_CLOSED_REQUEST_STATUS })
    }

    console.error("Blog listing request failed", error)

    return NextResponse.json(
      { message: "Blog listing is temporarily unavailable" },
      { status: 502 }
    )
  }
}

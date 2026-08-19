import { NextResponse } from "next/server"
import { loadBlogQueryState } from "@/lib/storefront/blog-query-state.server"
import { fetchCmsBlogListing } from "@/lib/storefront/cms"
import { resolveMarketContextFromHeaders } from "@/lib/storefront/market-context.server"

const CLIENT_CLOSED_REQUEST_STATUS = 499

export async function GET(request: Request) {
  const { category, page } = loadBlogQueryState(request)
  const marketContext = resolveMarketContextFromHeaders(request.headers)

  if (!marketContext) {
    return NextResponse.json(
      { message: "Unsupported storefront market" },
      { status: 400 }
    )
  }

  try {
    const listing = await fetchCmsBlogListing({
      category,
      locale: marketContext.locale,
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

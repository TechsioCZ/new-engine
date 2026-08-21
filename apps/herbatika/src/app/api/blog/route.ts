import { NextResponse } from "next/server"
import { resolveStorefrontApiMessages } from "@/app/api/_messages"
import { resolveConfiguredMarketRuntimeBindingByHost } from "@/lib/market/market-runtime.server"
import { loadBlogQueryState } from "@/lib/storefront/blog-query-state.server"
import { fetchCmsBlogListing } from "@/lib/storefront/cms"

const CLIENT_CLOSED_REQUEST_STATUS = 499

export async function GET(request: Request) {
  const { category, page } = loadBlogQueryState(request)
  const binding = resolveConfiguredMarketRuntimeBindingByHost(
    request.headers.get("host")
  )
  if (!binding) {
    return NextResponse.json(
      { message: "Misdirected request" },
      {
        headers: { "Cache-Control": "private, no-store" },
        status: 421,
      }
    )
  }
  const messages = resolveStorefrontApiMessages(binding.market)

  try {
    const listing = await fetchCmsBlogListing({
      category,
      locale: binding.locale,
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
      { message: messages.blogListingUnavailable },
      {
        headers: { "Cache-Control": "private, no-store" },
        status: 502,
      }
    )
  }
}

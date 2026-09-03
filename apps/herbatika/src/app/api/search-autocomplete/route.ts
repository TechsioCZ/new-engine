import { NextResponse } from "next/server"
import { resolveConfiguredMarketRuntimeBindingByHost } from "@/lib/market/market-runtime.server"
import { fetchSearchAutocomplete } from "@/lib/search-autocomplete/search-autocomplete.server"
import {
  createEmptySearchAutocompleteResponse,
  SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH,
} from "@/lib/search-autocomplete/search-autocomplete-types"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
import { getSessionTokenFromCookieHeader } from "../storefront-auth/_lib"

const PRIVATE_RESPONSE_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  vary: "Host, Cookie",
} as const

export async function GET(request: Request) {
  const marketBinding = resolveConfiguredMarketRuntimeBindingByHost(
    request.headers.get("host")
  )
  if (!marketBinding) {
    return NextResponse.json(createEmptySearchAutocompleteResponse(""), {
      headers: PRIVATE_RESPONSE_HEADERS,
      status: 421,
    })
  }

  const { searchParams } = new URL(request.url)
  const query = (searchParams.get("q") ?? "")
    .trim()
    .slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)
  const authToken = getSessionTokenFromCookieHeader(
    request.headers.get("cookie")
  )
  const marketContext = getHerbatikaMarketContext(marketBinding.market)

  try {
    const response = await fetchSearchAutocomplete({
      query,
      countryCode: marketBinding.countryCode.toLowerCase(),
      currencyCode: marketContext.currencyCode,
      locale: marketBinding.locale,
      market: marketBinding.market,
      regionId: marketBinding.regionId,
      authToken,
    })
    return NextResponse.json(response, { headers: PRIVATE_RESPONSE_HEADERS })
  } catch (error) {
    console.error("Search autocomplete failed", error)

    return NextResponse.json(createEmptySearchAutocompleteResponse(query), {
      headers: PRIVATE_RESPONSE_HEADERS,
      status: 502,
    })
  }
}

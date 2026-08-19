import { NextResponse } from "next/server"
import { resolveConfiguredMarketRuntimeBindingByHost } from "@/lib/market/market-runtime.server"
import { fetchSearchAutocomplete } from "@/lib/search-autocomplete/search-autocomplete.server"
import {
  createEmptySearchAutocompleteResponse,
  SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH,
} from "@/lib/search-autocomplete/search-autocomplete-types"
import { getSessionTokenFromCookieHeader } from "../storefront-auth/_lib"

export async function GET(request: Request) {
  const marketBinding = resolveConfiguredMarketRuntimeBindingByHost(
    request.headers.get("host")
  )
  if (!marketBinding) {
    return NextResponse.json(createEmptySearchAutocompleteResponse(""), {
      status: 421,
    })
  }

  const { searchParams } = new URL(request.url)
  const query = (searchParams.get("q") ?? "")
    .trim()
    .slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)
  const countryCode = searchParams.get("country")
  const currencyCode = searchParams.get("currency")
  const locale = searchParams.get("locale")
  const regionId = searchParams.get("region")
  const authToken = getSessionTokenFromCookieHeader(
    request.headers.get("cookie")
  )

  try {
    const response = await fetchSearchAutocomplete({
      query,
      countryCode,
      currencyCode,
      locale,
      market: marketBinding.market,
      regionId,
      authToken,
    })
    return NextResponse.json(response)
  } catch (error) {
    console.error("Search autocomplete failed", error)

    return NextResponse.json(createEmptySearchAutocompleteResponse(query), {
      status: 502,
    })
  }
}

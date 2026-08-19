import { NextResponse } from "next/server"
import { fetchSearchAutocomplete } from "@/lib/search-autocomplete/search-autocomplete.server"
import {
  createEmptySearchAutocompleteResponse,
  SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH,
} from "@/lib/search-autocomplete/search-autocomplete-types"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import { getSessionTokenFromCookieHeader } from "../storefront-auth/_lib"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get("q") ?? "")
    .trim()
    .slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)
  const authToken = getSessionTokenFromCookieHeader(
    request.headers.get("cookie")
  )

  try {
    const { marketContext, region } = await getRegionServerContext()

    if (!region) {
      return NextResponse.json(createEmptySearchAutocompleteResponse(query), {
        status: 503,
      })
    }

    const response = await fetchSearchAutocomplete({
      query,
      countryCode: region.country_code,
      currencyCode: region.currency_code,
      locale: marketContext.locale,
      regionId: region.region_id,
      salesChannelId: region.salesChannelId,
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

import { NextResponse } from "next/server"
import { fetchSearchAutocomplete } from "@/lib/search-autocomplete/search-autocomplete.server"
import {
  createEmptySearchAutocompleteResponse,
  SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH,
} from "@/lib/search-autocomplete/search-autocomplete-types"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get("q") ?? "")
    .trim()
    .slice(0, SEARCH_AUTOCOMPLETE_MAX_QUERY_LENGTH)
  try {
    const response = await fetchSearchAutocomplete({ query })
    return NextResponse.json(response)
  } catch (error) {
    console.error("Search autocomplete failed", error)

    return NextResponse.json(createEmptySearchAutocompleteResponse(query), {
      status: 502,
    })
  }
}

import { NextResponse } from "next/server";
import { fetchSearchAutocomplete } from "@/lib/search-autocomplete/search-autocomplete.server";
import { createEmptySearchAutocompleteResponse } from "@/lib/search-autocomplete/search-autocomplete-types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const currencyCode = searchParams.get("currency");

  try {
    const response = await fetchSearchAutocomplete({ query, currencyCode });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Search autocomplete failed", error);

    return NextResponse.json(createEmptySearchAutocompleteResponse(query), {
      status: 502,
    });
  }
}

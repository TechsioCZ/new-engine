import { NextResponse } from "next/server";
import { searchStorefrontProducts } from "@/lib/storefront/meili-search";

const DEFAULT_LIMIT = 12;
const DEFAULT_PAGE = 1;

const parseLimit = (value: string | null): number => {
  if (!value) {
    return DEFAULT_LIMIT;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return DEFAULT_LIMIT;
  }

  return numericValue;
};

const parsePage = (value: string | null): number => {
  if (!value) {
    return DEFAULT_PAGE;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return DEFAULT_PAGE;
  }

  return numericValue;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (!query) {
    return NextResponse.json(
      {
        provider: "meili",
        query: "",
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 0,
        page: DEFAULT_PAGE,
        pageSize: parseLimit(searchParams.get("limit")),
        totalPages: 0,
      },
      { status: 200 },
    );
  }

  try {
    const result = await searchStorefrontProducts(query, {
      limit: parseLimit(searchParams.get("limit")),
      page: parsePage(searchParams.get("page")),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Meilisearch request failed.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}

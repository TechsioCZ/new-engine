import { NextResponse } from "next/server";
import { fetchServerSearchProductsByHandles } from "@/lib/storefront/storefront-server";

const DEFAULT_FETCH_LIMIT = 24;
const MAX_FETCH_LIMIT = 80;

type SearchProductsRequestBody = {
  handles?: unknown;
  regionId?: unknown;
  countryCode?: unknown;
};

const toOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeHandles = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueHandles = new Set<string>();
  for (const item of value) {
    const handle = toOptionalString(item);
    if (!handle) {
      continue;
    }
    uniqueHandles.add(handle);
  }

  return Array.from(uniqueHandles).sort((left, right) =>
    left.localeCompare(right),
  );
};

const clampLimit = (value: number): number => {
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_FETCH_LIMIT;
  }

  return Math.min(Math.trunc(value), MAX_FETCH_LIMIT);
};

export async function POST(request: Request) {
  let body: SearchProductsRequestBody = {};
  try {
    body = (await request.json()) as SearchProductsRequestBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const handles = normalizeHandles(body.handles);
  if (handles.length === 0) {
    return NextResponse.json({ products: [], count: 0 }, { status: 200 });
  }

  try {
    const result = await fetchServerSearchProductsByHandles({
      handles,
      regionId: toOptionalString(body.regionId),
      countryCode: toOptionalString(body.countryCode),
      limit: clampLimit(handles.length),
    });

    return NextResponse.json(
      {
        products: result.products,
        count: result.count,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to fetch search products.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";
import { STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS } from "@/lib/storefront/product-query-config";

const DEFAULT_MEDUSA_BACKEND_URL = "http://localhost:9000";
const DEFAULT_FETCH_LIMIT = 24;
const MAX_FETCH_LIMIT = 80;

type SearchProductsRequestBody = {
  handles?: unknown;
  regionId?: unknown;
  countryCode?: unknown;
};

type StoreProductsResponsePayload = {
  products?: unknown[];
  count?: number;
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

const buildProductsUrl = (input: {
  backendUrl: string;
  handles: string[];
  regionId: string | null;
  countryCode: string | null;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.set("offset", "0");
  searchParams.set("limit", String(clampLimit(input.handles.length)));
  searchParams.set("fields", STOREFRONT_SEARCH_PRODUCT_CARD_FIELDS);

  if (input.regionId) {
    searchParams.set("region_id", input.regionId);
  }

  if (input.countryCode) {
    searchParams.set("country_code", input.countryCode);
  }

  for (const handle of input.handles) {
    searchParams.append("handle[]", handle);
  }

  return `${input.backendUrl}/store/products?${searchParams.toString()}`;
};

const parseMedusaError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string };
    if (typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }
  } catch {
    // noop
  }

  return `Medusa request failed with status ${response.status}`;
};

export async function POST(request: Request) {
  const backendUrl =
    toOptionalString(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) ??
    DEFAULT_MEDUSA_BACKEND_URL;
  const publishableKey = toOptionalString(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY);

  if (!publishableKey) {
    return NextResponse.json(
      { message: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY is not configured." },
      { status: 500 },
    );
  }

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

  const productsUrl = buildProductsUrl({
    backendUrl: backendUrl.replace(/\/$/, ""),
    handles,
    regionId: toOptionalString(body.regionId),
    countryCode: toOptionalString(body.countryCode),
  });

  const response = await fetch(productsUrl, {
    method: "GET",
    headers: {
      "x-publishable-api-key": publishableKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        message: "Failed to fetch search products.",
        error: await parseMedusaError(response),
      },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as StoreProductsResponsePayload;
  return NextResponse.json(
    {
      products: Array.isArray(payload.products) ? payload.products : [],
      count: typeof payload.count === "number" ? payload.count : 0,
    },
    { status: 200 },
  );
}

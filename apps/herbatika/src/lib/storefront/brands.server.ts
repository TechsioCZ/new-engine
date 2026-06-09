import "server-only";

import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  SSR_FETCH_OPTIONS,
} from "@/lib/storefront/ssr/constants";
import {
  normalizeStorefrontBrand,
  type StorefrontBrand,
} from "./brands";

type StoreProducersResponse = {
  producers?: Array<{
    id?: string | null;
    title?: string | null;
    handle?: string | null;
  }>;
};

const STORE_PRODUCERS_INDEX_LIMIT = 500;

export const fetchStorefrontBrands = async (): Promise<StorefrontBrand[]> => {
  const url = new URL("/store/producers", MEDUSA_BACKEND_URL);
  url.searchParams.set("limit", String(STORE_PRODUCERS_INDEX_LIMIT));
  url.searchParams.set("offset", "0");
  url.searchParams.set("order", "title");
  url.searchParams.set("fields", "id,title,handle");

  const response = await fetch(url, {
    ...SSR_FETCH_OPTIONS.static,
    headers: {
      "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load storefront brands: ${response.status}`);
  }

  const data = (await response.json()) as StoreProducersResponse;
  const brands = (data.producers ?? [])
    .map((producer) => normalizeStorefrontBrand(producer))
    .filter((brand): brand is StorefrontBrand => Boolean(brand));

  const brandsBySlug = new Map<string, StorefrontBrand>();
  for (const brand of brands) {
    if (!brandsBySlug.has(brand.slug)) {
      brandsBySlug.set(brand.slug, brand);
    }
  }

  return Array.from(brandsBySlug.values());
};

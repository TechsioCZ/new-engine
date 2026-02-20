import type { HttpTypes } from "@medusajs/types";
import { useEffect } from "react";
import {
  STOREFRONT_PRODUCT_CARD_FIELDS,
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
  usePrefetchProducts,
} from "@/lib/storefront/products";
import { PRODUCT_FETCH_LIMIT } from "./homepage.data";

type RegionLike = {
  region_id?: string;
  country_code?: string;
} | null;

type UseHomepagePrefetchResult = {
  handleProductHoverStart: (product: HttpTypes.StoreProduct) => void;
  handleProductHoverEnd: (product: HttpTypes.StoreProduct) => void;
};

export function useHomepagePrefetch(region: RegionLike): UseHomepagePrefetchResult {
  const { prefetchFirstPage, prefetchProducts } = usePrefetchProducts({
    cacheStrategy: "semiStatic",
    defaultDelay: 220,
  });
  const { delayedPrefetch, cancelPrefetch } = usePrefetchProduct({
    cacheStrategy: "semiStatic",
    defaultDelay: 160,
  });

  useEffect(() => {
    if (!region?.region_id) {
      return;
    }

    void prefetchFirstPage(
      {
        page: 1,
        limit: PRODUCT_FETCH_LIMIT,
        fields: STOREFRONT_PRODUCT_CARD_FIELDS,
        region_id: region.region_id,
        country_code: region.country_code,
      },
      { prefetchedBy: "home-main" },
    );

    void prefetchProducts(
      {
        page: 2,
        limit: PRODUCT_FETCH_LIMIT,
        fields: STOREFRONT_PRODUCT_CARD_FIELDS,
        region_id: region.region_id,
        country_code: region.country_code,
      },
      {
        prefetchedBy: "home-next-page",
        skipMode: "any",
      },
    );
  }, [
    prefetchFirstPage,
    prefetchProducts,
    region?.country_code,
    region?.region_id,
  ]);

  const handleProductHoverStart = (product: HttpTypes.StoreProduct) => {
    if (!product.handle) {
      return;
    }

    delayedPrefetch(
      {
        handle: product.handle,
        fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
        region_id: region?.region_id,
        country_code: region?.country_code,
      },
      120,
      `home-product-${product.id}`,
    );
  };

  const handleProductHoverEnd = (product: HttpTypes.StoreProduct) => {
    cancelPrefetch(`home-product-${product.id}`);
  };

  return {
    handleProductHoverStart,
    handleProductHoverEnd,
  };
}

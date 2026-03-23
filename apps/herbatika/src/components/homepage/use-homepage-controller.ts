import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useMemo } from "react";
import {
  PRODUCT_FETCH_LIMIT,
  PRODUCT_SECTIONS,
  PRODUCTS_PER_GRID_SECTION,
  TOTAL_GRID_PRODUCTS,
} from "./homepage.data";
import type { HomepageProductSection } from "./homepage.types";
import { getSectionProducts } from "./homepage.utils";
import { useHomepageCartActions } from "./use-homepage-cart-actions";
import { useHomepagePrefetch } from "./use-homepage-prefetch";
import {
  STOREFRONT_PRODUCT_CARD_FIELDS,
  useProducts,
} from "@/lib/storefront/products";

type UseHomepageControllerResult = {
  cartMessage: string | null;
  mutationError: string | null;
  productsError: string | null;
  shouldShowProductSkeleton: boolean;
  leadingSections: HomepageProductSection[];
  trailingSections: HomepageProductSection[];
  recentProducts: HttpTypes.StoreProduct[];
  isProductAdding: (product: HttpTypes.StoreProduct) => boolean;
  handleAddToCart: (product: HttpTypes.StoreProduct) => Promise<void>;
  handleProductHoverStart: (product: HttpTypes.StoreProduct) => void;
  handleProductHoverEnd: (product: HttpTypes.StoreProduct) => void;
};

export function useHomepageController(): UseHomepageControllerResult {
  const region = useRegionContext();
  const productsQuery = useProducts({
    page: 1,
    limit: PRODUCT_FETCH_LIMIT,
    fields: STOREFRONT_PRODUCT_CARD_FIELDS,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });

  const cartActions = useHomepageCartActions(region);
  const prefetchActions = useHomepagePrefetch(region);

  const shouldShowProductSkeleton =
    productsQuery.products.length === 0 &&
    (!region?.region_id || productsQuery.isLoading);

  const preparedProductSections = useMemo<HomepageProductSection[]>(() => {
    return PRODUCT_SECTIONS.map((section, index) => ({
      ...section,
      products: getSectionProducts(
        productsQuery.products,
        index * PRODUCTS_PER_GRID_SECTION,
        PRODUCTS_PER_GRID_SECTION,
      ),
    }));
  }, [productsQuery.products]);

  const recentProducts = useMemo(() => {
    return getSectionProducts(
      productsQuery.products,
      TOTAL_GRID_PRODUCTS,
      productsQuery.products.length,
    );
  }, [productsQuery.products]);

  return {
    cartMessage: cartActions.cartMessage,
    mutationError: cartActions.mutationError,
    productsError: productsQuery.error,
    shouldShowProductSkeleton,
    leadingSections: preparedProductSections.slice(0, 2),
    trailingSections: preparedProductSections.slice(2),
    recentProducts,
    isProductAdding: cartActions.isProductAdding,
    handleAddToCart: cartActions.handleAddToCart,
    handleProductHoverStart: prefetchActions.handleProductHoverStart,
    handleProductHoverEnd: prefetchActions.handleProductHoverEnd,
  };
}

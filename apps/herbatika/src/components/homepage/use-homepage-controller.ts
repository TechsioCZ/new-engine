import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useMemo } from "react";
import {
  PRODUCT_SECTIONS,
  PRODUCTS_PER_GRID_SECTION,
} from "./homepage.data";
import type { HomepageProductSection } from "./homepage.types";
import { useHomepageCartActions } from "./use-homepage-cart-actions";
import { useHomepagePrefetch } from "./use-homepage-prefetch";
import { useCatalogProducts } from "@/lib/storefront/catalog-products";
import {
  STOREFRONT_CATEGORY_TREE_FIELDS,
  STOREFRONT_CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config";
import { useCategories } from "@/lib/storefront/categories";
import { HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE } from "@/lib/storefront/homepage-catalog-config";
import {
  orderProductsByHandles,
  useRecentlyVisitedProductHandles,
} from "@/lib/storefront/recently-visited-products";
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
  const categoriesQuery = useCategories({
    page: 1,
    limit: STOREFRONT_CATEGORY_TREE_LIMIT,
    fields: STOREFRONT_CATEGORY_TREE_FIELDS,
  });

  const cartActions = useHomepageCartActions(region);
  const prefetchActions = useHomepagePrefetch(region);

  const categoryByHandle = useMemo(() => {
    const map = new Map<string, HttpTypes.StoreProductCategory>();

    for (const category of categoriesQuery.categories) {
      if (category.handle) {
        map.set(category.handle, category);
      }
    }

    return map;
  }, [categoriesQuery.categories]);

  const bestsellersCategoryId = categoryByHandle.get(
    HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE,
  )?.id;
  const recentlyVisitedHandles = useRecentlyVisitedProductHandles();
  const recentProductHandles = useMemo(
    () => recentlyVisitedHandles.slice(0, PRODUCTS_PER_GRID_SECTION),
    [recentlyVisitedHandles],
  );

  const bestsellersProductsQuery = useCatalogProducts({
    page: 1,
    limit: PRODUCTS_PER_GRID_SECTION,
    sort: "recommended",
    category_id: bestsellersCategoryId ? [bestsellersCategoryId] : undefined,
    enabled: Boolean(region?.region_id && bestsellersCategoryId),
  });

  const newProductsQuery = useCatalogProducts({
    page: 1,
    limit: PRODUCTS_PER_GRID_SECTION,
    sort: "newest",
    status: ["new"],
    enabled: Boolean(region?.region_id),
  });

  const actionProductsQuery = useCatalogProducts({
    page: 1,
    limit: PRODUCTS_PER_GRID_SECTION,
    sort: "recommended",
    status: ["action"],
    enabled: Boolean(region?.region_id),
  });

  const recentProductsQuery = useProducts({
    page: 1,
    limit: recentProductHandles.length,
    handle: recentProductHandles.length > 0 ? recentProductHandles : undefined,
    fields: STOREFRONT_PRODUCT_CARD_FIELDS,
    enabled: Boolean(region?.region_id && recentProductHandles.length > 0),
  });

  const sectionQueries = [
    bestsellersProductsQuery,
    newProductsQuery,
    actionProductsQuery,
  ];

  const shouldShowProductSkeleton =
    sectionQueries.every((query) => query.products.length === 0) &&
    (!region?.region_id ||
      categoriesQuery.isLoading ||
      sectionQueries.some((query) => query.isLoading));

  const preparedProductSections = useMemo<HomepageProductSection[]>(() => {
    return [
      {
        ...PRODUCT_SECTIONS[0],
        products: bestsellersProductsQuery.products,
      },
      {
        ...PRODUCT_SECTIONS[1],
        products: newProductsQuery.products,
      },
      {
        ...PRODUCT_SECTIONS[2],
        products: actionProductsQuery.products,
      },
    ];
  }, [
    actionProductsQuery.products,
    bestsellersProductsQuery.products,
    newProductsQuery.products,
  ]);
  const recentProducts = useMemo(() => {
    return orderProductsByHandles(
      recentProductsQuery.products,
      recentProductHandles,
    );
  }, [recentProductsQuery.products, recentProductHandles]);

  return {
    cartMessage: cartActions.cartMessage,
    mutationError: cartActions.mutationError,
    productsError:
      categoriesQuery.error ??
      bestsellersProductsQuery.error ??
      newProductsQuery.error ??
      actionProductsQuery.error ??
      recentProductsQuery.error,
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

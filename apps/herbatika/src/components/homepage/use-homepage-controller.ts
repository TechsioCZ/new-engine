import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useMemo } from "react";
import {
  PRODUCT_SECTIONS,
  PRODUCTS_PER_COLLECTION_SECTION,
} from "./homepage.data";
import type { HomepageProductSection } from "./homepage.types";
import { useHomepagePrefetch } from "./use-homepage-prefetch";
import { useCatalogProducts } from "@/lib/storefront/catalog-products";
import {
  CATEGORY_TREE_FIELDS,
  CATEGORY_TREE_LIMIT,
} from "@/lib/storefront/category-query-config";
import { useCategories } from "@/lib/storefront/categories";
import { HOMEPAGE_BESTSELLERS_CATEGORY_HANDLE } from "@/lib/storefront/homepage-catalog-config";

type UseHomepageControllerResult = {
  productsError: string | null;
  shouldShowProductSkeleton: boolean;
  leadingSections: HomepageProductSection[];
  trailingSections: HomepageProductSection[];
  handleProductHoverStart: (product: HttpTypes.StoreProduct) => void;
  handleProductHoverEnd: (product: HttpTypes.StoreProduct) => void;
};

export function useHomepageController(): UseHomepageControllerResult {
  const region = useRegionContext();
  const categoriesQuery = useCategories({
    page: 1,
    limit: CATEGORY_TREE_LIMIT,
    fields: CATEGORY_TREE_FIELDS,
  });

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

  const bestsellersProductsQuery = useCatalogProducts({
    page: 1,
    limit: PRODUCTS_PER_COLLECTION_SECTION,
    sort: "recommended",
    category_id: bestsellersCategoryId ? [bestsellersCategoryId] : undefined,
    enabled: Boolean(region?.region_id && bestsellersCategoryId),
  });

  const newProductsQuery = useCatalogProducts({
    page: 1,
    limit: PRODUCTS_PER_COLLECTION_SECTION,
    sort: "newest",
    status: ["new"],
    enabled: Boolean(region?.region_id),
  });

  const actionProductsQuery = useCatalogProducts({
    page: 1,
    limit: PRODUCTS_PER_COLLECTION_SECTION,
    sort: "recommended",
    status: ["action"],
    enabled: Boolean(region?.region_id),
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

  return {
    productsError:
      categoriesQuery.error ??
      bestsellersProductsQuery.error ??
      newProductsQuery.error ??
      actionProductsQuery.error,
    shouldShowProductSkeleton,
    leadingSections: preparedProductSections.slice(0, 2),
    trailingSections: preparedProductSections.slice(2),
    handleProductHoverStart: prefetchActions.handleProductHoverStart,
    handleProductHoverEnd: prefetchActions.handleProductHoverEnd,
  };
}

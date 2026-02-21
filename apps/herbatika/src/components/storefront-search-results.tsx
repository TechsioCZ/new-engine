"use client";

import { useRegionContext } from "@techsio/storefront-data/shared";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { useEffect, useMemo } from "react";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import { useStorefrontSearch } from "@/lib/storefront/search";
import { SearchPagination } from "./search/search-pagination";
import { SEARCH_RESULT_LIMIT } from "./search/search-query-config";
import { SearchResultsGrid } from "./search/search-results-grid";
import { SearchSkeletonGrid } from "./search/search-skeleton-grid";
import { SearchToolbar } from "./search/search-toolbar";
import { useSearchAddToCart } from "./search/use-search-add-to-cart";
import { useSearchProducts } from "./search/use-search-products";
import { useSearchQueryState } from "./search/use-search-query-state";

export function StorefrontSearchResults() {
  const region = useRegionContext();
  const { query, currentPage, setPage } = useSearchQueryState();

  const searchQuery = useStorefrontSearch({
    q: query,
    page: currentPage,
    limit: SEARCH_RESULT_LIMIT,
  });

  const result = searchQuery.data;
  const hits = result?.hits ?? [];
  const {
    orderedProducts,
    descriptionByHandle,
    missingProductsCount,
    isProductGridLoading: isSearchProductsLoading,
  } = useSearchProducts({
    query,
    hits,
    regionId: region?.region_id,
    countryCode: region?.country_code,
  });

  const { addToCartError, activeProductId, isAddPending, handleAddToCart } =
    useSearchAddToCart({
      regionId: region?.region_id,
      countryCode: region?.country_code,
    });

  useEffect(() => {
    if (!(query && result && result.totalPages > 0)) {
      return;
    }

    if (currentPage <= result.totalPages) {
      return;
    }

    setPage(result.totalPages, "replace");
  }, [currentPage, query, result, setPage]);

  const pageBadgeLabel = useMemo(() => {
    if (result && result.totalPages > 0) {
      return `strana: ${result.page}/${result.totalPages}`;
    }

    return `strana: ${currentPage}`;
  }, [currentPage, result]);

  const errorMessage = searchQuery.error
    ? resolveErrorMessage(searchQuery.error, "Vyhľadávanie zlyhalo.")
    : null;
  const isProductGridLoading =
    !searchQuery.isLoading && isSearchProductsLoading;
  const shouldShowGridSkeleton = searchQuery.isLoading || isProductGridLoading;
  const shouldShowEmptyState =
    !searchQuery.isLoading &&
    !isProductGridLoading &&
    query.length > 0 &&
    !errorMessage &&
    orderedProducts.length === 0;

  return (
    <main className="mx-auto w-full max-w-max-w px-400 py-700 lg:px-550">
      <section className="rounded-2xl border border-border-secondary bg-surface p-400 md:p-550">
        <div className="space-y-400">
          <SearchToolbar
            estimatedTotalHits={result?.estimatedTotalHits ?? 0}
            hitsCount={hits.length}
            pageBadgeLabel={pageBadgeLabel}
            query={query}
          />

          {errorMessage ? <ErrorText showIcon>{errorMessage}</ErrorText> : null}
          {addToCartError ? (
            <ErrorText showIcon>{addToCartError}</ErrorText>
          ) : null}

          {!query ? (
            <p className="text-sm text-fg-secondary">
              Zadajte výraz do vyhľadávania v hornom paneli.
            </p>
          ) : null}

          {shouldShowGridSkeleton ? <SearchSkeletonGrid /> : null}

          {shouldShowEmptyState ? (
            <p className="text-sm text-fg-secondary">
              {hits.length === 0
                ? "Pre zadaný výraz sme nenašli žiadny produkt."
                : "Produkty sa nepodarilo načítať v aktuálnom regióne."}
            </p>
          ) : null}

          {!shouldShowGridSkeleton && orderedProducts.length > 0 ? (
            <SearchResultsGrid
              activeProductId={activeProductId}
              descriptionByHandle={descriptionByHandle}
              isAddPending={isAddPending}
              onAddToCart={handleAddToCart}
              products={orderedProducts}
            />
          ) : null}

          {!shouldShowGridSkeleton && missingProductsCount > 0 ? (
            <p className="text-xs text-fg-tertiary">{`Nepodarilo sa načítať ${missingProductsCount} položiek.`}</p>
          ) : null}

          <SearchPagination
            count={result?.estimatedTotalHits ?? 0}
            currentPage={currentPage}
            isVisible={
              !searchQuery.isLoading &&
              !errorMessage &&
              query.length > 0 &&
              (result?.totalPages ?? 0) > 1
            }
            onPageChange={(nextPage) => {
              if (nextPage === currentPage) {
                return;
              }

              setPage(nextPage, "push");
            }}
            pageSize={result?.pageSize ?? SEARCH_RESULT_LIMIT}
          />
        </div>
      </section>
    </main>
  );
}

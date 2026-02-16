"use client";

import { useRegionContext } from "@techsio/storefront-data/shared";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { useEffect, useMemo } from "react";
import { useStorefrontSearch } from "@/lib/storefront/search";
import { SearchPagination } from "./search/search-pagination";
import {
  resolveErrorMessage,
  SEARCH_RESULT_LIMIT,
} from "./search/search-query-config";
import { SearchResultsGrid } from "./search/search-results-grid";
import { SearchSkeletonGrid } from "./search/search-skeleton-grid";
import { SearchToolbar } from "./search/search-toolbar";
import { useSearchAddToCart } from "./search/use-search-add-to-cart";
import { useSearchProducts } from "./search/use-search-products";
import { useSearchQueryState } from "./search/use-search-query-state";

export function StorefrontSearchResults() {
  const region = useRegionContext();
  const {
    query,
    currentPage,
    searchDraft,
    setSearchDraft,
    setPage,
    handleSearchSubmit,
  } = useSearchQueryState();

  const searchQuery = useStorefrontSearch({
    q: query,
    page: currentPage,
    limit: SEARCH_RESULT_LIMIT,
  });

  const result = searchQuery.data;
  const hits = result?.hits ?? [];
  const {
    orderedProducts,
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
    ? resolveErrorMessage(searchQuery.error)
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
    <main className="mx-auto w-full max-w-[1418px] px-4 py-8 lg:px-6">
      <section className="rounded-[14px] border border-border-secondary bg-surface p-4 md:p-6">
        <div className="space-y-4">
          <SearchToolbar
            estimatedTotalHits={result?.estimatedTotalHits ?? 0}
            hitsCount={hits.length}
            onSearchDraftChange={setSearchDraft}
            onSearchSubmit={handleSearchSubmit}
            pageBadgeLabel={pageBadgeLabel}
            query={query}
            searchDraft={searchDraft}
          />

          {errorMessage ? <ErrorText showIcon>{errorMessage}</ErrorText> : null}
          {addToCartError ? (
            <ErrorText showIcon>{addToCartError}</ErrorText>
          ) : null}

          {!query ? (
            <p className="text-sm text-fg-secondary">
              Zadajte výraz do vyhľadávania a potvrďte Enter.
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

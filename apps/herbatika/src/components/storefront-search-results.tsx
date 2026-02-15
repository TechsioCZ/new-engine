"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { Pagination } from "@techsio/ui-kit/molecules/pagination";
import { ProductCard } from "@techsio/ui-kit/molecules/product-card";
import { SearchForm } from "@techsio/ui-kit/molecules/search-form";
import NextLink from "next/link";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { useStorefrontSearch } from "@/lib/storefront/search";

const SEARCH_RESULT_LIMIT = 24;
const PRODUCT_FALLBACK_IMAGE = "/file.svg";

const searchQueryParsers = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

const normalizePage = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  const normalizedPage = Math.trunc(value);
  if (normalizedPage < 1) {
    return 1;
  }

  return normalizedPage;
};

const resolveErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "Vyhľadávanie zlyhalo.";
};

const renderSkeletonCards = () => {
  return Array.from({ length: 8 }).map((_, index) => (
    <div
      className="rounded-[14px] border border-border-secondary bg-surface p-3"
      key={`search-skeleton-${index}`}
    >
      <Skeleton className="h-48 w-full rounded-[10px]" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  ));
};

export function StorefrontSearchResults() {
  const [queryState, setQueryState] = useQueryStates(searchQueryParsers);
  const query = queryState.q.trim();
  const currentPage = normalizePage(queryState.page);
  const [searchDraft, setSearchDraft] = useState(query);

  useEffect(() => {
    setSearchDraft(query);
  }, [query]);

  const searchQuery = useStorefrontSearch({
    q: query,
    page: currentPage,
    limit: SEARCH_RESULT_LIMIT,
  });

  const result = searchQuery.data;
  const hits = result?.hits ?? [];

  useEffect(() => {
    if (!(query && result && result.totalPages > 0)) {
      return;
    }

    if (currentPage <= result.totalPages) {
      return;
    }

    void setQueryState(
      {
        page: result.totalPages,
      },
      {
        history: "replace",
      },
    );
  }, [currentPage, query, result, setQueryState]);

  const pageBadgeLabel = useMemo(() => {
    if (result && result.totalPages > 0) {
      return `strana: ${result.page}/${result.totalPages}`;
    }

    return `strana: ${currentPage}`;
  }, [currentPage, result]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const formValue = formData.get("q");
    const nextQuery = typeof formValue === "string" ? formValue.trim() : "";

    if (!nextQuery) {
      void setQueryState(
        {
          q: "",
          page: 1,
        },
        {
          history: "replace",
        },
      );
      return;
    }

    void setQueryState(
      {
        q: nextQuery,
        page: 1,
      },
      {
        history: "push",
      },
    );
  };

  const errorMessage = searchQuery.error
    ? resolveErrorMessage(searchQuery.error)
    : null;

  return (
    <main className="mx-auto w-full max-w-[1418px] px-4 py-8 lg:px-6">
      <section className="rounded-[14px] border border-border-secondary bg-surface p-4 md:p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-fg-primary">Vyhľadávanie</h1>
            <p className="text-sm text-fg-secondary">
              Výsledky sú načítané cez Meilisearch index `products`.
            </p>
          </div>

          <SearchForm
            className="w-full max-w-[620px]"
            onSubmit={handleSearchSubmit}
            onValueChange={setSearchDraft}
            value={searchDraft}
          >
            <SearchForm.Control className="rounded-[12px] border-border-secondary bg-surface">
              <SearchForm.Input
                className="h-11"
                name="q"
                placeholder="Napíšte, čo hľadáte..."
              />
              <SearchForm.Button
                aria-label="Hľadať"
                className="min-w-14 rounded-r-[12px] px-4"
                showSearchIcon
              />
            </SearchForm.Control>
          </SearchForm>

          {query ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">{`dotaz: ${query}`}</Badge>
              <Badge variant="secondary">
                {`nájdené: ${result?.estimatedTotalHits ?? 0}`}
              </Badge>
              <Badge variant="secondary">
                {`zobrazené: ${hits.length}`}
              </Badge>
              <Badge variant="secondary">{pageBadgeLabel}</Badge>
            </div>
          ) : null}

          {errorMessage ? <ErrorText showIcon>{errorMessage}</ErrorText> : null}

          {!query ? (
            <p className="text-sm text-fg-secondary">
              Zadajte výraz do vyhľadávania a potvrďte Enter.
            </p>
          ) : null}

          {searchQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {renderSkeletonCards()}
            </div>
          ) : null}

          {!searchQuery.isLoading && query && hits.length === 0 && !errorMessage ? (
            <p className="text-sm text-fg-secondary">
              {(result?.estimatedTotalHits ?? 0) === 0
                ? "Pre zadaný výraz sme nenašli žiadny produkt."
                : "Na tejto strane nie sú žiadne produkty."}
            </p>
          ) : null}

          {!searchQuery.isLoading && hits.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {hits.map((hit) => {
                const href = `/p/${hit.handle}`;

                return (
                  <ProductCard
                    className="h-full max-w-none rounded-[14px] border-border-secondary bg-surface p-3 shadow-sm"
                    key={hit.id}
                  >
                    <Link as={NextLink} className="block" href={href}>
                      <ProductCard.Image
                        alt={hit.title}
                        className="aspect-[4/5] w-full rounded-[10px] border border-border-secondary object-cover"
                        src={hit.thumbnail ?? PRODUCT_FALLBACK_IMAGE}
                      />
                    </Link>

                    <ProductCard.Name className="min-h-10 text-sm leading-snug text-fg-primary">
                      <Link as={NextLink} className="hover:text-primary" href={href}>
                        {hit.title}
                      </Link>
                    </ProductCard.Name>

                    <p className="line-clamp-3 text-xs leading-relaxed text-fg-secondary">
                      {hit.descriptionSnippet || "Bez stručného popisu."}
                    </p>

                    <ProductCard.Actions className="mt-2">
                      <LinkButton
                        as={NextLink}
                        block
                        className="rounded-[9px] px-3 py-2 text-xs font-semibold"
                        href={href}
                        size="sm"
                        theme="outlined"
                        variant="secondary"
                      >
                        Detail
                      </LinkButton>
                    </ProductCard.Actions>
                  </ProductCard>
                );
              })}
            </div>
          ) : null}

          {!searchQuery.isLoading &&
          !errorMessage &&
          query &&
          (result?.totalPages ?? 0) > 1 ? (
            <Pagination
              count={result?.estimatedTotalHits ?? 0}
              onPageChange={(nextPage) => {
                if (nextPage === currentPage) {
                  return;
                }

                void setQueryState(
                  {
                    page: nextPage,
                  },
                  {
                    history: "push",
                  },
                );
              }}
              page={currentPage}
              pageSize={result?.pageSize ?? SEARCH_RESULT_LIMIT}
              size="sm"
              variant="outlined"
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

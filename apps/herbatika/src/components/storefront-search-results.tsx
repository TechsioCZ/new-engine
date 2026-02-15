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
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  StorefrontSearchHit,
  StorefrontSearchResult,
} from "@/lib/storefront/meili-search";

const SEARCH_RESULT_LIMIT = 24;
const PRODUCT_FALLBACK_IMAGE = "/file.svg";

type SearchState = {
  isLoading: boolean;
  error: string | null;
  result: StorefrontSearchResult | null;
};

const createEmptyState = (): SearchState => {
  return {
    isLoading: false,
    error: null,
    result: null,
  };
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

const normalizeQuery = (value: string | null): string => {
  return (value ?? "").trim();
};

const normalizePage = (value: string | null): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  const normalizedPage = Math.trunc(numericValue);
  if (normalizedPage < 1) {
    return 1;
  }

  return normalizedPage;
};

const buildSearchHref = (query: string, page: number): string => {
  const normalizedPage = Math.max(1, Math.trunc(page));
  const encodedQuery = encodeURIComponent(query);

  if (normalizedPage <= 1) {
    return `/search?q=${encodedQuery}`;
  }

  return `/search?q=${encodedQuery}&page=${normalizedPage}`;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => normalizeQuery(searchParams.get("q")), [searchParams]);
  const currentPage = useMemo(
    () => normalizePage(searchParams.get("page")),
    [searchParams],
  );
  const [state, setState] = useState<SearchState>(() => createEmptyState());

  useEffect(() => {
    if (!query) {
      setState(createEmptyState());
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    setState((previousState) => ({
      ...previousState,
      isLoading: true,
      error: null,
    }));

    const run = async () => {
      try {
        const response = await fetch(
          `/api/storefront-search?q=${encodeURIComponent(query)}&limit=${SEARCH_RESULT_LIMIT}&page=${currentPage}`,
          {
            method: "GET",
            signal: controller.signal,
            cache: "no-store",
          },
        );

        const payload = (await response.json()) as
          | StorefrontSearchResult
          | { message?: string };

        if (!response.ok) {
          const payloadMessage =
            payload && typeof payload === "object" && "message" in payload
              ? payload.message
              : null;
          throw new Error(
            typeof payloadMessage === "string" && payloadMessage.trim().length > 0
              ? payloadMessage
              : `Search failed with status ${response.status}`,
          );
        }

        if (!isMounted) {
          return;
        }

        setState({
          isLoading: false,
          error: null,
          result: payload as StorefrontSearchResult,
        });
      } catch (error) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        setState({
          isLoading: false,
          error: resolveErrorMessage(error),
          result: null,
        });
      }
    };

    void run();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [currentPage, query]);

  useEffect(() => {
    if (!(query && state.result && state.result.totalPages > 0)) {
      return;
    }

    if (currentPage <= state.result.totalPages) {
      return;
    }

    router.replace(buildSearchHref(query, state.result.totalPages));
  }, [currentPage, query, router, state.result]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const formValue = formData.get("q");
    const nextQuery = typeof formValue === "string" ? formValue.trim() : "";

    if (!nextQuery) {
      router.replace("/search");
      return;
    }

    router.push(buildSearchHref(nextQuery, 1));
  };

  const hits: StorefrontSearchHit[] = state.result?.hits ?? [];
  const pageBadgeLabel =
    state.result && state.result.totalPages > 0
      ? `strana: ${state.result.page}/${state.result.totalPages}`
      : `strana: ${currentPage}`;

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
            defaultValue={query}
            onSubmit={handleSearchSubmit}
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
                {`nájdené: ${state.result?.estimatedTotalHits ?? 0}`}
              </Badge>
              <Badge variant="secondary">
                {`zobrazené: ${hits.length}`}
              </Badge>
              <Badge variant="secondary">
                {pageBadgeLabel}
              </Badge>
            </div>
          ) : null}

          {state.error ? <ErrorText showIcon>{state.error}</ErrorText> : null}

          {!query ? (
            <p className="text-sm text-fg-secondary">
              Zadajte výraz do vyhľadávania a potvrďte Enter.
            </p>
          ) : null}

          {state.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {renderSkeletonCards()}
            </div>
          ) : null}

          {!state.isLoading && query && hits.length === 0 && !state.error ? (
            <p className="text-sm text-fg-secondary">
              {(state.result?.estimatedTotalHits ?? 0) === 0
                ? "Pre zadaný výraz sme nenašli žiadny produkt."
                : "Na tejto strane nie sú žiadne produkty."}
            </p>
          ) : null}

          {!state.isLoading && hits.length > 0 ? (
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

          {!state.isLoading &&
          !state.error &&
          query &&
          (state.result?.totalPages ?? 0) > 1 ? (
            <Pagination
              count={state.result?.estimatedTotalHits ?? 0}
              onPageChange={(nextPage) => {
                if (nextPage === currentPage) {
                  return;
                }

                router.push(buildSearchHref(query, nextPage));
              }}
              page={currentPage}
              pageSize={state.result?.pageSize ?? SEARCH_RESULT_LIMIT}
              size="sm"
              variant="outlined"
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

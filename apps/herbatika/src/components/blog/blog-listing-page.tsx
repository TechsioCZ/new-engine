"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import { useTranslations } from "next-intl"
import { useQueryStates } from "nuqs"
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb"
import { StorefrontLink } from "@/components/storefront-link"
import type { BlogCategoryFilter } from "@/lib/storefront/blog-content"
import {
  ALL_BLOG_CATEGORIES_KEY,
  blogQueryParsers,
} from "@/lib/storefront/blog-query-state"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import { buildPath, withPublicSearchParams } from "@/lib/url/public-url"
import {
  type BlogListingWithSourceIds,
  resolveBlogCardPublicSlug,
} from "./blog-card-projection"
import { BlogListingCard } from "./blog-listing-card"
import { useBlogListingPages } from "./use-blog-listing-pages"

type BlogListingPageProps = {
  articlePublicSlugsById: PublicEntitySlugMap
  listing: BlogListingWithSourceIds
}

const getFilterLabel = (filter: BlogCategoryFilter) =>
  `${filter.label} (${filter.count})`

export function BlogListingPage({
  articlePublicSlugsById,
  listing,
}: BlogListingPageProps) {
  const tContent = useTranslations("content")
  const market = useMarketContext().code
  const adviceHref = buildPath({ kind: "article" }, market)
  const [, setBlogQueryState] = useQueryStates(blogQueryParsers)
  const listingQuery = useBlogListingPages(listing)
  const loadedPages = listingQuery.data?.pages ?? [listing]
  const posts = loadedPages.flatMap((page) => page.posts)
  const firstLoadedPage = loadedPages[0]?.page ?? listing.page
  const lastLoadedPage = loadedPages.at(-1)?.page ?? listing.page
  const getPageUrl = ({ page }: { page: number }) =>
    withPublicSearchParams(adviceHref, {
      category:
        listing.category === ALL_BLOG_CATEGORIES_KEY
          ? undefined
          : listing.category,
      page: page === 1 ? undefined : page,
    })
  const paginationLabel =
    firstLoadedPage === lastLoadedPage
      ? tContent("blog.pagination.summary", {
          page: lastLoadedPage,
          totalPages: listing.totalPages,
        })
      : tContent("blog.pagination.range", {
          firstPage: firstLoadedPage,
          lastPage: lastLoadedPage,
          totalPages: listing.totalPages,
        })
  const handleLoadMore = async () => {
    const result = await listingQuery.fetchNextPage()

    if (!result.isSuccess) {
      return
    }

    const nextPage = result.data.pages.at(-1)?.page
    if (!nextPage) {
      return
    }

    await setBlogQueryState(
      { page: nextPage },
      {
        history: "replace",
        scroll: false,
        shallow: true,
      }
    )
  }
  const breadcrumbItems: HerbatikaBreadcrumbItem[] = [
    {
      label: tContent("pages.blog"),
      href: adviceHref,
      icon: "token-icon-home",
    },
  ]

  const shouldShowLoadMore = listingQuery.hasNextPage
  const shouldShowPagination = listing.totalPages > 1

  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-blog-listing-page-gap p-blog-listing-page 2xl:p-blog-listing-page-lg">
        <HerbatikaBreadcrumb items={breadcrumbItems} />

        <section className="space-y-500">
          <header className="space-y-400">
            <h1 className="font-bold text-4xl text-fg-primary leading-tight">
              {tContent("blog.listing.title")}
            </h1>

            <p className="font-verdana text-fg-primary text-md leading-relaxed">
              {tContent("blog.listing.description")}
            </p>

            <div className="flex flex-wrap items-center gap-250">
              {listing.categoryFilters.map((filter) => {
                const isActive = filter.key === listing.category

                return (
                  <LinkButton
                    as={StorefrontLink}
                    className={`h-full rounded-full border-1 border-primary px-450 py-250 font-bold font-open-sans text-md leading-[18px] ${!isActive && "border-border-muted bg-surface text-fg-muted"}`}
                    href={withPublicSearchParams(adviceHref, {
                      category:
                        filter.key === ALL_BLOG_CATEGORIES_KEY
                          ? undefined
                          : filter.key,
                    })}
                    key={filter.key}
                    size="sm"
                    theme={isActive ? "solid" : "outlined"}
                    variant={isActive ? "primary" : "secondary"}
                  >
                    {getFilterLabel(filter)}
                  </LinkButton>
                )
              })}
            </div>
          </header>

          <div className="grid gap-400 md:grid-cols-2 xl:grid-cols-4">
            {posts.map((post) => (
              <BlogListingCard
                key={post.id}
                post={post}
                publicSlug={resolveBlogCardPublicSlug(
                  post,
                  articlePublicSlugsById
                )}
              />
            ))}
          </div>

          {shouldShowLoadMore || shouldShowPagination ? (
            <div className="space-y-250">
              <div className="grid min-h-600 items-center gap-300 sm:grid-cols-3">
                {shouldShowLoadMore ? (
                  <Button
                    className="justify-self-center sm:col-start-2"
                    isLoading={listingQuery.isFetchingNextPage}
                    loadingText={tContent("blog.pagination.loading")}
                    onClick={() => {
                      runDetachedPromise(handleLoadMore())
                    }}
                    size="sm"
                    theme="outlined"
                    variant="primary"
                  >
                    {tContent("blog.pagination.load_more")}
                  </Button>
                ) : null}

                {shouldShowPagination ? (
                  <Pagination
                    className="justify-self-center sm:col-start-3 sm:justify-self-end"
                    compact
                    compactLabel={() => paginationLabel}
                    count={listing.totalItems}
                    getPageUrl={getPageUrl}
                    linkAs={StorefrontLink}
                    page={lastLoadedPage}
                    pageSize={listing.pageSize}
                    size="sm"
                    variant="outlined"
                  />
                ) : null}
              </div>

              {listingQuery.isFetchNextPageError ? (
                <div className="flex justify-center">
                  <StatusText role="alert" showIcon status="error">
                    {tContent("blog.pagination.load_failed")}
                  </StatusText>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

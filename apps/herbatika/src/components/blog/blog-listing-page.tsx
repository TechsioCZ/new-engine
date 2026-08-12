"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Pagination } from "@techsio/ui-kit/molecules/pagination"
import NextLink from "next/link"
import { useTranslations } from "next-intl"
import { useQueryStates } from "nuqs"
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb"
import type {
  BlogCategoryFilter,
  BlogListing,
} from "@/lib/storefront/blog-content"
import { blogQueryParsers } from "@/lib/storefront/blog-query-state"
import { resolveBlogListingHref } from "@/lib/storefront/blog-routing"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { BlogListingCard } from "./blog-listing-card"
import { useBlogListingPages } from "./use-blog-listing-pages"

type BlogListingPageProps = {
  listing: BlogListing
}

const getFilterLabel = (filter: BlogCategoryFilter) =>
  `${filter.label} (${filter.count})`

export function BlogListingPage({ listing }: BlogListingPageProps) {
  const tContent = useTranslations("content")
  const [, setBlogQueryState] = useQueryStates(blogQueryParsers)
  const listingQuery = useBlogListingPages(listing)
  const loadedPages = listingQuery.data?.pages ?? [listing]
  const posts = loadedPages.flatMap((page) => page.posts)
  const firstLoadedPage = loadedPages[0]?.page ?? listing.page
  const lastLoadedPage = loadedPages.at(-1)?.page ?? listing.page
  const getPageUrl = ({ page }: { page: number }) =>
    resolveBlogListingHref({
      category: listing.category,
      page,
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
      href: "/blog",
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
              Blog o zdraví a kráse
            </h1>

            <p className="font-verdana text-fg-primary text-md leading-relaxed">
              Články o zdraví, kráse, stravovaní a wellness od našich
              odborníkov.
            </p>

            <div className="flex flex-wrap items-center gap-250">
              {listing.categoryFilters.map((filter) => {
                const isActive = filter.key === listing.category

                return (
                  <LinkButton
                    as={NextLink}
                    className={`h-full rounded-full border-1 border-primary px-450 py-250 font-bold font-open-sans text-md leading-[18px] ${!isActive && "border-border-muted bg-surface text-fg-muted"}`}
                    href={resolveBlogListingHref({
                      category: filter.key,
                      page: 1,
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
              <BlogListingCard key={post.id} post={post} />
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
                    linkAs={NextLink}
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

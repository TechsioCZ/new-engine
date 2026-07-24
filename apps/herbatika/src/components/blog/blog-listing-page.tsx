"use client"

import { Link } from "@techsio/ui-kit/atoms/link"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import NextLink from "next/link"
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb"
import type {
  BlogCategoryFilter,
  BlogListing,
} from "@/lib/storefront/blog-content"
import { resolveBlogListingHref } from "@/lib/storefront/blog-routing"
import { BlogListingCard } from "./blog-listing-card"

type BlogListingPageProps = {
  listing: BlogListing
}

const getFilterLabel = (filter: BlogCategoryFilter) =>
  `${filter.label} (${filter.count})`

export function BlogListingPage({ listing }: BlogListingPageProps) {
  const breadcrumbItems: HerbatikaBreadcrumbItem[] = [
    {
      label: "Blog",
      href: "/blog",
      icon: "token-icon-home",
    },
  ]

  const nextPage = listing.hasNextPage ? listing.page + 1 : listing.page
  const shouldShowLoadMore = listing.hasNextPage
  const shouldShowPageIndicator = listing.totalPages > 1

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
            {listing.posts.map((post) => (
              <BlogListingCard key={post.id} post={post} />
            ))}
          </div>

          {shouldShowLoadMore || shouldShowPageIndicator ? (
            <div className="relative flex min-h-600 items-center justify-center">
              {shouldShowLoadMore ? (
                <LinkButton
                  as={NextLink}
                  className="rounded-full px-550 py-250 font-open-sans font-semibold text-sm"
                  href={resolveBlogListingHref({
                    category: listing.category,
                    page: nextPage,
                  })}
                  size="sm"
                  theme="outlined"
                  variant="primary"
                >
                  Zobraziť ďalšie
                </LinkButton>
              ) : null}

              {shouldShowPageIndicator ? (
                <Link
                  as={NextLink}
                  className="absolute right-0 font-semibold text-primary text-sm leading-normal underline underline-offset-2 hover:text-primary-hover"
                  href={resolveBlogListingHref({
                    category: listing.category,
                    page: nextPage,
                  })}
                >
                  {`Strana ${listing.page}/${listing.totalPages}`}
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

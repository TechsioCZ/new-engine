"use client";

import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import type { IconType } from "@techsio/ui-kit/atoms/icon";
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import NextLink from "next/link";
import type {
  BlogTopicFilter,
  BlogTopicKey,
  resolveBlogListing,
} from "@/lib/storefront/blog-content";
import { BlogListingCard } from "./blog-listing-card";

type BlogListingPageProps = {
  listing: ReturnType<typeof resolveBlogListing>;
};

const resolveBlogListingHref = ({
  topic,
  page,
}: {
  topic: BlogTopicKey;
  page: number;
}) => {
  const query = new URLSearchParams();

  if (topic !== "all") {
    query.set("topic", topic);
  }

  if (page > 1) {
    query.set("page", String(page));
  }

  const serialized = query.toString();
  return serialized.length > 0 ? `/blog?${serialized}` : "/blog";
};

const getFilterLabel = (filter: BlogTopicFilter) => {
  return `${filter.label} (${filter.count})`;
};

export function BlogListingPage({ listing }: BlogListingPageProps) {
  const breadcrumbItems: Array<{
    label: string;
    href?: string;
    icon?: IconType;
  }> = [
    {
      label: "Blog",
      href: "/blog",
      icon: "icon-[mdi--home-outline]",
    },
  ];

  const nextPage = listing.hasNextPage ? listing.page + 1 : listing.page;
  const shouldShowLoadMore = listing.hasNextPage;
  const shouldShowPageIndicator = listing.totalPages > 1;

  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-550 px-550 pt-550 pb-700">
        <Breadcrumb items={breadcrumbItems} linkAs={NextLink} size="md" />

        <section className="space-y-500">
          <header className="space-y-400">
            <h1 className="text-4xl leading-tight font-bold text-fg-primary">
              Trápi ma
            </h1>

            <p className="font-verdana text-md leading-relaxed text-fg-primary">
              Najnovšie články o zdraví, kráse, stravovaní a wellness od našich
              odborníkov.
            </p>

            <div className="flex flex-wrap items-center gap-250">
              {listing.topicFilters.map((filter) => {
                const isActive = filter.key === listing.topic;

                return (
                  <LinkButton
                    className="rounded-full px-400 py-200 font-open-sans text-md font-semibold"
                    href={resolveBlogListingHref({
                      topic: filter.key,
                      page: 1,
                    })}
                    key={filter.key}
                    size="sm"
                    theme={isActive ? "solid" : "outlined"}
                    variant={isActive ? "primary" : "secondary"}
                  >
                    {getFilterLabel(filter)}
                  </LinkButton>
                );
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
                  className="rounded-full px-550 py-250 font-open-sans text-sm font-semibold"
                  href={resolveBlogListingHref({
                    topic: listing.topic,
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
                  className="absolute right-0 text-sm leading-normal font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
                  href={resolveBlogListingHref({
                    topic: listing.topic,
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
  );
}

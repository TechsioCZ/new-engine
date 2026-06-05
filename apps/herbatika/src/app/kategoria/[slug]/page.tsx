import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { StorefrontCategoryListing } from "@/components/storefront-category-listing";
import { appendSearchParamsToHref, routes } from "@/lib/routes";
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state";
import { prefetchCategoryPageStorefrontData } from "@/lib/storefront/ssr";

type CategoryPageProps = PageProps<"/kategoria/[slug]">;

const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  akcie: "vypredaj-zlavy-a-akcie",
};

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  const normalizedSlug = slug.trim().toLowerCase();
  const canonicalSlug = CATEGORY_SLUG_ALIASES[normalizedSlug];

  if (canonicalSlug) {
    redirect(
      appendSearchParamsToHref(
        routes.category.detail(canonicalSlug),
        resolvedSearchParams,
      ),
    );
  }

  const queryState = parsePlpQueryStateFromSearchParams(resolvedSearchParams);
  const { dehydratedState } = await prefetchCategoryPageStorefrontData(
    normalizedSlug,
    queryState,
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <StorefrontCategoryListing slug={normalizedSlug} />
    </HydrationBoundary>
  );
}

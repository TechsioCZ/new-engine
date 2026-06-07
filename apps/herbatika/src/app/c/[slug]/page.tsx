import { HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { CategoryListing } from "@/components/category-listing";
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state";
import { prefetchCategoryPageStorefrontData } from "@/lib/storefront/ssr";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
    redirect(`/c/${canonicalSlug}`);
  }

  const queryState = parsePlpQueryStateFromSearchParams(resolvedSearchParams);
  const { dehydratedState } = await prefetchCategoryPageStorefrontData(
    normalizedSlug,
    queryState,
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <CategoryListing slug={normalizedSlug} />
    </HydrationBoundary>
  );
}

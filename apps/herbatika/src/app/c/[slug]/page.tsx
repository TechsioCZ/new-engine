import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StorefrontCategoryListing } from "@/components/storefront-category-listing";
import { StorefrontHydrationBoundary } from "@/components/storefront-hydration-boundary";
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state";
import { prefetchCategoryPageStorefrontData } from "@/lib/storefront/ssr";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
};

const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  akcie: "vypredaj-zlavy-a-akcie",
};

function CategoryPageFallback() {
  return <main className="mx-auto min-h-[40dvh] w-full max-w-(--breakpoint-2xl)" />;
}

async function CategoryPageContent({
  params,
  searchParams,
}: CategoryPageProps) {
  await connection();
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);

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
    <StorefrontHydrationBoundary state={dehydratedState}>
      <StorefrontCategoryListing slug={normalizedSlug} />
    </StorefrontHydrationBoundary>
  );
}

export default function CategoryPage(props: CategoryPageProps) {
  return (
    <Suspense fallback={<CategoryPageFallback />}>
      <CategoryPageContent {...props} />
    </Suspense>
  );
}

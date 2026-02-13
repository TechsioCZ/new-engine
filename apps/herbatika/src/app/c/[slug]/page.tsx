import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StorefrontCategoryListing } from "@/components/storefront-category-listing";

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  akcie: "vypredaj-zlavy-a-akcie",
};

async function CategoryPageContent({ params }: CategoryPageProps) {
  const { slug } = await params;
  const normalizedSlug = slug.trim().toLowerCase();
  const canonicalSlug = CATEGORY_SLUG_ALIASES[normalizedSlug];

  if (canonicalSlug) {
    redirect(`/c/${canonicalSlug}`);
  }

  return <StorefrontCategoryListing slug={normalizedSlug} />;
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl p-6">
          <div className="h-96 animate-pulse rounded-xl border border-black/10 bg-white" />
        </main>
      }
    >
      <CategoryPageContent params={params} />
    </Suspense>
  );
}

import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StorefrontBrandListing } from "@/components/brands/storefront-brand-listing";
import { resolveBrandBySlug } from "@/lib/storefront/brands";
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server";
import { appendSearchParamsToHref, routes } from "@/lib/routes";
import { parsePlpQueryStateFromSearchParams } from "@/lib/storefront/plp-query-state";
import { prefetchBrandPageStorefrontData } from "@/lib/storefront/ssr";

type BrandPageProps = PageProps<"/znacky/[slug]">;

const resolveBrandPageData = async (slug: string) => {
  const brands = await fetchStorefrontBrands();
  return resolveBrandBySlug(brands, slug);
};

export async function generateMetadata({
  params,
}: Pick<BrandPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const brand = await resolveBrandPageData(slug);

  if (!brand) {
    return {
      title: "Značka | Herbatica",
    };
  }

  return {
    title: `${brand.title} | Značky Herbatica`,
    description: `Produkty značky ${brand.title} dostupné v e-shope Herbatica.`,
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: BrandPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const brand = await resolveBrandPageData(slug);

  if (!brand) {
    notFound();
  }

  if (slug !== brand.slug) {
    redirect(
      appendSearchParamsToHref(
        routes.brand.detail(brand.slug),
        resolvedSearchParams,
      ),
    );
  }

  const queryState = parsePlpQueryStateFromSearchParams(resolvedSearchParams);
  const { dehydratedState } = await prefetchBrandPageStorefrontData(
    brand.facetId,
    queryState,
  );

  return (
    <HydrationBoundary state={dehydratedState}>
      <StorefrontBrandListing
        brandFacetId={brand.facetId}
        brandTitle={brand.title}
      />
    </HydrationBoundary>
  );
}

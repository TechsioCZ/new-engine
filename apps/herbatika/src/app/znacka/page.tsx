import type { Metadata } from "next";
import { BrandIndexPage } from "@/components/brands/brand-index-page";
import { fetchStorefrontBrands } from "@/lib/storefront/brands.server";

export const metadata: Metadata = {
  title: "Všetky značky A-Z | Herbatica",
  description:
    "Prehľad všetkých značiek dostupných v e-shope Herbatica zoradený podľa abecedy.",
};

export default async function BrandsPage() {
  const brands = await fetchStorefrontBrands();

  return <BrandIndexPage brands={brands} />;
}

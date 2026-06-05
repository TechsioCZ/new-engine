import type { Metadata } from "next";
import { AboutPage } from "@/components/about/about-page";
import { CmsPageSurface } from "@/components/cms/cms-page-surface";
import { fetchCmsPageBySlug } from "@/lib/storefront/cms";

const cmsSlug = "o-nas";
const fallbackTitle = "O našom tíme | Herbatika";
const fallbackDescription =
  "Spoznajte príbeh značky Herbatica, jej začiatky, tím, nároky na kvalitu, vlastné produkty a víziu do budúcnosti.";

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchCmsPageBySlug(cmsSlug);

  return {
    description: page?.meta?.description ?? fallbackDescription,
    title: page?.meta?.title ?? page?.title ?? fallbackTitle,
  };
}

export default async function AboutPageRoute() {
  const page = await fetchCmsPageBySlug(cmsSlug);

  if (page) {
    return <CmsPageSurface page={page} />;
  }

  return <AboutPage />;
}

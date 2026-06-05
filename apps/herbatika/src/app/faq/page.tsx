import type { Metadata } from "next";
import { CmsPageSurface } from "@/components/cms/cms-page-surface";
import { FaqPage } from "@/components/faq/faq-page";
import { fetchCmsPageBySlug } from "@/lib/storefront/cms";

const cmsSlug = "faq";
const fallbackTitle = "Často kladené otázky | Herbatika";
const fallbackDescription =
  "Odpovede na často kladené otázky o objednávkach, dostupnosti tovaru, zľavových kupónoch, spolupráci, predajni, vrátení a reklamáciách.";

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchCmsPageBySlug(cmsSlug);

  return {
    description: page?.meta?.description ?? fallbackDescription,
    title: page?.meta?.title ?? page?.title ?? fallbackTitle,
  };
}

export default async function FaqPageRoute() {
  const page = await fetchCmsPageBySlug(cmsSlug);

  if (page) {
    return <CmsPageSurface page={page} />;
  }

  return <FaqPage />;
}

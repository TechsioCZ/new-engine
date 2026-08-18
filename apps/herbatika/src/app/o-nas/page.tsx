import type { Metadata } from "next"
import { AboutPage } from "@/components/about/about-page"
import { fetchExternalReviewTrustSources } from "@/lib/storefront/external-reviews.server"

export const metadata: Metadata = {
  title: "O našom tíme | Herbatika",
  description:
    "Spoznajte príbeh značky Herbatica, jej začiatky, tím, nároky na kvalitu, vlastné produkty a víziu do budúcnosti.",
}

export default async function AboutPageRoute() {
  const reviewTrustSources = await fetchExternalReviewTrustSources()

  return <AboutPage reviewTrustSources={reviewTrustSources} />
}

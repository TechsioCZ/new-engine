import { useTranslations } from "next-intl"
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb"
import type { ReviewTrustSource } from "@/components/reviews/reviews.types"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildPath } from "@/lib/url/public-url"
import {
  AboutArticleSections,
  AboutClosingStatement,
  AboutCommunityAndReviews,
  AboutContact,
  AboutMilestones,
  AboutPrinciples,
} from "./about-page-sections"
import { AboutHero } from "./about-page-top"

export function AboutPage({
  reviewTrustSources,
}: {
  reviewTrustSources: readonly ReviewTrustSource[]
}) {
  const tContent = useTranslations("content")
  const tNavigation = useTranslations("navigation")
  const market = useMarketContext().code
  const breadcrumbItems: HerbatikaBreadcrumbItem[] = [
    {
      label: tNavigation("breadcrumbs.home"),
      href: buildPath({ kind: "home" }, market),
      icon: "token-icon-home",
    },
    { label: tContent("pages.about") },
  ]

  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-about-page-gap p-about-page 2xl:p-about-page-lg">
        <HerbatikaBreadcrumb items={breadcrumbItems} />
        <AboutHero />
        <AboutArticleSections group="beforeMilestones" />
        <AboutMilestones />
        <AboutArticleSections group="afterMilestones" />
        <AboutClosingStatement />
        <AboutPrinciples />
        <AboutCommunityAndReviews reviewTrustSources={reviewTrustSources} />
        <AboutContact />
      </div>
    </main>
  )
}

import { useTranslations } from "next-intl"
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb"
import type { ReviewTrustSource } from "@/components/reviews/reviews.types"
import type { HerbatikaLocale } from "@/lib/storefront/market-context"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildPath } from "@/lib/url/public-url"
import { getAboutPageData } from "./about-page.data"
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
  locale,
  reviewTrustSources,
}: {
  locale: HerbatikaLocale
  reviewTrustSources: readonly ReviewTrustSource[]
}) {
  const tContent = useTranslations("content")
  const tNavigation = useTranslations("navigation")
  const market = useMarketContext().code
  const aboutPageData = getAboutPageData(locale)

  if (!aboutPageData) {
    return null
  }

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
        <AboutHero data={aboutPageData} />
        <AboutArticleSections data={aboutPageData} group="beforeMilestones" />
        <AboutMilestones data={aboutPageData} />
        <AboutArticleSections data={aboutPageData} group="afterMilestones" />
        <AboutClosingStatement data={aboutPageData} />
        <AboutPrinciples data={aboutPageData} />
        <AboutCommunityAndReviews
          data={aboutPageData}
          reviewTrustSources={reviewTrustSources}
        />
        <AboutContact data={aboutPageData} />
      </div>
    </main>
  )
}

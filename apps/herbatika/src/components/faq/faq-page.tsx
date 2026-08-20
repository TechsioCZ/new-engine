import { useTranslations } from "next-intl"
import {
  HerbatikaBreadcrumb,
  type HerbatikaBreadcrumbItem,
} from "@/components/herbatika-breadcrumb"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildPath } from "@/lib/url/public-url"
import { FaqAccordion } from "./faq-accordion"
import { getFaqPageData } from "./faq-page.data"

export function FaqPage() {
  const tContent = useTranslations("content")
  const tNavigation = useTranslations("navigation")
  const marketContext = useMarketContext()
  const market = marketContext.code
  const faqPageData = getFaqPageData(marketContext.locale)

  if (!faqPageData) {
    return null
  }
  const breadcrumbItems: HerbatikaBreadcrumbItem[] = [
    {
      label: tNavigation("breadcrumbs.home"),
      href: buildPath({ kind: "home" }, market),
      icon: "token-icon-home",
    },
    { label: tContent("pages.faq") },
  ]

  return (
    <main className="w-full bg-base font-rubik">
      <div className="mx-auto flex w-full max-w-max-w flex-col gap-faq-page-gap p-faq-page 2xl:p-faq-page-lg">
        <HerbatikaBreadcrumb items={breadcrumbItems} />

        <section className="mx-auto w-full max-w-7xl space-y-500">
          <div className="space-y-400">
            <h1 className="font-bold text-4xl text-fg-primary leading-tight">
              {faqPageData.title}
            </h1>
            <p className="font-verdana text-fg-secondary text-md leading-relaxed">
              {faqPageData.intro}
            </p>
          </div>
          <p className="font-verdana text-fg-secondary text-sm leading-normal">
            {tContent("faq.item_count", { count: faqPageData.items.length })}
          </p>

          <FaqAccordion items={faqPageData.items} />
        </section>
      </div>
    </main>
  )
}

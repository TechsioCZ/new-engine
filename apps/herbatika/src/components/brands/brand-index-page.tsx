"use client"

import { useTranslations } from "next-intl"
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import { StorefrontLink } from "@/components/storefront-link"
import {
  groupStorefrontBrands,
  type StorefrontBrand,
} from "@/lib/storefront/brands"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { buildProjectedEntityPath } from "@/lib/url/link-projections/projected-entity-link"
import { buildPath } from "@/lib/url/public-url"

type BrandIndexPageProps = {
  brands: (StorefrontBrand & { publicSlug?: string })[]
}

export function BrandIndexPage({ brands }: BrandIndexPageProps) {
  const t = useTranslations("catalog")
  const tNavigation = useTranslations("navigation")
  const market = useMarketContext().code
  const brandGroups = groupStorefrontBrands(brands)
  const publicSlugById = new Map(
    brands.map((brand) => [brand.id, brand.publicSlug] as const)
  )

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-brand-index-page-gap p-brand-index-page font-rubik 2xl:p-brand-index-page-lg">
      <HerbatikaBreadcrumb
        items={[
          {
            label: tNavigation("breadcrumbs.home"),
            href: buildPath({ kind: "home" }, market),
            icon: "token-icon-home",
          },
          { label: t("brands.label") },
        ]}
      />

      <section>
        <h1 className="font-bold text-4xl text-fg-primary leading-snug">
          {t("brands.all_title")}
        </h1>
      </section>

      <section
        aria-label={t("brands.list_aria")}
        className="border-border-secondary border-y"
      >
        <div className="divide-y divide-border-secondary">
          {brandGroups.map((group) => (
            <section
              aria-labelledby={`brand-group-${group.letter}`}
              className="grid grid-cols-12 gap-x-300 gap-y-300 py-450"
              key={group.letter}
            >
              <h2
                className="col-span-2 font-bold text-2xl text-fg-primary leading-snug sm:col-span-1"
                id={`brand-group-${group.letter}`}
              >
                {group.letter}
              </h2>

              <ul className="col-span-10 grid gap-x-800 gap-y-200 sm:col-span-11 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.brands.map((brand) => {
                  const href = buildProjectedEntityPath(
                    "brand",
                    { publicSlug: publicSlugById.get(brand.id) },
                    market
                  )

                  return (
                    <li className="min-w-0" key={brand.id}>
                      {href ? (
                        <StorefrontLink
                          className="inline-flex max-w-full font-medium text-base text-primary uppercase leading-snug hover:text-primary-strong hover:underline"
                          href={href}
                        >
                          <span className="break-words">{brand.title}</span>
                        </StorefrontLink>
                      ) : (
                        <span className="inline-flex max-w-full font-medium text-base text-fg-muted uppercase leading-snug">
                          <span className="break-words">{brand.title}</span>
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}

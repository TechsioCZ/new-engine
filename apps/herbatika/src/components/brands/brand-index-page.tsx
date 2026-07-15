import NextLink from "next/link"
import { getTranslations } from "next-intl/server"
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import {
  createBrandHref,
  groupStorefrontBrands,
  type StorefrontBrand,
} from "@/lib/storefront/brands"

type BrandIndexPageProps = {
  brands: StorefrontBrand[]
}

export async function BrandIndexPage({ brands }: BrandIndexPageProps) {
  const [t, tNavigation] = await Promise.all([
    getTranslations("catalog"),
    getTranslations("navigation"),
  ])
  const brandGroups = groupStorefrontBrands(brands)

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-brand-index-page-gap p-brand-index-page font-rubik 2xl:p-brand-index-page-lg">
      <HerbatikaBreadcrumb
        items={[
          {
            label: tNavigation("breadcrumbs.home"),
            href: "/",
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
                {group.brands.map((brand) => (
                  <li className="min-w-0" key={brand.id}>
                    <NextLink
                      className="inline-flex max-w-full font-medium text-base text-primary uppercase leading-snug hover:text-primary-strong hover:underline"
                      href={createBrandHref(brand)}
                    >
                      <span className="break-words">{brand.title}</span>
                    </NextLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}

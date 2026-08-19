export type HeroBannerItem = {
  id: string
  title?: string
  subtitle?: string
  badge?: string
  ctaLabel?: string
  ctaTarget?:
    | {
        kind:
          | "product"
          | "category"
          | "brand"
          | "collection"
          | "article"
          | "page"
        publicSlug: string
      }
    | { kind: "static"; href: string }
  imageAlt?: string
  imageSrc: string
}

export type HomepageBenefitTranslationKey =
  | "home.benefits.fast_delivery"
  | "home.benefits.own_products"
  | "home.benefits.satisfaction_guarantee"
  | "home.benefits.trusted_customers"

export type HomepageProductSectionTitleKey =
  | "home.product_sections.bestsellers"
  | "home.product_sections.new_products"
  | "home.product_sections.sale"

export type ProductSectionDefinition = {
  id: string
  titleKey: HomepageProductSectionTitleKey
  publicSlug?: string
}

export type HomepagePromoContent = {
  contentHtml: string
  heading: string
  imageAlt?: string
  imageSrc?: string
}

export interface HeroBannerItem {
  id: string
  title?: string
  subtitle?: string
  badge?: string
  ctaLabel?: string
  href: string
  imageAlt?: string
  imageSrc: string
}

export interface BlogTeaserItem {
  id: string
  title: string
  excerpt: string
  href: string
  imageSrc: string
  topic: "fitness" | "krasa" | "zdravie"
  publishedAt: string
  readingTime: string
}

export type HomepageBenefitTranslationKey =
  | "home.benefits.fast_delivery"
  | "home.benefits.own_products"
  | "home.benefits.satisfaction_guarantee"
  | "home.benefits.trusted_customers"

type HomepageProductSectionTitleKey =
  | "home.product_sections.bestsellers"
  | "home.product_sections.new_products"
  | "home.product_sections.sale"

export interface ProductSectionDefinition {
  id: string
  titleKey: HomepageProductSectionTitleKey
  viewAllHref: string
}

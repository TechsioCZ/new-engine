import { HOMEPAGE_PRODUCTS_PER_SECTION } from "@/lib/storefront/homepage-catalog-config"
import { PRODUCT_SECTIONS as PRODUCT_SECTION_DATA } from "./homepage.content.data"
import type {
  HeroBannerItem as HeroBannerItemData,
  ProductSectionDefinition as ProductSectionDefinitionData,
} from "./homepage.data.types"
import { HERO_BANNERS as HERO_BANNER_DATA } from "./homepage.hero.data"

export const HERO_BANNERS = HERO_BANNER_DATA
export const PRODUCT_SECTIONS = PRODUCT_SECTION_DATA
export const PRODUCTS_PER_COLLECTION_SECTION = HOMEPAGE_PRODUCTS_PER_SECTION

export type HeroBannerItem = HeroBannerItemData
export type ProductSectionDefinition = ProductSectionDefinitionData

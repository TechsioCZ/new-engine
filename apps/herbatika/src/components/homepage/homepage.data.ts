import { HOMEPAGE_PRODUCTS_PER_SECTION } from "@/lib/storefront/homepage-catalog-config"
import {
  createBlogPosts,
  createProductSections,
} from "./homepage.content.data"
import type {
  BlogTeaserItem as BlogTeaserItemData,
  HeroBannerItem as HeroBannerItemData,
  ProductSectionDefinition as ProductSectionDefinitionData,
} from "./homepage.data.types"
import { createHeroBanners } from "./homepage.hero.data"

export { createBlogPosts, createHeroBanners, createProductSections }
export const PRODUCTS_PER_COLLECTION_SECTION = HOMEPAGE_PRODUCTS_PER_SECTION

export type BlogTeaserItem = BlogTeaserItemData
export type HeroBannerItem = HeroBannerItemData
export type ProductSectionDefinition = ProductSectionDefinitionData

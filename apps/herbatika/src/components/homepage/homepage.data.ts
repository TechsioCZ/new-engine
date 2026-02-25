export {
  type BenefitItem,
  type BlogTeaserItem,
  type HeroBannerItem,
  type ProductSectionDefinition,
  type PurposeCategoryItem,
} from "./homepage.data.types";
export { BENEFITS, HERO_BANNERS } from "./homepage.hero.data";
export {
  BLOG_POSTS,
  PRODUCT_SECTIONS,
  PURPOSE_CATEGORIES,
  RECENT_PRODUCT_SKELETON_KEYS,
} from "./homepage.content.data";

import { PRODUCT_SECTIONS } from "./homepage.content.data";

export const PRODUCT_FETCH_LIMIT = 24;
export const PRODUCTS_PER_GRID_SECTION = 4;
export const HERO_PAGE_SIZE = 4;
export const TOTAL_GRID_PRODUCTS =
  PRODUCT_SECTIONS.length * PRODUCTS_PER_GRID_SECTION;

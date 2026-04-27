import { HOMEPAGE_PRODUCTS_PER_SECTION } from "@/lib/storefront/homepage-catalog-config";

export {
  type BlogTeaserItem,
  type HeroBannerItem,
  type ProductSectionDefinition,
} from "./homepage.data.types";
export { HERO_BANNERS } from "./homepage.hero.data";
export {
  BLOG_POSTS,
  PRODUCT_SECTIONS,
  RECENT_PRODUCT_SKELETON_KEYS,
} from "./homepage.content.data";

export const PRODUCTS_PER_GRID_SECTION = HOMEPAGE_PRODUCTS_PER_SECTION;
export const HERO_PAGE_SIZE = 4;

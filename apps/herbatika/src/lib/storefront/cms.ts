import {
  fetchCachedLatestCmsBlogPosts as fetchCachedLatestCmsBlogPostsValue,
  fetchCmsArticleBySlug as fetchCmsArticleBySlugValue,
  fetchCmsArticleCategories as fetchCmsArticleCategoriesValue,
  fetchCmsBlogCategoryFilters as fetchCmsBlogCategoryFiltersValue,
  fetchCmsBlogListing as fetchCmsBlogListingValue,
  fetchCmsBlogPost as fetchCmsBlogPostValue,
  fetchLatestCmsBlogPosts as fetchLatestCmsBlogPostsValue,
} from "./cms-blog"
import { mapCmsArticleToBlogPost as mapCmsArticleToBlogPostValue } from "./cms-blog-mappers"
import {
  fetchCmsHeroBanners as fetchCmsHeroBannersValue,
  mapCmsHeroCarouselToHeroBanner as mapCmsHeroCarouselToHeroBannerValue,
} from "./cms-hero-carousels"
import { fetchCmsHomepagePromo as fetchCmsHomepagePromoValue } from "./cms-homepage-promo"
import { fetchCmsPageBySlug as fetchCmsPageBySlugValue } from "./cms-pages"
import type {
  CmsArticleCategory as CmsArticleCategoryValue,
  CmsArticleSummary as CmsArticleSummaryValue,
  CmsArticle as CmsArticleValue,
  CmsCategory as CmsCategoryValue,
  CmsHeroCarousel as CmsHeroCarouselValue,
  CmsMedia as CmsMediaValue,
  CmsPage as CmsPageValue,
} from "./cms-types"

export const fetchCmsArticleBySlug = fetchCmsArticleBySlugValue
export const fetchCmsArticleCategories = fetchCmsArticleCategoriesValue
export const fetchCmsBlogCategoryFilters = fetchCmsBlogCategoryFiltersValue
export const fetchCmsBlogListing = fetchCmsBlogListingValue
export const fetchCmsBlogPost = fetchCmsBlogPostValue
export const fetchCachedLatestCmsBlogPosts = fetchCachedLatestCmsBlogPostsValue
export const fetchLatestCmsBlogPosts = fetchLatestCmsBlogPostsValue
export const fetchCmsHeroBanners = fetchCmsHeroBannersValue
export const fetchCmsHomepagePromo = fetchCmsHomepagePromoValue
export const fetchCmsPageBySlug = fetchCmsPageBySlugValue
export const mapCmsArticleToBlogPost = mapCmsArticleToBlogPostValue
export const mapCmsHeroCarouselToHeroBanner =
  mapCmsHeroCarouselToHeroBannerValue

export type CmsArticle = CmsArticleValue
export type CmsArticleCategory = CmsArticleCategoryValue
export type CmsArticleSummary = CmsArticleSummaryValue
export type CmsCategory = CmsCategoryValue
export type CmsHeroCarousel = CmsHeroCarouselValue
export type CmsMedia = CmsMediaValue
export type CmsPage = CmsPageValue

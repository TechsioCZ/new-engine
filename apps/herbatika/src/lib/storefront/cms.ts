import {
  fetchCmsArticleBySlug as fetchCmsArticleBySlugValue,
  fetchCmsArticleCategories as fetchCmsArticleCategoriesValue,
  fetchCmsBlogCategoryFilters as fetchCmsBlogCategoryFiltersValue,
  fetchCmsBlogListing as fetchCmsBlogListingValue,
  fetchCmsBlogPost as fetchCmsBlogPostValue,
  fetchCachedRandomCmsBlogPosts as fetchCachedRandomCmsBlogPostsValue,
  fetchRandomCmsBlogPosts as fetchRandomCmsBlogPostsValue,
  mapCmsArticleToBlogPost as mapCmsArticleToBlogPostValue,
} from "./cms-blog"
import {
  fetchCmsHeroBanners as fetchCmsHeroBannersValue,
  mapCmsHeroCarouselToHeroBanner as mapCmsHeroCarouselToHeroBannerValue,
} from "./cms-hero-carousels"
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
export const fetchCachedRandomCmsBlogPosts =
  fetchCachedRandomCmsBlogPostsValue
export const fetchRandomCmsBlogPosts = fetchRandomCmsBlogPostsValue
export const fetchCmsHeroBanners = fetchCmsHeroBannersValue
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

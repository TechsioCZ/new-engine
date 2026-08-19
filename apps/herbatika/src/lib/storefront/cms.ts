import {
  type CmsBlogListing as CmsBlogListingValue,
  fetchCachedLatestCmsBlogPosts as fetchCachedLatestCmsBlogPostsValue,
  fetchCmsArticleById as fetchCmsArticleByIdValue,
  fetchCmsArticleBySlug as fetchCmsArticleBySlugValue,
  fetchCmsArticleCategories as fetchCmsArticleCategoriesValue,
  fetchCmsBlogCategoryFilters as fetchCmsBlogCategoryFiltersValue,
  fetchCmsBlogListing as fetchCmsBlogListingValue,
  fetchCmsBlogPostById as fetchCmsBlogPostByIdValue,
  fetchCmsBlogPost as fetchCmsBlogPostValue,
  fetchLatestCmsBlogPosts as fetchLatestCmsBlogPostsValue,
  readCmsArticleById as readCmsArticleByIdValue,
} from "./cms-blog"
import {
  type CmsBlogCardItem as CmsBlogCardItemValue,
  type CmsBlogPost as CmsBlogPostValue,
  mapCmsArticleToBlogPost as mapCmsArticleToBlogPostValue,
} from "./cms-blog-mappers"
import {
  fetchCmsHeroBanners as fetchCmsHeroBannersValue,
  mapCmsHeroCarouselToHeroBanner as mapCmsHeroCarouselToHeroBannerValue,
} from "./cms-hero-carousels"
import { fetchCmsHomepagePromo as fetchCmsHomepagePromoValue } from "./cms-homepage-promo"
import {
  fetchCmsPageById as fetchCmsPageByIdValue,
  fetchCmsPageBySlug as fetchCmsPageBySlugValue,
  readCmsPageById as readCmsPageByIdValue,
  readCmsPageBySlug as readCmsPageBySlugValue,
  readCmsStaticPage as readCmsStaticPageValue,
} from "./cms-pages"
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
export const fetchCmsArticleById = fetchCmsArticleByIdValue
export const readCmsArticleById = readCmsArticleByIdValue
export const fetchCmsArticleCategories = fetchCmsArticleCategoriesValue
export const fetchCmsBlogCategoryFilters = fetchCmsBlogCategoryFiltersValue
export const fetchCmsBlogListing = fetchCmsBlogListingValue
export const fetchCmsBlogPost = fetchCmsBlogPostValue
export const fetchCmsBlogPostById = fetchCmsBlogPostByIdValue
export const fetchCachedLatestCmsBlogPosts = fetchCachedLatestCmsBlogPostsValue
export const fetchLatestCmsBlogPosts = fetchLatestCmsBlogPostsValue
export const fetchCmsHeroBanners = fetchCmsHeroBannersValue
export const fetchCmsHomepagePromo = fetchCmsHomepagePromoValue
export const fetchCmsPageBySlug = fetchCmsPageBySlugValue
export const fetchCmsPageById = fetchCmsPageByIdValue
export const readCmsPageById = readCmsPageByIdValue
export const readCmsPageBySlug = readCmsPageBySlugValue
export const readCmsStaticPage = readCmsStaticPageValue
export const mapCmsArticleToBlogPost = mapCmsArticleToBlogPostValue
export const mapCmsHeroCarouselToHeroBanner =
  mapCmsHeroCarouselToHeroBannerValue

export type CmsArticle = CmsArticleValue
export type CmsArticleCategory = CmsArticleCategoryValue
export type CmsArticleSummary = CmsArticleSummaryValue
export type CmsBlogCardItem = CmsBlogCardItemValue
export type CmsBlogListing = CmsBlogListingValue
export type CmsBlogPost = CmsBlogPostValue
export type CmsCategory = CmsCategoryValue
export type CmsHeroCarousel = CmsHeroCarouselValue
export type CmsMedia = CmsMediaValue
export type CmsPage = CmsPageValue

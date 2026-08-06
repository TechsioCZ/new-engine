import {
  fetchCmsArticleById as fetchCmsArticleByIdValue,
  fetchCmsArticleBySlug as fetchCmsArticleBySlugValue,
  fetchCmsArticleCategories as fetchCmsArticleCategoriesValue,
  fetchCmsBlogPostById as fetchCmsBlogPostByIdValue,
  fetchCmsBlogPosts as fetchCmsBlogPostsValue,
  fetchCmsBlogPost as fetchCmsBlogPostValue,
  mapCmsArticleToBlogPost as mapCmsArticleToBlogPostValue,
} from "./cms-blog"
import {
  fetchCmsHeroBanners as fetchCmsHeroBannersValue,
  mapCmsHeroCarouselToHeroBanner as mapCmsHeroCarouselToHeroBannerValue,
} from "./cms-hero-carousels"
import { fetchCmsHomepagePromo as fetchCmsHomepagePromoValue } from "./cms-homepage-promo"
import {
  fetchCmsPageById as fetchCmsPageByIdValue,
  fetchCmsPageBySlug as fetchCmsPageBySlugValue,
} from "./cms-pages"
import type {
  CmsArticleCategory as CmsArticleCategoryValue,
  CmsArticleSummary as CmsArticleSummaryValue,
  CmsArticle as CmsArticleValue,
  CmsBlogTopic as CmsBlogTopicValue,
  CmsCategory as CmsCategoryValue,
  CmsHeroCarousel as CmsHeroCarouselValue,
  CmsMedia as CmsMediaValue,
  CmsPage as CmsPageValue,
} from "./cms-types"

export const fetchCmsArticleById = fetchCmsArticleByIdValue
export const fetchCmsArticleBySlug = fetchCmsArticleBySlugValue
export const fetchCmsArticleCategories = fetchCmsArticleCategoriesValue
export const fetchCmsBlogPost = fetchCmsBlogPostValue
export const fetchCmsBlogPostById = fetchCmsBlogPostByIdValue
export const fetchCmsBlogPosts = fetchCmsBlogPostsValue
export const fetchCmsHeroBanners = fetchCmsHeroBannersValue
export const fetchCmsHomepagePromo = fetchCmsHomepagePromoValue
export const fetchCmsPageById = fetchCmsPageByIdValue
export const fetchCmsPageBySlug = fetchCmsPageBySlugValue
export const mapCmsArticleToBlogPost = mapCmsArticleToBlogPostValue
export const mapCmsHeroCarouselToHeroBanner =
  mapCmsHeroCarouselToHeroBannerValue

export type CmsArticle = CmsArticleValue
export type CmsArticleCategory = CmsArticleCategoryValue
export type CmsArticleSummary = CmsArticleSummaryValue
export type CmsBlogTopic = CmsBlogTopicValue
export type CmsCategory = CmsCategoryValue
export type CmsHeroCarousel = CmsHeroCarouselValue
export type CmsMedia = CmsMediaValue
export type CmsPage = CmsPageValue

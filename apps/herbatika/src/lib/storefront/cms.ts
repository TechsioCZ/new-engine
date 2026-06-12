import {
  fetchCmsArticleBySlug as fetchCmsArticleBySlugValue,
  fetchCmsArticleCategories as fetchCmsArticleCategoriesValue,
  fetchCmsBlogPosts as fetchCmsBlogPostsValue,
  fetchCmsBlogPost as fetchCmsBlogPostValue,
  mapCmsArticleToBlogPost as mapCmsArticleToBlogPostValue,
} from "./cms-blog"
import { fetchCmsPageBySlug as fetchCmsPageBySlugValue } from "./cms-pages"
import type {
  CmsArticleCategory as CmsArticleCategoryValue,
  CmsArticleSummary as CmsArticleSummaryValue,
  CmsArticle as CmsArticleValue,
  CmsBlogTopic as CmsBlogTopicValue,
  CmsCategory as CmsCategoryValue,
  CmsMedia as CmsMediaValue,
  CmsPage as CmsPageValue,
} from "./cms-types"

export const fetchCmsArticleBySlug = fetchCmsArticleBySlugValue
export const fetchCmsArticleCategories = fetchCmsArticleCategoriesValue
export const fetchCmsBlogPost = fetchCmsBlogPostValue
export const fetchCmsBlogPosts = fetchCmsBlogPostsValue
export const fetchCmsPageBySlug = fetchCmsPageBySlugValue
export const mapCmsArticleToBlogPost = mapCmsArticleToBlogPostValue

export type CmsArticle = CmsArticleValue
export type CmsArticleCategory = CmsArticleCategoryValue
export type CmsArticleSummary = CmsArticleSummaryValue
export type CmsBlogTopic = CmsBlogTopicValue
export type CmsCategory = CmsCategoryValue
export type CmsMedia = CmsMediaValue
export type CmsPage = CmsPageValue

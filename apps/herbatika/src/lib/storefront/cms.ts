import {
  fetchCmsBlogPosts as fetchCmsBlogPostsValue,
  fetchCmsBlogPost as fetchCmsBlogPostValue,
} from "./cms-blog"
import { fetchCmsHeroBanners as fetchCmsHeroBannersValue } from "./cms-hero-carousels"
import { fetchCmsPageBySlug as fetchCmsPageBySlugValue } from "./cms-pages"
import type { CmsPage as CmsPageValue } from "./cms-types"

export const fetchCmsBlogPost = fetchCmsBlogPostValue
export const fetchCmsBlogPosts = fetchCmsBlogPostsValue
export const fetchCmsHeroBanners = fetchCmsHeroBannersValue
export const fetchCmsPageBySlug = fetchCmsPageBySlugValue

export type CmsPage = CmsPageValue

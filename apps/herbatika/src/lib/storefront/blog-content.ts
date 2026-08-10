import BLOG_BANNER from "@/assets/blog-banner.webp"

import { ACTIVE_LIFE_MINERALS_BLOG_POST } from "./blog-posts/active-life-minerals"
import { ADAPTOGENS_BLOG_POST } from "./blog-posts/adaptogens"
import { ASHWAGANDHA_BLOG_POST } from "./blog-posts/ashwagandha"
import { COLLAGEN_BLOG_POST } from "./blog-posts/collagen"
import { DIGESTION_BLOG_POST } from "./blog-posts/digestion"
import { ELECTROLYTES_BLOG_POST } from "./blog-posts/electrolytes"
import { HEART_AND_BLOOD_VESSELS_BLOG_POST } from "./blog-posts/heart-and-blood-vessels"
import { HORMONAL_BALANCE_BLOG_POST } from "./blog-posts/hormonal-balance"
import { LIVER_DETOX_BLOG_POST } from "./blog-posts/liver-detox"
import { LYMPHATIC_SYSTEM_BLOG_POST } from "./blog-posts/lymphatic-system"
import { NATURAL_COSMETICS_BLOG_POST } from "./blog-posts/natural-cosmetics"
import { PROBIOTICS_BLOG_POST } from "./blog-posts/probiotics"
import { getBlogRecommendedProductsConfig } from "./blog-recommended-products"
import type {
  BlogTopicFilter,
  BlogTopicKey,
  ResolveBlogListingInput,
} from "./blog-types"

export type {
  BlogPost,
  BlogTopicFilter,
  BlogTopicKey,
  ResolveBlogListingInput,
} from "./blog-types"

const BLOG_PAGE_SIZE = 12
const BLOG_TOPIC_ONLY_FILTERS: {
  key: Exclude<BlogTopicKey, "all">
  label: string
}[] = [
  { key: "fitness", label: "Fitness" },
  { key: "krasa", label: "Krása" },
  { key: "zdravie", label: "Zdravie" },
]
const HERBATIKA_BLOG_POSTS = [
  ELECTROLYTES_BLOG_POST,
  ASHWAGANDHA_BLOG_POST,
  ADAPTOGENS_BLOG_POST,
  NATURAL_COSMETICS_BLOG_POST,
  DIGESTION_BLOG_POST,
  HEART_AND_BLOOD_VESSELS_BLOG_POST,
  HORMONAL_BALANCE_BLOG_POST,
  LYMPHATIC_SYSTEM_BLOG_POST,
  ACTIVE_LIFE_MINERALS_BLOG_POST,
  LIVER_DETOX_BLOG_POST,
  COLLAGEN_BLOG_POST,
  PROBIOTICS_BLOG_POST,
]

export const BLOG_PROMO_BANNER = {
  codeLabel: "KÓD:",
  codeValue: "TOP20",
  imageSrc: BLOG_BANNER,
  subtitle: "na bestsellery",
  title: "ZĽAVA 20 %",
}

const normalizeBlogTopic = (topic: BlogTopicKey | undefined): BlogTopicKey => {
  if (!topic || topic === "all") {
    return "all"
  }

  return BLOG_TOPIC_ONLY_FILTERS.some((item) => item.key === topic)
    ? topic
    : "all"
}

const resolveBlogTopicFilters = (
  posts = HERBATIKA_BLOG_POSTS,
): BlogTopicFilter[] => {
  const topicCounts = BLOG_TOPIC_ONLY_FILTERS.map((topicFilter) => ({
    ...topicFilter,
    count: posts.filter((post) => post.topic === topicFilter.key).length,
  }))

  return [{ count: posts.length, key: "all", label: "Všetky" }, ...topicCounts]
}

export const resolveBlogListing = ({
  posts = HERBATIKA_BLOG_POSTS,
  topic,
  page,
  pageSize = BLOG_PAGE_SIZE,
}: ResolveBlogListingInput) => {
  const normalizedTopic = normalizeBlogTopic(topic)
  const safePageSize = Math.max(pageSize, 1)
  const filteredPosts =
    normalizedTopic === "all"
      ? posts
      : posts.filter((post) => post.topic === normalizedTopic)
  const totalItems = filteredPosts.length
  const totalPages = Math.max(Math.ceil(totalItems / safePageSize), 1)
  const safePage =
    Number.isFinite(page) && Number(page) > 0 ? Math.floor(Number(page)) : 1
  const normalizedPage = Math.min(safePage, totalPages)
  const start = (normalizedPage - 1) * safePageSize

  return {
    hasNextPage: normalizedPage < totalPages,
    hasPreviousPage: normalizedPage > 1,
    page: normalizedPage,
    pageSize: safePageSize,
    posts: filteredPosts.slice(start, start + safePageSize),
    topic: normalizedTopic,
    topicFilters: resolveBlogTopicFilters(posts),
    totalItems,
    totalPages,
  }
}

export const resolveBlogPostBySlug = (
  slug: string,
  posts = HERBATIKA_BLOG_POSTS,
) => posts.find((post) => post.slug === slug) ?? null

export const resolveBlogRecommendedProductsConfig = (slug: string) =>
  getBlogRecommendedProductsConfig(slug)

export const resolveRelatedBlogPosts = (
  slug: string,
  limit = 4,
  posts = HERBATIKA_BLOG_POSTS,
) => posts.filter((post) => post.slug !== slug).slice(0, limit)

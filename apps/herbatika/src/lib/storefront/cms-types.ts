import type { BlogTopicKey } from "@/lib/storefront/blog-content";

export type CmsMedia = {
  alt?: string | null;
  url?: string | null;
};

export type CmsCategory = {
  id: number | string;
  slug?: string | null;
  title?: string | null;
};

export type CmsArticleSummary = {
  excerpt?: string | null;
  featuredImage?: unknown;
  slug?: string | null;
  title?: string | null;
};

export type CmsArticleCategory = CmsCategory & {
  articles?: CmsArticleSummary[] | null;
};

export type CmsArticle = {
  author?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  category?: CmsCategory | null;
  content?: unknown;
  excerpt?: string | null;
  featuredImage?: unknown;
  id: number | string;
  publishedAt?: string | null;
  publishedDate?: string | null;
  readingTime?: number | string | null;
  slug?: string | null;
  tags?: string[] | null;
  title?: string | null;
};

export type CmsPage = {
  category?: CmsCategory | null;
  content?: unknown;
  id: number | string;
  meta?: {
    description?: string | null;
    title?: string | null;
  } | null;
  seo?: {
    description?: string | null;
    title?: string | null;
  } | null;
  publishedAt?: string | null;
  publishedDate?: string | null;
  slug?: string | null;
  title?: string | null;
};

export type CmsBlogTopic = Exclude<BlogTopicKey, "all">;

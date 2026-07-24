import BLOG_BANNER from "@/assets/blog-banner.webp"

export type BlogCategory = {
  slug: string
  title: string
}

export type BlogPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  contentHtml: string
  imageSrc: string
  category: BlogCategory
  tags: string[]
  publishedAt: string
  author: string
  authorRole: string
  authorBio: string
  authorImageSrc?: string
  readingTime: string
  lead: string
}

export type BlogCardItem = Pick<
  BlogPost,
  | "category"
  | "excerpt"
  | "id"
  | "imageSrc"
  | "publishedAt"
  | "readingTime"
  | "slug"
  | "title"
>

export type BlogCategoryFilter = {
  key: string
  label: string
  count: number
}

export type BlogListing = {
  category: string
  page: number
  totalItems: number
  totalPages: number
  pageSize: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  posts: BlogCardItem[]
  categoryFilters: BlogCategoryFilter[]
}

export const BLOG_PAGE_SIZE = 12

export const BLOG_PROMO_BANNER = {
  title: "ZĽAVA 20 %",
  imageSrc: BLOG_BANNER,
}

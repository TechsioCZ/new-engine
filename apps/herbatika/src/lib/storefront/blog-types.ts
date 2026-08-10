export type BlogTopicKey = "all" | "fitness" | "krasa" | "zdravie"

interface BlogPostSection {
  title: string
  paragraphs: string[]
  bulletPoints?: string[]
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  contentHtml?: string
  imageSrc: string
  topic: Exclude<BlogTopicKey, "all">
  tags: string[]
  publishedAt: string
  author: string
  authorRole: string
  authorBio: string
  authorImageSrc: string
  readingTime: string
  lead: string
  bulletPoints: string[]
  sections: BlogPostSection[]
}

export interface BlogTopicFilter {
  key: BlogTopicKey
  label: string
  count: number
}

export interface ResolveBlogListingInput {
  posts?: BlogPost[]
  topic?: BlogTopicKey
  page?: number
  pageSize?: number
}

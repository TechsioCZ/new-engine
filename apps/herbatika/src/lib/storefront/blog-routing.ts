import { serializeBlogQueryState } from "./blog-query-state"

export { ALL_BLOG_CATEGORIES_KEY } from "./blog-query-state"

type BlogListingUrlInput = {
  category: string
  page?: number
}

const resolveBlogListingUrl = (
  pathname: string,
  { category, page = 1 }: BlogListingUrlInput
) =>
  serializeBlogQueryState(pathname, {
    category,
    page,
  })

export const resolveBlogListingHref = (input: BlogListingUrlInput) =>
  resolveBlogListingUrl("/blog", input)

export const resolveBlogListingApiHref = (input: BlogListingUrlInput) =>
  resolveBlogListingUrl("/api/blog", input)

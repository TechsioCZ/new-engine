import { buildPath } from "@/lib/url/public-url"
import type { Market } from "@/lib/url/types"
import { serializeBlogQueryState } from "./blog-query-state"

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

export const resolveBlogListingHref = (
  market: Market,
  input: BlogListingUrlInput
) => resolveBlogListingUrl(buildPath({ kind: "article" }, market), input)

export const resolveBlogListingApiHref = (input: BlogListingUrlInput) =>
  resolveBlogListingUrl("/api/blog", input)

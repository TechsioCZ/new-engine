export const ALL_BLOG_CATEGORIES_KEY = "all"

export const resolveBlogListingHref = ({
  category,
  page = 1,
}: {
  category: string
  page?: number
}) => {
  const query = new URLSearchParams()

  if (category !== ALL_BLOG_CATEGORIES_KEY) {
    query.set("category", category)
  }

  if (page > 1) {
    query.set("page", String(page))
  }

  const serialized = query.toString()
  return serialized ? `/blog?${serialized}` : "/blog"
}

"use client"

const normalizeSearchQuery = (value: unknown): string => {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim()
}

export const resolveSearchHref = (value: unknown): string => {
  const query = normalizeSearchQuery(value)
  if (!query) {
    return "/search"
  }

  return `/search?q=${encodeURIComponent(query)}`
}

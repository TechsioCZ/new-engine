const BLOG_HEADING_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i

export const isBlogHeadingId = (value: string) =>
  BLOG_HEADING_ID_PATTERN.test(value)

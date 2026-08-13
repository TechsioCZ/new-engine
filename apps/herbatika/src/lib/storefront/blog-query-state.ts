import { createParser, createSerializer } from "nuqs/server"

export const ALL_BLOG_CATEGORIES_KEY = "all"

const MAX_CATEGORY_LENGTH = 100

const blogCategoryParser = createParser({
  parse: (value) => value.trim().slice(0, MAX_CATEGORY_LENGTH) || null,
  serialize: String,
}).withDefault(ALL_BLOG_CATEGORIES_KEY)

const blogPageParser = createParser({
  parse: (value) => {
    const page = Number(value)

    return Number.isSafeInteger(page) && page > 0 ? page : null
  },
  serialize: String,
}).withDefault(1)

export const blogQueryParsers = {
  category: blogCategoryParser,
  page: blogPageParser,
}

export const serializeBlogQueryState = createSerializer(blogQueryParsers)

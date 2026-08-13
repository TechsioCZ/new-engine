import type { Block, TextFieldSingleValidation } from "payload"

const validateArticleSlug: TextFieldSingleValidation = async (
  value,
  { req }
) => {
  if (typeof value !== "string" || !value.trim()) {
    return "Article slug is required"
  }

  const slug = value.trim()
  if (value !== slug) {
    return "Article slug must not contain leading or trailing whitespace"
  }

  if (req.context?.skipArticleSlugValidation) {
    return true
  }

  const result = await req.payload.find({
    req,
    collection: "articles",
    where: {
      and: [
        { slug: { equals: slug } },
        { status: { equals: "published" } },
      ],
    },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  return result.docs.length > 0
    ? true
    : `Published article with slug "${slug}" does not exist`
}

export const ARTICLE_CAROUSEL_BLOCK_SLUG = "articleCarousel"

export const ArticleCarouselBlock: Block = {
  slug: ARTICLE_CAROUSEL_BLOCK_SLUG,
  labels: {
    singular: "Article carousel",
    plural: "Article carousels",
  },
  fields: [
    {
      name: "articles",
      type: "array",
      required: true,
      minRows: 1,
      fields: [
        {
          name: "articleSlug",
          type: "text",
          required: true,
          validate: validateArticleSlug,
          admin: {
            components: {
              Field: "/components/admin/article-slug-field#ArticleSlugField",
            },
          },
        },
      ],
    },
  ],
}

import type { Block, TextFieldSingleValidation } from "payload"

const validateArticleSlug: TextFieldSingleValidation = async (
  value,
  { req }
) => {
  if (typeof value !== "string" || !value.trim()) {
    return "Article slug is required"
  }

  if (req.context?.skipArticleSlugValidation) {
    return true
  }

  const result = await req.payload.find({
    req,
    collection: "articles",
    where: {
      slug: {
        equals: value.trim(),
      },
    },
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  })

  return result.docs.length > 0
    ? true
    : `Article with slug "${value.trim()}" does not exist`
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

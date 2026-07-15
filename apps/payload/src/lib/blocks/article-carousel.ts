import type { Block } from "payload"

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

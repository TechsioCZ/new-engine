import { z } from "@medusajs/framework/zod"

const passthroughObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).passthrough()

const nonStrictSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => value, schema)

const CmsVisibilitySchema = z.enum(["public", "customers-only"])
const CmsStatusSchema = z.enum(["draft", "published"])

const CmsSeoSchema = passthroughObject({
  description: z.string().nullable().optional(),
  image: z.unknown().nullable().optional(),
  title: z.string().nullable().optional(),
})

const CmsPageSchema = passthroughObject({
  content: z.unknown().optional(),
  id: z.number(),
  publishedAt: z.string().nullable().optional(),
  seo: CmsSeoSchema.optional(),
  slug: z.string(),
  status: CmsStatusSchema.optional(),
  title: z.string(),
  visibility: CmsVisibilitySchema.optional(),
})

const CmsPageCategorySchema = passthroughObject({
  id: z.number(),
  pages: z.array(
    passthroughObject({
      title: z.string(),
      slug: z.string().nullable().optional(),
    }),
  ),
  slug: z.string(),
  title: z.string(),
})

const CmsArticleSchema = passthroughObject({
  author: z.unknown().optional(),
  category: z.unknown().optional(),
  content: z.unknown().optional(),
  excerpt: z.string().nullable().optional(),
  featuredImage: z.unknown().optional(),
  id: z.number(),
  publishedAt: z.string().nullable().optional(),
  slug: z.string(),
  status: CmsStatusSchema.optional(),
  title: z.string(),
})

const CmsArticleCategorySchema = passthroughObject({
  articles: z.array(
    passthroughObject({
      title: z.string(),
      slug: z.string().nullable().optional(),
      excerpt: z.string().nullable().optional(),
      featuredImage: z.string().nullable().optional(),
    }),
  ),
  id: z.number(),
  slug: z.string(),
  title: z.string(),
})

const CmsHeroCarouselSchema = passthroughObject({
  button: z.string().nullable().optional(),
  buttonHref: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  heading: z.string().nullable().optional(),
  id: z.number(),
  image: z.unknown(),
  subheading: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
})

const createPayloadBulkResultSchema = <T extends z.ZodTypeAny>(docSchema: T) =>
  nonStrictSchema(
    passthroughObject({
      docs: z.array(docSchema),
      hasNextPage: z.boolean(),
      hasPrevPage: z.boolean(),
      limit: z.number(),
      nextPage: z.number().nullable(),
      page: z.number(),
      pagingCounter: z.number(),
      prevPage: z.number().nullable(),
      totalDocs: z.number(),
      totalPages: z.number(),
    }),
  )

const PageCategoriesWithPagesSchema = nonStrictSchema(
  passthroughObject({
    categories: z.array(CmsPageCategorySchema),
  }),
)

const ArticleCategoriesWithArticlesSchema = nonStrictSchema(
  passthroughObject({
    categories: z.array(CmsArticleCategorySchema),
  }),
)

const CmsPagesBulkResultSchema = createPayloadBulkResultSchema(CmsPageSchema)
const CmsArticlesBulkResultSchema =
  createPayloadBulkResultSchema(CmsArticleSchema)
const CmsHeroCarouselsBulkResultSchema = createPayloadBulkResultSchema(
  CmsHeroCarouselSchema,
)

const CmsListOptionsSchema = z.object({
  limit: z.number().optional(),
  locale: z.string().optional(),
  page: z.number().optional(),
  sort: z.string().optional(),
})

const CmsCategoryListOptionsSchema = z.object({
  categorySlug: z.string().optional(),
  locale: z.string().optional(),
})

export {
  CmsVisibilitySchema,
  CmsStatusSchema,
  CmsSeoSchema,
  CmsPageSchema,
  CmsPageCategorySchema,
  CmsArticleSchema,
  CmsArticleCategorySchema,
  CmsHeroCarouselSchema,
  CmsPagesBulkResultSchema,
  CmsArticlesBulkResultSchema,
  CmsHeroCarouselsBulkResultSchema,
  PageCategoriesWithPagesSchema,
  ArticleCategoriesWithArticlesSchema,
  CmsListOptionsSchema,
  CmsCategoryListOptionsSchema,
  createPayloadBulkResultSchema,
}

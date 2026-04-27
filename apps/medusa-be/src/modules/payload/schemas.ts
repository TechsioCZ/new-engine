import { z } from "zod"

const passthroughObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).passthrough()

const nonStrictSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => value, schema)

const CmsVisibilitySchema = z.enum(["public", "customers-only"])
const CmsStatusSchema = z.enum(["draft", "published"])

const CmsSeoSchema = passthroughObject({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  image: z.unknown().nullable().optional(),
})

const CmsPageSchema = passthroughObject({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  content: z.unknown().optional(),
  seo: CmsSeoSchema.optional(),
  status: CmsStatusSchema.optional(),
  visibility: CmsVisibilitySchema.optional(),
  publishedAt: z.string().nullable().optional(),
})

const CmsPageCategorySchema = passthroughObject({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  pages: z.array(
    passthroughObject({
      title: z.string(),
      slug: z.string().nullable().optional(),
    })
  ),
})

const CmsArticleSchema = passthroughObject({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable().optional(),
  content: z.unknown().optional(),
  featuredImage: z.unknown().optional(),
  category: z.unknown().optional(),
  author: z.unknown().optional(),
  status: CmsStatusSchema.optional(),
  publishedAt: z.string().nullable().optional(),
})

const CmsArticleCategorySchema = passthroughObject({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  articles: z.array(
    passthroughObject({
      title: z.string(),
      slug: z.string().nullable().optional(),
      excerpt: z.string().nullable().optional(),
      featuredImage: z.string().nullable().optional(),
    })
  ),
})

const CmsHeroCarouselSchema = passthroughObject({
  id: z.number(),
  image: z.unknown(),
  heading: z.string().nullable().optional(),
  subheading: z.string().nullable().optional(),
  button: z.string().nullable().optional(),
  buttonHref: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

const createPayloadBulkResultSchema = <T extends z.ZodTypeAny>(docSchema: T) =>
  nonStrictSchema(
    passthroughObject({
      docs: z.array(docSchema),
      totalDocs: z.number(),
      limit: z.number(),
      page: z.number(),
      totalPages: z.number(),
      hasNextPage: z.boolean(),
      hasPrevPage: z.boolean(),
      nextPage: z.number().nullable(),
      prevPage: z.number().nullable(),
      pagingCounter: z.number(),
    })
  )

const PageCategoriesWithPagesSchema = nonStrictSchema(
  passthroughObject({
    categories: z.array(CmsPageCategorySchema),
  })
)

const ArticleCategoriesWithArticlesSchema = nonStrictSchema(
  passthroughObject({
    categories: z.array(CmsArticleCategorySchema),
  })
)

const CmsPagesBulkResultSchema = createPayloadBulkResultSchema(CmsPageSchema)
const CmsArticlesBulkResultSchema = createPayloadBulkResultSchema(CmsArticleSchema)
const CmsHeroCarouselsBulkResultSchema =
  createPayloadBulkResultSchema(CmsHeroCarouselSchema)

const CmsListOptionsSchema = z.object({
  limit: z.number().optional(),
  page: z.number().optional(),
  sort: z.string().optional(),
  locale: z.string().optional(),
})

const CmsCategoryListOptionsSchema = z.object({
  locale: z.string().optional(),
  categorySlug: z.string().optional(),
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

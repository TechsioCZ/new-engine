import { z } from "@medusajs/framework/zod"

const passthroughObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).passthrough()

const nonStrictSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => value, schema)

const CmsVisibilitySchema = z.enum(["public", "customers-only"])
const CmsStatusSchema = z.enum(["draft", "published", "archived"])

const CmsSeoSchema = passthroughObject({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  image: z.unknown().nullable().optional(),
})

const CmsProductReferenceSchema = passthroughObject({
  id: z.string().optional(),
  productExternalId: z.string().trim().min(1).optional(),
  productSlug: z.string().trim().min(1).optional(),
}).refine(
  ({ productExternalId, productSlug }) =>
    Boolean(productExternalId || productSlug),
  {
    message: "Product reference requires productExternalId or productSlug",
  }
)

const CmsProductCarouselBlockSchema = passthroughObject({
  id: z.string().optional(),
  blockName: z.string().nullable().optional(),
  blockType: z.literal("productCarousel"),
  products: z.array(CmsProductReferenceSchema).min(1),
})

const CmsLexicalNodeSchema = passthroughObject({
  type: z.string(),
  version: z.number(),
  children: z.array(z.unknown()).optional(),
  fields: z.unknown().optional(),
}).superRefine((node, context) => {
  if (
    node.type !== "block" ||
    typeof node.fields !== "object" ||
    node.fields === null
  ) {
    return
  }

  const blockType = (node.fields as { blockType?: unknown }).blockType
  if (blockType !== "productCarousel") {
    return
  }

  const parsedBlock = CmsProductCarouselBlockSchema.safeParse(node.fields)
  if (!parsedBlock.success) {
    for (const issue of parsedBlock.error.issues) {
      context.addIssue({
        ...issue,
        path: ["fields", ...issue.path],
      })
    }
  }
})

const CmsLexicalContentSchema = passthroughObject({
  root: passthroughObject({
    type: z.string(),
    children: z.array(CmsLexicalNodeSchema),
    direction: z.enum(["ltr", "rtl"]).nullable().optional(),
    format: z.string().optional(),
    indent: z.number().optional(),
    version: z.number(),
  }),
})

const CmsDocumentIdSchema = z.union([z.number(), z.string()])

const CmsMediaSchema = passthroughObject({
  id: CmsDocumentIdSchema,
  alt: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
})

const CmsArticleCategoryReferenceSchema = passthroughObject({
  id: CmsDocumentIdSchema,
  title: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
})

const CmsArticleAuthorSchema = passthroughObject({
  id: CmsDocumentIdSchema,
  displayName: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  portrait: z.unknown().nullable().optional(),
})

const CmsRelatedArticleSchema = passthroughObject({
  id: CmsDocumentIdSchema,
  slug: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  excerpt: z.string().nullable().optional(),
  featuredImage: z.unknown().nullable().optional(),
  primaryCategory: z.unknown().nullable().optional(),
  status: CmsStatusSchema.optional(),
  publishedDate: z.string().nullable().optional(),
  readingTime: z.number().nullable().optional(),
})

const CmsArticleSidebarSchema = passthroughObject({
  promoImage: z
    .union([CmsDocumentIdSchema, CmsMediaSchema])
    .nullable()
    .optional(),
  productExternalId: z.string().trim().min(1).nullable().optional(),
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
  content: z.union([CmsLexicalContentSchema, z.string()]).optional(),
  contentHTML: z.string().nullable().optional(),
  featuredImage: z
    .union([CmsDocumentIdSchema, CmsMediaSchema])
    .nullable()
    .optional(),
  sidebar: CmsArticleSidebarSchema.nullable().optional(),
  category: z
    .union([CmsDocumentIdSchema, CmsArticleCategoryReferenceSchema])
    .nullable()
    .optional(),
  categories: z
    .array(z.union([CmsDocumentIdSchema, CmsArticleCategoryReferenceSchema]))
    .nullable()
    .optional(),
  primaryCategory: z
    .union([CmsDocumentIdSchema, CmsArticleCategoryReferenceSchema])
    .nullable()
    .optional(),
  articleAuthor: z
    .union([CmsDocumentIdSchema, CmsArticleAuthorSchema])
    .nullable()
    .optional(),
  relatedArticles: z
    .array(z.union([CmsDocumentIdSchema, CmsRelatedArticleSchema]))
    .nullable()
    .optional(),
  meta: CmsSeoSchema.optional(),
  status: CmsStatusSchema.optional(),
  publishedDate: z.string().nullable().optional(),
  readingTime: z.number().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
})

const CmsArticleCategorySchema = passthroughObject({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  articles: z.array(
    passthroughObject({
      id: CmsDocumentIdSchema,
      title: z.string(),
      slug: z.string().nullable().optional(),
      excerpt: z.string().nullable().optional(),
      featuredImage: z.string().nullable().optional(),
      primaryCategory: z
        .union([CmsDocumentIdSchema, CmsArticleCategoryReferenceSchema])
        .nullable()
        .optional(),
      publishedDate: z.string().nullable().optional(),
      readingTime: z.number().nullable().optional(),
    })
  ),
})

const CmsHeroButtonTargetSchema = z.union([
  passthroughObject({
    targetType: z.literal("entity"),
    sourceSystem: z.literal("medusa"),
    sourceType: z.enum(["product", "category", "brand", "collection"]),
    sourceId: z.string().trim().min(1),
    staticRouteKey: z.null().optional(),
  }),
  passthroughObject({
    targetType: z.literal("entity"),
    sourceSystem: z.literal("payload"),
    sourceType: z.enum(["article", "page"]),
    sourceId: z.string().trim().min(1),
    staticRouteKey: z.null().optional(),
  }),
  passthroughObject({
    targetType: z.literal("static"),
    sourceSystem: z.null().optional(),
    sourceType: z.null().optional(),
    sourceId: z.null().optional(),
    staticRouteKey: z.enum([
      "root:about",
      "root:contact",
      "root:faq",
      "root:shipping",
      "root:returns",
      "root:terms",
      "root:privacy",
      "root:cookies",
    ]),
  }),
])

const CmsHeroCarouselSchema = passthroughObject({
  id: z.number(),
  image: z.unknown(),
  heading: z.string().nullable().optional(),
  subheading: z.string().nullable().optional(),
  button: z.string().nullable().optional(),
  buttonHref: z.string().nullable().optional(),
  buttonTarget: CmsHeroButtonTargetSchema.nullable().optional(),
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
const CmsArticlesBulkResultSchema =
  createPayloadBulkResultSchema(CmsArticleSchema)
const CmsHeroCarouselsBulkResultSchema = createPayloadBulkResultSchema(
  CmsHeroCarouselSchema
)

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
  CmsProductReferenceSchema,
  CmsProductCarouselBlockSchema,
  CmsLexicalNodeSchema,
  CmsLexicalContentSchema,
  CmsMediaSchema,
  CmsArticleCategoryReferenceSchema,
  CmsArticleAuthorSchema,
  CmsRelatedArticleSchema,
  CmsPageSchema,
  CmsPageCategorySchema,
  CmsArticleSchema,
  CmsArticleCategorySchema,
  CmsHeroButtonTargetSchema,
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

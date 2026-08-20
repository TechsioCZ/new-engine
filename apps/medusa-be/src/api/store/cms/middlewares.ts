import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { StoreCmsArticleCategoriesSchema } from "./article-categories/route"
import { StoreCmsArticleSchema } from "./articles/[slug]/route"
import { StoreCmsArticleByIdSchema } from "./articles/by-id/[id]/route"
import { StoreCmsHeroCarouselsSchema } from "./hero-carousels/route"
import { StoreCmsFooterNavigationSchema } from "./navigation/footer/route"
import { StoreCmsPageCategoriesSchema } from "./page-categories/route"
import { StoreCmsPageSchema } from "./pages/[slug]/route"
import { StoreCmsPageByIdSchema } from "./pages/by-id/[id]/route"

/** Middleware definitions for store CMS routes (query validation). */
export const storeCmsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/cms/pages/by-id/:id",
    middlewares: [
      validateAndTransformQuery(StoreCmsPageByIdSchema, { isList: false }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/cms/navigation/footer",
    middlewares: [
      validateAndTransformQuery(StoreCmsFooterNavigationSchema, {
        isList: false,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/cms/pages/:slug",
    middlewares: [
      validateAndTransformQuery(StoreCmsPageSchema, { isList: false }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/cms/articles/by-id/:id",
    middlewares: [
      validateAndTransformQuery(StoreCmsArticleByIdSchema, { isList: false }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/cms/articles/:slug",
    middlewares: [
      validateAndTransformQuery(StoreCmsArticleSchema, { isList: false }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/cms/article-categories",
    middlewares: [
      validateAndTransformQuery(StoreCmsArticleCategoriesSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/cms/page-categories",
    middlewares: [
      validateAndTransformQuery(StoreCmsPageCategoriesSchema, { isList: true }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/cms/hero-carousels",
    middlewares: [
      validateAndTransformQuery(StoreCmsHeroCarouselsSchema, { isList: true }),
    ],
  },
]

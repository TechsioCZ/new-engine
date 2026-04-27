import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { StoreCmsArticleCategoriesSchema } from "./article-categories/route"
import { StoreCmsArticleSchema } from "./articles/[slug]/route"
import { StoreCmsHeroCarouselsSchema } from "./hero-carousels/route"
import { StoreCmsPageCategoriesSchema } from "./page-categories/route"
import { StoreCmsPageSchema } from "./pages/[slug]/route"

/** Middleware definitions for store CMS routes (query validation). */
export const storeCmsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/cms/pages/:slug",
    middlewares: [
      validateAndTransformQuery(StoreCmsPageSchema, { isList: false }),
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
      validateAndTransformQuery(StoreCmsArticleCategoriesSchema, { isList: true }),
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

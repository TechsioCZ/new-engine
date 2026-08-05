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
    matcher: "/store/cms/pages/:slug",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(StoreCmsPageSchema, { isList: false }),
    ],
  },
  {
    matcher: "/store/cms/articles/:slug",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(StoreCmsArticleSchema, { isList: false }),
    ],
  },
  {
    matcher: "/store/cms/article-categories",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(StoreCmsArticleCategoriesSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/store/cms/page-categories",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(StoreCmsPageCategoriesSchema, { isList: true }),
    ],
  },
  {
    matcher: "/store/cms/hero-carousels",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(StoreCmsHeroCarouselsSchema, { isList: true }),
    ],
  },
]

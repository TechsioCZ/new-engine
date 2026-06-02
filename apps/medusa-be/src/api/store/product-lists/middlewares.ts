import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import { authenticate, type MiddlewareRoute } from "@medusajs/framework/http"
import {
  StoreCreateCustomProductListSchema,
  StoreCreateFavoriteProductListItemSchema,
  StoreCreateFavoriteProductListSchema,
  StoreCreateProductListItemSchema,
  StoreGetProductListsSchema,
  StoreIncrementProductListItemSchema,
} from "./validators"

const customerAuth = authenticate("customer", ["session", "bearer"])

export const storeProductListsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/product-lists",
    middlewares: [
      customerAuth,
      validateAndTransformQuery(StoreGetProductListsSchema, {
        isList: true,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/product-lists/:id",
    middlewares: [customerAuth],
  },
  {
    methods: ["POST"],
    matcher: "/store/product-lists/favorites",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreCreateFavoriteProductListSchema),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/store/product-lists/favorites/items",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreCreateFavoriteProductListItemSchema),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/store/product-lists/custom",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreCreateCustomProductListSchema),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/store/product-lists/:id/items",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreCreateProductListItemSchema),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/store/product-lists/items/:id/increment",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreIncrementProductListItemSchema),
    ],
  },
]

import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import { authenticate } from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import {
  StoreChangeProductListItemQuantitySchema,
  StoreCreateCustomProductListSchema,
  StoreCreateFavoriteProductListItemSchema,
  StoreCreateFavoriteProductListSchema,
  StoreCreateProductListCartSchema,
  StoreCreateProductListItemSchema,
  StoreGetProductListsSchema,
  StoreIncrementProductListItemQuantitySchema,
  StoreUpdateProductListItemSchema,
  StoreUpdateProductListSchema,
} from "./validators"

const customerAuth = authenticate("customer", ["session", "bearer"])
const optionalCustomerAuth = authenticate("customer", ["session", "bearer"], {
  allowUnauthenticated: true,
})

export const storeProductListsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/product-lists",
    methods: ["GET"],
    middlewares: [
      customerAuth,
      validateAndTransformQuery(StoreGetProductListsSchema, {
        isList: true,
      }),
    ],
  },
  {
    matcher: "/store/product-lists/:id",
    methods: ["GET"],
    middlewares: [optionalCustomerAuth],
  },
  {
    matcher: "/store/product-lists/:id",
    methods: ["POST"],
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreUpdateProductListSchema),
    ],
  },
  {
    matcher: "/store/product-lists/:id",
    methods: ["DELETE"],
    middlewares: [customerAuth],
  },
  {
    matcher: "/store/product-lists/favorites",
    methods: ["POST"],
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreCreateFavoriteProductListSchema),
    ],
  },
  {
    matcher: "/store/product-lists/favorites/items",
    methods: ["POST"],
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreCreateFavoriteProductListItemSchema),
    ],
  },
  {
    matcher: "/store/product-lists/custom",
    methods: ["POST"],
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreCreateCustomProductListSchema),
    ],
  },
  {
    matcher: "/store/product-lists/:id/cart",
    methods: ["POST"],
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreCreateProductListCartSchema),
    ],
  },
  {
    matcher: "/store/product-lists/:id/items",
    methods: ["POST"],
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreCreateProductListItemSchema),
    ],
  },
  {
    matcher: "/store/product-lists/:id/items/:item_id",
    methods: ["DELETE"],
    middlewares: [customerAuth],
  },
  {
    matcher: "/store/product-lists/items/:id",
    methods: ["POST"],
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreUpdateProductListItemSchema),
    ],
  },
  {
    matcher: "/store/product-lists/items/:id",
    methods: ["DELETE"],
    middlewares: [customerAuth],
  },
  {
    matcher: "/store/product-lists/items/:id/change-quantity",
    methods: ["POST"],
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreChangeProductListItemQuantitySchema),
    ],
  },
  {
    matcher: "/store/product-lists/items/:id/increment",
    methods: ["POST"],
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreIncrementProductListItemQuantitySchema),
    ],
  },
]

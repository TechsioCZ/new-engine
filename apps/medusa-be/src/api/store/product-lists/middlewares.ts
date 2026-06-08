import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import { authenticate, type MiddlewareRoute } from "@medusajs/framework/http"
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
    middlewares: [optionalCustomerAuth],
  },
  {
    methods: ["POST"],
    matcher: "/store/product-lists/:id",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreUpdateProductListSchema),
    ],
  },
  {
    methods: ["DELETE"],
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
    matcher: "/store/product-lists/:id/cart",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreCreateProductListCartSchema),
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
    methods: ["DELETE"],
    matcher: "/store/product-lists/:id/items/:item_id",
    middlewares: [customerAuth],
  },
  {
    methods: ["POST"],
    matcher: "/store/product-lists/items/:id",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreUpdateProductListItemSchema),
    ],
  },
  {
    methods: ["DELETE"],
    matcher: "/store/product-lists/items/:id",
    middlewares: [customerAuth],
  },
  {
    methods: ["POST"],
    matcher: "/store/product-lists/items/:id/change-quantity",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreChangeProductListItemQuantitySchema),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/store/product-lists/items/:id/increment",
    middlewares: [
      customerAuth,
      validateAndTransformBody(StoreIncrementProductListItemQuantitySchema),
    ],
  },
]

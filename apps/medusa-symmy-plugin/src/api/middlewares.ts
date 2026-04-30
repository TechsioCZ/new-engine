import { defineMiddlewares } from "@medusajs/medusa"
import { symmyProductsBatchRoutes } from "./api/symmy/v1/products/batch/middlewares"

export default defineMiddlewares({
  routes: [...symmyProductsBatchRoutes],
})

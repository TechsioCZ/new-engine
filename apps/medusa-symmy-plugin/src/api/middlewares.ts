import { defineMiddlewares } from "@medusajs/medusa"
import { adminProductsBatchRoutes } from "./admin/symmy/products/batch/middlewares"

export default defineMiddlewares({
  routes: [...adminProductsBatchRoutes],
})

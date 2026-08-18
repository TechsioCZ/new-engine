import { MedusaService } from "@medusajs/framework/utils"
import ProductContent from "./models/product-content"

class ProductContentModuleService extends MedusaService({
  ProductContent,
}) {}

export default ProductContentModuleService

import { MedusaService } from "@medusajs/framework/utils"
import Review from "./models/review"

class ProductReviewModuleService extends MedusaService({
  Review,
}) {}

export default ProductReviewModuleService

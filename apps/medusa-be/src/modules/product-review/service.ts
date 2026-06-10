import { MedusaService } from "@medusajs/framework/utils"
import Review from "./models/review"
import ReviewToken from "./models/review-token"

class ProductReviewModuleService extends MedusaService({
  Review,
  ReviewToken,
}) {}

export default ProductReviewModuleService

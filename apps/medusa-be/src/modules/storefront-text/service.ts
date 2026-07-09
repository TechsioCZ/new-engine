import { MedusaService } from "@medusajs/framework/utils"
import StorefrontText from "./models/storefront-text"

class StorefrontTextModuleService extends MedusaService({
  StorefrontText,
}) {}

export default StorefrontTextModuleService

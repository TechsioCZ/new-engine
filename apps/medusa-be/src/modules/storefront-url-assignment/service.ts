import { MedusaService } from "@medusajs/framework/utils"
import StorefrontUrlAssignment from "./models/storefront-url-assignment"

class StorefrontUrlAssignmentModuleService extends MedusaService({
  StorefrontUrlAssignment,
}) {}

export default StorefrontUrlAssignmentModuleService

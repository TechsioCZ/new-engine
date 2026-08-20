import { MedusaService } from "@medusajs/framework/utils"
import OrderConfirmationAccess from "./models/order-confirmation-access"

class OrderConfirmationModuleService extends MedusaService({
  OrderConfirmationAccess,
}) {}

export default OrderConfirmationModuleService

import { MedusaService } from "@medusajs/framework/utils"
import PaymentReturnState from "./models/payment-return-state"

class PaymentReturnStateModuleService extends MedusaService({
  PaymentReturnState,
}) {}

export default PaymentReturnStateModuleService

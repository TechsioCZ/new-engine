import { MedusaService } from "@medusajs/framework/utils"
import EmailLog from "./models/email-log"

class EmailLogModuleService extends MedusaService({
  EmailLog,
}) {}

export default EmailLogModuleService

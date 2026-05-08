import { MedusaService } from "@medusajs/framework/utils"
import EmailLog from "./models/email-log"
import EmailWebhookEvent from "./models/email-webhook-event"

class EmailLogModuleService extends MedusaService({
  EmailLog,
  EmailWebhookEvent,
}) {}

export default EmailLogModuleService

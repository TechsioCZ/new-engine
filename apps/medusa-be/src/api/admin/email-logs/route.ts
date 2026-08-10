import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { EMAIL_LOG_MODULE } from "../../../modules/email-log"
import type EmailLogModuleService from "../../../modules/email-log/service"

interface EmailLogDTO {
  id: string
  email_id: string
  customer_id: string | null
  order_id: string | null
  type: string
  subject: string
  sent_to: string
  sent_at: Date
  checked_at: Date | null
  created_at: Date
  updated_at: Date
}

type EmailLogService = EmailLogModuleService & {
  listAndCountEmailLogs: (
    filters?: Parameters<EmailLogModuleService["listAndCountEmailLogs"]>[0],
    config?: Parameters<EmailLogModuleService["listAndCountEmailLogs"]>[1],
  ) => Promise<[EmailLogDTO[], number]>
}

const toEmailLogResponse = (emailLog: EmailLogDTO) => ({
  checked_at: emailLog.checked_at,
  created_at: emailLog.created_at,
  customer_id: emailLog.customer_id,
  email_id: emailLog.email_id,
  id: emailLog.id,
  order_id: emailLog.order_id,
  sent_at: emailLog.sent_at,
  sent_to: emailLog.sent_to,
  subject: emailLog.subject,
  type: emailLog.type,
  updated_at: emailLog.updated_at,
})

const getRoute = async (req: MedusaRequest, res: MedusaResponse) => {
  const emailLogService = req.scope.resolve<EmailLogService>(EMAIL_LOG_MODULE)

  const limit = Number(req.query["limit"] ?? 20)
  const offset = Number(req.query["offset"] ?? 0)

  const [emailLogs, count] = await emailLogService.listAndCountEmailLogs(
    {},
    {
      order: { sent_at: "DESC" },
      skip: Number.isFinite(offset) ? offset : 0,
      take: Number.isFinite(limit) ? limit : 20,
    },
  )

  res.json({
    count,
    email_logs: emailLogs.map(toEmailLogResponse),
    limit,
    offset,
  })
}

export { getRoute as GET }

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EMAIL_LOG_MODULE } from "../../../modules/email-log"
import type EmailLogModuleService from "../../../modules/email-log/service"

type EmailLogDTO = {
  id: string
  email_id: string
  customer_id: string | null
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
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<[EmailLogDTO[], number]>
}

const toEmailLogResponse = (emailLog: EmailLogDTO) => ({
  id: emailLog.id,
  email_id: emailLog.email_id,
  customer_id: emailLog.customer_id,
  type: emailLog.type,
  subject: emailLog.subject,
  sent_to: emailLog.sent_to,
  sent_at: emailLog.sent_at,
  checked_at: emailLog.checked_at,
  created_at: emailLog.created_at,
  updated_at: emailLog.updated_at,
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const emailLogService = req.scope.resolve<EmailLogService>(EMAIL_LOG_MODULE)

  const limit = Number(req.query.limit ?? 20)
  const offset = Number(req.query.offset ?? 0)

  const [emailLogs, count] = await emailLogService.listAndCountEmailLogs(
    {},
    {
      order: { sent_at: "DESC" },
      skip: Number.isFinite(offset) ? offset : 0,
      take: Number.isFinite(limit) ? limit : 20,
    }
  )

  res.json({
    email_logs: emailLogs.map(toEmailLogResponse),
    count,
    limit,
    offset,
  })
}

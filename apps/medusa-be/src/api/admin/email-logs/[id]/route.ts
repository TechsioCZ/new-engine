import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { EMAIL_LOG_MODULE } from "../../../../modules/email-log"
import type EmailLogModuleService from "../../../../modules/email-log/service"

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
  retrieveEmailLog: (id: string) => Promise<EmailLogDTO>
}

type ResendErrorResponse = {
  message?: string
}

const RESEND_EMAILS_API = "https://api.resend.com/emails"

const isResendErrorResponse = (obj: unknown): obj is ResendErrorResponse =>
  obj !== null &&
  typeof obj === "object" &&
  "message" in obj &&
  typeof obj.message === "string"

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

async function retrieveResendEmail(emailId: string) {
  const apiKey =
    process.env.RESEND_API_KEY ?? process.env.DC_N1_MEDUSA_RESEND_API_KEY

  if (!apiKey) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "RESEND_API_KEY is not configured"
    )
  }

  const response = await fetch(`${RESEND_EMAILS_API}/${emailId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })

  const parsed = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    const errorMessage = isResendErrorResponse(parsed)
      ? parsed.message
      : response.statusText

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to retrieve Resend email ${emailId}: ${errorMessage}`
    )
  }

  return parsed
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const emailLogService = req.scope.resolve<EmailLogService>(EMAIL_LOG_MODULE)
  const { id } = req.params

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Email log id is required"
    )
  }

  const emailLog = await emailLogService.retrieveEmailLog(id)
  const resendEmail = await retrieveResendEmail(emailLog.email_id)

  res.json({
    email_log: toEmailLogResponse(emailLog),
    resend_email: resendEmail,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import {
  getCredentialString,
  INTEGRATION_CONFIG_NAMES,
  requireCredentialObject,
  requireEnabledIntegrationConfig,
} from "../../../../modules/api-store/integration-config"
import { EMAIL_LOG_MODULE } from "../../../../modules/email-log"
import type EmailLogModuleService from "../../../../modules/email-log/service"

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
  retrieveEmailLog: (id: string) => Promise<EmailLogDTO>
}

interface ResendErrorResponse {
  message?: string
}

const RESEND_EMAILS_API = "https://api.resend.com/emails"
const RESEND_EMAILS_API_TIMEOUT_MS = 30_000

const isResendErrorResponse = (obj: unknown): obj is ResendErrorResponse =>
  obj !== null &&
  typeof obj === "object" &&
  "message" in obj &&
  typeof obj.message === "string"

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

const retrieveResendEmail = async (
  emailId: string,
  container: MedusaContainer,
) => {
  const config = await requireEnabledIntegrationConfig(
    container,
    INTEGRATION_CONFIG_NAMES.RESEND,
  )
  const credentials = requireCredentialObject(config)
  const apiKey =
    config.api_key ?? getCredentialString(credentials, "apiKey", "api_key")

  if (apiKey === undefined || apiKey.length === 0) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Resend API key is not configured in Settings → API Store",
    )
  }

  const url = `${RESEND_EMAILS_API}/${emailId}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, RESEND_EMAILS_API_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend email retrieval timed out after ${RESEND_EMAILS_API_TIMEOUT_MS}ms: ${emailId}`,
      )
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  let parsed: unknown = null
  try {
    parsed = await response.json()
  } catch {
    parsed = null
  }

  if (!response.ok) {
    const errorMessage = isResendErrorResponse(parsed)
      ? parsed.message
      : response.statusText

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to retrieve Resend email ${emailId}: ${errorMessage}`,
    )
  }

  return parsed
}

const getEmailLog = async (req: MedusaRequest, res: MedusaResponse) => {
  const emailLogService = req.scope.resolve<EmailLogService>(EMAIL_LOG_MODULE)
  const { id } = req.params

  if (id === undefined || id.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Email log id is required",
    )
  }

  const emailLog = await emailLogService.retrieveEmailLog(id)
  const resendEmail = await retrieveResendEmail(emailLog.email_id, req.scope)

  res.json({
    email_log: toEmailLogResponse(emailLog),
    resend_email: resendEmail,
  })
}

export { getEmailLog as GET }

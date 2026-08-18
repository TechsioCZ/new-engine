import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { EMAIL_LOG_MODULE } from "../../../modules/email-log"
import type EmailLogModuleService from "../../../modules/email-log/service"
import type {
  ProcessResendWebhookEventInput,
  ProcessResendWebhookEventResult,
  ResendWebhookEvent,
} from "../types"

type EmailLogDTO = {
  id: string
  checked_at: Date | null
}

type EmailLogService = EmailLogModuleService & {
  createEmailWebhookEvents: (
    data: {
      email_id: string
      payload: ResendWebhookEvent
      processed_at: Date | null
      received_at: Date
      type: string
    }[]
  ) => Promise<unknown[]>
  listEmailLogs: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<EmailLogDTO[]>
  updateEmailLogs: (
    data: { id: string; checked_at: Date }[]
  ) => Promise<EmailLogDTO[]>
}

export const processResendWebhookEventStep = createStep(
  "process-resend-webhook-event",
  async (
    input: ProcessResendWebhookEventInput,
    { container }
  ): Promise<StepResponse<ProcessResendWebhookEventResult>> => {
    const emailLogService = container.resolve<EmailLogService>(EMAIL_LOG_MODULE)
    const emailLogs = await emailLogService.listEmailLogs(
      { email_id: input.email_id },
      { select: ["id", "checked_at"] }
    )
    const uncheckedLogs = emailLogs.filter((emailLog) => !emailLog.checked_at)

    if (uncheckedLogs.length) {
      const checkedAt = new Date()
      await emailLogService.updateEmailLogs(
        uncheckedLogs.map((emailLog) => ({
          id: emailLog.id,
          checked_at: checkedAt,
        }))
      )
    } else if (!emailLogs.length) {
      await emailLogService.createEmailWebhookEvents([
        {
          email_id: input.email_id,
          payload: input.event,
          processed_at: null,
          received_at: new Date(),
          type: input.event.type,
        },
      ])
    }

    return new StepResponse({
      checked_count: uncheckedLogs.length,
      found_count: emailLogs.length,
    })
  }
)

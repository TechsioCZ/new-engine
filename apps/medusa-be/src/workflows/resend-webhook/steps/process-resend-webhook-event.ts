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
  listEmailLogs: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<EmailLogDTO[]>
  updateEmailLogs: (
    data: { id: string; checked_at: Date }[]
  ) => Promise<EmailLogDTO[]>
  recordEmailWebhookEventOnce: (data: {
    email_id: string
    event_id: string
    payload: ResendWebhookEvent
    received_at: Date
    type: string
  }) => Promise<void>
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
      await emailLogService.recordEmailWebhookEventOnce({
        email_id: input.email_id,
        event_id: input.event_id,
        payload: input.event,
        received_at: new Date(),
        type: input.event.type,
      })
    }

    return new StepResponse({
      checked_count: uncheckedLogs.length,
      found_count: emailLogs.length,
    })
  }
)

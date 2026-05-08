import type {
  CreateNotificationDTO,
  ICustomerModuleService,
  INotificationModuleService,
  NotificationDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { EMAIL_LOG_MODULE } from "../../modules/email-log"
import type EmailLogModuleService from "../../modules/email-log/service"
import { getResendTemplateSubject } from "../../modules/resend/templates"
import { CHECKED_RESEND_EVENT_TYPES } from "../../utils/resend-webhook-events"

type EmailLogDTO = {
  id: string
  checked_at: Date | null
  email_id: string
}

type EmailWebhookEventDTO = {
  id: string
  processed_at: Date | null
  received_at: Date
  type: string
}

type EmailLogService = EmailLogModuleService & {
  createEmailLogs: (
    data: {
      checked_at: Date | null
      customer_id: string | null
      email_id: string
      sent_at: Date
      sent_to: string
      subject: string
      type: string
    }[]
  ) => Promise<EmailLogDTO[]>
  listEmailWebhookEvents: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<EmailWebhookEventDTO[]>
  updateEmailLogs: (
    data: { id: string; checked_at: Date }[]
  ) => Promise<EmailLogDTO[]>
  updateEmailWebhookEvents: (
    data: { id: string; processed_at: Date }[]
  ) => Promise<EmailWebhookEventDTO[]>
}

const CUSTOMER_LOOKUP_CHUNK_SIZE = 25

function getStringField(
  data: Record<string, unknown> | null | undefined,
  field: string
) {
  const raw: unknown = data?.[field]

  return typeof raw === "string" && raw.trim() ? raw : undefined
}

function getNotificationSubject(input: CreateNotificationDTO) {
  return (
    input.content?.subject ||
    getStringField(input.provider_data, "subject") ||
    getStringField(input.data, "subject") ||
    (input.template ? getResendTemplateSubject(input.template) : undefined) ||
    input.template ||
    "Email"
  )
}

function getCustomerId(input: CreateNotificationDTO) {
  return (
    input.receiver_id ||
    getStringField(input.data, "customer_id") ||
    getStringField(input.provider_data, "customer_id") ||
    null
  )
}

function getEmailType(input: CreateNotificationDTO) {
  return input.template || input.trigger_type || input.resource_type || "email"
}

function getNotificationList(
  notification: NotificationDTO | NotificationDTO[]
) {
  return Array.isArray(notification) ? notification : [notification]
}

async function getCustomerIdByEmail(
  customerModuleService: ICustomerModuleService,
  email: string
) {
  const customer = (
    await customerModuleService.listCustomers(
      { email },
      { select: ["id"], take: 1 }
    )
  ).shift()

  return customer?.id ?? null
}

function chunkItems<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

async function getCustomerIdsByEmail(
  customerModuleService: ICustomerModuleService,
  emails: string[]
) {
  const customerIdsByEmail = new Map<string, string | null>()

  for (const chunk of chunkItems(emails, CUSTOMER_LOOKUP_CHUNK_SIZE)) {
    const results = await Promise.all(
      chunk.map(async (email) => ({
        customerId: await getCustomerIdByEmail(customerModuleService, email),
        email,
      }))
    )

    for (const result of results) {
      customerIdsByEmail.set(result.email, result.customerId)
    }
  }

  return customerIdsByEmail
}

async function replayPendingCheckedEvents({
  emailLogModuleService,
  emailLogs,
}: {
  emailLogModuleService: EmailLogService
  emailLogs: EmailLogDTO[]
}) {
  const processedAt = new Date()

  for (const emailLog of emailLogs) {
    const pendingEvents = await emailLogModuleService.listEmailWebhookEvents(
      {
        email_id: emailLog.email_id,
      },
      {
        order: { received_at: "ASC" },
        select: ["id", "email_id", "processed_at", "received_at", "type"],
      }
    )
    const checkedEvents = pendingEvents.filter(
      (event) =>
        !event.processed_at && CHECKED_RESEND_EVENT_TYPES.has(event.type)
    )

    if (!checkedEvents.length) {
      continue
    }

    const firstEvent = checkedEvents[0]
    if (!firstEvent) {
      continue
    }

    if (!emailLog.checked_at) {
      await emailLogModuleService.updateEmailLogs([
        {
          checked_at: firstEvent.received_at,
          id: emailLog.id,
        },
      ])
    }

    await emailLogModuleService.updateEmailWebhookEvents(
      checkedEvents.map((event) => ({
        id: event.id,
        processed_at: processedAt,
      }))
    )
  }
}

export const sendNotificationStep = createStep(
  "send-notification",
  async (data: CreateNotificationDTO[], { container }) => {
    const notificationModuleService: INotificationModuleService =
      container.resolve(Modules.NOTIFICATION)
    const notification =
      await notificationModuleService.createNotifications(data)
    const customerModuleService: ICustomerModuleService = container.resolve(
      Modules.CUSTOMER
    )

    const notificationList = getNotificationList(notification)
    const emailLogInputs = data.flatMap((input, index) => {
      if (input.channel !== "email") {
        return []
      }

      const createdNotification = notificationList[index]

      if (!createdNotification) {
        return []
      }

      const explicitCustomerId =
        createdNotification.receiver_id ?? getCustomerId(input)

      return [
        {
          createdNotification,
          explicitCustomerId,
          input,
        },
      ]
    })
    const customerLookupEmails = Array.from(
      new Set(
        emailLogInputs
          .filter((item) => !item.explicitCustomerId)
          .map((item) => item.input.to)
      )
    )
    const customerIdsByEmail = await getCustomerIdsByEmail(
      customerModuleService,
      customerLookupEmails
    )
    const emailLogs = emailLogInputs.map(
      ({ createdNotification, explicitCustomerId, input }) => ({
        email_id: createdNotification.external_id ?? createdNotification.id,
        customer_id:
          explicitCustomerId ?? customerIdsByEmail.get(input.to) ?? null,
        type: createdNotification.template ?? getEmailType(input),
        subject: getNotificationSubject(input),
        sent_to: createdNotification.to ?? input.to,
        sent_at: new Date(),
        checked_at: null,
      })
    )

    if (emailLogs.length) {
      const emailLogModuleService =
        container.resolve<EmailLogService>(EMAIL_LOG_MODULE)

      const createdEmailLogs =
        await emailLogModuleService.createEmailLogs(emailLogs)
      await replayPendingCheckedEvents({
        emailLogModuleService,
        emailLogs: createdEmailLogs,
      })
    }

    return new StepResponse(notification)
  }
)

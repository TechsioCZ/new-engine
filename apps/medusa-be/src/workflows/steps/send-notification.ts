import type {
  CreateNotificationDTO,
  ICustomerModuleService,
  INotificationModuleService,
  NotificationDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { chunk } from "@techsio/std/array"

import { EMAIL_LOG_MODULE } from "../../modules/email-log"
import type EmailLogModuleService from "../../modules/email-log/service"
import { getResendTemplateSubject } from "../../modules/resend/templates"
import { CHECKED_RESEND_EVENT_TYPES } from "../../utils/resend-webhook-events"

interface EmailLogDTO {
  id: string
  checked_at: Date | null
  email_id: string
}

interface EmailWebhookEventDTO {
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
      order_id: string | null
      sent_at: Date
      sent_to: string
      subject: string
      type: string
    }[],
  ) => Promise<EmailLogDTO[]>
  listEmailWebhookEvents: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<EmailWebhookEventDTO[]>
  updateEmailLogs: (
    data: { id: string; checked_at: Date }[],
  ) => Promise<EmailLogDTO[]>
  updateEmailWebhookEvents: (
    data: { id: string; processed_at: Date }[],
  ) => Promise<EmailWebhookEventDTO[]>
}

const CUSTOMER_LOOKUP_CHUNK_SIZE = 25

/** Matches the truthiness semantics the notification payload fields rely on. */
const isPresentString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0

const firstPresentString = (values: readonly unknown[]) =>
  values.find(isPresentString)

const getStringField = (
  data: Record<string, unknown> | null | undefined,
  field: string,
) => {
  const raw: unknown = data?.[field]

  return typeof raw === "string" && raw.trim() ? raw : undefined
}

const getNotificationSubject = (input: CreateNotificationDTO) => {
  const templateSubject = isPresentString(input.template)
    ? getResendTemplateSubject(input.template)
    : undefined

  return (
    firstPresentString([
      input.content?.subject,
      getStringField(input.provider_data, "subject"),
      getStringField(input.data, "subject"),
      templateSubject,
      input.template,
    ]) ?? "Email"
  )
}

const getCustomerId = (input: CreateNotificationDTO) =>
  firstPresentString([
    input.receiver_id,
    getStringField(input.data, "customer_id"),
    getStringField(input.provider_data, "customer_id"),
  ]) ?? null

const getOrderId = (input: CreateNotificationDTO) =>
  firstPresentString([
    input.resource_type === "order" ? input.resource_id : undefined,
    getStringField(input.data, "order_id"),
    getStringField(input.provider_data, "order_id"),
  ]) ?? null

const getEmailType = (input: CreateNotificationDTO) =>
  firstPresentString([
    input.template,
    input.trigger_type,
    input.resource_type,
  ]) ?? "email"

const getNotificationList = (
  notification: NotificationDTO | NotificationDTO[],
) => (Array.isArray(notification) ? notification : [notification])

const getCustomerIdByEmail = async (
  customerModuleService: ICustomerModuleService,
  email: string,
) => {
  const [customer] = await customerModuleService.listCustomers(
    { email },
    { select: ["id"], take: 1 },
  )

  return customer?.id ?? null
}

/**
 * Walks the chunks recursively so lookups stay bounded to one chunk of
 * concurrent customer queries at a time.
 */
const collectCustomerIdsByEmail = async (
  customerModuleService: ICustomerModuleService,
  emailChunks: readonly string[][],
  customerIdsByEmail: Map<string, string | null>,
): Promise<Map<string, string | null>> => {
  const [emailChunk, ...remainingChunks] = emailChunks

  if (!emailChunk) {
    return customerIdsByEmail
  }

  const results = await Promise.all(
    emailChunk.map(async (email) => ({
      customerId: await getCustomerIdByEmail(customerModuleService, email),
      email,
    })),
  )

  for (const result of results) {
    customerIdsByEmail.set(result.email, result.customerId)
  }

  return await collectCustomerIdsByEmail(
    customerModuleService,
    remainingChunks,
    customerIdsByEmail,
  )
}

const getCustomerIdsByEmail = async (
  customerModuleService: ICustomerModuleService,
  emails: readonly string[],
) =>
  await collectCustomerIdsByEmail(
    customerModuleService,
    chunk(emails, CUSTOMER_LOOKUP_CHUNK_SIZE),
    new Map<string, string | null>(),
  )

const listCheckedEvents = async (
  emailLogModuleService: EmailLogService,
  emailLog: EmailLogDTO,
) => {
  const pendingEvents = await emailLogModuleService.listEmailWebhookEvents(
    {
      email_id: emailLog.email_id,
    },
    {
      order: { received_at: "ASC" },
      select: ["id", "email_id", "processed_at", "received_at", "type"],
    },
  )

  return pendingEvents.filter(
    (event) =>
      !event.processed_at && CHECKED_RESEND_EVENT_TYPES.has(event.type),
  )
}

const replayEmailLogEvents = async ({
  emailLog,
  emailLogModuleService,
  processedAt,
}: {
  emailLog: EmailLogDTO
  emailLogModuleService: EmailLogService
  processedAt: Date
}) => {
  const checkedEvents = await listCheckedEvents(emailLogModuleService, emailLog)
  const [firstEvent] = checkedEvents

  if (!firstEvent) {
    return
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
    })),
  )
}

/**
 * Replays one email log at a time so webhook catch-up never fans out into an
 * unbounded number of concurrent module calls.
 */
const replayPendingCheckedEvents = async ({
  emailLogModuleService,
  emailLogs,
  processedAt,
}: {
  emailLogModuleService: EmailLogService
  emailLogs: readonly EmailLogDTO[]
  processedAt: Date
}): Promise<void> => {
  const [emailLog, ...remainingEmailLogs] = emailLogs

  if (!emailLog) {
    return
  }

  await replayEmailLogEvents({
    emailLog,
    emailLogModuleService,
    processedAt,
  })

  await replayPendingCheckedEvents({
    emailLogModuleService,
    emailLogs: remainingEmailLogs,
    processedAt,
  })
}

export const sendNotificationStep = createStep(
  "send-notification",
  async (data: CreateNotificationDTO[], { container }) => {
    const notificationModuleService: INotificationModuleService =
      container.resolve(Modules.NOTIFICATION)
    const notification =
      await notificationModuleService.createNotifications(data)
    const customerModuleService: ICustomerModuleService = container.resolve(
      Modules.CUSTOMER,
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
    const customerLookupEmails = new Set<string>()

    for (const item of emailLogInputs) {
      if (!isPresentString(item.explicitCustomerId)) {
        customerLookupEmails.add(item.input.to)
      }
    }

    const customerIdsByEmail = await getCustomerIdsByEmail(
      customerModuleService,
      [...customerLookupEmails],
    )
    const emailLogs = emailLogInputs.map(
      ({ createdNotification, explicitCustomerId, input }) => ({
        checked_at: null,
        customer_id:
          explicitCustomerId ?? customerIdsByEmail.get(input.to) ?? null,
        email_id: createdNotification.external_id ?? createdNotification.id,
        order_id: getOrderId(input),
        sent_at: new Date(),
        sent_to: createdNotification.to ?? input.to,
        subject: getNotificationSubject(input),
        type: createdNotification.template ?? getEmailType(input),
      }),
    )

    if (emailLogs.length) {
      const emailLogModuleService =
        container.resolve<EmailLogService>(EMAIL_LOG_MODULE)

      const createdEmailLogs =
        await emailLogModuleService.createEmailLogs(emailLogs)
      await replayPendingCheckedEvents({
        emailLogModuleService,
        emailLogs: createdEmailLogs,
        processedAt: new Date(),
      })
    }

    return new StepResponse(notification)
  },
)

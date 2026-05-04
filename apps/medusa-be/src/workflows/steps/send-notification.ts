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

const templateSubjects: Record<string, string> = {
  "user-forgotpwd": "Forgot Password",
}

function getStringField(
  data: Record<string, unknown> | null | undefined,
  field: string
) {
  const value = data?.[field]

  return typeof value === "string" && value.trim() ? value : undefined
}

function getNotificationSubject(input: CreateNotificationDTO) {
  return (
    input.content?.subject ||
    getStringField(input.provider_data, "subject") ||
    getStringField(input.data, "subject") ||
    (input.template ? templateSubjects[input.template] : undefined) ||
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

  return customer?.id || null
}

export const sendNotificationStep = createStep(
  "send-notification",
  async (data: CreateNotificationDTO[], { container }) => {
    const notificationModuleService = container.resolve(
      Modules.NOTIFICATION
    ) as INotificationModuleService
    const notification =
      await notificationModuleService.createNotifications(data)
    const customerModuleService = container.resolve(
      Modules.CUSTOMER
    ) as ICustomerModuleService

    const emailLogs = (
      await Promise.all(
        data.map(async (input, index) => {
          if (input.channel !== "email") {
            return null
          }

          const createdNotification = getNotificationList(notification)[index]

          if (!createdNotification) {
            return null
          }

          const explicitCustomerId =
            createdNotification.receiver_id || getCustomerId(input)

          return {
            email_id: createdNotification.external_id || createdNotification.id,
            customer_id:
              explicitCustomerId ||
              (await getCustomerIdByEmail(customerModuleService, input.to)),
            type: createdNotification.template || getEmailType(input),
            subject: getNotificationSubject(input),
            sent_to: createdNotification.to || input.to,
            sent_at: new Date(),
            checked_at: null,
          }
        })
      )
    ).filter((emailLog) => emailLog !== null)

    if (emailLogs.length) {
      const emailLogModuleService =
        container.resolve<EmailLogModuleService>(EMAIL_LOG_MODULE)

      await emailLogModuleService.createEmailLogs(emailLogs)
    }

    return new StepResponse(notification)
  }
)

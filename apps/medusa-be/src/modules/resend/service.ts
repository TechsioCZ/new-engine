import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import { createElement, type ReactNode } from "react"
import { type CreateEmailOptions, Resend } from "resend"
import ForgotPasswordEmail from "./emails/forgot-password"
import OrderPaymentReminderEmail from "./emails/order-payment-reminder"
import OrderReceiptEmail from "./emails/order-receipt"
import {
  type ResendEmailTemplate,
  resendEmailTemplates as templates,
} from "./templates"

type ResendOptions = {
  api_key: string
  from: string
  html_templates?: Record<
    string,
    {
      subject?: string
      content: string
    }
  >
}

type InjectedDependencies = {
  logger: Logger
}

type ForgotPasswordTemplateData = {
  reset_url: string
  store_name?: string
}

type OrderPaymentReminderTemplateData = {
  order_display_id: string
  payment_url: string
  store_name?: string
  total?: string
}

type OrderReceiptTemplateData = {
  customer_name?: string
  order_display_id: string
  store_name?: string
  total?: string
}

type NotificationAttachment = {
  content?: Buffer | string
  content_type?: string
  contentType?: string
  filename?: string | false
  path?: string
}

type Template = ResendEmailTemplate

const templateComponents: {
  [templates.FORGOT_PASSWORD]: (props: ForgotPasswordTemplateData) => ReactNode
  [templates.ORDER_PLACED]: (props: OrderReceiptTemplateData) => ReactNode
  [templates.ORDER_PAYMENT_REMINDER]: (
    props: OrderPaymentReminderTemplateData
  ) => ReactNode
} = {
  [templates.FORGOT_PASSWORD]: (props) =>
    createElement(ForgotPasswordEmail, props),
  [templates.ORDER_PLACED]: (props) => createElement(OrderReceiptEmail, props),
  [templates.ORDER_PAYMENT_REMINDER]: (props) =>
    createElement(OrderPaymentReminderEmail, props),
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static override identifier = "notification-resend"

  protected readonly resendClient: Resend
  protected readonly options: ResendOptions
  protected readonly logger: Logger

  constructor({ logger }: InjectedDependencies, options: ResendOptions) {
    super()

    this.resendClient = new Resend(options.api_key)
    this.options = options
    this.logger = logger
  }

  static override validateOptions(options: Record<string, unknown>) {
    if (!options.api_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `api_key` is required in the provider's options."
      )
    }

    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Option `from` is required in the provider's options."
      )
    }
  }

  protected getTemplate(template: Template) {
    if (this.options.html_templates?.[template]) {
      return this.options.html_templates[template].content
    }

    const allowedTemplates = Object.values(templates)

    if (!allowedTemplates.includes(template)) {
      return null
    }

    return templateComponents[template]
  }

  protected getTemplateSubject(template: Template) {
    if (this.options.html_templates?.[template]?.subject) {
      return this.options.html_templates[template].subject
    }

    switch (template) {
      case templates.FORGOT_PASSWORD:
        return "Forgot Password"
      case templates.ORDER_PLACED:
        return "Potvrzení objednávky"
      case templates.ORDER_PAYMENT_REMINDER:
        return "Zaplaťte prosím svou objednávku"
      default:
        return "New Email"
    }
  }

  protected renderTemplate(
    template: Template,
    data?: Record<string, unknown> | null
  ) {
    switch (template) {
      case templates.FORGOT_PASSWORD:
        return templateComponents[template](data as ForgotPasswordTemplateData)
      case templates.ORDER_PLACED:
        return templateComponents[template](data as OrderReceiptTemplateData)
      case templates.ORDER_PAYMENT_REMINDER:
        return templateComponents[template](
          data as OrderPaymentReminderTemplateData
        )
      default:
        return null
    }
  }

  protected getAttachments(notification: ProviderSendNotificationDTO) {
    const attachments = (notification as unknown as {
      attachments?: NotificationAttachment[]
    }).attachments

    if (!attachments?.length) {
      return undefined
    }

    return attachments.map((attachment) => ({
      content: attachment.content,
      contentType: attachment.contentType ?? attachment.content_type,
      filename: attachment.filename,
      path: attachment.path,
    }))
  }

  override async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const templateKey = notification.template as Template
    const template = this.getTemplate(templateKey)

    if (!template) {
      this.logger.error(
        `Couldn't find an email template for ${notification.template}. The valid options are ${Object.values(templates)}`
      )
      return {}
    }

    const commonOptions = {
      attachments: this.getAttachments(notification),
      from: this.options.from,
      to: [notification.to],
      subject: this.getTemplateSubject(templateKey),
    }

    let emailOptions: CreateEmailOptions

    if (typeof template === "string") {
      emailOptions = {
        ...commonOptions,
        html: template,
      }
    } else {
      emailOptions = {
        ...commonOptions,
        react: this.renderTemplate(templateKey, notification.data),
      }
    }

    const { data, error } = await this.resendClient.emails.send(emailOptions)

    if (error || !data) {
      if (error) {
        this.logger.error("Failed to send email", error)
      } else {
        this.logger.error("Failed to send email: unknown error")
      }

      return {}
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService

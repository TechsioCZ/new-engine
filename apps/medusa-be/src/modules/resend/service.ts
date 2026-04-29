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
  reset_url?: string
  store_name?: string
}

const templates = {
  FORGOT_PASSWORD: "user-forgotpwd",
} as const

type Template = (typeof templates)[keyof typeof templates]

const templateComponents: {
  [templates.FORGOT_PASSWORD]: (props: ForgotPasswordTemplateData) => ReactNode
} = {
  [templates.FORGOT_PASSWORD]: (props) =>
    createElement(ForgotPasswordEmail, props),
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
      default:
        return "New Email"
    }
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
        react: template(notification.data as ForgotPasswordTemplateData),
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

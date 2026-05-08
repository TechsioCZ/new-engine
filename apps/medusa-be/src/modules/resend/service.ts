import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import { Resend } from "resend"
import {
  getResendTemplateDefinition,
  type ResendEmailTemplate,
  type ResendTemplateDefinition,
} from "./templates"

type ResendOptions = {
  api_key: string
  from: string
}

type InjectedDependencies = {
  logger: Logger
}

type NotificationAttachment = {
  content?: Buffer | string
  content_type?: string
  contentType?: string
  filename?: string | false
  path?: string
}

type Template = ResendEmailTemplate

type TemplateVariableValue = string | number

type ResendTemplateEmailOptions = {
  attachments?: {
    content?: Buffer | string
    contentType?: string
    filename?: string | false
    path?: string
  }[]
  from: string
  template: {
    id: string
    variables: Record<string, TemplateVariableValue>
  }
  to: string[]
}

type ResendApiEmailResponse = {
  id: string
}

type ResendApiErrorResponse = {
  message?: string
  name?: string
  statusCode?: number
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

  protected getAttachments(notification: ProviderSendNotificationDTO) {
    const attachments = (
      notification as unknown as {
        attachments?: NotificationAttachment[]
      }
    ).attachments

    if (!attachments?.length) {
      return
    }

    return attachments.map((attachment) => ({
      content: attachment.content,
      contentType: attachment.contentType ?? attachment.content_type,
      filename: attachment.filename,
      path: attachment.path,
    }))
  }

  protected getTemplateVariables(
    definition: ResendTemplateDefinition,
    data?: Record<string, unknown> | null
  ) {
    const variables: Record<string, TemplateVariableValue> = {}
    const missingVariables: string[] = []

    for (const variable of definition.requiredVariables) {
      const value = data?.[variable]

      if (typeof value === "string" || typeof value === "number") {
        variables[variable] = value
      } else {
        missingVariables.push(variable)
      }
    }

    for (const variable of definition.optionalVariables) {
      const value = data?.[variable]
      variables[variable] =
        typeof value === "string" || typeof value === "number" ? value : ""
    }

    return {
      missingVariables,
      variables,
    }
  }

  protected async sendTemplateEmail(emailOptions: ResendTemplateEmailOptions) {
    const baseUrl = process.env.RESEND_BASE_URL || "https://api.resend.com"
    const response = await fetch(`${baseUrl}/emails`, {
      body: JSON.stringify({
        attachments: emailOptions.attachments,
        from: emailOptions.from,
        template: emailOptions.template,
        to: emailOptions.to,
      }),
      headers: {
        Authorization: `Bearer ${this.options.api_key}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    })

    const payload = (await response.json()) as
      | ResendApiEmailResponse
      | ResendApiErrorResponse

    if (!response.ok) {
      return {
        data: null,
        error: payload as ResendApiErrorResponse,
      }
    }

    return {
      data: payload as ResendApiEmailResponse,
      error: null,
    }
  }

  override async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const templateKey = notification.template as Template
    const template = getResendTemplateDefinition(templateKey)

    if (!template) {
      this.logger.error(
        `Couldn't find a Resend email template for ${notification.template}.`
      )
      return {}
    }

    const { missingVariables, variables } = this.getTemplateVariables(
      template,
      notification.data
    )

    if (missingVariables.length) {
      this.logger.error(
        `Missing Resend email template variables for ${templateKey}: ${missingVariables.join(", ")}`
      )
      return {}
    }

    const emailOptions: ResendTemplateEmailOptions = {
      attachments: this.getAttachments(notification),
      from: this.options.from,
      template: {
        id: template.id,
        variables,
      },
      to: [notification.to],
    }

    const { data, error } = await this.sendTemplateEmail(emailOptions)

    if (error || !data) {
      if (error) {
        this.logger.error(
          `Failed to send email: ${error.message ?? "unknown Resend API error"}`
        )
      } else {
        this.logger.error("Failed to send email: unknown error")
      }

      return {}
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService

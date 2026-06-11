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
  request_timeout_ms?: number
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

type TemplateVariableValue =
  | boolean
  | null
  | number
  | string
  | TemplateVariableValue[]
  | { [key: string]: TemplateVariableValue }

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

const DEFAULT_RESEND_REQUEST_TIMEOUT_MS = 10_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isEmailResponse(value: unknown): value is ResendApiEmailResponse {
  return isRecord(value) && typeof value.id === "string"
}

function isTemplateVariableValue(
  value: unknown
): value is TemplateVariableValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true
  }

  if (Array.isArray(value)) {
    return value.every(isTemplateVariableValue)
  }

  if (isRecord(value) && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.values(value).every(isTemplateVariableValue)
  }

  return false
}

function toErrorResponse(value: unknown): ResendApiErrorResponse {
  if (!isRecord(value)) {
    return {}
  }

  const error: ResendApiErrorResponse = {}
  if (typeof value.message === "string") {
    error.message = value.message
  }
  if (typeof value.name === "string") {
    error.name = value.name
  }
  if (typeof value.statusCode === "number") {
    error.statusCode = value.statusCode
  }

  return error
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

      if (isTemplateVariableValue(value)) {
        variables[variable] = value
      } else {
        missingVariables.push(variable)
      }
    }

    for (const variable of definition.optionalVariables) {
      const value = data?.[variable]
      variables[variable] = isTemplateVariableValue(value) ? value : ""
    }

    return {
      missingVariables,
      variables,
    }
  }

  protected getRequestTimeoutMs() {
    const configuredTimeoutMs = this.options.request_timeout_ms
    const envTimeoutMs = Number(process.env.RESEND_REQUEST_TIMEOUT_MS)
    if (
      typeof configuredTimeoutMs === "number" &&
      Number.isFinite(configuredTimeoutMs) &&
      configuredTimeoutMs > 0
    ) {
      return configuredTimeoutMs
    }
    if (Number.isFinite(envTimeoutMs) && envTimeoutMs > 0) {
      return envTimeoutMs
    }
    return DEFAULT_RESEND_REQUEST_TIMEOUT_MS
  }

  protected async sendTemplateEmail(emailOptions: ResendTemplateEmailOptions) {
    const baseUrl = process.env.RESEND_BASE_URL || "https://api.resend.com"
    const timeoutMs = this.getRequestTimeoutMs()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
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
        signal: controller.signal,
      })

      const payload: unknown = await response.json()

      if (!response.ok) {
        return {
          data: null,
          error: toErrorResponse(payload),
        }
      }

      if (!isEmailResponse(payload)) {
        return {
          data: null,
          error: toErrorResponse(payload),
        }
      }

      return {
        data: payload,
        error: null,
      }
    } catch (error) {
      let message = "Unknown Resend API error."
      if (error instanceof Error && error.name === "AbortError") {
        message = `Resend API request timed out after ${timeoutMs}ms.`
      } else if (error instanceof Error) {
        message = error.message
      }

      return {
        data: null,
        error: { message },
      }
    } finally {
      clearTimeout(timeoutId)
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

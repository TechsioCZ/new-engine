import type {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  DEFAULT_RESEND_API_URL,
  RESEND_CONFIG_MODULE,
  type ResendConfigModuleService,
} from "../resend-config"
import {
  getResendMailboxDomain,
  type ResendEmailMarket,
  resendEmailMarketBindings,
  resolveResendEmailMarket,
} from "./contracts"
import {
  getResendTemplateDefinition,
  getResendTemplateSubject,
  type ResendEmailTemplate,
  type ResendTemplateDefinition,
} from "./templates"

type ResendOptions = {
  channels?: string[]
}

type InjectedDependencies = Record<string, unknown>

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
  apiKey: string
  apiUrl: string
  attachments?: {
    content?: Buffer | string
    contentType?: string
    filename?: string | false
    path?: string
  }[]
  from: string
  replyTo: string
  requestTimeoutMs: number
  subject: string
  template: {
    id: string
    variables: Record<string, TemplateVariableValue>
  }
  to: string[]
}

type ResendRuntimeOptions = {
  apiKey: string
  apiUrl: string
  from: string
  replyTo: string
  requestTimeoutMs: number
  templateMappings: Record<string, string>
}

type ResendApiEmailResponse = {
  id: string
}

type ResendApiErrorResponse = {
  message?: string
  name?: string
  statusCode?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isEmailResponse(value: unknown): value is ResendApiEmailResponse {
  return (
    isRecord(value) && typeof value.id === "string" && Boolean(value.id.trim())
  )
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

function isRequiredTemplateVariableValue(
  value: unknown
): value is Exclude<TemplateVariableValue, null> {
  if (value === null || !isTemplateVariableValue(value)) {
    return false
  }

  if (typeof value === "string") {
    return Boolean(value.trim())
  }

  if (Array.isArray(value)) {
    return value.length > 0
  }

  if (isRecord(value)) {
    return Object.keys(value).length > 0
  }

  return true
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

function normalizeApiUrl(value: string) {
  const normalizedValue = value.trim()
  let url: URL

  try {
    url = new URL(normalizedValue)
  } catch {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Resend API URL must use the trusted HTTPS origin ${DEFAULT_RESEND_API_URL}`
    )
  }

  if (
    url.origin !== DEFAULT_RESEND_API_URL ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Resend API URL must use the trusted HTTPS origin ${DEFAULT_RESEND_API_URL}`
    )
  }

  return DEFAULT_RESEND_API_URL
}

async function parseResendApiResponse(response: Response) {
  try {
    return (await response.json()) as unknown
  } catch {
    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend API request failed with status ${response.status}`
      )
    }

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Resend API returned a malformed JSON response"
    )
  }
}

function requireSuccessfulResendApiResponse(
  response: Response,
  payload: unknown
): ResendApiEmailResponse {
  if (!response.ok) {
    const error = toErrorResponse(payload)
    const detail = error.message?.trim()

    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Resend API request failed with status ${response.status}${detail ? `: ${detail}` : ""}`
    )
  }

  if (!isEmailResponse(payload)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Resend API returned a success response without an email id"
    )
  }

  return { id: payload.id.trim() }
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static override identifier = "notification-resend"

  protected readonly container: InjectedDependencies

  constructor(container: InjectedDependencies, _options: ResendOptions) {
    super()

    this.container = container
  }

  static override validateOptions(_options: Record<string, unknown>) {
    return
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
    const invalidVariables: string[] = []
    const missingVariables: string[] = []

    for (const variable of definition.requiredVariables) {
      const value = data?.[variable]

      if (isRequiredTemplateVariableValue(value)) {
        variables[variable] = value
      } else {
        missingVariables.push(variable)
      }
    }

    for (const variable of definition.optionalVariables) {
      const value = data?.[variable]

      if (value !== undefined && !isTemplateVariableValue(value)) {
        invalidVariables.push(variable)
        continue
      }

      variables[variable] = value === undefined ? "" : value
    }

    return {
      invalidVariables,
      missingVariables,
      variables,
    }
  }

  protected async getRuntimeOptions(
    market: ResendEmailMarket
  ): Promise<ResendRuntimeOptions> {
    const service = this.container[RESEND_CONFIG_MODULE]

    if (!service || typeof service !== "object") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Resend configuration service is unavailable"
      )
    }

    const runtimeConfig = await (
      service as ResendConfigModuleService
    ).getRuntimeConfig()

    const binding = resendEmailMarketBindings[market]
    const marketConfiguration = runtimeConfig.market_configurations?.[market]

    if (!marketConfiguration) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Resend configuration is missing the ${market.toUpperCase()} notification market`
      )
    }

    const from = marketConfiguration.from_email
    const replyTo = marketConfiguration.reply_to
    const templateMappings = marketConfiguration.template_mappings

    if (
      getResendMailboxDomain(from) !== binding.senderDomain ||
      getResendMailboxDomain(replyTo) !== binding.senderDomain
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Resend sender configuration does not match the ${market.toUpperCase()} notification market`
      )
    }

    return {
      apiKey: runtimeConfig.api_key,
      apiUrl: normalizeApiUrl(runtimeConfig.api_url),
      from,
      replyTo,
      requestTimeoutMs: runtimeConfig.request_timeout_ms,
      templateMappings,
    }
  }

  protected async sendTemplateEmail(
    emailOptions: ResendTemplateEmailOptions
  ): Promise<ResendApiEmailResponse> {
    const timeoutMs = emailOptions.requestTimeoutMs
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${emailOptions.apiUrl}/emails`, {
        body: JSON.stringify({
          attachments: emailOptions.attachments,
          from: emailOptions.from,
          reply_to: emailOptions.replyTo,
          subject: emailOptions.subject,
          template: emailOptions.template,
          to: emailOptions.to,
        }),
        headers: {
          Authorization: `Bearer ${emailOptions.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      })

      const payload = await parseResendApiResponse(response)

      return requireSuccessfulResendApiResponse(response, payload)
    } catch (error) {
      if (error instanceof MedusaError) {
        throw error
      }

      let message = "Unknown Resend API error."
      if (error instanceof Error && error.name === "AbortError") {
        message = `Resend API request timed out after ${timeoutMs}ms.`
      } else if (error instanceof Error) {
        message = error.message
      }

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend API request failed: ${message}`
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }

  override async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    if (notification.channel !== "email") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Resend notification provider does not support channel ${notification.channel}`
      )
    }

    if (typeof notification.to !== "string" || !notification.to.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend notification recipient is required"
      )
    }

    const templateKey = notification.template as Template
    const template = getResendTemplateDefinition(templateKey)

    if (!template) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Couldn't find a Resend email template for ${notification.template}.`
      )
    }

    const locale = notification.data?.locale
    const storefrontDomain = notification.data?.storefront_domain
    const market = resolveResendEmailMarket(locale, storefrontDomain)

    if (!market) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend notification requires an exact supported locale and storefront domain tuple"
      )
    }

    for (const field of ["market_code", "country_code"] as const) {
      const value = notification.data?.[field]
      if (value !== undefined && value !== market) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Resend notification market context is cross-wired"
        )
      }
    }

    const { invalidVariables, missingVariables, variables } =
      this.getTemplateVariables(template, notification.data)

    if (invalidVariables.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid Resend email template variables for ${templateKey}: ${invalidVariables.join(", ")}`
      )
    }

    if (missingVariables.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Missing Resend email template variables for ${templateKey}: ${missingVariables.join(", ")}`
      )
    }

    const subject = getResendTemplateSubject(
      templateKey,
      resendEmailMarketBindings[market].locale
    )

    if (!subject) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unsupported Resend email locale for ${templateKey}: ${String(locale)}`
      )
    }

    const runtimeOptions = await this.getRuntimeOptions(market)
    const templateId = runtimeOptions.templateMappings[templateKey]?.trim()

    if (!templateId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Resend email template ${templateKey} is not mapped in Settings → Resend`
      )
    }
    const emailOptions: ResendTemplateEmailOptions = {
      apiKey: runtimeOptions.apiKey,
      apiUrl: runtimeOptions.apiUrl,
      attachments: this.getAttachments(notification),
      from: runtimeOptions.from,
      replyTo: runtimeOptions.replyTo,
      requestTimeoutMs: runtimeOptions.requestTimeoutMs,
      subject,
      template: {
        id: templateId,
        variables,
      },
      to: [notification.to],
    }

    const result = await this.sendTemplateEmail(emailOptions)

    return { id: result.id }
  }
}

export default ResendNotificationProviderService

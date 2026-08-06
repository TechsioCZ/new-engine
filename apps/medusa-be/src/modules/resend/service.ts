import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import {
  getCredentialString,
  INTEGRATION_CONFIG_NAMES,
  requireCredentialObject,
  requireEnabledIntegrationConfig,
} from "../api-store/integration-config"
import { resendTemplateDefinitions } from "./templates"
import type { ResendTemplateDefinition } from "./templates"

interface ResendOptions {
  api_key?: string
  apiStoreName?: string
  from?: string
  request_timeout_ms?: number
}

type InjectedDependencies = Record<string, unknown> & {
  logger: Logger
}

interface NotificationAttachment {
  content?: Buffer | string
  content_type?: string
  contentType?: string
  filename?: string | false
  path?: string
}

type TemplateVariableValue =
  | boolean
  | null
  | number
  | string
  | TemplateVariableValue[]
  | { [key: string]: TemplateVariableValue }

interface ResendTemplateEmailOptions {
  apiKey: string
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

interface ResendApiEmailResponse {
  id: string
}

interface ResendApiErrorResponse {
  message?: string
  name?: string
  statusCode?: number
}

interface ResendApiResult {
  data: ResendApiEmailResponse | null
  error: ResendApiErrorResponse | null
}

const RESEND_TEMPLATE_DEFINITIONS: ReadonlyMap<
  string,
  ResendTemplateDefinition
> = new Map(Object.entries(resendTemplateDefinitions))
const DEFAULT_RESEND_REQUEST_TIMEOUT_MS = 10_000

const isEmailResponse = (value: unknown): value is ResendApiEmailResponse =>
  isRecord(value) && typeof value["id"] === "string"

const isTemplateVariableValue = (
  value: unknown,
): value is TemplateVariableValue => {
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

const toErrorResponse = (value: unknown): ResendApiErrorResponse => {
  if (!isRecord(value)) {
    return {}
  }

  const error: ResendApiErrorResponse = {}
  if (typeof value["message"] === "string") {
    error.message = value["message"]
  }
  if (typeof value["name"] === "string") {
    error.name = value["name"]
  }
  if (typeof value["statusCode"] === "number") {
    error.statusCode = value["statusCode"]
  }

  return error
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static override readonly identifier = "notification-resend"

  protected readonly container: InjectedDependencies
  protected readonly options: ResendOptions
  protected readonly logger: Logger

  constructor(container: InjectedDependencies, options: ResendOptions) {
    super()

    this.container = container
    this.options = options
    this.logger = container.logger
  }

  static override validateOptions(options: Record<string, unknown>) {
    const { apiStoreName } = options
    if (typeof apiStoreName === "string" && apiStoreName.length > 0) {
      return
    }

    const apiKey = options["api_key"]
    const { from } = options
    const hasApiKey = typeof apiKey === "string" && apiKey.length > 0
    const hasFrom = typeof from === "string" && from.length > 0
    if (!hasApiKey || !hasFrom) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Options `api_key` and `from` are required unless `apiStoreName` is configured.",
      )
    }
  }

  protected static getAttachments(
    notification: ProviderSendNotificationDTO,
  ): ResendTemplateEmailOptions["attachments"] | undefined {
    const rawAttachments =
      "attachments" in notification && Array.isArray(notification.attachments)
        ? notification.attachments
        : []
    const attachments = rawAttachments.flatMap((value) => {
      if (!isRecord(value)) {
        return []
      }

      const attachment: NotificationAttachment = {}
      const { content } = value
      const contentType = value["contentType"] ?? value.content_type
      const { filename } = value
      const { path } = value

      if (typeof content === "string" || Buffer.isBuffer(content)) {
        attachment.content = content
      }
      if (typeof contentType === "string") {
        attachment.contentType = contentType
      }
      if (typeof filename === "string" || filename === false) {
        attachment.filename = filename
      }
      if (typeof path === "string") {
        attachment.path = path
      }

      return [attachment]
    })

    return rawAttachments.length === 0 ? undefined : attachments
  }

  protected static getTemplateVariables(
    definition: ResendTemplateDefinition,
    data?: Record<string, unknown> | null,
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
    const envTimeoutMs = Number(process.env["RESEND_REQUEST_TIMEOUT_MS"])
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

  protected async getRuntimeOptions(): Promise<
    Required<Pick<ResendOptions, "api_key" | "from">>
  > {
    if (
      this.options.api_key !== undefined &&
      this.options.api_key !== "" &&
      this.options.from !== undefined &&
      this.options.from !== ""
    ) {
      return { api_key: this.options.api_key, from: this.options.from }
    }

    const name =
      this.options.apiStoreName === undefined ||
      this.options.apiStoreName === ""
        ? INTEGRATION_CONFIG_NAMES.RESEND
        : this.options.apiStoreName
    const config = await requireEnabledIntegrationConfig(this.container, name)
    const credentials = requireCredentialObject(config)
    const apiKey =
      config.api_key ?? getCredentialString(credentials, "apiKey", "api_key")
    const from = getCredentialString(
      credentials,
      "from",
      "from_email",
      "fromEmail",
    )

    const isApiKeyMissing =
      apiKey === undefined || apiKey === null || apiKey.length === 0
    const isFromMissing = from === undefined || from.length === 0
    if (isApiKeyMissing || isFromMissing) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${name} API Store config must contain api_key and from_email`,
      )
    }

    return { api_key: apiKey, from }
  }

  protected async sendTemplateEmail(
    emailOptions: ResendTemplateEmailOptions,
  ): Promise<ResendApiResult> {
    const configuredBaseUrl = process.env["RESEND_BASE_URL"]
    const baseUrl =
      configuredBaseUrl === undefined || configuredBaseUrl.length === 0
        ? "https://api.resend.com"
        : configuredBaseUrl
    const timeoutMs = this.getRequestTimeoutMs()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    try {
      const response = await fetch(`${baseUrl}/emails`, {
        body: JSON.stringify({
          attachments: emailOptions.attachments,
          from: emailOptions.from,
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
        const { message: errorMessage } = error
        message = errorMessage
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
    notification: ProviderSendNotificationDTO,
  ): Promise<ProviderSendNotificationResultsDTO> {
    const templateKey = notification.template
    const template = RESEND_TEMPLATE_DEFINITIONS.get(templateKey)

    if (template === undefined) {
      this.logger.error(
        `Couldn't find a Resend email template for ${notification.template}.`,
      )
      return {}
    }

    const { missingVariables, variables } =
      ResendNotificationProviderService.getTemplateVariables(
        template,
        notification.data,
      )

    if (missingVariables.length > 0) {
      this.logger.error(
        `Missing Resend email template variables for ${templateKey}: ${missingVariables.join(", ")}`,
      )
      return {}
    }

    const runtimeOptions = await this.getRuntimeOptions()
    const emailOptions: ResendTemplateEmailOptions = {
      apiKey: runtimeOptions.api_key,
      from: runtimeOptions.from,
      template: {
        id: template.id,
        variables,
      },
      to: [notification.to],
    }
    const attachments =
      ResendNotificationProviderService.getAttachments(notification)
    if (attachments !== undefined) {
      emailOptions.attachments = attachments
    }

    const { data, error } = await this.sendTemplateEmail(emailOptions)

    if (error !== null || data === null) {
      if (error === null) {
        this.logger.error("Failed to send email: unknown error")
      } else {
        this.logger.error(
          `Failed to send email: ${error.message ?? "unknown Resend API error"}`,
        )
      }

      return {}
    }

    return { id: data.id }
  }
}

export default ResendNotificationProviderService

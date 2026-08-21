import type { InferTypeOf } from "@medusajs/framework/types"
import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { decryptFields, encryptFields } from "../../utils/encryption"
import type { ApiStoreAdminDTO, ApiStoreModuleService } from "../api-store"
import { API_STORE_MODULE } from "../api-store"
import {
  getResendMailboxDomain,
  type ResendEmailTemplate,
  resendEmailMarketBindings,
  resendEmailMarkets,
  resendEmailTemplateKeys,
} from "../resend/contracts"
import {
  DEFAULT_PRODUCT_REVIEW_REQUEST_DELAY_MINUTES,
  DEFAULT_RESEND_API_URL,
  DEFAULT_RESEND_REQUEST_TIMEOUT_MS,
} from "./constants"
import ResendConfig from "./models/resend-config"
import type {
  ResendConfigAdminDTO,
  ResendConfigUpdateInput,
  ResendMarketConfigurations,
  ResendRuntimeConfig,
} from "./types"

type ResendConfigRecord = InferTypeOf<typeof ResendConfig>

type InjectedDependencies = {
  [API_STORE_MODULE]: ApiStoreModuleService
}

type ResendConfigWriteData = {
  id?: string
  configuration_key?: string
  api_store_id?: string | null
  api_url?: string
  is_enabled?: boolean
  from_email?: string | null
  webhook_secret?: string | null
  request_timeout_ms?: number
  market_configurations?: ResendMarketConfigurations
  template_mappings?: Record<ResendEmailTemplate, string>
  product_review_request_delay_minutes?: number
}

const EMAIL_ADDRESS_PATTERN = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/
const FORMATTED_EMAIL_PATTERN = /^.+\s<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>$/
function normalizeOptionalSetting(
  input: string | null | undefined,
  existing: string | null | undefined
) {
  if (input === undefined) {
    return existing ?? null
  }

  return input?.trim() || null
}

function validateRequestTimeout(requestTimeoutMs: number) {
  if (
    Number.isInteger(requestTimeoutMs) &&
    requestTimeoutMs >= 1000 &&
    requestTimeoutMs <= 120_000
  ) {
    return
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "Resend request timeout must be between 1000 and 120000 ms"
  )
}

function validateProductReviewRequestDelay(delayMinutes: number) {
  if (
    Number.isInteger(delayMinutes) &&
    delayMinutes >= 0 &&
    delayMinutes <= 525_600
  ) {
    return
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "Product review request delay must be between 0 and 525600 minutes"
  )
}

function defaultTemplateMappings(): Record<ResendEmailTemplate, string> {
  return Object.fromEntries(
    resendEmailTemplateKeys.map((template) => [template, ""])
  ) as Record<ResendEmailTemplate, string>
}

function normalizeTemplateMappings(
  value: Partial<Record<ResendEmailTemplate, string>> | null | undefined
) {
  const mappings = defaultTemplateMappings()

  if (!value) {
    return mappings
  }

  const unknownTemplates = Object.keys(value).filter(
    (template) =>
      !resendEmailTemplateKeys.includes(template as ResendEmailTemplate)
  )
  if (unknownTemplates.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported Resend template mappings: ${unknownTemplates.join(", ")}`
    )
  }

  for (const template of resendEmailTemplateKeys) {
    if (template in value) {
      mappings[template] = value[template]?.trim() ?? ""
    }
  }

  return mappings
}

function normalizeMarketConfigurations(
  value: ResendMarketConfigurations | null | undefined
): ResendMarketConfigurations {
  if (!value) {
    return {}
  }

  const unknownMarkets = Object.keys(value).filter(
    (market) => !resendEmailMarkets.includes(market as never)
  )
  if (unknownMarkets.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unsupported Resend notification markets: ${unknownMarkets.join(", ")}`
    )
  }

  const configurations: ResendMarketConfigurations = {}
  for (const market of resendEmailMarkets) {
    const input = value[market]
    if (!input) {
      continue
    }

    const fromEmail = input.from_email?.trim()
    const replyTo = input.reply_to?.trim()
    validateFromEmail(fromEmail || null)
    validateFromEmail(replyTo || null)
    const senderDomain = resendEmailMarketBindings[market].senderDomain

    if (
      !(fromEmail && replyTo) ||
      getResendMailboxDomain(fromEmail) !== senderDomain ||
      getResendMailboxDomain(replyTo) !== senderDomain
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Resend ${market.toUpperCase()} From Email and Reply-To must use ${senderDomain}`
      )
    }

    configurations[market] = {
      from_email: fromEmail,
      reply_to: replyTo,
      template_mappings: normalizeTemplateMappings(input.template_mappings),
    }
  }

  return configurations
}

function validateFromEmail(fromEmail: string | null) {
  if (
    !fromEmail ||
    EMAIL_ADDRESS_PATTERN.test(fromEmail) ||
    FORMATTED_EMAIL_PATTERN.test(fromEmail)
  ) {
    return
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "Resend From Email must be an email address or a name followed by an email address in angle brackets"
  )
}

function normalizeApiUrl(value: string) {
  const normalized = value.trim()
  let url: URL

  try {
    url = new URL(normalized)
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

function hasCompleteMarketConfiguration(
  marketConfigurations: ResendMarketConfigurations
): boolean {
  return resendEmailMarkets.every((market) => {
    const configuration = marketConfigurations[market]
    return Boolean(
      configuration &&
        resendEmailTemplateKeys.every((template) =>
          Boolean(configuration.template_mappings[template])
        )
    )
  })
}

function validateEnabledConfiguration({
  apiStore,
  isEnabled,
  marketConfigurations,
}: {
  apiStore: ApiStoreAdminDTO | null
  isEnabled: boolean
  marketConfigurations: ResendMarketConfigurations
}) {
  if (
    !isEnabled ||
    (apiStore?.enabled &&
      apiStore.has_api_key &&
      hasCompleteMarketConfiguration(marketConfigurations))
  ) {
    return
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "Enable Resend only after selecting an enabled API Store configuration with an API key and configuring every email template for all four markets"
  )
}

function toAdminDTO(
  record: ResendConfigRecord | undefined
): ResendConfigAdminDTO {
  return {
    id: record?.id ?? null,
    api_store_id: record?.api_store_id ?? null,
    is_enabled: record?.is_enabled ?? false,
    from_email: record?.from_email ?? null,
    has_webhook_secret: Boolean(record?.webhook_secret),
    request_timeout_ms:
      record?.request_timeout_ms ?? DEFAULT_RESEND_REQUEST_TIMEOUT_MS,
    market_configurations: normalizeMarketConfigurations(
      record?.market_configurations as ResendMarketConfigurations | undefined
    ),
    template_mappings: normalizeTemplateMappings(
      record?.template_mappings as
        | Partial<Record<ResendEmailTemplate, string>>
        | undefined
    ),
    product_review_request_delay_minutes:
      record?.product_review_request_delay_minutes ??
      DEFAULT_PRODUCT_REVIEW_REQUEST_DELAY_MINUTES,
  }
}

class ResendConfigModuleService extends MedusaService({ ResendConfig }) {
  protected readonly apiStoreService_: ApiStoreModuleService

  constructor(container: InjectedDependencies) {
    super(container)
    this.apiStoreService_ = container[API_STORE_MODULE]
  }

  async getConfig(): Promise<ResendConfigAdminDTO> {
    return toAdminDTO(await this.getConfigRecord())
  }

  async getRuntimeConfig(): Promise<ResendRuntimeConfig> {
    const record = await this.getConfigRecord()

    if (!record?.is_enabled) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Resend is disabled in Settings → Resend"
      )
    }

    const apiStoreId = record.api_store_id?.trim()
    const fromEmail = record.from_email?.trim()
    const apiUrl = normalizeApiUrl(record.api_url)
    const marketConfigurations = normalizeMarketConfigurations(
      record.market_configurations as ResendMarketConfigurations | undefined
    )

    if (!apiStoreId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend requires an API Store configuration"
      )
    }

    if (!hasCompleteMarketConfiguration(marketConfigurations)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Enabled Resend requires complete sender and template configuration for all four markets"
      )
    }

    const apiStore =
      await this.apiStoreService_.retrieveApiStoreSecrets(apiStoreId)

    if (!(apiStore.enabled && apiStore.api_key?.trim())) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "The API Store configuration linked to Resend must be enabled and contain an API key"
      )
    }

    const decrypted = decryptFields(
      { webhook_secret: record.webhook_secret ?? null },
      ["webhook_secret"]
    )

    return {
      api_key: apiStore.api_key.trim(),
      api_url: apiUrl,
      api_store_id: apiStoreId,
      from_email: fromEmail ?? "",
      market_configurations: marketConfigurations,
      request_timeout_ms: record.request_timeout_ms,
      template_mappings: normalizeTemplateMappings(
        record.template_mappings as
          | Partial<Record<ResendEmailTemplate, string>>
          | undefined
      ),
      product_review_request_delay_minutes:
        record.product_review_request_delay_minutes ??
        DEFAULT_PRODUCT_REVIEW_REQUEST_DELAY_MINUTES,
      webhook_secret: decrypted.webhook_secret,
    }
  }

  async getWebhookSecret(): Promise<string | null> {
    const record = await this.getConfigRecord()
    const decrypted = decryptFields(
      { webhook_secret: record?.webhook_secret ?? null },
      ["webhook_secret"]
    )

    return decrypted.webhook_secret?.trim() || null
  }

  async updateConfig(
    input: ResendConfigUpdateInput
  ): Promise<ResendConfigAdminDTO> {
    const existing = await this.getConfigRecord()
    const apiStoreId = normalizeOptionalSetting(
      input.api_store_id,
      existing?.api_store_id
    )
    const fromEmail = normalizeOptionalSetting(
      input.from_email,
      existing?.from_email
    )
    const isEnabled = input.is_enabled ?? existing?.is_enabled ?? false
    const apiUrl = DEFAULT_RESEND_API_URL
    const requestTimeoutMs =
      input.request_timeout_ms ??
      existing?.request_timeout_ms ??
      DEFAULT_RESEND_REQUEST_TIMEOUT_MS
    const templateMappings = normalizeTemplateMappings(
      input.template_mappings ??
        (existing?.template_mappings as
          | Partial<Record<ResendEmailTemplate, string>>
          | undefined)
    )
    const marketConfigurations = normalizeMarketConfigurations(
      input.market_configurations ??
        (existing?.market_configurations as
          | ResendMarketConfigurations
          | undefined)
    )
    const productReviewRequestDelayMinutes =
      input.product_review_request_delay_minutes ??
      existing?.product_review_request_delay_minutes ??
      DEFAULT_PRODUCT_REVIEW_REQUEST_DELAY_MINUTES

    validateRequestTimeout(requestTimeoutMs)
    validateProductReviewRequestDelay(productReviewRequestDelayMinutes)
    validateFromEmail(fromEmail)

    let apiStore: ApiStoreAdminDTO | null = null
    if (apiStoreId) {
      apiStore = await this.apiStoreService_.retrieveApiStoreConfig(apiStoreId)
    }

    validateEnabledConfiguration({
      apiStore,
      isEnabled,
      marketConfigurations,
    })

    const writeData: ResendConfigWriteData = {
      api_store_id: apiStoreId,
      api_url: apiUrl,
      from_email: fromEmail,
      is_enabled: isEnabled,
      market_configurations: marketConfigurations,
      request_timeout_ms: requestTimeoutMs,
      template_mappings: templateMappings,
      product_review_request_delay_minutes: productReviewRequestDelayMinutes,
    }

    if (input.webhook_secret !== undefined) {
      writeData.webhook_secret = input.webhook_secret?.trim() || null
    }

    const encrypted = encryptFields(writeData, ["webhook_secret"])
    const saved = existing
      ? await this.updateResendConfigs({ id: existing.id, ...encrypted })
      : await this.createResendConfigs({
          configuration_key: "default",
          ...encrypted,
        })

    return toAdminDTO(saved)
  }

  private async getConfigRecord(): Promise<ResendConfigRecord | undefined> {
    const records = await this.listResendConfigs({}, { take: 2 })

    if (records.length > 1) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Resend has multiple configuration records"
      )
    }

    return records[0]
  }
}

export default ResendConfigModuleService

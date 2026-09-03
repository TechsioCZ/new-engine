import type {
  ResendEmailMarket,
  ResendEmailTemplate,
} from "../resend/contracts"

export type ResendMarketConfiguration = {
  from_email: string
  reply_to: string
  template_mappings: Record<ResendEmailTemplate, string>
}

export type ResendMarketConfigurations = Partial<
  Record<ResendEmailMarket, ResendMarketConfiguration>
>

export type ResendConfigAdminDTO = {
  id: string | null
  api_store_id: string | null
  is_enabled: boolean
  from_email: string | null
  has_webhook_secret: boolean
  request_timeout_ms: number
  market_configurations: ResendMarketConfigurations
  template_mappings: Record<ResendEmailTemplate, string>
  product_review_request_delay_minutes: number
}

export type ResendConfigUpdateInput = {
  api_store_id?: string | null
  is_enabled?: boolean
  from_email?: string | null
  webhook_secret?: string | null
  request_timeout_ms?: number
  market_configurations?: ResendMarketConfigurations
  template_mappings?: Partial<Record<ResendEmailTemplate, string>>
  product_review_request_delay_minutes?: number
}

export type ResendRuntimeConfig = {
  api_key: string
  api_url: string
  api_store_id: string
  from_email: string
  market_configurations: ResendMarketConfigurations
  request_timeout_ms: number
  template_mappings: Record<ResendEmailTemplate, string>
  product_review_request_delay_minutes: number
  webhook_secret: string | null
}

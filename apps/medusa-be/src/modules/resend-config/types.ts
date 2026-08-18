import type { ResendEmailTemplate } from "../resend/contracts"

export type ResendConfigAdminDTO = {
  id: string | null
  api_store_id: string | null
  api_url: string
  is_enabled: boolean
  from_email: string | null
  has_webhook_secret: boolean
  request_timeout_ms: number
  template_mappings: Record<ResendEmailTemplate, string>
  product_review_request_delay_minutes: number
}

export type ResendConfigUpdateInput = {
  api_store_id?: string | null
  api_url?: string
  is_enabled?: boolean
  from_email?: string | null
  webhook_secret?: string | null
  request_timeout_ms?: number
  template_mappings?: Partial<Record<ResendEmailTemplate, string>>
  product_review_request_delay_minutes?: number
}

export type ResendRuntimeConfig = {
  api_key: string
  api_url: string
  api_store_id: string
  from_email: string
  request_timeout_ms: number
  template_mappings: Record<ResendEmailTemplate, string>
  product_review_request_delay_minutes: number
  webhook_secret: string | null
}

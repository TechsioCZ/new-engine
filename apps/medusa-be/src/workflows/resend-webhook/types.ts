export type ResendWebhookEvent = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    [key: string]: unknown
  }
}

export type ProcessResendWebhookEventInput = {
  email_id: string
  event: ResendWebhookEvent & { type: string }
}

export type ProcessResendWebhookEventResult = {
  checked_count: number
  found_count: number
}

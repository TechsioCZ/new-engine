import type { CreateNotificationDTO } from "@medusajs/framework/types"

export type ClaimType = "complaint" | "return"
export type ClaimResolution = "discount" | "refund" | "repair" | "replacement"

export type RequestClaimAccessInput = {
  email: string
  order_number: string
  sales_channel_id: string
}

export type RequestClaimAccessResult = {
  accepted: true
  challenge_id: string
}

export type VerifyClaimAccessInput = {
  challenge_id: string
  code: string
  sales_channel_id: string
}

export type VerifiedOrderItem = {
  id: string
  product_id: null | string
  quantity: number
  title: string
  variant_id: null | string
}

export type VerifyClaimAccessResult = {
  access_token: string
  order: {
    display_id: string
    items: VerifiedOrderItem[]
  }
}

export type CreateClaimItemInput = {
  order_item_id?: string
  quantity: number
  title?: string
}

export type CreateClaimInput = {
  access_token?: string
  attachment_urls?: string[]
  defect_description?: string
  defect_discovered_at?: string
  email: string
  items: CreateClaimItemInput[]
  order_number?: string
  purchase_details?: string
  reason?: string
  requested_resolution?: ClaimResolution
  sales_channel_id: string
  type: ClaimType
}

export type CreateClaimResult = {
  case_number: string
  status: "submitted"
}

export type ClaimStepResult<T> = {
  notification_input: CreateNotificationDTO[]
  result: T
}

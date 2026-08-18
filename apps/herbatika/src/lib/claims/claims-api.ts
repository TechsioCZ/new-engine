import { storefrontSdk } from "@/lib/storefront/sdk"

export type ClaimType = "return" | "complaint"
export type ClaimResolution = "repair" | "replacement" | "discount" | "refund"

export type VerifiedOrderItem = {
  id: string
  product_id: string | null
  quantity: number
  title: string
  variant_id: string | null
}

export type VerifiedOrder = {
  display_id: string
  items: VerifiedOrderItem[]
}

export type ClaimItemInput = {
  order_item_id?: string
  quantity: number
  title?: string
}

export type CreateClaimInput = {
  access_token?: string
  defect_description?: string
  email: string
  items: ClaimItemInput[]
  order_number?: string
  purchase_details?: string
  reason?: string
  requested_resolution?: ClaimResolution
  turnstile_token?: string
  type: ClaimType
}

type BuildClaimInputOptions = {
  accessToken: string
  defectDescription: string
  email: string
  items: ClaimItemInput[]
  orderNumber: string
  purchaseDetails: string
  reason: string
  resolution: ClaimResolution
  turnstileToken: string | null
  type: ClaimType
}

export function buildClaimInput(
  options: BuildClaimInputOptions
): CreateClaimInput {
  return {
    ...(options.accessToken
      ? { access_token: options.accessToken }
      : { purchase_details: options.purchaseDetails.trim() }),
    email: options.email.trim(),
    items: options.items,
    ...(options.orderNumber.trim()
      ? { order_number: options.orderNumber.trim() }
      : {}),
    ...(options.reason.trim() ? { reason: options.reason.trim() } : {}),
    ...(options.type === "complaint"
      ? {
          defect_description: options.defectDescription.trim(),
          requested_resolution: options.resolution,
        }
      : {}),
    ...(options.turnstileToken
      ? { turnstile_token: options.turnstileToken }
      : {}),
    type: options.type,
  }
}

export function requestClaimAccess(input: {
  email: string
  order_number: string
  turnstile_token?: string
}) {
  return storefrontSdk.client.fetch<{
    accepted: true
    challenge_id: string
  }>("/store/claims/order-access/request", {
    method: "POST",
    body: input,
  })
}

export function verifyClaimAccess(input: {
  challenge_id: string
  code: string
}) {
  return storefrontSdk.client.fetch<{
    access_token: string
    order: VerifiedOrder
  }>("/store/claims/order-access/verify", {
    method: "POST",
    body: input,
  })
}

export function createClaim(input: CreateClaimInput) {
  return storefrontSdk.client.fetch<{
    case_number: string
    status: "submitted"
  }>("/store/claims", {
    method: "POST",
    body: input,
  })
}

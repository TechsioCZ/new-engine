import type { MedusaStoreRequest } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  requireCartSessionSecret,
  verifyCartSessionToken,
} from "../../../utils/cart-session"
import {
  privateFlowNotFound,
  resolveExactMarketSalesChannelId,
} from "../private-flow-utils"

export type CheckoutStep = "contact" | "shipping" | "payment" | "review"

type CartAddress = {
  address_1?: null | string
  city?: null | string
  country_code?: null | string
  first_name?: null | string
  last_name?: null | string
  phone?: null | string
  postal_code?: null | string
}

type PaymentSession = {
  id?: string
  provider_id?: null | string
  status?: null | string
}

export type PrivateFlowCart = {
  billing_address?: CartAddress | null
  completed_at?: Date | null | string
  email?: null | string
  id: string
  items?: Array<{ id?: string }> | null
  payment_collection?: {
    payment_sessions?: PaymentSession[] | null
  } | null
  sales_channel_id?: null | string
  shipping_address?: CartAddress | null
  shipping_methods?: Array<{ id?: string }> | null
}

const hasText = (value: unknown): value is string =>
  typeof value === "string" && Boolean(value.trim())

const hasCompleteAddress = (address?: CartAddress | null) =>
  Boolean(
    address &&
      hasText(address.first_name) &&
      hasText(address.last_name) &&
      hasText(address.address_1) &&
      hasText(address.city) &&
      hasText(address.postal_code) &&
      hasText(address.country_code)
  )

const hasContact = (cart: PrivateFlowCart) =>
  Boolean(
    hasText(cart.email) &&
      hasText(cart.shipping_address?.phone) &&
      hasCompleteAddress(cart.shipping_address) &&
      hasCompleteAddress(cart.billing_address)
  )

const unusablePaymentStatuses = new Set(["canceled", "cancelled", "error"])

export const projectCheckoutStepState = (cart: PrivateFlowCart) => {
  const contactComplete = hasContact(cart)
  const shippingComplete = Boolean(cart.shipping_methods?.length)
  const sessions = cart.payment_collection?.payment_sessions ?? []
  const usableSessions = sessions.filter(
    (session) =>
      hasText(session.id) &&
      hasText(session.provider_id) &&
      !unusablePaymentStatuses.has(session.status?.toLowerCase() ?? "")
  )
  const invalidProviderState =
    sessions.length > 0 && usableSessions.length !== 1

  let defaultStep: CheckoutStep = "shipping"
  let reachableSteps: CheckoutStep[] = ["shipping"]

  if (shippingComplete && !invalidProviderState) {
    defaultStep = "contact"
    reachableSteps = ["shipping", "payment", "contact"]
  }
  if (shippingComplete && contactComplete && !invalidProviderState) {
    defaultStep = "review"
    reachableSteps = ["shipping", "payment", "contact", "review"]
  }

  return {
    default_step: defaultStep,
    invalid_provider_state: invalidProviderState,
    reachable_steps: reachableSteps,
  }
}

export const assertExactSignedCartSession = (
  request: MedusaStoreRequest,
  cartId: string,
  salesChannelId: string
) => {
  const header = request.headers["x-cart-session"]
  const token = Array.isArray(header) ? undefined : header

  if (!token) {
    return privateFlowNotFound()
  }

  const claims = verifyCartSessionToken(token, requireCartSessionSecret())
  if (
    !claims ||
    claims.cart_id !== cartId ||
    claims.sales_channel_id !== salesChannelId
  ) {
    return privateFlowNotFound()
  }
}

export const retrieveMarketCart = async (
  request: MedusaStoreRequest,
  cartId: string
) => {
  const salesChannelId = resolveExactMarketSalesChannelId(request)
  const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "completed_at",
      "sales_channel_id",
      "email",
      "items.id",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.address_1",
      "shipping_address.city",
      "shipping_address.postal_code",
      "shipping_address.country_code",
      "shipping_address.phone",
      "billing_address.first_name",
      "billing_address.last_name",
      "billing_address.address_1",
      "billing_address.city",
      "billing_address.postal_code",
      "billing_address.country_code",
      "shipping_methods.id",
      "payment_collection.payment_sessions.id",
      "payment_collection.payment_sessions.provider_id",
      "payment_collection.payment_sessions.status",
    ],
    filters: { id: cartId },
    pagination: { take: 1 },
  })
  const cart = (data as PrivateFlowCart[])[0]

  if (
    !cart ||
    cart.id !== cartId ||
    cart.sales_channel_id !== salesChannelId ||
    cart.completed_at ||
    !cart.items?.length
  ) {
    return privateFlowNotFound()
  }

  return { cart, salesChannelId }
}

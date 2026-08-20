import type { MedusaStoreRequest } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_CONFIRMATION_MODULE } from "../../../modules/order-confirmation"
import type OrderConfirmationModuleService from "../../../modules/order-confirmation/service"
import {
  createOrderConfirmationToken,
  hashOrderConfirmationToken,
  ORDER_CONFIRMATION_TOKEN_TTL_MS,
  orderConfirmationTokenMatches,
} from "../../../modules/order-confirmation/token"
import {
  CART_SESSION_COOKIE_NAME,
  readCookie,
  requireCartSessionSecret,
  verifyCartSessionToken,
} from "../../../utils/cart-session"
import {
  privateFlowNotFound,
  resolveExactMarketSalesChannelId,
  resolveOptionalCustomerId,
} from "../private-flow-utils"

type OrderRecord = {
  cart_id?: null | string
  customer_id?: null | string
  id: string
  sales_channel_id?: null | string
  [key: string]: unknown
}

const SAFE_ORDER_FIELDS = [
  "id",
  "display_id",
  "status",
  "payment_status",
  "fulfillment_status",
  "created_at",
  "updated_at",
  "currency_code",
  "email",
  "total",
  "subtotal",
  "original_total",
  "original_subtotal",
  "original_tax_total",
  "item_total",
  "item_subtotal",
  "item_tax_total",
  "shipping_total",
  "shipping_subtotal",
  "shipping_tax_total",
  "tax_total",
  "discount_total",
  "discount_tax_total",
  "gift_card_total",
  "gift_card_tax_total",
  "billing_address.*",
  "shipping_address.*",
  "shipping_methods.*",
  "shipping_methods.tax_lines.*",
  "transactions.*",
  "payment_collections.*",
  "*items",
  "items.tax_lines.*",
] as const

type OrderConfirmationAccessRecord = {
  customer_id?: null | string
  expires_at: Date | string
  id: string
  order_id: string
  public_order_id: string
  sales_channel_id: string
  token_hash: string
  used_at?: Date | null | string
}

type OrderConfirmationService = OrderConfirmationModuleService & {
  createOrderConfirmationAccesses: (input: {
    customer_id: null | string
    expires_at: Date
    order_id: string
    public_order_id: string
    sales_channel_id: string
    token_hash: string
  }) => Promise<OrderConfirmationAccessRecord>
  deleteOrderConfirmationAccesses: (ids: string | string[]) => Promise<void>
  listOrderConfirmationAccesses: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<OrderConfirmationAccessRecord[]>
}

const headerValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? undefined : value

const resolveSignedCartSession = (request: MedusaStoreRequest) => {
  const headerToken = headerValue(request.headers["x-cart-session"])
  const cookieToken = readCookie(
    headerValue(request.headers.cookie),
    CART_SESSION_COOKIE_NAME
  )
  const token = headerToken ?? cookieToken

  return token
    ? verifyCartSessionToken(token, requireCartSessionSecret())
    : undefined
}

export const retrievePrivateFlowOrder = async (
  request: MedusaStoreRequest,
  publicOrderId: string
) => {
  const salesChannelId = resolveExactMarketSalesChannelId(request)
  const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      ...SAFE_ORDER_FIELDS,
      "cart_id",
      "customer_id",
      "sales_channel_id",
    ],
    filters: { id: publicOrderId },
    pagination: { take: 1 },
  })
  const order = (data as OrderRecord[])[0]

  if (
    !order ||
    order.id !== publicOrderId ||
    order.sales_channel_id !== salesChannelId
  ) {
    return privateFlowNotFound()
  }

  const {
    cart_id: _cartId,
    customer_id: _customerId,
    sales_channel_id: _salesChannelId,
    ...safeOrder
  } = order

  return { order, safeOrder, salesChannelId }
}

export const assertOrderOwnerOrGuestToken = async (
  request: MedusaStoreRequest,
  order: OrderRecord,
  salesChannelId: string,
  orderToken: string | undefined
) => {
  const customerId = resolveOptionalCustomerId(request)
  if (customerId && order.customer_id === customerId) {
    return
  }

  if (!orderToken || orderToken !== orderToken.trim()) {
    return privateFlowNotFound()
  }

  const service = request.scope.resolve<OrderConfirmationService>(
    ORDER_CONFIRMATION_MODULE
  )
  const [access] = await service.listOrderConfirmationAccesses(
    { order_id: order.id },
    { take: 1 }
  )

  if (
    !access ||
    access.order_id !== order.id ||
    access.public_order_id !== order.id ||
    access.sales_channel_id !== salesChannelId ||
    access.customer_id !== (order.customer_id ?? null) ||
    access.used_at ||
    new Date(access.expires_at).getTime() <= Date.now() ||
    !orderConfirmationTokenMatches(orderToken, access.token_hash)
  ) {
    return privateFlowNotFound()
  }
}

export const issueGuestOrderConfirmationToken = async (
  request: MedusaStoreRequest,
  order: OrderRecord,
  salesChannelId: string,
  cartId: string
) => {
  const customerId = resolveOptionalCustomerId(request)
  if (order.customer_id) {
    if (customerId !== order.customer_id) {
      return privateFlowNotFound()
    }
  } else {
    const cartSession = resolveSignedCartSession(request)
    if (
      !cartSession ||
      cartSession.cart_id !== cartId ||
      cartSession.sales_channel_id !== salesChannelId
    ) {
      return privateFlowNotFound()
    }
  }

  if (!order.cart_id || order.cart_id !== cartId) {
    return privateFlowNotFound()
  }

  const service = request.scope.resolve<OrderConfirmationService>(
    ORDER_CONFIRMATION_MODULE
  )
  const existing = await service.listOrderConfirmationAccesses(
    { order_id: order.id },
    { select: ["id"], take: 10 }
  )
  if (existing.length) {
    await service.deleteOrderConfirmationAccesses(
      existing.map((access) => access.id)
    )
  }

  const orderToken = createOrderConfirmationToken()
  await service.createOrderConfirmationAccesses({
    customer_id: order.customer_id ?? null,
    expires_at: new Date(Date.now() + ORDER_CONFIRMATION_TOKEN_TTL_MS),
    order_id: order.id,
    public_order_id: order.id,
    sales_channel_id: salesChannelId,
    token_hash: hashOrderConfirmationToken(orderToken),
  })

  return orderToken
}

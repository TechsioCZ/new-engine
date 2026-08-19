import type { MedusaStoreRequest } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  PAYKIT_COMGATE_PROVIDER_ID,
  PAYKIT_GOPAY_PROVIDER_ID,
  PAYKIT_PAYMENT_PROVIDER_IDENTIFIER,
  PAYKIT_STRIPE_PROVIDER_ID,
} from "../../../modules/payment-paykit/constants"
import { PAYMENT_RETURN_STATE_MODULE } from "../../../modules/payment-return-state"
import type PaymentReturnStateModuleService from "../../../modules/payment-return-state/service"
import {
  createPaymentResultToken,
  createPaymentReturnState,
  hashPaymentReturnState,
  PAYMENT_RESULT_TOKEN_TTL_MS,
  PAYMENT_RETURN_STATE_TTL_MS,
  verifyPaymentReturnState,
} from "../../../modules/payment-return-state/token"
import {
  CART_SESSION_COOKIE_NAME,
  readCookie,
  requireCartSessionSecret,
  verifyCartSessionToken,
} from "../../../utils/cart-session"
import {
  privateFlowNotFound,
  resolveExactMarketSalesChannelId,
} from "../private-flow-utils"

export const MAX_PAYMENT_RETURN_RESOLUTIONS = 8
const OPAQUE_RESULT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

const paymentProviderId = (provider: string) =>
  `pp_${PAYKIT_PAYMENT_PROVIDER_IDENTIFIER}_${provider}`

export const PAYMENT_RETURN_PROVIDERS = {
  [paymentProviderId(PAYKIT_GOPAY_PROVIDER_ID)]: PAYKIT_GOPAY_PROVIDER_ID,
  [paymentProviderId(PAYKIT_STRIPE_PROVIDER_ID)]: PAYKIT_STRIPE_PROVIDER_ID,
  [paymentProviderId(PAYKIT_COMGATE_PROVIDER_ID)]: PAYKIT_COMGATE_PROVIDER_ID,
} as const

export type PaymentReturnProvider =
  (typeof PAYMENT_RETURN_PROVIDERS)[keyof typeof PAYMENT_RETURN_PROVIDERS]

type PaymentReturnRecord = {
  cart_id: string
  expires_at: Date | string
  id: string
  last_seen_at?: Date | null | string
  order_id?: null | string
  payment_session_id?: null | string
  provider_id: string
  result_expires_at?: Date | null | string
  result_token_hash?: null | string
  response_count: number
  sales_channel_id: string
  state_hash: string
  terminal_status?: null | string
  used_at?: Date | null | string
}

type PaymentReturnService = PaymentReturnStateModuleService & {
  createPaymentReturnStates: (
    input: Omit<PaymentReturnRecord, "id" | "response_count">
  ) => Promise<PaymentReturnRecord>
  deletePaymentReturnStates: (ids: string | string[]) => Promise<void>
  listPaymentReturnStates: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<PaymentReturnRecord[]>
  updatePaymentReturnStates: (input: {
    id: string
    last_seen_at?: Date
    order_id?: null | string
    payment_session_id?: null | string
    response_count?: number
    result_expires_at?: Date
    result_token_hash?: string
    terminal_status?: null | string
    used_at?: Date
  }) => Promise<PaymentReturnRecord>
}

type PaymentSessionRecord = {
  id?: string
  is_selected?: boolean
  provider_id?: null | string
  status?: null | string
}

type PaymentCartRecord = {
  completed_at?: Date | null | string
  id: string
  items?: Array<{ id?: string }> | null
  payment_collection?: {
    payment_sessions?: PaymentSessionRecord[] | null
  } | null
  sales_channel_id?: null | string
}

type PaymentOrderRecord = {
  cart_id?: null | string
  id: string
  sales_channel_id?: null | string
}

type OrderByCartQuery = {
  graph: (input: {
    entity: "order"
    fields: ["id", "cart_id", "sales_channel_id"]
    filters: { cart_id: string }
    pagination: { take: 2 }
  }) => Promise<{ data: PaymentOrderRecord[] }>
}

export type PaymentReturnProjection = {
  cart_id: string
  payment_session_id: string
  provider_id: string
  public_order_id?: string
  status: "authorized" | "cancelled" | "completed" | "pending"
}

export type PaymentReturnResolution = PaymentReturnProjection & {
  result_token: string
}

const isFutureDate = (value: Date | string | null | undefined) => {
  if (!value) {
    return false
  }
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) && timestamp > Date.now()
}

const isTerminalStatus = (value: unknown): value is "cancelled" | "completed" =>
  value === "cancelled" || value === "completed"

const resolveTerminalPaymentReturn = async (
  request: MedusaStoreRequest,
  record: PaymentReturnRecord,
  input: { cartId: string; providerId: string }
): Promise<PaymentReturnResolution> => {
  const status = record.terminal_status
  const resultToken = createPaymentResultToken(
    record.state_hash,
    requireCartSessionSecret()
  )
  if (
    !(
      record.payment_session_id &&
      record.result_token_hash &&
      isTerminalStatus(status)
    ) ||
    record.result_token_hash !== hashPaymentReturnState(resultToken) ||
    !isFutureDate(record.result_expires_at)
  ) {
    return privateFlowNotFound()
  }
  await resolveService(request).updatePaymentReturnStates({
    id: record.id,
    last_seen_at: new Date(),
    response_count: record.response_count + 1,
  })
  return {
    cart_id: input.cartId,
    payment_session_id: record.payment_session_id,
    provider_id: input.providerId,
    ...(status === "completed" && record.order_id
      ? { public_order_id: record.order_id }
      : {}),
    result_token: resultToken,
    status,
  }
}

const getHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? undefined : value

const resolveService = (request: MedusaStoreRequest) =>
  request.scope.resolve<PaymentReturnService>(PAYMENT_RETURN_STATE_MODULE)

const resolveQuery = (request: MedusaStoreRequest) =>
  request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

export const requirePaymentReturnProvider = (
  providerId: string
): PaymentReturnProvider => {
  const provider = (
    PAYMENT_RETURN_PROVIDERS as Record<
      string,
      PaymentReturnProvider | undefined
    >
  )[providerId]

  return provider ?? privateFlowNotFound()
}

const assertSignedCartSession = (
  request: MedusaStoreRequest,
  cartId: string,
  salesChannelId: string
) => {
  const headerToken = getHeaderValue(request.headers["x-cart-session"])
  const cookieToken = readCookie(
    getHeaderValue(request.headers.cookie),
    CART_SESSION_COOKIE_NAME
  )
  const token = headerToken ?? cookieToken
  const claims = token
    ? verifyCartSessionToken(token, requireCartSessionSecret())
    : undefined

  if (
    !claims ||
    claims.cart_id !== cartId ||
    claims.sales_channel_id !== salesChannelId
  ) {
    return privateFlowNotFound()
  }
}

const retrievePaymentCart = async (
  request: MedusaStoreRequest,
  cartId: string,
  salesChannelId: string,
  allowCompleted: boolean
) => {
  const { data } = await resolveQuery(request).graph({
    entity: "cart",
    fields: [
      "id",
      "completed_at",
      "sales_channel_id",
      "items.id",
      "payment_collection.payment_sessions.id",
      "payment_collection.payment_sessions.provider_id",
      "payment_collection.payment_sessions.status",
      "payment_collection.payment_sessions.is_selected",
    ],
    filters: { id: cartId },
    pagination: { take: 1 },
  })
  const cart = (data as PaymentCartRecord[])[0]

  if (
    !cart ||
    cart.id !== cartId ||
    cart.sales_channel_id !== salesChannelId ||
    !cart.items?.length ||
    (!allowCompleted && cart.completed_at)
  ) {
    return privateFlowNotFound()
  }

  return cart
}

const resolveSelectedSession = (
  cart: PaymentCartRecord,
  providerId: string
) => {
  const providerSessions = (
    cart.payment_collection?.payment_sessions ?? []
  ).filter((session) => session.provider_id === providerId)
  const selectedSessions = providerSessions.filter(
    (session) => session.is_selected === true
  )

  if (selectedSessions.length === 1) {
    return selectedSessions[0]
  }
  return selectedSessions.length === 0 && providerSessions.length === 1
    ? providerSessions[0]
    : undefined
}

const assertExactPaymentSession = (
  cart: PaymentCartRecord,
  providerId: string,
  paymentSessionId: string
) => {
  const session = resolveSelectedSession(cart, providerId)
  if (
    !session ||
    session.id !== paymentSessionId ||
    session.provider_id !== providerId
  ) {
    return privateFlowNotFound()
  }

  return session
}

const retrieveOrderForCart = async (
  request: MedusaStoreRequest,
  cartId: string,
  salesChannelId: string
) => {
  // Medusa's remote order graph supports the persisted cart_id field, while
  // its public FilterableOrderProps declaration omits that internal relation.
  // Model the exact graph capability we use instead of weakening the call with
  // a cast or scanning orders by a broader public filter.
  const query = request.scope.resolve<OrderByCartQuery>(
    ContainerRegistrationKeys.QUERY
  )
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "cart_id", "sales_channel_id"],
    filters: { cart_id: cartId },
    pagination: { take: 2 },
  })
  const orders = (data as PaymentOrderRecord[]).filter(
    (order) =>
      order.cart_id === cartId && order.sales_channel_id === salesChannelId
  )

  if (orders.length > 1) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Payment-return cart resolved to more than one order"
    )
  }

  return orders[0]
}

const requireStoredState = async ({
  cartId,
  providerId,
  request,
  salesChannelId,
  state,
}: {
  cartId: string
  providerId: string
  request: MedusaStoreRequest
  salesChannelId: string
  state: string
}) => {
  const claims = verifyPaymentReturnState(state, requireCartSessionSecret())
  if (
    !claims ||
    claims.cart_id !== cartId ||
    claims.provider_id !== providerId ||
    claims.sales_channel_id !== salesChannelId
  ) {
    return privateFlowNotFound()
  }

  const records = await resolveService(request).listPaymentReturnStates(
    { state_hash: hashPaymentReturnState(state) },
    { take: 2 }
  )
  if (records.length !== 1) {
    return privateFlowNotFound()
  }

  const record = records[0]
  if (
    !record ||
    record.cart_id !== cartId ||
    record.provider_id !== providerId ||
    record.sales_channel_id !== salesChannelId ||
    !isFutureDate(record.expires_at)
  ) {
    return privateFlowNotFound()
  }

  return record
}

export const issuePaymentReturnState = async (
  request: MedusaStoreRequest,
  cartId: string,
  providerId: string
) => {
  const provider = requirePaymentReturnProvider(providerId)
  const salesChannelId = resolveExactMarketSalesChannelId(request)
  assertSignedCartSession(request, cartId, salesChannelId)
  await retrievePaymentCart(request, cartId, salesChannelId, false)

  const service = resolveService(request)
  const existing = await service.listPaymentReturnStates(
    { cart_id: cartId, provider_id: providerId },
    { select: ["id"], take: 10 }
  )
  if (existing.length) {
    await service.deletePaymentReturnStates(existing.map((row) => row.id))
  }

  const state = createPaymentReturnState(
    {
      cart_id: cartId,
      provider_id: providerId,
      sales_channel_id: salesChannelId,
    },
    requireCartSessionSecret()
  )
  const expiresAt = new Date(Date.now() + PAYMENT_RETURN_STATE_TTL_MS)
  await service.createPaymentReturnStates({
    cart_id: cartId,
    expires_at: expiresAt,
    last_seen_at: null,
    order_id: null,
    payment_session_id: null,
    provider_id: providerId,
    result_expires_at: null,
    result_token_hash: null,
    sales_channel_id: salesChannelId,
    state_hash: hashPaymentReturnState(state),
    terminal_status: null,
    used_at: null,
  })

  return {
    cart_id: cartId,
    expires_at: expiresAt.toISOString(),
    provider,
    provider_id: providerId,
    state,
  }
}

export const bindPaymentReturnState = async (
  request: MedusaStoreRequest,
  input: {
    cartId: string
    paymentSessionId: string
    providerId: string
    state: string
  }
) => {
  requirePaymentReturnProvider(input.providerId)
  const salesChannelId = resolveExactMarketSalesChannelId(request)
  assertSignedCartSession(request, input.cartId, salesChannelId)
  const record = await requireStoredState({
    cartId: input.cartId,
    providerId: input.providerId,
    request,
    salesChannelId,
    state: input.state,
  })
  const cart = await retrievePaymentCart(
    request,
    input.cartId,
    salesChannelId,
    false
  )
  assertExactPaymentSession(cart, input.providerId, input.paymentSessionId)

  if (
    record.payment_session_id &&
    record.payment_session_id !== input.paymentSessionId
  ) {
    return privateFlowNotFound()
  }
  if (!record.payment_session_id) {
    await resolveService(request).updatePaymentReturnStates({
      id: record.id,
      payment_session_id: input.paymentSessionId,
    })
  }

  return {
    cart_id: input.cartId,
    payment_session_id: input.paymentSessionId,
    provider_id: input.providerId,
  }
}

const projectSessionStatus = (
  status: string | null | undefined
): PaymentReturnProjection["status"] => {
  switch (status?.toLowerCase()) {
    case "authorized":
    case "captured":
      return "authorized"
    case "canceled":
    case "cancelled":
    case "error":
      return "cancelled"
    default:
      return "pending"
  }
}

export const resolvePaymentReturnState = async (
  request: MedusaStoreRequest,
  input: {
    cartId: string
    paymentSessionId?: string
    providerId: string
    state: string
  }
): Promise<PaymentReturnResolution> => {
  requirePaymentReturnProvider(input.providerId)
  const salesChannelId = resolveExactMarketSalesChannelId(request)
  assertSignedCartSession(request, input.cartId, salesChannelId)
  const record = await requireStoredState({
    cartId: input.cartId,
    providerId: input.providerId,
    request,
    salesChannelId,
    state: input.state,
  })
  if (
    !record.payment_session_id ||
    (input.paymentSessionId &&
      input.paymentSessionId !== record.payment_session_id) ||
    record.response_count >= MAX_PAYMENT_RETURN_RESOLUTIONS
  ) {
    return privateFlowNotFound()
  }

  if (record.terminal_status) {
    return resolveTerminalPaymentReturn(request, record, input)
  }

  const cart = await retrievePaymentCart(
    request,
    input.cartId,
    salesChannelId,
    true
  )
  const session = assertExactPaymentSession(
    cart,
    input.providerId,
    record.payment_session_id
  )
  const order = await retrieveOrderForCart(
    request,
    input.cartId,
    salesChannelId
  )
  const status: PaymentReturnProjection["status"] = order
    ? "completed"
    : projectSessionStatus(session.status)
  const isTerminal = status === "completed" || status === "cancelled"
  const now = new Date()
  const resultToken = createPaymentResultToken(
    record.state_hash,
    requireCartSessionSecret()
  )
  const resultExpiresAt = new Date(Date.now() + PAYMENT_RESULT_TOKEN_TTL_MS)
  await resolveService(request).updatePaymentReturnStates({
    id: record.id,
    last_seen_at: now,
    order_id: order?.id ?? null,
    response_count: record.response_count + 1,
    result_expires_at: resultExpiresAt,
    result_token_hash: hashPaymentReturnState(resultToken),
    terminal_status: isTerminal ? status : null,
    ...(isTerminal ? { used_at: now } : {}),
  })

  return {
    cart_id: input.cartId,
    payment_session_id: record.payment_session_id,
    provider_id: input.providerId,
    ...(order ? { public_order_id: order.id } : {}),
    result_token: resultToken,
    status,
  }
}

export const resolvePaymentResultSession = async (
  request: MedusaStoreRequest,
  resultToken: string
): Promise<PaymentReturnProjection> => {
  if (
    !OPAQUE_RESULT_TOKEN_PATTERN.test(resultToken) ||
    resultToken !== resultToken.trim()
  ) {
    return privateFlowNotFound()
  }

  const records = await resolveService(request).listPaymentReturnStates(
    { result_token_hash: hashPaymentReturnState(resultToken) },
    { take: 2 }
  )
  if (records.length !== 1) {
    return privateFlowNotFound()
  }
  const record = records[0]
  if (!(record?.payment_session_id && isFutureDate(record.result_expires_at))) {
    return privateFlowNotFound()
  }

  requirePaymentReturnProvider(record.provider_id)
  const salesChannelId = resolveExactMarketSalesChannelId(request)
  if (record.sales_channel_id !== salesChannelId) {
    return privateFlowNotFound()
  }
  assertSignedCartSession(request, record.cart_id, salesChannelId)
  const cart = await retrievePaymentCart(
    request,
    record.cart_id,
    salesChannelId,
    true
  )
  const session = assertExactPaymentSession(
    cart,
    record.provider_id,
    record.payment_session_id
  )
  const order = await retrieveOrderForCart(
    request,
    record.cart_id,
    salesChannelId
  )
  const status: PaymentReturnProjection["status"] = order
    ? "completed"
    : projectSessionStatus(session.status)

  return {
    cart_id: record.cart_id,
    payment_session_id: record.payment_session_id,
    provider_id: record.provider_id,
    ...(order ? { public_order_id: order.id } : {}),
    status,
  }
}

export const isPrivateFlowNotFoundError = (error: unknown) =>
  Boolean(
    error &&
      typeof error === "object" &&
      "type" in error &&
      error.type === "not_found"
  )

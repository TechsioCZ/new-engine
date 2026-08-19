import type { HttpTypes } from "@medusajs/types"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { Market } from "@/lib/url/types"
import type { SourceReadResult } from "@/lib/url-registry/reads"

const PRIVATE_FLOW_TIMEOUT_MS = 5000
const CHECKOUT_STEPS = ["contact", "shipping", "payment", "review"] as const

export type ReachableCheckoutStep = (typeof CHECKOUT_STEPS)[number]

export type CheckoutSessionProjection = Readonly<{
  cartId: string
  defaultStep: ReachableCheckoutStep
  reachableSteps: readonly ReachableCheckoutStep[]
}>

export type CheckoutSessionResult =
  | SourceReadResult<CheckoutSessionProjection>
  | Readonly<{ kind: "invalid-provider" }>

export type PaymentResultProjection = Readonly<{
  cartId: string
  paymentSessionId: string
  providerId: string
  publicOrderId?: string
  status: "authorized" | "cancelled" | "completed" | "pending"
}>

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

type TransactionalFlowReaderDependencies = Readonly<{
  baseUrl: string
  fetch: FetchLike
  resolveMarket: (market: Market) => MarketRuntimeBinding | null
}>

type PrivatePostInput = Readonly<{
  bearerToken?: string
  body: Readonly<Record<string, string>>
  cartSessionToken?: string
  path: string
}>

type OrderConfirmationPayload = Readonly<{
  order?: HttpTypes.StoreOrder
}>

type ReviewInvitationPayload = Readonly<{
  product_id?: unknown
}>

type ResetTokenPayload = Readonly<{
  valid?: unknown
}>

type DeactivationTokenPayload = Readonly<{
  valid?: unknown
}>

type CheckoutSessionPayload = Readonly<{
  cart_id?: unknown
  default_step?: unknown
  invalid_provider_state?: unknown
  reachable_steps?: unknown
}>

type PaymentResultPayload = Readonly<{
  cart_id?: unknown
  payment_session_id?: unknown
  provider_id?: unknown
  public_order_id?: unknown
  status?: unknown
}>

const jsonPayload = async <Value>(
  response: Response
): Promise<Value | null> => {
  try {
    return (await response.json()) as Value
  } catch {
    return null
  }
}

const unavailable = <Value>(): SourceReadResult<Value> => ({
  kind: "unavailable",
  retryAfterSeconds: 30,
})

const missingStatuses = new Set([400, 401, 403, 404, 409, 410])

const resolveBinding = (
  dependencies: TransactionalFlowReaderDependencies,
  market: Market
) => {
  try {
    return dependencies.resolveMarket(market)
  } catch {
    return null
  }
}

const privatePostHeaders = (
  binding: MarketRuntimeBinding,
  input: PrivatePostInput
): HeadersInit => ({
  accept: "application/json",
  ...(input.bearerToken
    ? { authorization: `Bearer ${input.bearerToken}` }
    : {}),
  "content-type": "application/json",
  ...(input.cartSessionToken
    ? { "x-cart-session": input.cartSessionToken }
    : {}),
  "x-publishable-api-key": binding.publishableApiKey,
})

const isCheckoutStep = (value: unknown): value is ReachableCheckoutStep =>
  typeof value === "string" &&
  CHECKOUT_STEPS.includes(value as ReachableCheckoutStep)

const isPaymentResultStatus = (
  value: unknown
): value is PaymentResultProjection["status"] =>
  value === "pending" ||
  value === "authorized" ||
  value === "completed" ||
  value === "cancelled"

const readProjection = (
  payload: CheckoutSessionPayload | null,
  cartId: string
): CheckoutSessionResult => {
  const reachable = payload?.reachable_steps
  if (payload?.invalid_provider_state === true) {
    return { kind: "invalid-provider" }
  }
  if (
    payload?.cart_id !== cartId ||
    payload.invalid_provider_state !== false ||
    !isCheckoutStep(payload.default_step) ||
    !Array.isArray(reachable) ||
    reachable.length === 0 ||
    !reachable.every(isCheckoutStep) ||
    new Set(reachable).size !== reachable.length ||
    !reachable.includes(payload.default_step)
  ) {
    return { kind: "missing" }
  }
  return {
    kind: "found",
    value: {
      cartId,
      defaultStep: payload.default_step,
      reachableSteps: reachable,
    },
  }
}

export const createMedusaTransactionalFlowReader = (
  dependencies: TransactionalFlowReaderDependencies
) => {
  const post = async <Payload>(
    market: Market,
    input: PrivatePostInput
  ): Promise<SourceReadResult<Payload>> => {
    const binding = resolveBinding(dependencies, market)
    if (!binding) {
      return unavailable()
    }
    try {
      const response = await dependencies.fetch(
        new URL(input.path, dependencies.baseUrl),
        {
          body: JSON.stringify(input.body),
          cache: "no-store",
          headers: privatePostHeaders(binding, input),
          method: "POST",
          signal: AbortSignal.timeout(PRIVATE_FLOW_TIMEOUT_MS),
        }
      )
      if (missingStatuses.has(response.status)) {
        return { kind: "missing" }
      }
      if (!response.ok) {
        return unavailable()
      }
      const payload = await jsonPayload<Payload>(response)
      return payload ? { kind: "found", value: payload } : unavailable()
    } catch {
      return unavailable()
    }
  }

  return {
    async readDeactivationToken(
      market: Market,
      token: string
    ): Promise<SourceReadResult<Readonly<{ valid: true }>>> {
      const result = await post<DeactivationTokenPayload>(market, {
        body: { token },
        path: "/store/customers/deactivate/validate",
      })
      if (result.kind !== "found") {
        return result
      }
      return result.value.valid === true
        ? { kind: "found", value: { valid: true } }
        : { kind: "missing" }
    },

    async readCheckoutSession(
      market: Market,
      cartId: string,
      cartSessionToken: string
    ): Promise<CheckoutSessionResult> {
      const result = await post<CheckoutSessionPayload>(market, {
        body: { cart_id: cartId },
        cartSessionToken,
        path: "/store/cart-session/resolve",
      })
      return result.kind === "found"
        ? readProjection(result.value, cartId)
        : result
    },

    async readOrderConfirmation(
      market: Market,
      input: Readonly<{
        customerToken?: string
        orderId: string
        orderToken?: string
      }>
    ): Promise<SourceReadResult<Readonly<{ order: HttpTypes.StoreOrder }>>> {
      const result = await post<OrderConfirmationPayload>(market, {
        bearerToken: input.customerToken,
        body: {
          public_order_id: input.orderId,
          ...(input.orderToken ? { order_token: input.orderToken } : {}),
        },
        path: "/store/order-confirmations/resolve",
      })
      if (result.kind !== "found") {
        return result
      }
      return result.value.order?.id === input.orderId
        ? { kind: "found", value: { order: result.value.order } }
        : { kind: "missing" }
    },

    async readPaymentResult(
      market: Market,
      input: Readonly<{
        cartSessionToken: string
        resultToken: string
      }>
    ): Promise<SourceReadResult<PaymentResultProjection>> {
      const result = await post<PaymentResultPayload>(market, {
        body: { result_token: input.resultToken },
        cartSessionToken: input.cartSessionToken,
        path: "/store/payment-returns/result",
      })
      if (result.kind !== "found") {
        return result
      }
      const payload = result.value
      const rawPublicOrderId = payload.public_order_id
      const publicOrderId =
        typeof rawPublicOrderId === "string" && rawPublicOrderId.length > 0
          ? rawPublicOrderId
          : undefined
      if (
        typeof payload.cart_id !== "string" ||
        !payload.cart_id ||
        typeof payload.provider_id !== "string" ||
        !payload.provider_id ||
        typeof payload.payment_session_id !== "string" ||
        !payload.payment_session_id ||
        !isPaymentResultStatus(payload.status) ||
        (rawPublicOrderId !== undefined && publicOrderId === undefined) ||
        (payload.status === "completed") !== (publicOrderId !== undefined)
      ) {
        return { kind: "missing" }
      }
      return {
        kind: "found",
        value: {
          cartId: payload.cart_id,
          paymentSessionId: payload.payment_session_id,
          providerId: payload.provider_id,
          ...(publicOrderId ? { publicOrderId } : {}),
          status: payload.status,
        },
      }
    },

    async readResetToken(
      market: Market,
      token: string
    ): Promise<SourceReadResult<Readonly<{ valid: true }>>> {
      const result = await post<ResetTokenPayload>(market, {
        bearerToken: token,
        body: {},
        path: "/auth/customer/emailpass/reset-password/validate",
      })
      if (result.kind !== "found") {
        return result
      }
      return result.value.valid === true
        ? { kind: "found", value: { valid: true } }
        : { kind: "missing" }
    },

    async readReviewInvitation(
      market: Market,
      token: string
    ): Promise<SourceReadResult<Readonly<{ productId: string }>>> {
      const result = await post<ReviewInvitationPayload>(market, {
        body: { token },
        path: "/store/review-invitations/resolve",
      })
      if (result.kind !== "found") {
        return result
      }
      const productId = result.value.product_id
      return typeof productId === "string" && productId.length > 0
        ? { kind: "found", value: { productId } }
        : { kind: "missing" }
    },
  }
}

import type {
  ProductLifecycleDecision,
  ProductLifecycleReceiptAction,
} from "../product-lifecycle"
import {
  type ProductLifecycleDeliveryV1,
  parseProductLifecycleDeliveryV1,
} from "../product-lifecycle-parser"
import { readBoundedTextBody } from "./bounded-body-reader"
import { verifyBearerAuthorization } from "./command-auth"

type RetryDecision = Extract<ProductLifecycleDecision, { kind: "retry" }> &
  Readonly<{ retryAfterSeconds?: number }>
type ConflictDecision = Extract<ProductLifecycleDecision, { kind: "conflict" }>

export type ProductLifecycleConsumeResult =
  | Readonly<{
      kind: "acknowledged"
      action: ProductLifecycleReceiptAction
      replayed: boolean
    }>
  | RetryDecision
  | ConflictDecision

export type ProductLifecycleEndpointDependencies = Readonly<{
  enabled: boolean
  lifecycleToken: string | undefined
  consume(
    delivery: ProductLifecycleDeliveryV1
  ): Promise<ProductLifecycleConsumeResult>
}>

const MAX_BODY_BYTES = 64 * 1024
const DEFAULT_RETRY_AFTER_SECONDS = 5
const MAX_RETRY_AFTER_SECONDS = 3600
const PRIVATE_NO_STORE = "private, no-store, max-age=0"

const responseHeaders = {
  "cache-control": PRIVATE_NO_STORE,
  "x-robots-tag": "noindex, nofollow",
}

const jsonError = (error: string, status: number, headers?: HeadersInit) =>
  Response.json(
    { error },
    { headers: { ...responseHeaders, ...headers }, status }
  )

const retryAfterSeconds = (value: number | undefined) => {
  if (!(Number.isSafeInteger(value) && Number(value) > 0)) {
    return DEFAULT_RETRY_AFTER_SECONDS
  }
  return Math.min(Number(value), MAX_RETRY_AFTER_SECONDS)
}

const retry = (error: string, requestedSeconds?: number) =>
  jsonError(error, 503, {
    "retry-after": String(retryAfterSeconds(requestedSeconds)),
  })

const mediaTypeIsJson = (request: Request) =>
  request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase() === "application/json"

const parseDelivery = (body: string): ProductLifecycleDeliveryV1 | null => {
  try {
    return parseProductLifecycleDeliveryV1(JSON.parse(body))
  } catch {
    return null
  }
}

type ConsumerOrderingErrorCode =
  | "DELIVERY_DRIFT"
  | "SEQUENCE_GAP"
  | "STALE_DELIVERY"

const orderingErrorCode = (
  error: unknown
): ConsumerOrderingErrorCode | null => {
  if (!(error && typeof error === "object")) {
    return null
  }
  const record = error as Readonly<Record<string, unknown>>
  if (record.name !== "ProductLifecycleConsumerError") {
    return null
  }
  return record.code === "DELIVERY_DRIFT" ||
    record.code === "SEQUENCE_GAP" ||
    record.code === "STALE_DELIVERY"
    ? record.code
    : null
}

const consumerFailure = (error: unknown) => {
  const code = orderingErrorCode(error)
  if (code === "SEQUENCE_GAP") {
    return retry("source-event-gap")
  }
  if (code === "DELIVERY_DRIFT" || code === "STALE_DELIVERY") {
    return jsonError("source-event-conflict", 409)
  }
  return retry("service-unavailable")
}

const acknowledge = (
  delivery: ProductLifecycleDeliveryV1,
  action: ProductLifecycleReceiptAction,
  replayed: boolean
) =>
  Response.json(
    {
      schemaVersion: 1,
      outcome: replayed ? "already-applied" : "applied",
      action,
      replayed,
      outboxEventId: delivery.outboxEventId,
      marketCode: delivery.marketCode,
      streamSequence: delivery.streamSequence,
    },
    { headers: responseHeaders, status: 200 }
  )

export const handleProductLifecycleRequest = async (
  request: Request,
  dependencies: ProductLifecycleEndpointDependencies
): Promise<Response> => {
  if (!dependencies.enabled) {
    return jsonError("not-found", 404)
  }

  const authorization = verifyBearerAuthorization(
    request.headers.get("authorization"),
    dependencies.lifecycleToken
  )
  if (authorization === "misconfigured") {
    return retry("service-unavailable")
  }
  if (authorization !== "authorized") {
    return jsonError("unauthorized", 401, { "www-authenticate": "Bearer" })
  }
  if (!mediaTypeIsJson(request)) {
    return jsonError("invalid-delivery", 400)
  }

  let body: Awaited<ReturnType<typeof readBoundedTextBody>>
  try {
    body = await readBoundedTextBody(request, MAX_BODY_BYTES)
  } catch {
    return retry("service-unavailable")
  }
  if (body.kind === "too-large") {
    return jsonError("payload-too-large", 413)
  }
  if (body.kind !== "text") {
    return jsonError("invalid-delivery", 400)
  }

  const delivery = parseDelivery(body.value)
  if (!delivery) {
    return jsonError("invalid-delivery", 400)
  }

  try {
    const result = await dependencies.consume(delivery)
    if (result.kind === "acknowledged") {
      return acknowledge(delivery, result.action, result.replayed)
    }
    if (result.kind === "retry") {
      return retry(result.cause, result.retryAfterSeconds)
    }
    if (result.kind === "conflict") {
      return jsonError(result.cause, 409)
    }
    return retry("service-unavailable")
  } catch (error) {
    return consumerFailure(error)
  }
}

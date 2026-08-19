import type { ClaimedUrlRegistryOutboxEvent } from "../../modules/url-registry-outbox/delivery-state-contracts"

export const URL_REGISTRY_REQUEST_TIMEOUT_MS = 5000
export const URL_REGISTRY_REQUEST_LIMIT_BYTES = 64 * 1024
export const URL_REGISTRY_RESPONSE_LIMIT_BYTES = 16 * 1024
export const URL_REGISTRY_MAX_RETRY_DELAY_MS = 60 * 60 * 1000

const PERMANENT_HTTP_STATUSES = new Set([400, 409, 413])
const ACK_KEYS = new Set([
  "action",
  "marketCode",
  "outboxEventId",
  "outcome",
  "replayed",
  "schemaVersion",
  "streamSequence",
])
const ACK_ACTIONS = new Set([
  "noop-route-missing",
  "noop-route-terminal",
  "noop-source-missing",
  "noop-source-present",
  "requires-publication",
  "retired",
])
const ASCII_DIGITS = /^\d+$/
const ignoreCancellationError = () => null

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>

export type UrlRegistryDeliveryAttempt =
  | Readonly<{
      kind: "acknowledge"
      outcome: "already-applied" | "applied"
    }>
  | Readonly<{ errorCode: string; kind: "fail" }>
  | Readonly<{
      errorCode: string
      kind: "retry"
      retryAfterMs?: number
    }>

type DeliveryClientConfig = Readonly<{
  endpoint: string
  token: string
}>

type DeliveryClientOptions = Readonly<{
  fetchImpl?: FetchLike
  now?: () => number
}>

const deliveryBody = (event: ClaimedUrlRegistryOutboxEvent) => ({
  schemaVersion: 1,
  outboxEventId: event.id,
  eventId: event.eventId,
  envelopeFingerprint: event.envelopeFingerprint,
  source: "medusa",
  entityKind: "product",
  entityId: event.entityId,
  marketCode: event.marketCode,
  streamSequence: event.streamSequence,
  changeType: event.changeType,
  occurredAt: event.occurredAt,
  payload: event.payload,
})

const parseRetryAfter = (
  value: string | null,
  now: () => number
): number | undefined => {
  if (!value) {
    return
  }
  let milliseconds: number
  if (ASCII_DIGITS.test(value)) {
    milliseconds = Number(value) * 1000
  } else {
    milliseconds = Date.parse(value) - now()
  }
  if (!(Number.isFinite(milliseconds) && milliseconds >= 0)) {
    return
  }
  return Math.min(milliseconds, URL_REGISTRY_MAX_RETRY_DELAY_MS)
}

const readBoundedResponse = async (
  response: Response
): Promise<{ kind: "text"; value: string } | { kind: "too-large" }> => {
  const reader = response.body?.getReader()
  if (!reader) {
    return { kind: "text", value: "" }
  }
  const decoder = new TextDecoder()
  let bytes = 0
  let value = ""
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) {
      return { kind: "text", value: value + decoder.decode() }
    }
    bytes += chunk.value.byteLength
    if (bytes > URL_REGISTRY_RESPONSE_LIMIT_BYTES) {
      await reader.cancel().catch(ignoreCancellationError)
      return { kind: "too-large" }
    }
    value += decoder.decode(chunk.value, { stream: true })
  }
}

const exactAck = (
  value: unknown,
  event: ClaimedUrlRegistryOutboxEvent
): "already-applied" | "applied" | null => {
  if (!(value && typeof value === "object" && !Array.isArray(value))) {
    return null
  }
  const ack = value as Record<string, unknown>
  const keys = Object.keys(ack)
  if (keys.length !== ACK_KEYS.size || keys.some((key) => !ACK_KEYS.has(key))) {
    return null
  }
  const outcome = ack.outcome
  const replayed = ack.replayed
  if (
    ack.schemaVersion !== 1 ||
    ack.outboxEventId !== event.id ||
    ack.marketCode !== event.marketCode ||
    ack.streamSequence !== event.streamSequence ||
    typeof ack.action !== "string" ||
    !ACK_ACTIONS.has(ack.action) ||
    (outcome !== "applied" && outcome !== "already-applied") ||
    (outcome === "applied" && replayed !== false) ||
    (outcome === "already-applied" && replayed !== true)
  ) {
    return null
  }
  return outcome
}

const parseAcknowledgement = async (
  response: Response,
  event: ClaimedUrlRegistryOutboxEvent
): Promise<UrlRegistryDeliveryAttempt> => {
  if (
    response.headers.get("content-type")?.split(";", 1)[0]?.trim() !==
    "application/json"
  ) {
    return { errorCode: "invalid-ack", kind: "retry" }
  }
  const body = await readBoundedResponse(response)
  if (body.kind === "too-large") {
    return { errorCode: "response-too-large", kind: "retry" }
  }
  try {
    const outcome = exactAck(JSON.parse(body.value), event)
    return outcome
      ? { kind: "acknowledge", outcome }
      : { errorCode: "invalid-ack", kind: "retry" }
  } catch {
    return { errorCode: "invalid-ack", kind: "retry" }
  }
}

export const deliverUrlRegistryOutboxEvent = async (
  event: ClaimedUrlRegistryOutboxEvent,
  config: DeliveryClientConfig,
  options: DeliveryClientOptions = {}
): Promise<UrlRegistryDeliveryAttempt> => {
  if (event.source !== "medusa" || event.entityKind !== "product") {
    return { errorCode: "unsupported-delivery-topic", kind: "fail" }
  }
  const body = JSON.stringify(deliveryBody(event))
  if (
    new TextEncoder().encode(body).byteLength > URL_REGISTRY_REQUEST_LIMIT_BYTES
  ) {
    return { errorCode: "request-too-large", kind: "fail" }
  }
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    URL_REGISTRY_REQUEST_TIMEOUT_MS
  )
  try {
    const response = await (options.fetchImpl ?? fetch)(config.endpoint, {
      body,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${config.token}`,
        "content-type": "application/json",
      },
      method: "POST",
      redirect: "error",
      signal: controller.signal,
    })
    if (response.status === 200) {
      return await parseAcknowledgement(response, event)
    }
    await response.body?.cancel().catch(ignoreCancellationError)
    const errorCode = `http-${response.status}`
    if (PERMANENT_HTTP_STATUSES.has(response.status)) {
      return { errorCode, kind: "fail" }
    }
    const retryAfterMs = parseRetryAfter(
      response.headers.get("retry-after"),
      options.now ?? Date.now
    )
    return {
      errorCode,
      kind: "retry",
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    }
  } catch {
    return {
      errorCode: controller.signal.aborted ? "timeout" : "network-error",
      kind: "retry",
    }
  } finally {
    clearTimeout(timeout)
  }
}

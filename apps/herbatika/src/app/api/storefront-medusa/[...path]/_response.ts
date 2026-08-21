import { resolveStorefrontApiMessages } from "@/app/api/_messages"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024
const TEXTUAL_RESPONSE_PATTERN =
  /(?:json|text|javascript|xml|x-www-form-urlencoded)/

const STRIPPED_RESPONSE_HEADERS = new Set([
  "authorization",
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "location",
  "proxy-authenticate",
  "proxy-authorization",
  "set-cookie",
  "surrogate-control",
  "transfer-encoding",
  "upgrade",
  "x-publishable-api-key",
])

export const noStoreHeaders = (headers?: HeadersInit) => {
  const result = new Headers(headers)
  result.set("cache-control", "private, no-store, max-age=0")
  result.set("expires", "0")
  result.set("pragma", "no-cache")
  return result
}

export const jsonError = (
  status: number,
  message: string,
  headers?: HeadersInit
) =>
  Response.json(
    { message },
    {
      status,
      headers: noStoreHeaders(headers),
    }
  )

const redactSecret = (value: string, secret: string) =>
  secret ? value.replaceAll(secret, "[REDACTED]") : value

const copyResponseHeaders = (
  source: Headers,
  publishableApiKey: string
): Headers => {
  const result = new Headers()
  source.forEach((value, name) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(name)) {
      result.append(name, redactSecret(value, publishableApiKey))
    }
  })
  return noStoreHeaders(result)
}

const readBoundedBody = async (
  response: Response
): Promise<ArrayBuffer | null> => {
  const declaredLength = Number(response.headers.get("content-length") ?? "0")
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel()
    return null
  }

  if (!response.body) {
    return new ArrayBuffer(0)
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalLength = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    totalLength += value.byteLength
    if (totalLength > MAX_RESPONSE_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }

  const joined = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  return joined.buffer
}

const isTextualResponse = (headers: Headers) => {
  const contentType = headers.get("content-type")?.toLowerCase() ?? ""
  return TEXTUAL_RESPONSE_PATTERN.test(contentType)
}

export const buildGatewayResponse = async (
  upstream: Response,
  binding: MarketRuntimeBinding
): Promise<Response> => {
  const messages = resolveStorefrontApiMessages(binding.market)
  if (upstream.status >= 300 && upstream.status < 400) {
    await upstream.body?.cancel()
    return jsonError(502, messages.gatewayRedirectRejected)
  }

  const headers = copyResponseHeaders(
    upstream.headers,
    binding.publishableApiKey
  )
  let body: BodyInit | null = null

  if (upstream.status !== 204 && upstream.status !== 304) {
    const responseBody = await readBoundedBody(upstream)
    if (!responseBody) {
      return jsonError(502, messages.gatewayResponseTooLarge)
    }
    body = isTextualResponse(upstream.headers)
      ? redactSecret(
          new TextDecoder().decode(responseBody),
          binding.publishableApiKey
        )
      : responseBody
  }

  return new Response(body, {
    headers,
    status: upstream.status,
    statusText: upstream.statusText,
  })
}

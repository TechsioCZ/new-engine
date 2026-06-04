import { Transform } from "node:stream"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/utils"

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])
const TRAILING_SLASH_PATTERN = /\/$/
const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
const DEFAULT_UPSTREAM_TIMEOUT_MS = 30_000

const getMaxUploadBytes = () => {
  const configured = Number(process.env.PAYLOAD_IMPORT_MAX_UPLOAD_BYTES)
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_UPLOAD_BYTES
}

const getUpstreamTimeoutMs = () => {
  const configured = Number(process.env.PAYLOAD_IMPORT_UPSTREAM_TIMEOUT_MS)
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_UPSTREAM_TIMEOUT_MS
}

const createLimitedUploadStream = (req: MedusaRequest, maxBytes: number) => {
  let totalBytes = 0
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      totalBytes += chunk.length
      if (totalBytes > maxBytes) {
        callback(
          new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Upload exceeds ${maxBytes} bytes limit`
          )
        )
        return
      }

      callback(null, chunk)
    },
  })

  return (req as unknown as NodeJS.ReadableStream).pipe(limiter)
}

const resolvePayloadBaseUrl = () => {
  const configuredUrl =
    process.env.PAYLOAD_INTERNAL_URL ??
    process.env.PAYLOAD_BASE_URL ??
    process.env.PAYLOAD_IFRAME_URL

  if (!configuredUrl) {
    return "http://payload:8083"
  }

  try {
    const url = new URL(configuredUrl)
    if (LOCAL_HOSTS.has(url.hostname)) {
      return `http://payload:${url.port || "8083"}`
    }

    return url.origin
  } catch {
    return configuredUrl.replace(TRAILING_SLASH_PATTERN, "")
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payloadApiKey = process.env.PAYLOAD_API_KEY
  if (!payloadApiKey) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PAYLOAD_API_KEY is not configured"
    )
  }

  const contentType = req.headers["content-type"]
  if (
    !(
      typeof contentType === "string" &&
      contentType.includes("multipart/form-data")
    )
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Expected multipart/form-data upload"
    )
  }

  const maxUploadBytes = getMaxUploadBytes()
  const contentLength = Number(req.headers["content-length"])
  if (Number.isFinite(contentLength) && contentLength > maxUploadBytes) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Upload exceeds ${maxUploadBytes} bytes limit`
    )
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getUpstreamTimeoutMs())

  try {
    const response = await fetch(
      `${resolvePayloadBaseUrl()}/api/article-import`,
      {
        method: "POST",
        headers: {
          "content-type": contentType,
          "x-payload-api-key": payloadApiKey,
        },
        body: createLimitedUploadStream(
          req,
          maxUploadBytes
        ) as unknown as RequestInit["body"],
        duplex: "half",
        signal: controller.signal,
      } as RequestInit & { duplex: "half" }
    )

    const responseBody = await response.text()
    res.status(response.status)
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") ?? "application/json"
    )
    return res.send(responseBody)
  } catch (error) {
    if (error instanceof MedusaError) {
      throw error
    }

    if (error instanceof Error && error.name === "AbortError") {
      res.status(504)
      return res.json({ message: "Payload import timed out" })
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }
}

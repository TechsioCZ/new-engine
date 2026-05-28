import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/utils"

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])
const TRAILING_SLASH_PATTERN = /\/$/

const readBody = (req: MedusaRequest) =>
  new Promise<Buffer>((resolve, reject) => {
    const stream = req as unknown as NodeJS.ReadableStream
    const chunks: Buffer[] = []

    stream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)
  })

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

  const body = await readBody(req)
  const response = await fetch(
    `${resolvePayloadBaseUrl()}/api/article-import`,
    {
      method: "POST",
      headers: {
        "content-type": contentType,
        "x-payload-api-key": payloadApiKey,
      },
      body,
    }
  )

  const responseBody = await response.text()
  res.status(response.status)
  res.setHeader(
    "Content-Type",
    response.headers.get("content-type") ?? "application/json"
  )
  return res.send(responseBody)
}

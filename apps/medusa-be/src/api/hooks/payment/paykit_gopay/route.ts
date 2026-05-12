import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID } from "../../../../modules/payment-paykit/config"
import { emitPaykitPaymentWebhookEvent } from "../../../../modules/payment-paykit/webhooks"

type RequestWithUrlParts = MedusaRequest & {
  originalUrl?: string
  protocol?: string
  get?: (name: string) => string | undefined
}

const getHeaderValue = (
  req: MedusaRequest,
  header: string
): string | undefined => {
  const value = req.headers[header]

  if (Array.isArray(value)) {
    return value[0]
  }

  return typeof value === "string" ? value : undefined
}

const getForwardedHeaderValue = (
  req: MedusaRequest,
  header: string
): string | undefined => getHeaderValue(req, header)?.split(",")[0]?.trim()

const getRequestUrl = (req: MedusaRequest): string => {
  const reqWithUrlParts = req as RequestWithUrlParts
  const url = reqWithUrlParts.originalUrl ?? req.url

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }

  const host =
    getForwardedHeaderValue(req, "x-forwarded-host") ??
    getHeaderValue(req, "host") ??
    reqWithUrlParts.get?.("host")

  if (!host) {
    return url
  }

  const protocol =
    getForwardedHeaderValue(req, "x-forwarded-proto") ??
    reqWithUrlParts.protocol ??
    "https"

  return `${protocol}://${host}${url}`
}

const hasGopayPaymentId = (url: string): boolean => {
  try {
    return Boolean(new URL(url).searchParams.get("id"))
  } catch {
    return false
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const fullUrl = getRequestUrl(req)

  if (!hasGopayPaymentId(fullUrl)) {
    res.status(400).json({ error: "Missing GoPay payment id" })
    return
  }

  await emitPaykitPaymentWebhookEvent({
    req,
    provider: PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID,
    data: {
      fullUrl,
      url: req.url,
    },
  })

  res.sendStatus(200)
}

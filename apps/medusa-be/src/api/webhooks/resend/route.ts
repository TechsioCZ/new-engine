import crypto from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  RESEND_CONFIG_MODULE,
  type ResendConfigModuleService,
} from "../../../modules/resend-config"
import { CHECKED_RESEND_EVENT_TYPES } from "../../../utils/resend-webhook-events"
import { processResendWebhookEventWorkflow } from "../../../workflows/resend-webhook/process-resend-webhook-event"
import type { ResendWebhookEvent } from "../../../workflows/resend-webhook/types"

const SVIX_TOLERANCE_IN_SECONDS = 5 * 60

function getHeader(req: MedusaRequest, header: string) {
  const value = req.headers[header]

  return Array.isArray(value) ? value[0] : value
}

function getPayload(req: MedusaRequest) {
  const requestWithRawBody = req as MedusaRequest & {
    rawBody?: Buffer | string
  }

  if (Buffer.isBuffer(requestWithRawBody.rawBody)) {
    return requestWithRawBody.rawBody.toString("utf8")
  }

  if (typeof requestWithRawBody.rawBody === "string") {
    return requestWithRawBody.rawBody
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "Resend webhook requires the raw request body for signature verification"
  )
}

function getSvixSecret(secret: string) {
  const secretValue = secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret

  return Buffer.from(secretValue, "base64")
}

function verifySvixSignature({
  id,
  payload,
  secret,
  signature,
  timestamp,
}: {
  id: string
  payload: string
  secret: string
  signature: string
  timestamp: string
}) {
  if (!(id && signature && timestamp)) {
    return false
  }

  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber)) {
    return false
  }

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestampNumber) > SVIX_TOLERANCE_IN_SECONDS) {
    return false
  }

  const signedPayload = `${id}.${timestamp}.${payload}`
  const expectedSignature = crypto
    .createHmac("sha256", getSvixSecret(secret))
    .update(signedPayload)
    .digest("base64")

  return signature.split(" ").some((part) => {
    const [, value] = part.split(",")
    if (typeof value !== "string") {
      return false
    }

    const signatureBuffer = Buffer.from(value)
    const expectedSignatureBuffer = Buffer.from(expectedSignature)

    if (signatureBuffer.length !== expectedSignatureBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  })
}

function parsePayload(payload: string) {
  return JSON.parse(payload) as ResendWebhookEvent
}

function hasRequiredResendWebhookFields(
  event: ResendWebhookEvent
): event is ResendWebhookEvent & {
  data: { email_id: string; [key: string]: unknown }
  type: string
} {
  return Boolean(event.type && event.data?.email_id)
}

const getResendWebhookSecret = async (req: MedusaRequest): Promise<string> => {
  const service =
    req.scope.resolve<ResendConfigModuleService>(RESEND_CONFIG_MODULE)
  const webhookSecret = await service.getWebhookSecret()

  if (!webhookSecret) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Resend webhook secret is not configured in Settings → Resend"
    )
  }

  return webhookSecret
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = getPayload(req)
  const webhookSecret = await getResendWebhookSecret(req)
  const eventId = getHeader(req, "svix-id") ?? ""
  const isValidSignature = verifySvixSignature({
    id: eventId,
    payload,
    secret: webhookSecret,
    signature: getHeader(req, "svix-signature") ?? "",
    timestamp: getHeader(req, "svix-timestamp") ?? "",
  })

  if (!isValidSignature) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid Resend webhook signature"
    )
  }

  const event = parsePayload(payload)

  if (!hasRequiredResendWebhookFields(event)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid Resend webhook payload"
    )
  }

  const emailId = event.data.email_id

  if (!CHECKED_RESEND_EVENT_TYPES.has(event.type)) {
    res.json({ received: true, checked: false })
    return
  }

  const { result } = await processResendWebhookEventWorkflow(req.scope).run({
    input: {
      email_id: emailId,
      event,
      event_id: eventId,
    },
  })

  res.json({
    checked: result.checked_count > 0,
    checked_count: result.checked_count,
    email_id: emailId,
    received: true,
    type: event.type,
  })
}

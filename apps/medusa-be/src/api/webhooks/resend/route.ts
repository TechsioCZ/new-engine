import crypto from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { EMAIL_LOG_MODULE } from "../../../modules/email-log"
import type EmailLogModuleService from "../../../modules/email-log/service"
import { CHECKED_RESEND_EVENT_TYPES } from "../../../utils/resend-webhook-events"

type ResendWebhookEvent = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    [key: string]: unknown
  }
}

type EmailLogDTO = {
  id: string
  email_id: string
  checked_at: Date | null
}

type EmailLogService = EmailLogModuleService & {
  createEmailWebhookEvents: (
    data: {
      email_id: string
      payload: ResendWebhookEvent
      processed_at: Date | null
      received_at: Date
      type: string
    }[]
  ) => Promise<unknown[]>
  listEmailLogs: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<EmailLogDTO[]>
  updateEmailLogs: (
    data: { id: string; checked_at: Date }[]
  ) => Promise<EmailLogDTO[]>
}

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

  return JSON.stringify(req.body ?? {})
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

function parsePayload(payload: string, body: unknown) {
  if (body && typeof body === "object") {
    return body as ResendWebhookEvent
  }

  return JSON.parse(payload) as ResendWebhookEvent
}

async function markEmailLogChecked({
  emailId,
  emailLogService,
}: {
  emailId: string
  emailLogService: EmailLogService
}) {
  const emailLogs = await emailLogService.listEmailLogs(
    { email_id: emailId },
    { select: ["id", "email_id", "checked_at"] }
  )

  const uncheckedLogs = emailLogs.filter((emailLog) => !emailLog.checked_at)
  if (!uncheckedLogs.length) {
    return {
      checkedCount: 0,
      foundCount: emailLogs.length,
    }
  }

  await emailLogService.updateEmailLogs(
    uncheckedLogs.map((emailLog) => ({
      id: emailLog.id,
      checked_at: new Date(),
    }))
  )

  return {
    checkedCount: uncheckedLogs.length,
    foundCount: emailLogs.length,
  }
}

async function storePendingWebhookEvent({
  emailId,
  emailLogService,
  event,
}: {
  emailId: string
  emailLogService: EmailLogService
  event: ResendWebhookEvent
}) {
  await emailLogService.createEmailWebhookEvents([
    {
      email_id: emailId,
      payload: event,
      processed_at: null,
      received_at: new Date(),
      type: event.type as string,
    },
  ])
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const payload = getPayload(req)
  const webhookSecret =
    process.env.RESEND_WEBHOOK_SECRET ??
    process.env.DC_N1_MEDUSA_RESEND_WEBHOOK_SECRET

  if (webhookSecret) {
    const isValidSignature = verifySvixSignature({
      id: getHeader(req, "svix-id") ?? "",
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
  }

  const event = parsePayload(payload, req.body)
  const emailId = event.data?.email_id

  if (!(event.type && emailId)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid Resend webhook payload"
    )
  }

  if (!CHECKED_RESEND_EVENT_TYPES.has(event.type)) {
    res.json({ received: true, checked: false })
    return
  }

  const emailLogService = req.scope.resolve<EmailLogService>(EMAIL_LOG_MODULE)
  const { checkedCount, foundCount } = await markEmailLogChecked({
    emailId,
    emailLogService,
  })

  if (!foundCount) {
    await storePendingWebhookEvent({
      emailId,
      emailLogService,
      event,
    })
  }

  res.json({
    checked: checkedCount > 0,
    checked_count: checkedCount,
    email_id: emailId,
    received: true,
    type: event.type,
  })
}

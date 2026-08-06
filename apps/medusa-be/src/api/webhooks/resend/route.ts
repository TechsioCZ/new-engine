import crypto from "node:crypto"

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import {
  getCredentialString,
  INTEGRATION_CONFIG_NAMES,
  requireCredentialObject,
  retrieveIntegrationConfig,
} from "../../../modules/api-store/integration-config"
import { EMAIL_LOG_MODULE } from "../../../modules/email-log"
import type EmailLogModuleService from "../../../modules/email-log/service"
import { CHECKED_RESEND_EVENT_TYPES } from "../../../utils/resend-webhook-events"

const ResendWebhookEventSchema = z
  .object({
    created_at: z.string().optional(),
    data: z.object({ email_id: z.string().optional() }).loose().optional(),
    type: z.string().optional(),
  })
  .loose()

type ResendWebhookEvent = z.infer<typeof ResendWebhookEventSchema>

interface EmailLogDTO {
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
    }[],
  ) => Promise<unknown[]>
  listEmailLogs: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<EmailLogDTO[]>
  updateEmailLogs: (
    data: { id: string; checked_at: Date }[],
  ) => Promise<EmailLogDTO[]>
}

const SVIX_TOLERANCE_IN_SECONDS = 5 * 60

const getHeader = (req: MedusaRequest, header: string) => {
  const value = z
    .union([z.string(), z.array(z.string())])
    .optional()
    .parse(req.headers[header])
  if (Array.isArray(value)) {
    return value.at(0)
  }
  return value
}

const getPayload = (req: MedusaRequest) => {
  const { rawBody } = z
    .object({ rawBody: z.union([z.instanceof(Buffer), z.string()]) })
    .parse(req)

  return Buffer.isBuffer(rawBody) ? rawBody.toString("utf-8") : rawBody
}

const getSvixSecret = (secret: string) => {
  const secretValue = secret.startsWith("whsec_")
    ? secret.slice("whsec_".length)
    : secret

  return Buffer.from(secretValue, "base64")
}

const verifySvixSignature = ({
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
}) => {
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

const parsePayload = (payload: string, body: unknown): ResendWebhookEvent => {
  const parsedPayload: unknown =
    typeof body === "object" && body !== null ? body : JSON.parse(payload)

  return ResendWebhookEventSchema.parse(parsedPayload)
}

const hasRequiredResendWebhookFields = (
  event: ResendWebhookEvent,
): event is ResendWebhookEvent & {
  data: { email_id: string; [key: string]: unknown }
  type: string
} =>
  typeof event.type === "string" &&
  event.type.length > 0 &&
  typeof event.data?.email_id === "string" &&
  event.data.email_id.length > 0

const markEmailLogChecked = async ({
  emailId,
  emailLogService,
}: {
  emailId: string
  emailLogService: EmailLogService
}) => {
  const emailLogs = await emailLogService.listEmailLogs(
    { email_id: emailId },
    { select: ["id", "email_id", "checked_at"] },
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
      checked_at: new Date(),
      id: emailLog.id,
    })),
  )

  return {
    checkedCount: uncheckedLogs.length,
    foundCount: emailLogs.length,
  }
}

const storePendingWebhookEvent = async ({
  emailId,
  emailLogService,
  event,
}: {
  emailId: string
  emailLogService: EmailLogService
  event: ResendWebhookEvent & { type: string }
}) => {
  await emailLogService.createEmailWebhookEvents([
    {
      email_id: emailId,
      payload: event,
      processed_at: null,
      received_at: new Date(),
      type: event.type,
    },
  ])
}

const getResendWebhookSecret = async (
  req: MedusaRequest,
): Promise<string | undefined> => {
  const config = await retrieveIntegrationConfig(
    req.scope,
    INTEGRATION_CONFIG_NAMES.RESEND,
  )

  if (config?.enabled === true) {
    const credentials = requireCredentialObject(config)
    return getCredentialString(credentials, "webhookSecret", "webhook_secret")
  }

  return z
    .string()
    .min(1)
    .optional()
    .parse(process.env["RESEND_WEBHOOK_SECRET"])
}

const post = async (req: MedusaRequest, res: MedusaResponse) => {
  const payload = getPayload(req)
  const webhookSecret = await getResendWebhookSecret(req)

  if (typeof webhookSecret === "string" && webhookSecret.length > 0) {
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
        "Invalid Resend webhook signature",
      )
    }
  }

  const event = parsePayload(payload, req.body)

  if (!hasRequiredResendWebhookFields(event)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid Resend webhook payload",
    )
  }

  const emailId = event.data.email_id

  if (!CHECKED_RESEND_EVENT_TYPES.has(event.type)) {
    res.json({ checked: false, received: true })
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

export { post as POST }

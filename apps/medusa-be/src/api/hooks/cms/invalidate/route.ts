import { createHmac } from "node:crypto"

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { PAYLOAD_MODULE } from "../../../../modules/payload"
import type PayloadModuleService from "../../../../modules/payload/service"
import {
  getHeaderValue,
  isValidWebhookSignature,
} from "../../../../utils/webhooks"

/** Expected webhook payload from Payload CMS invalidation hook. */
interface PayloadWebhookBody {
  collection: string
  doc?: { id?: string; slug?: string; locale?: string }
}

const parseWebhookBody = (value: unknown): PayloadWebhookBody | undefined => {
  if (!isRecord(value) || typeof value["collection"] !== "string") {
    return undefined
  }

  const rawDoc = value["doc"]
  if (rawDoc !== undefined && !isRecord(rawDoc)) {
    return undefined
  }

  const doc =
    rawDoc === undefined
      ? undefined
      : {
          ...(typeof rawDoc["id"] === "string" ? { id: rawDoc["id"] } : {}),
          ...(typeof rawDoc["locale"] === "string"
            ? { locale: rawDoc["locale"] }
            : {}),
          ...(typeof rawDoc["slug"] === "string"
            ? { slug: rawDoc["slug"] }
            : {}),
        }

  return {
    collection: value["collection"],
    ...(doc === undefined ? {} : { doc }),
  }
}

/** Hook endpoint to invalidate cached CMS content in Medusa. */
const post = async (req: MedusaRequest, res: MedusaResponse) => {
  const WEBHOOK_SECRET = process.env["PAYLOAD_WEBHOOK_SECRET"]
  if (WEBHOOK_SECRET === undefined || WEBHOOK_SECRET.length === 0) {
    return res.status(500).json({ error: "Webhook secret not configured" })
  }

  const signature = getHeaderValue(req, "x-payload-signature")
  // Prefer raw body for signature verification to avoid JSON.stringify inconsistencies.
  // Falls back to re-stringified body if raw body isn't preserved by middleware.
  const requestRawBody: unknown = Reflect.get(req, "rawBody")
  const rawBody =
    typeof requestRawBody === "string" || Buffer.isBuffer(requestRawBody)
      ? requestRawBody
      : JSON.stringify(req.body)
  if (rawBody === undefined) {
    return res.status(400).json({ error: "Missing request body" })
  }

  const expectedSignature = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex")

  if (!isValidWebhookSignature(signature, expectedSignature)) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const cmsService = req.scope.resolve<PayloadModuleService>(PAYLOAD_MODULE)
  const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const body = parseWebhookBody(req.body)

  if (body === undefined) {
    return res.status(400).json({ error: "Missing or invalid collection" })
  }

  try {
    await cmsService.invalidateCache(
      body.collection,
      body.doc?.slug,
      body.doc?.locale,
    )
  } catch (error) {
    logger.error(
      `CMS cache invalidation failed (collection="${body.collection}", slug="${body.doc?.slug ?? "n/a"}", locale="${body.doc?.locale ?? "n/a"}")`,
      error instanceof Error ? error : new Error(String(error)),
    )
    return res.status(500).json({
      collection: body.collection,
      error: "Failed to invalidate cache",
      locale: body.doc?.locale ?? null,
      slug: body.doc?.slug ?? null,
    })
  }

  return res.status(200).json({ success: true })
}

export { post as POST }

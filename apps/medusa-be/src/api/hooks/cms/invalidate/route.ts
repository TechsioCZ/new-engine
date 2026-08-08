import { createHmac } from "node:crypto"

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { reconcileContentSearchChange } from "../../../../modules/meilisearch/content-events"
import type { CmsSearchChange } from "../../../../modules/meilisearch/content-events"
import { loadSearchProfiles } from "../../../../modules/meilisearch/profiles"
import { PAYLOAD_MODULE } from "../../../../modules/payload"
import type PayloadModuleService from "../../../../modules/payload/service"
import {
  getHeaderValue,
  isValidWebhookSignature,
} from "../../../../utils/webhooks"

/** Expected webhook payload from Payload CMS invalidation hook. */
const parseWebhookBody = (value: unknown): CmsSearchChange | undefined => {
  if (!isRecord(value) || typeof value["collection"] !== "string") {
    return undefined
  }

  const rawDoc = value["doc"]
  if (rawDoc !== undefined && !isRecord(rawDoc)) {
    return undefined
  }
  const rawOperation = value["operation"]
  if (rawOperation !== undefined && typeof rawOperation !== "string") {
    return undefined
  }

  return {
    collection: value["collection"],
    ...(rawDoc === undefined ? {} : { doc: rawDoc }),
    ...(rawOperation === undefined ? {} : { operation: rawOperation }),
  }
}

const getOptionalString = (
  value: Record<string, unknown> | undefined,
  field: string,
): string | undefined => {
  const fieldValue = value?.[field]
  return typeof fieldValue === "string" && fieldValue.length > 0
    ? fieldValue
    : undefined
}

const reconcileSearchChange = async (
  change: CmsSearchChange,
  cmsService: PayloadModuleService,
  logger: Logger,
  req: MedusaRequest,
): Promise<void> => {
  if (change.doc === undefined) {
    return
  }
  const isGlobalVisibilityChange = change.doc["globalVisibilityChange"] === true
  const hasLocalizedPayload = typeof change.doc?.["locale"] === "string"
  if (!isGlobalVisibilityChange && hasLocalizedPayload) {
    await reconcileContentSearchChange(change, logger, req.scope)
    return
  }

  const rawId = change.doc?.["id"]
  if (
    (typeof rawId !== "string" || rawId.length === 0) &&
    (typeof rawId !== "number" || !Number.isFinite(rawId))
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Locale-wide CMS search reconciliation requires a document id",
    )
  }
  if (change.collection !== "articles" && change.collection !== "pages") {
    return
  }

  const searchableCollection = change.collection
  const profiles = await loadSearchProfiles(req.scope)
  const locales = [...new Set(profiles.map((profile) => profile.locale))]
  const reconcileLocaleBatch = async (offset: number): Promise<void> => {
    const batch = locales.slice(offset, offset + 4)
    if (batch.length === 0) {
      return
    }
    await Promise.all(
      batch.map(async (locale) => {
        const localizedDocument = await cmsService.getPublishedSearchDocument(
          searchableCollection,
          String(rawId),
          locale,
        )
        const localizedChange: CmsSearchChange = {
          collection: searchableCollection,
          doc: {
            ...(isRecord(localizedDocument) ? localizedDocument : change.doc),
            id: rawId,
            locale,
            ...(localizedDocument === null ? { status: "unpublished" } : {}),
          },
          ...(change.operation === undefined
            ? {}
            : { operation: change.operation }),
        }
        await reconcileContentSearchChange(localizedChange, logger, req.scope)
      }),
    )
    await reconcileLocaleBatch(offset + batch.length)
  }
  await reconcileLocaleBatch(0)
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

  const slug = getOptionalString(body.doc, "slug")
  const previousSlug = getOptionalString(body.doc, "previousSlug")
  const locale = getOptionalString(body.doc, "locale")

  try {
    await cmsService.invalidateCache(body.collection, slug, locale)
    if (previousSlug !== undefined && previousSlug !== slug) {
      await cmsService.invalidateCache(body.collection, previousSlug, locale)
    }
    await reconcileSearchChange(body, cmsService, logger, req)
  } catch (error) {
    logger.error(
      `CMS cache invalidation failed (collection="${body.collection}", slug="${slug ?? "n/a"}", locale="${locale ?? "n/a"}")`,
      error instanceof Error ? error : new Error(String(error)),
    )
    return res.status(500).json({
      collection: body.collection,
      error: "Failed to invalidate cache",
      locale: locale ?? null,
      slug: slug ?? null,
    })
  }

  return res.status(200).json({ success: true })
}

export { post as POST }

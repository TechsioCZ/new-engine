import { createHmac } from "node:crypto"
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  PayloadRequest,
} from "payload"
import { getEnvString } from "../utils/env"

import { createRequestTimeout } from "../utils/request"

/** Payload invalidation payload sent to Medusa. */
type MedusaInvalidatePayload = {
  collection: string
  doc?: {
    id?: string
    slug?: string
    locale?: string
  }
}

/** Minimal CMS document shape for invalidation metadata. */
type CmsDoc = {
  id?: string | number
  slug?: string | Record<string, unknown>
}

/** Track whether the missing base URL warning has already been logged. */
let loggedMissingBaseUrl = false

/** Resolve the Medusa backend base URL from environment settings. */
const getMedusaBaseUrl = (): string | null => {
  const baseUrl = getEnvString("MEDUSA_BACKEND_URL")
  return baseUrl ? baseUrl.replace(/\/$/, "") : null
}

/** Resolve a localized slug from a CMS document. */
const resolveSlug = (
  doc: CmsDoc | undefined,
  locale?: string
): string | undefined => {
  if (!doc) {
    return
  }

  if (typeof doc.slug === "string") {
    return doc.slug
  }

  if (doc.slug && typeof doc.slug === "object" && locale) {
    const localized = (doc.slug as Record<string, unknown>)[locale]
    return typeof localized === "string" ? localized : undefined
  }

  return
}

/** Notify Medusa to invalidate its CMS cache. */
const notifyMedusa = async (
  payload: MedusaInvalidatePayload,
  req?: PayloadRequest | null
): Promise<void> => {
  const baseUrl = getMedusaBaseUrl()
  if (!baseUrl) {
    if (!loggedMissingBaseUrl) {
      loggedMissingBaseUrl = true
      req?.payload?.logger?.warn?.(
        "MEDUSA_BACKEND_URL is not set; skipping CMS cache invalidation."
      )
    }
    return
  }

  const { controller, clearTimeout } = createRequestTimeout(10_000)
  const webhookSecret = getEnvString("PAYLOAD_WEBHOOK_SECRET")
  if (!webhookSecret) {
    throw new Error(
      "PAYLOAD_WEBHOOK_SECRET is not set; refusing to send CMS cache invalidation."
    )
  }

  try {
    const body = JSON.stringify(payload)
    const signature = createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex")

    const response = await fetch(`${baseUrl}/hooks/cms/invalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-payload-signature": signature,
      },
      body,
      signal: controller.signal,
    })

    if (!response.ok) {
      const message = await response.text().catch(() => "")
      req?.payload?.logger?.error?.(
        `CMS cache invalidation failed (${response.status}): ${message}`
      )
    }
  } catch (error) {
    req?.payload?.logger?.error?.(
      `CMS cache invalidation request failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  } finally {
    clearTimeout()
  }
}

/** Create a hook that invalidates Medusa CMS cache for a collection. */
export const createMedusaCacheHook = (
  collection: string
): CollectionAfterChangeHook & CollectionAfterDeleteHook => {
  const invalidateCache = async ({
    doc,
    req,
    operation,
  }: {
    doc?: CmsDoc
    req?: PayloadRequest | null
    operation?: string
  }) => {
    const op = operation ?? "delete"
    if (!["create", "update", "delete"].includes(op)) {
      return doc
    }

    const isDelete = op === "delete"
    const locale = isDelete ? undefined : req?.locale
    const cmsDoc = doc as CmsDoc | undefined
    const payload: MedusaInvalidatePayload = {
      collection,
      doc: {
        id: cmsDoc?.id ? String(cmsDoc.id) : undefined,
        slug: resolveSlug(cmsDoc, locale),
        locale,
      },
    }

    req?.payload?.logger?.info?.(
      `CMS invalidate hook: ${op} -> ${JSON.stringify(payload)}`
    )

    await notifyMedusa(payload, req)

    return doc
  }

  return invalidateCache as CollectionAfterChangeHook &
    CollectionAfterDeleteHook
}

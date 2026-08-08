import { createHmac } from "node:crypto"
import { setTimeout as waitForRetry } from "node:timers/promises"

import { compactRecord, getErrorMessage, isRecord } from "@techsio/std/object"
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  PayloadRequest,
} from "payload"

import { getEnvString } from "../utils/env"
import { createRequestTimeout } from "../utils/request"

/** Payload invalidation payload sent to Medusa. */
interface MedusaInvalidatePayload {
  collection: string
  doc: Record<string, unknown>
  operation?: string
}

/** Track whether the missing base URL warning has already been logged. */
let loggedMissingBaseUrl = false
const TRAILING_SLASH_REGEX = /\/$/u
const SUPPORTED_OPERATIONS = new Set(["create", "update", "delete"])
const DELIVERY_ATTEMPTS = 3
const RETRY_DELAYS_MS = [100, 250] as const

class MedusaCacheInvalidationError extends Error {
  readonly code = "MEDUSA_CACHE_INVALIDATION_FAILED"

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = "MedusaCacheInvalidationError"
  }
}

/** Resolve the Medusa backend base URL from environment settings. */
const getMedusaBaseUrl = (): string | null => {
  const baseUrl = getEnvString("MEDUSA_BACKEND_URL")
  return baseUrl === null ? null : baseUrl.replace(TRAILING_SLASH_REGEX, "")
}

const readDocumentId = (doc: unknown): string | undefined => {
  if (!isRecord(doc)) {
    return undefined
  }

  const { id } = doc
  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : undefined
}

/** Resolve a localized slug from a CMS document. */
const resolveSlug = (doc: unknown, locale?: string): string | undefined => {
  if (!isRecord(doc)) {
    return undefined
  }

  const { slug } = doc
  if (typeof slug === "string") {
    return slug
  }

  if (isRecord(slug) && locale !== undefined) {
    const localized = slug[locale]
    return typeof localized === "string" ? localized : undefined
  }

  return undefined
}

const readResponseText = async (response: Response): Promise<string> => {
  try {
    return await response.text()
  } catch {
    return ""
  }
}

/** Notify Medusa to invalidate its CMS cache. */
const notifyMedusaOnce = async (
  baseUrl: string,
  body: string,
  signature: string,
): Promise<void> => {
  const { controller, clearTimeout } = createRequestTimeout(10_000)
  try {
    const response = await fetch(`${baseUrl}/hooks/cms/invalidate`, {
      body,
      headers: {
        "Content-Type": "application/json",
        "x-payload-signature": signature,
      },
      method: "POST",
      signal: controller.signal,
    })
    if (!response.ok) {
      const responseBody = await readResponseText(response)
      throw new MedusaCacheInvalidationError(
        `Medusa rejected CMS cache invalidation (${response.status}): ${responseBody}`,
      )
    }
  } finally {
    clearTimeout()
  }
}

const notifyMedusa = async (
  payload: MedusaInvalidatePayload,
  req?: PayloadRequest | null,
): Promise<void> => {
  const baseUrl = getMedusaBaseUrl()
  if (baseUrl === null) {
    if (!loggedMissingBaseUrl) {
      loggedMissingBaseUrl = true
      req?.payload.logger.warn(
        "MEDUSA_BACKEND_URL is not set; CMS cache invalidation cannot be delivered.",
      )
    }
    return
  }

  const webhookSecret = getEnvString("PAYLOAD_WEBHOOK_SECRET")
  if (webhookSecret === null) {
    throw new MedusaCacheInvalidationError(
      "PAYLOAD_WEBHOOK_SECRET is not set; refusing to send CMS cache invalidation.",
    )
  }
  const body = JSON.stringify(payload)
  const signature = createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex")
  const deliver = async (attempt: number): Promise<void> => {
    try {
      await notifyMedusaOnce(baseUrl, body, signature)
    } catch (error) {
      req?.payload.logger.error(
        `CMS cache invalidation delivery attempt ${attempt}/${DELIVERY_ATTEMPTS} failed: ${getErrorMessage(error)}`,
      )
      const retryDelay = RETRY_DELAYS_MS[attempt - 1]
      if (retryDelay === undefined) {
        throw new MedusaCacheInvalidationError(
          `CMS cache invalidation failed after ${DELIVERY_ATTEMPTS} attempts`,
          { cause: error },
        )
      }
      await waitForRetry(retryDelay)
      await deliver(attempt + 1)
    }
  }

  await deliver(1)
}

const resolveInvalidationLocale = (options: {
  globalVisibilityChange: boolean
  operation: string
  requestLocale: unknown
}): string | undefined => {
  if (
    options.operation === "delete" ||
    options.globalVisibilityChange ||
    options.requestLocale === "all"
  ) {
    return undefined
  }
  return typeof options.requestLocale === "string"
    ? options.requestLocale
    : undefined
}

/** Create a hook that invalidates Medusa CMS cache for a collection. */
export const createMedusaCacheHook = (
  collection: string,
): CollectionAfterChangeHook & CollectionAfterDeleteHook => {
  const invalidateCache = async ({
    doc,
    req,
    operation,
    previousDoc,
  }: {
    doc?: unknown
    operation?: string
    previousDoc?: unknown
    req?: PayloadRequest | null
  }) => {
    const op = operation ?? "delete"
    if (!SUPPORTED_OPERATIONS.has(op)) {
      return doc
    }

    const cmsDoc = isRecord(doc) ? doc : {}
    const previousCmsDoc = isRecord(previousDoc) ? previousDoc : {}
    const globalVisibilityChange =
      op === "update" &&
      (cmsDoc["status"] !== previousCmsDoc["status"] ||
        cmsDoc["visibility"] !== previousCmsDoc["visibility"])
    const locale = resolveInvalidationLocale({
      globalVisibilityChange,
      operation: op,
      requestLocale: req?.locale,
    })
    const slug = resolveSlug(doc, locale)
    const previousSlug = resolveSlug(previousDoc, locale)
    const id = readDocumentId(doc)
    const payload: MedusaInvalidatePayload = {
      collection,
      doc: compactRecord({
        content: cmsDoc["content"],
        contentHTML: cmsDoc["contentHTML"],
        excerpt: cmsDoc["excerpt"],
        globalVisibilityChange: globalVisibilityChange || undefined,
        id: id === "" ? undefined : id,
        locale,
        previousSlug:
          previousSlug === "" || previousSlug === slug
            ? undefined
            : previousSlug,
        slug: slug === "" ? undefined : slug,
        status: cmsDoc["status"],
        title: cmsDoc["title"],
        visibility: cmsDoc["visibility"],
      }),
      operation: op,
    }

    req?.payload.logger.info(
      `CMS invalidate hook: ${JSON.stringify(
        compactRecord({
          collection,
          id: payload.doc["id"],
          locale: payload.doc["locale"],
          operation: op,
          slug: payload.doc["slug"],
        }),
      )}`,
    )

    await notifyMedusa(payload, req)

    return doc
  }

  return invalidateCache
}

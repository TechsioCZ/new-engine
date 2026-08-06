import { createHmac } from "node:crypto"

import { getErrorMessage, isRecord } from "@techsio/std/object"
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
  doc?: {
    id?: string
    locale?: string
    slug?: string
  }
}

/** Track whether the missing base URL warning has already been logged. */
let loggedMissingBaseUrl = false
const TRAILING_SLASH_REGEX = /\/$/u
const SUPPORTED_OPERATIONS = new Set(["create", "update", "delete"])

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
const notifyMedusa = async (
  payload: MedusaInvalidatePayload,
  req?: PayloadRequest | null,
): Promise<void> => {
  const baseUrl = getMedusaBaseUrl()
  if (baseUrl === null) {
    if (!loggedMissingBaseUrl) {
      loggedMissingBaseUrl = true
      req?.payload.logger.warn(
        "MEDUSA_BACKEND_URL is not set; skipping CMS cache invalidation.",
      )
    }
    return
  }

  const { controller, clearTimeout } = createRequestTimeout(10_000)
  const webhookSecret = getEnvString("PAYLOAD_WEBHOOK_SECRET")
  if (webhookSecret === null) {
    throw new Error(
      "PAYLOAD_WEBHOOK_SECRET is not set; refusing to send CMS cache invalidation.",
    )
  }

  try {
    const body = JSON.stringify(payload)
    const signature = createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex")

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
      const message = await readResponseText(response)
      req?.payload.logger.error(
        `CMS cache invalidation failed (${response.status}): ${message}`,
      )
    }
  } catch (error) {
    req?.payload.logger.error(
      `CMS cache invalidation request failed: ${getErrorMessage(error)}`,
    )
  } finally {
    clearTimeout()
  }
}

/** Create a hook that invalidates Medusa CMS cache for a collection. */
export const createMedusaCacheHook = (
  collection: string,
): CollectionAfterChangeHook & CollectionAfterDeleteHook => {
  const invalidateCache = async ({
    doc,
    req,
    operation,
  }: {
    doc?: unknown
    req?: PayloadRequest | null
    operation?: string
  }) => {
    const op = operation ?? "delete"
    if (!SUPPORTED_OPERATIONS.has(op)) {
      return doc
    }

    const requestLocale: unknown = req?.locale
    const locale =
      op === "delete" ||
      requestLocale === "all" ||
      typeof requestLocale !== "string"
        ? undefined
        : requestLocale
    const slug = resolveSlug(doc, locale)
    const id = readDocumentId(doc)
    const payload: MedusaInvalidatePayload = {
      collection,
      doc: {
        ...(id === undefined || id === "" ? {} : { id }),
        ...(locale === undefined ? {} : { locale }),
        ...(slug === undefined || slug === "" ? {} : { slug }),
      },
    }

    req?.payload.logger.info(
      `CMS invalidate hook: ${op} -> ${JSON.stringify(payload)}`,
    )

    await notifyMedusa(payload, req)

    return doc
  }

  return invalidateCache
}

import { createHash } from "node:crypto"
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  PayloadRequest,
} from "payload"
import type { MedusaCmsInvalidationInput } from "../jobs/medusa-cms-invalidation"

/** Minimal CMS document shape for invalidation metadata. */
type CmsDoc = {
  id?: string | number
  slug?: string | Record<string, unknown>
  updatedAt?: string
  [key: string]: unknown
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
}

const buildEventId = (input: {
  collection: string
  doc?: CmsDoc
  locale?: string
  operation: string
}) =>
  `payload-cms-v1:${createHash("sha256")
    .update(
      JSON.stringify([
        input.collection,
        input.doc?.id ? String(input.doc.id) : null,
        input.locale ?? null,
        input.operation,
        input.doc?.updatedAt ?? null,
      ])
    )
    .digest("hex")}`

/** Create a transactional outbox hook for Medusa CMS cache invalidation. */
export const createMedusaCacheHook = (
  collection: string
): CollectionAfterChangeHook & CollectionAfterDeleteHook => {
  const enqueueInvalidation = async ({
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
    if (!req) {
      throw new Error("Payload request is required to enqueue CMS invalidation")
    }

    const isDelete = op === "delete"
    const locale = isDelete ? undefined : (req.locale ?? undefined)
    const cmsDoc = doc as CmsDoc | undefined
    const occurredAt = new Date().toISOString()
    const input: MedusaCmsInvalidationInput = {
      collection,
      doc: {
        id: cmsDoc?.id ? String(cmsDoc.id) : undefined,
        slug: resolveSlug(cmsDoc, locale),
        locale,
        title: cmsDoc?.title,
        excerpt: cmsDoc?.excerpt,
        content: cmsDoc?.content,
        contentHTML: cmsDoc?.contentHTML,
        status: cmsDoc?.status,
        visibility: cmsDoc?.visibility,
      },
      eventId: buildEventId({ collection, doc: cmsDoc, locale, operation: op }),
      occurredAt,
      operation: op,
      sourceVersion: cmsDoc?.updatedAt ?? occurredAt,
    }

    req.payload.logger.info(
      `CMS invalidation outbox: ${op} -> ${input.eventId}`
    )

    await req.payload.jobs.queue({
      input,
      queue: "cms-outbox",
      req,
      task: "deliver-medusa-cms-invalidation",
    })

    return doc
  }

  return enqueueInvalidation as CollectionAfterChangeHook &
    CollectionAfterDeleteHook
}

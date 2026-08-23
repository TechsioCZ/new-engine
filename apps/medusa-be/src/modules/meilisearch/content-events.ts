import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { MeilisearchAdminClient } from "./admin-client"
import { buildContentSearchDocument } from "./documents"
import { isMeilisearchEnabled } from "./env"
import { loadSearchProfiles } from "./profiles"
import { CONTENT_INDEX_SETTINGS } from "./settings"
import {
  contentProjectionKey,
  readUrlRegistryContentProjectionConfig,
  resolveContentProjectionHrefs,
} from "./url-registry-content-projection"

export type CmsSearchChange = {
  collection: string
  doc?: Record<string, unknown>
  operation?: string
}

const SEARCHABLE_COLLECTION_TYPES = {
  articles: "article",
  pages: "page",
} as const

const normalizeLocale = (value: string): string =>
  value.trim().toLowerCase().replaceAll("_", "-").split("-")[0] ?? ""

const isPublished = (
  change: CmsSearchChange,
  type: "article" | "page"
): boolean =>
  change.operation !== "delete" &&
  change.doc?.status === "published" &&
  (type === "article" || change.doc?.visibility === "public")

const requirePublishedContentDocument = ({
  change,
  locale,
  publicHref,
  type,
}: {
  change: CmsSearchChange
  locale: string
  publicHref: string | undefined
  type: "article" | "page"
}): Record<string, unknown> => {
  const document = buildContentSearchDocument(
    change.doc ?? {},
    type,
    locale,
    publicHref
  )

  if (document) {
    return document
  }

  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    `Cannot reconcile ${change.collection} search projection because its canonical public href is unavailable`
  )
}

// A misconfigured-but-enabled projection must keep failing loudly, so only an
// explicitly disabled feature flag is treated as "projection unavailable".
const isContentProjectionDisabled = (): boolean => {
  try {
    return readUrlRegistryContentProjectionConfig() === null
  } catch {
    return false
  }
}

const prepareContentIndex = async (
  client: MeilisearchAdminClient,
  index: string
): Promise<void> => {
  await client.ensureIndex(index)
  await client.updateSettings(
    index,
    CONTENT_INDEX_SETTINGS as Record<string, unknown>
  )
}

const indexPublishedContent = async ({
  change,
  client,
  index,
  locale,
  logger,
  sourceId,
  type,
}: {
  change: CmsSearchChange
  client: MeilisearchAdminClient
  index: string
  locale: string
  logger: Logger
  sourceId: string
  type: "article" | "page"
}): Promise<void> => {
  if (isContentProjectionDisabled()) {
    logger.warn(
      `Skipping ${change.collection} search projection for ${index} because URL_REGISTRY_CONTENT_PROJECTION_ENABLED is not "1"; published documents stay out of the search index until the projection is enabled and a full content resync runs`
    )

    return
  }

  const projections = await resolveContentProjectionHrefs(
    [{ sourceId, sourceType: type }],
    locale,
    logger
  )
  const document = requirePublishedContentDocument({
    change,
    locale,
    publicHref: projections.get(contentProjectionKey(type, sourceId)),
    type,
  })
  await prepareContentIndex(client, index)
  await client.addDocuments(index, [document])
}

export const reconcileContentSearchChange = async (
  change: CmsSearchChange,
  logger: Logger,
  container: MedusaContainer
): Promise<void> => {
  if (!isMeilisearchEnabled()) {
    return
  }

  const type =
    SEARCHABLE_COLLECTION_TYPES[
      change.collection as keyof typeof SEARCHABLE_COLLECTION_TYPES
    ]

  if (!type) {
    return
  }

  const rawId = change.doc?.id

  if (
    (typeof rawId !== "string" || !rawId.trim()) &&
    (typeof rawId !== "number" || !Number.isFinite(rawId))
  ) {
    logger.warn(
      `Skipping ${change.collection} search projection because the document id is missing`
    )

    return
  }

  const locale =
    typeof change.doc?.locale === "string"
      ? normalizeLocale(change.doc.locale)
      : undefined
  const isLocaleLessDelete = change.operation === "delete" && !locale
  if (!(locale || isLocaleLessDelete)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Quarantining ${change.collection} search projection because its locale is missing`
    )
  }
  const profiles = (await loadSearchProfiles(container)).filter(
    (profile) =>
      isLocaleLessDelete || normalizeLocale(profile.locale) === locale
  )
  const client = new MeilisearchAdminClient()
  const documentId = `${type}_${String(rawId)}`

  for (const profile of profiles) {
    const index = profile.indexes.content

    if (isPublished(change, type)) {
      await indexPublishedContent({
        change,
        client,
        index,
        locale: profile.locale,
        logger,
        sourceId: String(rawId).trim(),
        type,
      })
    } else {
      await prepareContentIndex(client, index)
      await client.deleteDocuments(index, [documentId])
    }
  }
}

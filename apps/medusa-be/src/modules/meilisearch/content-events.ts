import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { getRecordValue } from "@techsio/std/object"

import { MeilisearchAdminClient } from "./admin-client"
import {
  buildContentDocumentId,
  buildContentSearchDocument,
  cleanSearchText,
} from "./documents"
import { isMeilisearchEnabled } from "./env"
import { loadSearchProfiles } from "./profiles"
import type { SearchProfile } from "./profiles"
import { CONTENT_INDEX_SETTINGS } from "./settings"

const CMS_PROFILE_CONCURRENCY = 4

export interface CmsSearchChange {
  collection: string
  doc?: object
  operation?: string
}

const getSearchableCollectionType = (
  collection: string,
): "article" | "page" | undefined => {
  if (collection === "articles") {
    return "article"
  }

  return collection === "pages" ? "page" : undefined
}

const normalizeLocale = (value: string): string =>
  value.trim().toLowerCase().replaceAll("_", "-").split("-")[0] ?? ""

export const selectContentSearchProfiles = (
  profiles: SearchProfile[],
  locale?: string,
): SearchProfile[] =>
  locale === undefined
    ? profiles
    : profiles.filter(
        (profile) =>
          normalizeLocale(profile.locale) === normalizeLocale(locale),
      )

const isPublished = (
  change: CmsSearchChange,
  type: "article" | "page",
): boolean => {
  if (change.operation === "delete" || change.doc === undefined) {
    return false
  }
  if (getRecordValue(change.doc, "status") !== "published") {
    return false
  }

  return (
    type === "article" || getRecordValue(change.doc, "visibility") === "public"
  )
}

export const reconcileContentSearchChange = async (
  change: CmsSearchChange,
  logger: Logger,
  container: MedusaContainer,
): Promise<void> => {
  if (!isMeilisearchEnabled()) {
    return
  }

  const type = getSearchableCollectionType(change.collection)

  if (type === undefined) {
    return
  }

  const rawId =
    change.doc === undefined ? undefined : getRecordValue(change.doc, "id")

  if (
    (typeof rawId !== "string" || rawId.trim().length === 0) &&
    (typeof rawId !== "number" || !Number.isFinite(rawId))
  ) {
    logger.warn(
      `Skipping ${
        change.collection
      } search projection because the document id is missing`,
    )

    return
  }

  const rawLocale =
    change.doc === undefined ? undefined : getRecordValue(change.doc, "locale")
  const locale = typeof rawLocale === "string" ? rawLocale : undefined
  const loadedProfiles = await loadSearchProfiles(container)
  const profiles = selectContentSearchProfiles(loadedProfiles, locale)
  const client = new MeilisearchAdminClient()
  const documentId = buildContentDocumentId(type, rawId)

  const reconcileProfile = async (
    profile: (typeof profiles)[number],
  ): Promise<void> => {
    const index = profile.indexes.content

    await client.ensureIndex(index)
    await client.updateSettings(index, CONTENT_INDEX_SETTINGS)

    if (isPublished(change, type)) {
      const sourceSlug =
        change.doc === undefined
          ? undefined
          : getRecordValue(change.doc, "slug")
      const contentSource = {
        ...change.doc,
        slug:
          typeof sourceSlug === "string"
            ? cleanSearchText(sourceSlug)
            : sourceSlug,
      }
      const document = buildContentSearchDocument(
        contentSource,
        type,
        profile.locale,
      )

      await client.addDocuments(index, [document])
      return
    }

    await client.deleteDocuments(index, [documentId])
  }

  const reconcileBatch = async (offset: number): Promise<void> => {
    const batch = profiles.slice(offset, offset + CMS_PROFILE_CONCURRENCY)

    if (batch.length === 0) {
      return
    }

    await Promise.all(batch.map(reconcileProfile))
    await reconcileBatch(offset + batch.length)
  }

  await reconcileBatch(0)
}

import type { CollectionConfig } from "payload"
import { requireAuth } from "../lib/access/require-auth"
import {
  adminGroups,
  collectionLabels,
  fieldLabels,
} from "../lib/constants/labels"
import { createMedusaCacheHook } from "../lib/hooks/medusa-cache"

/** Collection slug for hero carousels. */
const COLLECTION_SLUG = "hero-carousels"
/** Hook to invalidate Medusa cache when hero carousels change. */
const invalidateHeroCarouselsCache = createMedusaCacheHook(COLLECTION_SLUG)
const DEFAULT_INTERNAL_TITLE = "Hero banner"

const cleanString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const resolveLocalizedString = (
  value: unknown,
  locale: string | undefined
) => {
  if (typeof value === "string") {
    return cleanString(value)
  }

  if (!isRecord(value)) {
    return ""
  }

  return (
    cleanString(locale ? value[locale] : undefined) ||
    cleanString(value.en) ||
    cleanString(value.sk) ||
    cleanString(value.cs) ||
    cleanString(Object.values(value).find((entry) => cleanString(entry)))
  )
}

const resolveInternalTitle = (
  data: Record<string, unknown>,
  locale: string | undefined
) =>
  cleanString(data.internalTitle) ||
  resolveLocalizedString(data.heading, locale) ||
  resolveLocalizedString(data.button, locale) ||
  cleanString(data.buttonHref) ||
  DEFAULT_INTERNAL_TITLE

/** Payload collection config for hero carousels. */
export const HeroCarousels: CollectionConfig = {
  slug: COLLECTION_SLUG,
  access: {
    read: requireAuth,
    create: requireAuth,
    update: requireAuth,
    delete: requireAuth,
  },
  labels: collectionLabels.heroCarousels,
  admin: {
    useAsTitle: "internalTitle",
    defaultColumns: ["internalTitle", "heading", "image"],
    group: adminGroups.content,
  },
  fields: [
    {
      name: "internalTitle",
      label: fieldLabels.internalTitle,
      type: "text",
      required: true,
    },
    {
      name: "image",
      label: fieldLabels.image,
      type: "upload",
      relationTo: "media",
      required: true,
    },
    {
      name: "heading",
      label: fieldLabels.heading,
      type: "text",
      required: false,
      localized: true,
    },
    {
      name: "subheading",
      label: fieldLabels.subheading,
      type: "text",
      required: false,
      localized: true,
    },
    {
      name: "button",
      label: fieldLabels.buttonText,
      type: "text",
      required: false,
      localized: true,
    },
    {
      name: "buttonHref",
      label: fieldLabels.buttonUrl,
      type: "text",
      required: false,
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (!data) {
          return data
        }

        data.internalTitle = resolveInternalTitle(data, req?.locale)

        return data
      },
    ],
    afterChange: [invalidateHeroCarouselsCache],
    afterDelete: [invalidateHeroCarouselsCache],
  },
}

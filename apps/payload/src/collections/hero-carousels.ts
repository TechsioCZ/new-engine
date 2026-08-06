import { isRecord } from "@techsio/std/object"
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

const cleanString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : ""

const firstNonEmptyString = (values: unknown[]): string =>
  values.map(cleanString).find((value) => value !== "") ?? ""

const resolveLocalizedString = (value: unknown, locale: string | undefined) => {
  if (typeof value === "string") {
    return cleanString(value)
  }

  if (!isRecord(value)) {
    return ""
  }

  const { cs, en, sk } = value
  return firstNonEmptyString([
    locale === undefined ? undefined : value[locale],
    en,
    sk,
    cs,
    ...Object.values(value),
  ])
}

const resolveInternalTitle = (
  data: Record<string, unknown>,
  locale: string | undefined,
): string => {
  const { button, buttonHref, heading, internalTitle } = data
  return firstNonEmptyString([
    internalTitle,
    resolveLocalizedString(heading, locale),
    resolveLocalizedString(button, locale),
    buttonHref,
    DEFAULT_INTERNAL_TITLE,
  ])
}

/** Payload collection config for hero carousels. */
export const HeroCarousels: CollectionConfig = {
  access: {
    create: requireAuth,
    delete: requireAuth,
    read: requireAuth,
    update: requireAuth,
  },
  admin: {
    defaultColumns: ["internalTitle", "heading", "image"],
    group: adminGroups.content,
    useAsTitle: "internalTitle",
  },
  fields: [
    {
      label: fieldLabels.internalTitle,
      name: "internalTitle",
      required: true,
      type: "text",
    },
    {
      label: fieldLabels.image,
      name: "image",
      relationTo: "media",
      required: true,
      type: "upload",
    },
    {
      label: fieldLabels.heading,
      localized: true,
      name: "heading",
      required: false,
      type: "text",
    },
    {
      label: fieldLabels.subheading,
      localized: true,
      name: "subheading",
      required: false,
      type: "text",
    },
    {
      label: fieldLabels.buttonText,
      localized: true,
      name: "button",
      required: false,
      type: "text",
    },
    {
      label: fieldLabels.buttonUrl,
      name: "buttonHref",
      required: false,
      type: "text",
    },
  ],
  hooks: {
    afterChange: [invalidateHeroCarouselsCache],
    afterDelete: [invalidateHeroCarouselsCache],
    beforeValidate: [
      ({ data, operation, originalDoc, req }) => {
        if (!isRecord(data)) {
          return data
        }

        const { internalTitle } = data
        if (operation === "update" && internalTitle === undefined) {
          return data
        }

        const source =
          operation === "update" && isRecord(originalDoc)
            ? { ...originalDoc, ...data }
            : data
        const { locale } = req
        Reflect.set(
          data,
          "internalTitle",
          resolveInternalTitle(source, locale === "all" ? undefined : locale),
        )

        return data
      },
    ],
  },
  labels: collectionLabels.heroCarousels,
  slug: COLLECTION_SLUG,
}

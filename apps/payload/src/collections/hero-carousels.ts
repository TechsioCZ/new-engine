import { getRecordValue, isRecord } from "@techsio/std/object"
import type { CollectionBeforeValidateHook, CollectionConfig } from "payload"

import { requireAuth } from "../lib/access/require-auth"
import {
  adminGroups,
  collectionLabels,
  fieldLabels,
} from "../lib/constants/labels"
import { createMedusaCacheHook } from "../lib/hooks/medusa-cache"
import type { HeroCarousel } from "../payload-types"

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

  const cs = getRecordValue(value, "cs")
  const en = getRecordValue(value, "en")
  const sk = getRecordValue(value, "sk")
  return firstNonEmptyString([
    locale === undefined ? undefined : getRecordValue(value, locale),
    en,
    sk,
    cs,
    ...Object.keys(value).map((key) => getRecordValue(value, key)),
  ])
}

const resolveInternalTitle = (
  data: Partial<HeroCarousel>,
  locale: string | undefined,
): string =>
  firstNonEmptyString([
    data.internalTitle,
    resolveLocalizedString(data.heading, locale),
    resolveLocalizedString(data.button, locale),
    data.buttonHref,
    DEFAULT_INTERNAL_TITLE,
  ])

const populateInternalTitle: CollectionBeforeValidateHook<HeroCarousel> = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (data === undefined) {
    return data
  }

  if (operation === "update" && data.internalTitle === undefined) {
    return data
  }

  const source =
    operation === "update" && originalDoc !== undefined
      ? { ...originalDoc, ...data }
      : data
  const { locale } = req
  data.internalTitle = resolveInternalTitle(
    source,
    locale === "all" ? undefined : locale,
  )

  return data
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
    beforeValidate: [populateInternalTitle],
  },
  labels: collectionLabels.heroCarousels,
  slug: COLLECTION_SLUG,
}

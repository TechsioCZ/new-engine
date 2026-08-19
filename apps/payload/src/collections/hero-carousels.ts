import { APIError, type CollectionConfig } from "payload"
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

const HERO_ENTITY_SOURCE_SYSTEM = {
  article: "payload",
  brand: "medusa",
  category: "medusa",
  collection: "medusa",
  page: "payload",
  product: "medusa",
} as const

const HERO_STATIC_ROUTE_KEYS = [
  "root:about",
  "root:contact",
  "root:faq",
  "root:shipping",
  "root:returns",
  "root:terms",
  "root:privacy",
  "root:cookies",
] as const

type HeroEntitySourceType = keyof typeof HERO_ENTITY_SOURCE_SYSTEM
type HeroStaticRouteKey = (typeof HERO_STATIC_ROUTE_KEYS)[number]

export type HeroButtonTarget =
  | Readonly<{
      targetType: "entity"
      sourceSystem: (typeof HERO_ENTITY_SOURCE_SYSTEM)[HeroEntitySourceType]
      sourceType: HeroEntitySourceType
      sourceId: string
      staticRouteKey: null
    }>
  | Readonly<{
      targetType: "static"
      sourceSystem: null
      sourceType: null
      sourceId: null
      staticRouteKey: HeroStaticRouteKey
    }>

const cleanString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const invalidButtonTarget = (detail: string): never => {
  throw new APIError(`Invalid hero button target: ${detail}`, 400)
}

type ButtonTargetFields = Readonly<{
  sourceId: string
  sourceSystem: string
  sourceType: string
  staticRouteKey: string
  targetType: string
}>

const readButtonTargetFields = (
  value: Record<string, unknown>
): ButtonTargetFields => ({
  sourceId: cleanString(value.sourceId),
  sourceSystem: cleanString(value.sourceSystem),
  sourceType: cleanString(value.sourceType),
  staticRouteKey: cleanString(value.staticRouteKey),
  targetType: cleanString(value.targetType),
})

const normalizeEntityButtonTarget = ({
  sourceId,
  sourceSystem,
  sourceType,
  staticRouteKey,
}: ButtonTargetFields): HeroButtonTarget => {
  if (!(sourceType in HERO_ENTITY_SOURCE_SYSTEM)) {
    return invalidButtonTarget("unsupported entity source type")
  }
  const typedSourceType = sourceType as HeroEntitySourceType
  const canonicalSourceSystem = HERO_ENTITY_SOURCE_SYSTEM[typedSourceType]
  if (sourceSystem !== canonicalSourceSystem) {
    return invalidButtonTarget("source system does not own the entity type")
  }
  if (!sourceId) {
    return invalidButtonTarget("entity source ID is required")
  }
  if (staticRouteKey) {
    return invalidButtonTarget("entity targets cannot carry a static key")
  }
  return {
    sourceId,
    sourceSystem: canonicalSourceSystem,
    sourceType: typedSourceType,
    staticRouteKey: null,
    targetType: "entity",
  }
}

const normalizeStaticButtonTarget = ({
  sourceId,
  sourceSystem,
  sourceType,
  staticRouteKey,
}: ButtonTargetFields): HeroButtonTarget => {
  if (sourceSystem || sourceType || sourceId) {
    return invalidButtonTarget("static targets cannot carry entity identity")
  }
  if (!HERO_STATIC_ROUTE_KEYS.includes(staticRouteKey as HeroStaticRouteKey)) {
    return invalidButtonTarget("unsupported static route key")
  }
  return {
    sourceId: null,
    sourceSystem: null,
    sourceType: null,
    staticRouteKey: staticRouteKey as HeroStaticRouteKey,
    targetType: "static",
  }
}

export const normalizeHeroButtonTarget = (
  value: unknown
): HeroButtonTarget | null => {
  if (value === null || value === undefined) {
    return null
  }
  if (!isRecord(value)) {
    return invalidButtonTarget("expected a structured target")
  }

  const fields = readButtonTargetFields(value)

  if (!Object.values(fields).some(Boolean)) {
    return null
  }

  if (fields.targetType === "entity") {
    return normalizeEntityButtonTarget(fields)
  }

  if (fields.targetType === "static") {
    return normalizeStaticButtonTarget(fields)
  }

  return invalidButtonTarget("target type must be entity or static")
}

const resolveLocalizedString = (value: unknown, locale: string | undefined) => {
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
    // Compatibility policy: existing free-form values remain readable for
    // editorial audit, but are never writable, backfilled, or sent to URLR.
    {
      name: "buttonHref",
      label: {
        en: "Legacy button URL (not used)",
        cs: "Původní URL tlačítka (nepoužívá se)",
        sk: "Pôvodná URL tlačidla (nepoužíva sa)",
      },
      type: "text",
      required: false,
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        description:
          "Historical display only. Storefront links resolve exclusively from the stable target below.",
        readOnly: true,
      },
    },
    {
      name: "buttonTarget",
      label: "Stable button target",
      type: "group",
      fields: [
        {
          name: "targetType",
          type: "select",
          options: [
            { label: "Entity", value: "entity" },
            { label: "Static page", value: "static" },
          ],
        },
        {
          name: "sourceSystem",
          type: "select",
          options: [
            { label: "Medusa", value: "medusa" },
            { label: "Payload", value: "payload" },
          ],
          admin: {
            condition: (_data, siblingData) =>
              siblingData?.targetType === "entity",
          },
        },
        {
          name: "sourceType",
          type: "select",
          options: Object.keys(HERO_ENTITY_SOURCE_SYSTEM).map((value) => ({
            label: value,
            value,
          })),
          admin: {
            condition: (_data, siblingData) =>
              siblingData?.targetType === "entity",
          },
        },
        {
          name: "sourceId",
          type: "text",
          admin: {
            condition: (_data, siblingData) =>
              siblingData?.targetType === "entity",
            description: "Immutable ID from the selected source system.",
          },
        },
        {
          name: "staticRouteKey",
          type: "select",
          options: HERO_STATIC_ROUTE_KEYS.map((value) => ({
            label: value,
            value,
          })),
          admin: {
            condition: (_data, siblingData) =>
              siblingData?.targetType === "static",
          },
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation, originalDoc, req }) => {
        if (!data) {
          return data
        }

        if (data.buttonTarget !== undefined) {
          const originalTarget = isRecord(originalDoc?.buttonTarget)
            ? originalDoc.buttonTarget
            : null
          const nextTarget = isRecord(data.buttonTarget)
            ? { ...originalTarget, ...data.buttonTarget }
            : data.buttonTarget
          data.buttonTarget = normalizeHeroButtonTarget(nextTarget)
        }

        if (operation === "update" && data.internalTitle === undefined) {
          return data
        }

        data.internalTitle = resolveInternalTitle(
          operation === "update" && originalDoc
            ? { ...originalDoc, ...data }
            : data,
          req?.locale
        )

        return data
      },
    ],
    afterChange: [invalidateHeroCarouselsCache],
    afterDelete: [invalidateHeroCarouselsCache],
  },
}

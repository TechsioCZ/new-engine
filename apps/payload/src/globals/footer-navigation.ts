import type { Block, GlobalConfig, TextFieldSingleValidation } from "payload"
import { requireAuth } from "../lib/access/require-auth"
import { adminGroups } from "../lib/constants/labels"
import { createMedusaGlobalCacheHook } from "../lib/hooks/medusa-cache"
import {
  FOOTER_COLUMN_SLOT_OPTIONS,
  FOOTER_ITEM_SLOT_OPTIONS,
} from "./footer-navigation-slots"

export const FOOTER_NAVIGATION_GLOBAL_SLUG = "footer-navigation"

const validateInternalPath: TextFieldSingleValidation = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "Internal path is required."
  }

  const path = value.trim()
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\")
    ? true
    : "Internal path must start with a single slash and cannot contain backslashes."
}

const validateExternalUrl: TextFieldSingleValidation = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "External URL is required."
  }

  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
      ? true
      : "External URL must use HTTP or HTTPS."
  } catch {
    return "Enter a valid external URL."
  }
}

const createItemSlotField = () => ({
  name: "slot",
  label: "Translation slot",
  type: "select" as const,
  required: true,
  options: FOOTER_ITEM_SLOT_OPTIONS,
  admin: {
    description:
      "Stable key used by the storefront-text module for the visible label.",
  },
})

const CmsPageLinkBlock: Block = {
  slug: "cmsPageLink",
  interfaceName: "FooterCmsPageLink",
  labels: {
    singular: "CMS page",
    plural: "CMS pages",
  },
  fields: [
    createItemSlotField(),
    {
      name: "page",
      label: "Page",
      type: "relationship",
      relationTo: "pages",
      filterOptions: {
        and: [
          { status: { equals: "published" } },
          { visibility: { equals: "public" } },
        ],
      },
    },
  ],
}

const AppRouteLinkBlock: Block = {
  slug: "appRouteLink",
  interfaceName: "FooterAppRouteLink",
  labels: {
    singular: "Application route",
    plural: "Application routes",
  },
  fields: [
    createItemSlotField(),
    {
      name: "path",
      label: "Internal path",
      type: "text",
      required: true,
      validate: validateInternalPath,
      admin: {
        description: "A storefront path such as /blog or /znacka.",
      },
    },
  ],
}

const ExternalLinkBlock: Block = {
  slug: "externalLink",
  interfaceName: "FooterExternalLink",
  labels: {
    singular: "External link",
    plural: "External links",
  },
  fields: [
    createItemSlotField(),
    {
      name: "url",
      label: "External URL",
      type: "text",
      required: true,
      validate: validateExternalUrl,
    },
    {
      name: "newTab",
      label: "Open in a new tab",
      type: "checkbox",
      defaultValue: true,
    },
  ],
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const getSlot = (value: unknown) =>
  isRecord(value) && typeof value.slot === "string" ? value.slot : null

const findDuplicateSlot = (slots: Array<string | null>) => {
  const seen = new Set<string>()
  for (const slot of slots) {
    if (slot && seen.has(slot)) {
      return slot
    }
    if (slot) {
      seen.add(slot)
    }
  }
  return null
}

const getColumnItems = (column: unknown): unknown[] =>
  isRecord(column) && Array.isArray(column.items) ? column.items : []

const validateColumns = (value: unknown) => {
  const columns = Array.isArray(value) ? value : []
  const duplicateColumnSlot = findDuplicateSlot(columns.map(getSlot))
  if (duplicateColumnSlot) {
    return `Column slot "${duplicateColumnSlot}" can only be used once.`
  }

  const duplicateItemSlot = findDuplicateSlot(
    columns.flatMap(getColumnItems).map(getSlot)
  )
  return duplicateItemSlot
    ? `Navigation item slot "${duplicateItemSlot}" can only be used once.`
    : true
}

const invalidateFooterNavigationCache = createMedusaGlobalCacheHook(
  FOOTER_NAVIGATION_GLOBAL_SLUG
)

export const FooterNavigation: GlobalConfig = {
  slug: FOOTER_NAVIGATION_GLOBAL_SLUG,
  label: "Footer navigation",
  admin: {
    group: adminGroups.content,
  },
  access: {
    read: requireAuth,
    update: requireAuth,
  },
  fields: [
    {
      name: "columns",
      label: "Columns",
      type: "array",
      localized: true,
      maxRows: 3,
      validate: validateColumns,
      admin: {
        description:
          "Each locale can choose, order, or omit its own footer links.",
      },
      fields: [
        {
          name: "slot",
          label: "Column translation slot",
          type: "select",
          required: true,
          options: FOOTER_COLUMN_SLOT_OPTIONS,
        },
        {
          name: "items",
          label: "Links",
          type: "blocks",
          blocks: [CmsPageLinkBlock, AppRouteLinkBlock, ExternalLinkBlock],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [invalidateFooterNavigationCache],
  },
}

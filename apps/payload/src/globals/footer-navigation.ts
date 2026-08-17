import type { Block, GlobalConfig, TextFieldSingleValidation } from "payload"
import { requireAuth } from "../lib/access/require-auth"
import { adminGroups } from "../lib/constants/labels"
import { createMedusaGlobalCacheHook } from "../lib/hooks/medusa-cache"

export const FOOTER_NAVIGATION_GLOBAL_SLUG = "footer-navigation"

const columnSlotOptions = [
  { label: "Information", value: "information" },
  { label: "Important information", value: "important" },
  { label: "Partners", value: "partners" },
]

const itemSlotOptions = [
  { label: "Blog", value: "blog" },
  { label: "About", value: "about" },
  { label: "FAQ", value: "faq" },
  { label: "Gift voucher", value: "gift_voucher" },
  { label: "Brands", value: "brands" },
  { label: "Reviews", value: "reviews" },
  { label: "Shipping and payment", value: "shipping_payment" },
  { label: "Claims and returns", value: "claims_returns" },
  { label: "Terms and conditions", value: "terms" },
  { label: "Privacy", value: "privacy" },
  { label: "Cookies", value: "cookies" },
  { label: "Affiliate program", value: "affiliate" },
  { label: "Wholesale", value: "wholesale" },
  { label: "Dropshipping", value: "dropshipping" },
  { label: "Private label", value: "private_label" },
]

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
  options: itemSlotOptions,
  admin: {
    description:
      "Stable key used by the storefront-text module for the visible label.",
  },
})

const CmsPageLinkBlock: Block = {
  slug: "cmsPageLink",
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
      required: true,
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
          options: columnSlotOptions,
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

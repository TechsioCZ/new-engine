import type { CollectionConfig } from "payload";

import { adminGroups, collectionLabels, fieldLabels } from "../lib/constants/labels";
import { requireAuth } from "../lib/access/require-auth";
import { createMedusaCacheHook } from "../lib/hooks/medusa-cache";

/** Collection slug for hero carousels. */
const COLLECTION_SLUG = "hero-carousels";
/** Hook to invalidate Medusa cache when hero carousels change. */
const invalidateHeroCarouselsCache = createMedusaCacheHook(COLLECTION_SLUG);

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
    useAsTitle: "heading",
    defaultColumns: ["heading", "subheading", "image"],
    group: adminGroups.content,
  },
  fields: [
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
      required: true,
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
    afterChange: [invalidateHeroCarouselsCache],
    afterDelete: [invalidateHeroCarouselsCache],
  },
};

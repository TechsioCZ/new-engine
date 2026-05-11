import type { CollectionConfig } from "payload"

import {
  adminGroups,
  collectionLabels,
  fieldLabels,
} from "@/lib/constants/labels"
import { createMedusaCacheHook } from "@/lib/hooks/medusa-cache"

/** Collection slug for media uploads. */
const COLLECTION_SLUG = "media"
/** Hook to invalidate Medusa CMS cache when media changes. */
const invalidateMediaCache = createMedusaCacheHook(COLLECTION_SLUG)

/** Payload collection config for media uploads. */
export const Media: CollectionConfig = {
  slug: COLLECTION_SLUG,
  labels: collectionLabels.media,
  admin: {
    group: adminGroups.library,
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "alt",
      label: fieldLabels.altText,
      type: "text",
      required: true,
    },
  ],
  hooks: {
    afterChange: [invalidateMediaCache],
    afterDelete: [invalidateMediaCache],
  },
  upload: true,
}

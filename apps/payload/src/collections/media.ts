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
  access: {
    read: () => true,
  },
  admin: {
    group: adminGroups.library,
  },
  fields: [
    {
      label: fieldLabels.altText,
      name: "alt",
      required: true,
      type: "text",
    },
  ],
  hooks: {
    afterChange: [invalidateMediaCache],
    afterDelete: [invalidateMediaCache],
  },
  labels: collectionLabels.media,
  slug: COLLECTION_SLUG,
  upload: true,
}

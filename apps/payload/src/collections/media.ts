import type { CollectionConfig } from 'payload'

import { adminGroups, collectionLabels, fieldLabels } from '../lib/constants/labels'

/** Payload collection config for media uploads. */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: collectionLabels.media,
  admin: {
    group: adminGroups.library,
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      label: fieldLabels.altText,
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}

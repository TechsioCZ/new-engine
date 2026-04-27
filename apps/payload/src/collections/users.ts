import type { CollectionConfig } from 'payload'

import { adminGroups, collectionLabels, fieldLabels } from '../lib/constants/labels'

/** Payload collection config for admin users. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: collectionLabels.users,
  admin: {
    useAsTitle: 'email',
    group: adminGroups.administration,
  },
  auth: {
    useAPIKey: true,
  },
  fields: [
    // Email added by default
    {
      name: 'firstName',
      type: 'text',
      label: fieldLabels.firstName,
    },
    {
      name: 'lastName',
      type: 'text',
      label: fieldLabels.lastName,
    },
  ],
}

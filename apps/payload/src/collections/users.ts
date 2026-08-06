import type { CollectionConfig } from "payload"

import {
  adminGroups,
  collectionLabels,
  fieldLabels,
} from "../lib/constants/labels"

/** Payload collection config for admin users. */
export const Users: CollectionConfig = {
  admin: {
    group: adminGroups.administration,
    useAsTitle: "email",
  },
  auth: {
    useAPIKey: true,
  },
  fields: [
    // Email added by default
    {
      label: fieldLabels.firstName,
      name: "firstName",
      type: "text",
    },
    {
      label: fieldLabels.lastName,
      name: "lastName",
      type: "text",
    },
  ],
  labels: collectionLabels.users,
  slug: "users",
}

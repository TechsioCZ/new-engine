import type { CollectionConfig } from "payload"
import { publicRead, requireAuth } from "../lib/access/require-auth"
import { adminGroups, collectionLabels } from "../lib/constants/labels"
import { createMedusaCacheHook } from "../lib/hooks/medusa-cache"
import { generateSlugFromTitle } from "../lib/hooks/slug"

const invalidateArticlesCache = createMedusaCacheHook("articles")

export const ArticleAuthors: CollectionConfig = {
  slug: "article-authors",
  labels: collectionLabels.articleAuthors,
  admin: {
    useAsTitle: "displayName",
    group: adminGroups.library,
    defaultColumns: ["displayName", "role", "updatedAt"],
  },
  access: {
    read: publicRead,
    create: requireAuth,
    update: requireAuth,
    delete: requireAuth,
  },
  fields: [
    {
      name: "displayName",
      type: "text",
      required: true,
      maxLength: 120,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
    },
    {
      name: "role",
      type: "text",
      localized: true,
      maxLength: 160,
    },
    {
      name: "bio",
      type: "textarea",
      localized: true,
      maxLength: 800,
    },
    {
      name: "portrait",
      type: "upload",
      relationTo: "media",
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.displayName && !data.slug) {
          data.slug = generateSlugFromTitle(data.displayName)
        }
        return data
      },
    ],
    afterChange: [invalidateArticlesCache],
    afterDelete: [invalidateArticlesCache],
  },
  timestamps: true,
}

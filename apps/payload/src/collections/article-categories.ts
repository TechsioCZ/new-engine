import type { CollectionConfig } from 'payload'

import { generateSlugFromTitle } from '../lib/hooks/slug'
import { adminGroups, collectionLabels } from '../lib/constants/labels'
import { createSlugField, createTitleField } from '../lib/constants/fields'
import { fieldDescriptions } from '../lib/constants/descriptions'
import { requireAuth } from '../lib/access/require-auth'
import { createMedusaCacheHook } from '../lib/hooks/medusa-cache'

/** Collection slug for article categories. */
const COLLECTION_SLUG = 'article-categories'
/** Hook to invalidate Medusa cache when article categories change. */
const invalidateArticleCategoriesCache = createMedusaCacheHook(COLLECTION_SLUG)

/** Payload collection config for article categories. */
export const ArticleCategories: CollectionConfig = {
  slug: COLLECTION_SLUG,
  labels: collectionLabels.articleCategories,
  admin: {
    useAsTitle: 'title',
    group: adminGroups.library,
  },
  access: {
    read: requireAuth,
    create: requireAuth,
    update: requireAuth,
    delete: requireAuth,
  },
  fields: [
    createTitleField(),
    createSlugField({
      description: fieldDescriptions.slugCategory,
    }),
  ],
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (!data) {
          return data
        }
        if (data?.title && !data?.slug) {
          const slug = generateSlugFromTitle(data.title, {
            locale: req?.locale,
          })
          if (slug) {
            data.slug = slug
          }
        }

        return data
      },
    ],
    afterChange: [invalidateArticleCategoriesCache],
    afterDelete: [invalidateArticleCategoriesCache],
  },
}

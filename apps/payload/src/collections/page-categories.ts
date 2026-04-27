import type { CollectionConfig } from 'payload'

import { generateSlugFromTitle } from '../lib/hooks/slug'
import { adminGroups, collectionLabels } from '../lib/constants/labels'
import { createSlugField, createTitleField } from '../lib/constants/fields'
import { fieldDescriptions } from '../lib/constants/descriptions'
import { requireAuth } from '../lib/access/require-auth'
import { createMedusaCacheHook } from '../lib/hooks/medusa-cache'

/** Collection slug for page categories. */
const COLLECTION_SLUG = 'page-categories'
/** Hook to invalidate Medusa cache when page categories change. */
const invalidatePageCategoriesCache = createMedusaCacheHook(COLLECTION_SLUG)

/** Payload collection config for page categories. */
export const PageCategories: CollectionConfig = {
  slug: COLLECTION_SLUG,
  labels: collectionLabels.pageCategories,
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
      description: fieldDescriptions.slugPageCategory,
    }),
  ],
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
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
    afterChange: [invalidatePageCategoriesCache],
    afterDelete: [invalidatePageCategoriesCache],
  },
}

import type { CollectionConfig } from 'payload'
import { lexicalHTMLField } from '@payloadcms/richtext-lexical'

import { createLexicalEditor } from '../lib/editors/lexical'
import { generateSlugFromTitle } from '../lib/hooks/slug'
import { adminGroups, collectionLabels, fieldLabels } from '../lib/constants/labels'
import { fieldDescriptions } from '../lib/constants/descriptions'
import { requireAuth } from '../lib/access/require-auth'
import { createMedusaCacheHook } from '../lib/hooks/medusa-cache'
import { shouldReturnHtmlForRequest } from '../lib/utils/request'
import {
  createContentField,
  createPublishedDateField,
  createSlugField,
  createStatusField,
  createTitleField,
} from '../lib/constants/fields'

/** Collection slug for pages. */
const COLLECTION_SLUG = 'pages'
/** Hook to invalidate Medusa cache when pages change. */
const invalidatePagesCache = createMedusaCacheHook(COLLECTION_SLUG)

/** Payload collection config for pages. */
export const Pages: CollectionConfig = {
  slug: COLLECTION_SLUG,
  labels: collectionLabels.pages,
  admin: {
    useAsTitle: 'title',
    group: adminGroups.content,
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
      description: fieldDescriptions.slugPage,
    }),
    {
      name: 'category',
      label: fieldLabels.category,
      type: 'relationship',
      relationTo: 'page-categories',
      required: false,
    },
    createContentField({ editor: createLexicalEditor() }),
    lexicalHTMLField({
      htmlFieldName: 'contentHTML',
      lexicalFieldName: 'content',
    }),
    {
      name: 'visibility',
      label: fieldLabels.visibility,
      type: 'select',
      required: true,
      defaultValue: 'public',
      options: [
        {
          label: fieldLabels.visibilityPublic,
          value: 'public',
        },
        {
          label: fieldLabels.visibilityCustomersOnly,
          value: 'customers-only',
        },
      ],
    },
    createStatusField(),
    createPublishedDateField(),
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
    afterChange: [invalidatePagesCache],
    afterDelete: [invalidatePagesCache],
    afterRead: [
      ({ doc, req }) => {
        if (!shouldReturnHtmlForRequest(req)) {
          return doc
        }

        if (doc.contentHTML !== undefined) {
          const { contentHTML, ...rest } = doc
          return {
            ...rest,
            content: contentHTML,
          }
        }

        return doc
      },
    ],
  },
}

import { lexicalHTMLField } from "@payloadcms/richtext-lexical"
import type {
  CollectionAfterReadHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
} from "payload"

import { requireAuth } from "../lib/access/require-auth"
import { fieldDescriptions } from "../lib/constants/descriptions"
import {
  createContentField,
  createPublishedDateField,
  createSlugField,
  createStatusField,
  createTitleField,
} from "../lib/constants/fields"
import {
  adminGroups,
  collectionLabels,
  fieldLabels,
} from "../lib/constants/labels"
import { createLexicalEditor } from "../lib/editors/lexical"
import { createMedusaCacheHook } from "../lib/hooks/medusa-cache"
import { generateSlugFromTitle } from "../lib/hooks/slug"
import { shouldReturnHtmlForRequest } from "../lib/utils/request"
import type { Page } from "../payload-types"

/** Collection slug for pages. */
const COLLECTION_SLUG = "pages"
/** Hook to invalidate Medusa cache when pages change. */
const invalidatePagesCache = createMedusaCacheHook(COLLECTION_SLUG)

const replaceContentWithHtml: CollectionAfterReadHook<Page> = ({
  doc,
  req,
}) => {
  if (!shouldReturnHtmlForRequest(req) || doc.contentHTML === undefined) {
    return doc
  }

  const { contentHTML, ...rest } = doc
  return { ...rest, content: contentHTML }
}

const populateSlug: CollectionBeforeValidateHook<Page> = ({ data, req }) => {
  if (data === undefined) {
    return data
  }

  const { slug: existingSlug, title } = data
  if (
    title !== undefined &&
    (existingSlug === undefined || existingSlug === null || existingSlug === "")
  ) {
    const { locale } = req
    const slug = generateSlugFromTitle(
      title,
      locale === undefined || locale === "all" ? {} : { locale },
    )
    if (slug !== "") {
      data.slug = slug
    }
  }

  return data
}

/** Payload collection config for pages. */
export const Pages: CollectionConfig = {
  access: {
    create: requireAuth,
    delete: requireAuth,
    read: requireAuth,
    update: requireAuth,
  },
  admin: {
    group: adminGroups.content,
    useAsTitle: "title",
  },
  fields: [
    createTitleField(),
    createSlugField({
      description: fieldDescriptions.slugPage,
    }),
    {
      label: fieldLabels.category,
      name: "category",
      relationTo: "page-categories",
      required: false,
      type: "relationship",
    },
    createContentField({ editor: createLexicalEditor() }),
    lexicalHTMLField({
      htmlFieldName: "contentHTML",
      lexicalFieldName: "content",
    }),
    {
      defaultValue: "public",
      label: fieldLabels.visibility,
      name: "visibility",
      options: [
        {
          label: fieldLabels.visibilityPublic,
          value: "public",
        },
        {
          label: fieldLabels.visibilityCustomersOnly,
          value: "customers-only",
        },
      ],
      required: true,
      type: "select",
    },
    createStatusField(),
    createPublishedDateField(),
  ],
  hooks: {
    afterChange: [invalidatePagesCache],
    afterDelete: [invalidatePagesCache],
    afterRead: [replaceContentWithHtml],
    beforeValidate: [populateSlug],
  },
  labels: collectionLabels.pages,
  slug: COLLECTION_SLUG,
}

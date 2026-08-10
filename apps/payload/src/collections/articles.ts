import { lexicalHTMLField } from "@payloadcms/richtext-lexical"
import type {
  CollectionAfterReadHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  Condition,
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
import { estimateReadingTime } from "../lib/utils/reading-time"
import { shouldReturnHtmlForRequest } from "../lib/utils/request"
import type { Article } from "../payload-types"

/** Collection slug for articles. */
const COLLECTION_SLUG = "articles"
/** Hook to invalidate Medusa cache when articles change. */
const invalidateArticlesCache = createMedusaCacheHook(COLLECTION_SLUG)

/** Show the analytics group only once the article has been published. */
const isArticlePublished: Condition<Article> = (data) =>
  data?.status === "published"

/** Return HTML content in place of the Lexical AST when the request asks for it. */
const returnHtmlForRequest: CollectionAfterReadHook<Article> = ({
  doc,
  req,
}) => {
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
}

/** Auto-generate the slug and estimated reading time before saving. */
const applyArticleDefaults: CollectionBeforeChangeHook<Article> = ({
  data,
  req,
}) => {
  // Auto-generate slug from title if not provided
  if (
    data.title !== undefined &&
    data.title !== "" &&
    (data.slug === undefined || data.slug === "")
  ) {
    const slug = generateSlugFromTitle(
      data.title,
      req?.locale ? { locale: req.locale } : {},
    )
    if (slug) {
      data.slug = slug
    }
  }

  // Estimate reading time (average 200 words per minute)
  if (
    data.content &&
    (data.readingTime === undefined || data.readingTime === null)
  ) {
    data.readingTime = estimateReadingTime(data.content)
  }

  return data
}

/** Payload collection config for articles. */
export const Articles: CollectionConfig = {
  access: {
    create: requireAuth,
    delete: requireAuth,
    read: requireAuth,
    update: requireAuth,
  },
  admin: {
    defaultColumns: ["title", "category", "publishedDate", "status"],
    group: adminGroups.content,
    useAsTitle: "title",
  },
  fields: [
    createTitleField({
      label: fieldLabels.articleTitle,
      maxLength: 100,
    }),
    createSlugField({
      description: fieldDescriptions.slugArticle,
      label: fieldLabels.urlSlug,
    }),
    {
      admin: {
        description: fieldDescriptions.excerptArticle,
      },
      label: fieldLabels.excerpt,
      localized: true,
      maxLength: 300,
      name: "excerpt",
      required: true,
      type: "textarea",
    },
    createContentField({
      admin: {
        description: fieldDescriptions.contentArticle,
      },
      editor: createLexicalEditor(),
      label: fieldLabels.articleContent,
      required: true,
    }),
    lexicalHTMLField({
      htmlFieldName: "contentHTML",
      lexicalFieldName: "content",
    }),
    {
      admin: {
        description: fieldDescriptions.featuredImageArticle,
      },
      label: fieldLabels.featuredImage,
      name: "featuredImage",
      relationTo: "media",
      required: true,
      type: "upload",
    },
    {
      label: fieldLabels.category,
      name: "category",
      relationTo: "article-categories",
      required: true,
      type: "relationship",
    },
    {
      admin: {
        description: fieldDescriptions.tagsArticle,
      },
      hasMany: true,
      label: fieldLabels.tags,
      localized: true,
      name: "tags",
      type: "text",
    },
    {
      defaultValue: ({ user }) => user?.id,
      label: fieldLabels.author,
      name: "author",
      relationTo: "users",
      type: "relationship",
    },
    createPublishedDateField(),
    createStatusField(),
    {
      admin: {
        description: fieldDescriptions.readingTime,
      },
      label: fieldLabels.readingTime,
      name: "readingTime",
      type: "number",
    },
    // Analytics and Performance
    {
      admin: {
        condition: isArticlePublished,
      },
      fields: [
        {
          admin: {
            readOnly: true,
          },
          defaultValue: 0,
          label: fieldLabels.views,
          name: "views",
          type: "number",
        },
        {
          admin: {
            readOnly: true,
          },
          defaultValue: 0,
          label: fieldLabels.shares,
          name: "shares",
          type: "number",
        },
        {
          admin: {
            date: {
              pickerAppearance: "dayAndTime",
            },
            readOnly: true,
          },
          label: fieldLabels.lastViewed,
          name: "lastViewed",
          type: "date",
        },
      ],
      label: fieldLabels.analytics,
      name: "analytics",
      type: "group",
    },
  ],
  hooks: {
    afterChange: [invalidateArticlesCache],
    afterDelete: [invalidateArticlesCache],
    afterRead: [returnHtmlForRequest],
    beforeChange: [applyArticleDefaults],
  },
  labels: collectionLabels.articles,
  slug: COLLECTION_SLUG,
  timestamps: true,
}

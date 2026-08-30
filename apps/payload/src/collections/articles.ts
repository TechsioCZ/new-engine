import { lexicalHTMLField } from "@payloadcms/richtext-lexical"
import type {
  CollectionBeforeValidateHook,
  CollectionConfig,
  Where,
} from "payload"
import { ValidationError } from "payload"
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
import { createMedusaProductReferenceField } from "../lib/fields/medusa-product-reference"
import { normalizeArticleCategories } from "../lib/hooks/article-categories"
import { storefrontHTMLConverters } from "../lib/hooks/lexical-html"
import { createMedusaCacheHook } from "../lib/hooks/medusa-cache"
import { generateSlugFromTitle } from "../lib/hooks/slug"
import { estimateReadingTime } from "../lib/utils/reading-time"
import { shouldReturnHtmlForRequest } from "../lib/utils/request"

/** Collection slug for articles. */
const COLLECTION_SLUG = "articles"
/** Hook to invalidate Medusa cache when articles change. */
const invalidateArticlesCache = createMedusaCacheHook(COLLECTION_SLUG)
const hasOwn = (value: object | undefined, key: string) =>
  Boolean(value && Object.hasOwn(value, key))

const validatePublishedArticleAuthor: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
  req,
}) => {
  const status = hasOwn(data, "status") ? data?.status : originalDoc?.status
  const articleAuthor = hasOwn(data, "articleAuthor")
    ? data?.articleAuthor
    : originalDoc?.articleAuthor

  if (status === "published" && !articleAuthor) {
    throw new ValidationError({
      collection: COLLECTION_SLUG,
      errors: [
        {
          message: "Published articles require an article author.",
          path: "articleAuthor",
        },
      ],
      id: originalDoc?.id,
      req,
    })
  }

  return data
}

/** Payload collection config for articles. */
export const Articles: CollectionConfig = {
  slug: COLLECTION_SLUG,
  labels: collectionLabels.articles,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "primaryCategory", "publishedDate", "status"],
    group: adminGroups.content,
  },
  access: {
    read: requireAuth,
    create: requireAuth,
    update: requireAuth,
    delete: requireAuth,
  },
  fields: [
    createTitleField({
      label: fieldLabels.articleTitle,
      maxLength: 200,
    }),
    createSlugField({
      label: fieldLabels.urlSlug,
      description: fieldDescriptions.slugArticle,
    }),
    {
      name: "excerpt",
      label: fieldLabels.excerpt,
      type: "textarea",
      required: true,
      maxLength: 300,
      localized: true,
      admin: {
        description: fieldDescriptions.excerptArticle,
      },
    },
    createContentField({
      editor: createLexicalEditor(),
      label: fieldLabels.articleContent,
      required: true,
      admin: {
        description: fieldDescriptions.contentArticle,
      },
    }),
    lexicalHTMLField({
      converters: storefrontHTMLConverters,
      htmlFieldName: "contentHTML",
      lexicalFieldName: "content",
    }),
    {
      name: "featuredImage",
      label: fieldLabels.featuredImage,
      type: "upload",
      relationTo: "media",
      required: true,
      localized: true,
      admin: {
        description: fieldDescriptions.featuredImageArticle,
      },
    },
    {
      name: "sidebar",
      label: fieldLabels.articleSidebar,
      type: "group",
      localized: true,
      fields: [
        {
          name: "promoImage",
          label: fieldLabels.sidebarPromoImage,
          type: "upload",
          relationTo: "media",
          admin: {
            description: fieldDescriptions.sidebarPromoImage,
          },
        },
        createMedusaProductReferenceField({
          label: fieldLabels.sidebarProduct,
          description: fieldDescriptions.sidebarProduct,
        }),
      ],
    },
    {
      name: "category",
      label: fieldLabels.category,
      type: "relationship",
      relationTo: "article-categories",
      required: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: "categories",
      label: "Categories",
      type: "relationship",
      relationTo: "article-categories",
      hasMany: true,
      required: true,
      minRows: 1,
    },
    {
      name: "primaryCategory",
      label: "Primary category",
      type: "relationship",
      relationTo: "article-categories",
      required: true,
    },
    {
      name: "relatedArticles",
      label: "Related articles",
      type: "relationship",
      relationTo: "articles",
      hasMany: true,
      localized: true,
      maxRows: 4,
      maxDepth: 2,
      filterOptions: ({ id }): Where => {
        const filters: Where[] = [{ status: { equals: "published" } }]
        if (id) {
          filters.push({ id: { not_equals: id } })
        }
        return { and: filters }
      },
      admin: {
        isSortable: true,
      },
    },
    {
      name: "tags",
      label: fieldLabels.tags,
      type: "text",
      hasMany: true,
      localized: true,
      admin: {
        description: fieldDescriptions.tagsArticle,
      },
    },
    {
      name: "author",
      type: "relationship",
      relationTo: "users",
      admin: {
        hidden: true,
      },
    },
    {
      name: "articleAuthor",
      label: fieldLabels.author,
      type: "relationship",
      relationTo: "article-authors",
    },
    createPublishedDateField({ localized: true }),
    createStatusField(),
    {
      name: "readingTime",
      label: fieldLabels.readingTime,
      type: "number",
      localized: true,
      admin: {
        description: fieldDescriptions.readingTime,
      },
    },
    // Analytics and Performance
    {
      name: "analytics",
      label: fieldLabels.analytics,
      type: "group",
      admin: {
        condition: (data: any) => data?.status === "published",
      },
      fields: [
        {
          name: "views",
          label: fieldLabels.views,
          type: "number",
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: "shares",
          label: fieldLabels.shares,
          type: "number",
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: "lastViewed",
          label: fieldLabels.lastViewed,
          type: "date",
          admin: {
            readOnly: true,
            date: {
              pickerAppearance: "dayAndTime",
            },
          },
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      normalizeArticleCategories,
      validatePublishedArticleAuthor,
    ],
    beforeChange: [
      ({ data, req }: any) => {
        // Auto-generate slug from title if not provided
        if (data.title && !data.slug) {
          const slug = generateSlugFromTitle(data.title, {
            locale: req?.locale,
          })
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
      },
    ],
    afterChange: [invalidateArticlesCache],
    afterDelete: [invalidateArticlesCache],
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
  timestamps: true,
}

import type { CollectionConfig } from "payload";
import { lexicalHTMLField } from "@payloadcms/richtext-lexical";
import { createLexicalEditor } from "../lib/editors/lexical";
import { requireAuth } from "../lib/access/require-auth";
import { generateSlugFromTitle } from "../lib/hooks/slug";
import { adminGroups, collectionLabels, fieldLabels } from "../lib/constants/labels";
import { fieldDescriptions } from "../lib/constants/descriptions";
import { createMedusaCacheHook } from "../lib/hooks/medusa-cache";
import { shouldReturnHtmlForRequest } from "../lib/utils/request";
import { estimateReadingTime } from "../lib/utils/reading-time";
import {
  createContentField,
  createPublishedDateField,
  createSlugField,
  createStatusField,
  createTitleField,
} from "../lib/constants/fields";

/** Collection slug for articles. */
const COLLECTION_SLUG = "articles";
/** Hook to invalidate Medusa cache when articles change. */
const invalidateArticlesCache = createMedusaCacheHook(COLLECTION_SLUG);

/** Payload collection config for articles. */
export const Articles: CollectionConfig = {
  slug: COLLECTION_SLUG,
  labels: collectionLabels.articles,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "category", "publishedDate", "status"],
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
      maxLength: 100,
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
      htmlFieldName: "contentHTML",
      lexicalFieldName: "content",
    }),
    {
      name: "featuredImage",
      label: fieldLabels.featuredImage,
      type: "upload",
      relationTo: "media",
      required: true,
      admin: {
        description: fieldDescriptions.featuredImageArticle,
      },
    },
    {
      name: "category",
      label: fieldLabels.category,
      type: "relationship",
      relationTo: "article-categories",
      required: true,
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
      label: fieldLabels.author,
      type: "relationship",
      relationTo: "users",
      defaultValue: ({ user }) => user?.id,
    },
    createPublishedDateField(),
    createStatusField(),
    {
      name: "readingTime",
      label: fieldLabels.readingTime,
      type: "number",
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
    beforeChange: [
      ({ data, req }: any) => {
        // Auto-generate slug from title if not provided
        if (data.title && !data.slug) {
          const slug = generateSlugFromTitle(data.title, {
            locale: req?.locale,
          });
          if (slug) {
            data.slug = slug;
          }
        }

        // Estimate reading time (average 200 words per minute)
        if (data.content && (data.readingTime === undefined || data.readingTime === null)) {
          data.readingTime = estimateReadingTime(data.content);
        }

        return data;
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
};

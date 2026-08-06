import { isRecord } from "@techsio/std/object"
import type { CollectionConfig } from "payload"

import { requireAuth } from "../lib/access/require-auth"
import { fieldDescriptions } from "../lib/constants/descriptions"
import { createSlugField, createTitleField } from "../lib/constants/fields"
import { adminGroups, collectionLabels } from "../lib/constants/labels"
import { createMedusaCacheHook } from "../lib/hooks/medusa-cache"
import { generateSlugFromTitle } from "../lib/hooks/slug"

/** Collection slug for article categories. */
const COLLECTION_SLUG = "article-categories"
/** Hook to invalidate Medusa cache when article categories change. */
const invalidateArticleCategoriesCache = createMedusaCacheHook(COLLECTION_SLUG)

/** Payload collection config for article categories. */
export const ArticleCategories: CollectionConfig = {
  access: {
    create: requireAuth,
    delete: requireAuth,
    read: requireAuth,
    update: requireAuth,
  },
  admin: {
    group: adminGroups.library,
    useAsTitle: "title",
  },
  fields: [
    createTitleField(),
    createSlugField({
      description: fieldDescriptions.slugCategory,
    }),
  ],
  hooks: {
    afterChange: [invalidateArticleCategoriesCache],
    afterDelete: [invalidateArticleCategoriesCache],
    beforeValidate: [
      ({ data, req }) => {
        if (!isRecord(data)) {
          return data
        }

        const { slug: existingSlug, title } = data
        if (
          title !== undefined &&
          (typeof existingSlug === "string"
            ? existingSlug === ""
            : !isRecord(existingSlug))
        ) {
          const { locale } = req
          const slug = generateSlugFromTitle(
            title,
            locale === undefined || locale === "all" ? {} : { locale },
          )
          if (slug !== "") {
            Reflect.set(data, "slug", slug)
          }
        }

        return data
      },
    ],
  },
  labels: collectionLabels.articleCategories,
  slug: COLLECTION_SLUG,
}

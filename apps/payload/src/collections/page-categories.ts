import { isRecord } from "@techsio/std/object"
import type { CollectionConfig } from "payload"

import { requireAuth } from "../lib/access/require-auth"
import { fieldDescriptions } from "../lib/constants/descriptions"
import { createSlugField, createTitleField } from "../lib/constants/fields"
import { adminGroups, collectionLabels } from "../lib/constants/labels"
import { createMedusaCacheHook } from "../lib/hooks/medusa-cache"
import { generateSlugFromTitle } from "../lib/hooks/slug"

/** Collection slug for page categories. */
const COLLECTION_SLUG = "page-categories"
/** Hook to invalidate Medusa cache when page categories change. */
const invalidatePageCategoriesCache = createMedusaCacheHook(COLLECTION_SLUG)

/** Payload collection config for page categories. */
export const PageCategories: CollectionConfig = {
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
      description: fieldDescriptions.slugPageCategory,
    }),
  ],
  hooks: {
    afterChange: [invalidatePageCategoriesCache],
    afterDelete: [invalidatePageCategoriesCache],
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
  labels: collectionLabels.pageCategories,
  slug: COLLECTION_SLUG,
}

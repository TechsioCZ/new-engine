import type { CollectionBeforeValidateHook } from "payload"

type RelationValue =
  | number
  | string
  | {
      id?: number | string | null
    }
  | null
  | undefined

const relationId = (value: RelationValue) => {
  if (typeof value === "number" || typeof value === "string") {
    return value
  }

  return value?.id ?? null
}

const normalizeRelationIds = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  const ids = value
    .map((entry) => relationId(entry as RelationValue))
    .filter((id): id is number | string => id !== null)

  return [...new Set(ids)]
}

export const normalizeArticleCategories: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
}) => {
  if (!data) {
    return data
  }

  const original = originalDoc as
    | Record<string, unknown>
    | null
    | undefined
  const categories = normalizeRelationIds(
    data.categories ?? original?.categories
  )
  const primaryCategory =
    relationId(
      (data.primaryCategory ??
        original?.primaryCategory ??
        data.category ??
        original?.category) as RelationValue
    ) ??
    categories[0] ??
    null

  if (primaryCategory !== null && !categories.includes(primaryCategory)) {
    categories.push(primaryCategory)
  }

  data.categories = categories
  data.primaryCategory = primaryCategory
  data.category = primaryCategory

  return data
}

import {
  MAX_SLUG_LENGTH,
  SlugError,
  slugify,
  validateSlug,
} from "../../url/slug.ts"

const TRAILING_SEGMENT_PATTERN = /-[^-]*$/
const TRAILING_HYPHENS_PATTERN = /-+$/

const sourceGroups = (source) => [
  {
    entities: source.products ?? [],
    kind: "product",
    equivalencePrefix: "product",
  },
  {
    entities: source.categories ?? [],
    kind: "category",
    equivalencePrefix: "category",
  },
  {
    entities: source.brands ?? [],
    kind: "brand",
    equivalencePrefix: "brand",
  },
  {
    entities: source.collections ?? [],
    kind: "collection",
    equivalencePrefix: "collection",
  },
  {
    entities: source.articles ?? [],
    kind: "article",
    equivalencePrefix: "article",
  },
  {
    entities: source.pages ?? [],
    kind: "page",
    equivalencePrefix: "page",
  },
]

const boundedProductSlug = (title) => {
  try {
    return slugify(title)
  } catch (error) {
    if (!(error instanceof SlugError && error.reason === "too-long")) {
      throw error
    }
    const bounded = error.value.slice(0, MAX_SLUG_LENGTH)
    return validateSlug(
      bounded.replace(TRAILING_SEGMENT_PATTERN, "") ||
        bounded.replace(TRAILING_HYPHENS_PATTERN, "")
    )
  }
}

const sourceSlug = (entity, kind) => {
  const candidate =
    entity.slug?.trim() ||
    (kind === "product" ? entity.title?.trim() : undefined) ||
    entity.handle?.trim()
  if (!candidate) {
    throw new Error(`Seed entity ${entity.id} has no slug or handle`)
  }
  return kind === "product"
    ? boundedProductSlug(candidate)
    : validateSlug(slugify(candidate))
}

export const mapSeedSources = (sources) => {
  const result = []
  const entityKeys = new Set()
  const slugsByNamespace = new Map()

  for (const source of sources) {
    for (const group of sourceGroups(source)) {
      const namespace = `${source.market}\u0000${group.kind}`
      const existingSlugs = slugsByNamespace.get(namespace) ?? new Set()
      slugsByNamespace.set(namespace, existingSlugs)

      for (const entity of group.entities) {
        const entityId = String(entity.id).trim()
        if (!entityId) {
          throw new Error("Seed entity ID cannot be empty")
        }
        const entityKey = `${namespace}\u0000${entityId}`
        if (entityKeys.has(entityKey)) {
          continue
        }

        const slug = sourceSlug(entity, group.kind)
        validateSlug(slug, { existingSlugs })
        existingSlugs.add(slug)
        entityKeys.add(entityKey)
        result.push({
          market: source.market,
          kind: group.kind,
          slug,
          entityId,
          equivalenceKey: `${group.equivalencePrefix}:${entityId}`,
          indexable: true,
        })
      }
    }
  }

  return result
}

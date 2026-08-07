import { slugifyProductTitle } from "../../url/product-slug.ts"
import { slugify, validateSlug } from "../../url/slug.ts"

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

const sourceSlug = (entity, kind) => {
  const candidate =
    entity.slug?.trim() ||
    (kind === "product" ? entity.title?.trim() : undefined) ||
    entity.handle?.trim()
  if (!candidate) {
    throw new Error(`Seed entity ${entity.id} has no slug or handle`)
  }
  return kind === "product"
    ? slugifyProductTitle(candidate)
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

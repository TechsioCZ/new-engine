import type { UrlRouteSnapshot } from "./model"

export const MAX_URL_REGISTRY_INVALIDATION_TAGS = 128
export const MAX_URL_REGISTRY_INVALIDATION_TAG_LENGTH = 256

const compareText = (left: string, right: string) => {
  if (left < right) {
    return -1
  }
  return left > right ? 1 : 0
}

const sortedUnique = (values: Iterable<string>): string[] =>
  [...new Set(values)].sort(compareText)

const isValidTag = (tag: string): boolean =>
  tag.length > 0 && tag.length <= MAX_URL_REGISTRY_INVALIDATION_TAG_LENGTH

const mandatoryTags = (snapshots: readonly UrlRouteSnapshot[]): string[] => {
  const tags: string[] = []
  for (const { route } of snapshots) {
    tags.push(
      `feed:${route.market}`,
      `market:${route.market}`,
      `navigation:${route.market}`,
      `route-family:${route.market}:${route.kind}`,
      `sitemap:${route.market}`
    )
  }
  return sortedUnique(tags)
}

const exactTags = (snapshots: readonly UrlRouteSnapshot[]): string[] => {
  const tags: string[] = []
  for (const snapshot of snapshots) {
    const { route } = snapshot
    tags.push(`route:${route.market}:${route.kind}:${route.id}`)
    if (route.equivalenceKey) {
      tags.push(`equivalence:${route.equivalenceKey}`)
    }
    if (snapshot.projectionType === "entity") {
      tags.push(
        `${route.kind}:${route.market}:${route.sourceId}`,
        `route-slug:${route.market}:${route.kind}:${snapshot.currentSlug.normalizedSlug}`
      )
    } else {
      tags.push(`static-route:${route.market}:${route.staticRouteKey}`)
    }
  }
  return sortedUnique(tags)
}

const appendWithinLimit = (
  selected: string[],
  seen: Set<string>,
  candidates: readonly string[]
) => {
  for (const tag of candidates) {
    if (seen.has(tag) || !isValidTag(tag)) {
      continue
    }
    if (selected.length === MAX_URL_REGISTRY_INVALIDATION_TAGS) {
      return
    }
    seen.add(tag)
    selected.push(tag)
  }
}

export const invalidationTagsForSnapshots = (
  snapshots: readonly UrlRouteSnapshot[],
  priorityExactTags: readonly string[] = []
): string[] => {
  const mandatory = mandatoryTags(snapshots)
  if (mandatory.length === 0) {
    throw new RangeError("At least one URL route snapshot is required")
  }
  if (mandatory.length > MAX_URL_REGISTRY_INVALIDATION_TAGS) {
    throw new RangeError(
      "URL registry coarse invalidation tags exceed the limit"
    )
  }
  if (!mandatory.every(isValidTag)) {
    throw new RangeError("URL registry coarse invalidation tag is invalid")
  }

  const selected = [...mandatory]
  const seen = new Set(selected)
  appendWithinLimit(selected, seen, sortedUnique(priorityExactTags))
  appendWithinLimit(selected, seen, exactTags(snapshots))
  return selected.sort(compareText)
}

export const assertBoundedUrlRegistryInvalidationTags = (
  tags: readonly string[]
): void => {
  if (
    tags.length < 1 ||
    tags.length > MAX_URL_REGISTRY_INVALIDATION_TAGS ||
    tags.some((tag) => !isValidTag(tag))
  ) {
    throw new RangeError("URL registry invalidation tags are outside the bound")
  }
}

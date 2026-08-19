import type { SourceReadResult } from "@/lib/url-registry/contracts"
import type {
  CollectionAssignment,
  CollectionRouteSourceMarketBinding,
} from "./collections-route-source"

export type CollectionIndexItem = Readonly<{
  id: string
  title: string
}>

type AssignmentPage = Readonly<{
  count: number
  items: readonly CollectionAssignment[]
  limit: number
  offset: number
}>

export type CollectionIndexSourceDependencies = Readonly<{
  listAssignments: (input: {
    binding: CollectionRouteSourceMarketBinding
    limit: number
    offset: number
  }) => Promise<unknown>
  listCollections: (input: {
    binding: CollectionRouteSourceMarketBinding
    ids: readonly string[]
  }) => Promise<unknown>
  resolveMarket: (market: string) => CollectionRouteSourceMarketBinding | null
}>

const PAGE_SIZE = 100
const MAX_ASSIGNMENTS = 5000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value)

const readAssignment = (
  value: unknown,
  binding: CollectionRouteSourceMarketBinding
): CollectionAssignment | null =>
  isRecord(value) &&
  value.schemaVersion === 1 &&
  typeof value.id === "string" &&
  value.entityId === value.id &&
  value.marketCode === binding.market &&
  value.salesChannelId === binding.salesChannelId &&
  value.publicationStatus === "published" &&
  typeof value.publicSlug === "string" &&
  value.publicSlug.length > 0 &&
  typeof value.sourceVersion === "string" &&
  value.sourceVersion.length > 0
    ? (value as unknown as CollectionAssignment)
    : null

const readAssignmentPage = (
  value: unknown,
  binding: CollectionRouteSourceMarketBinding,
  expectedOffset: number
): AssignmentPage | null => {
  if (
    !(isRecord(value) && Array.isArray(value.items)) ||
    typeof value.count !== "number" ||
    !Number.isInteger(value.count) ||
    value.count < 0 ||
    value.limit !== PAGE_SIZE ||
    value.offset !== expectedOffset ||
    value.items.length > PAGE_SIZE ||
    expectedOffset + value.items.length > value.count
  ) {
    return null
  }
  const items = value.items.map((item) => readAssignment(item, binding))
  return items.every((item) => item !== null)
    ? {
        count: value.count,
        items: items as CollectionAssignment[],
        limit: PAGE_SIZE,
        offset: expectedOffset,
      }
    : null
}

const readCollections = (
  value: unknown,
  expectedIds: ReadonlySet<string>
): CollectionIndexItem[] | null => {
  if (!(isRecord(value) && Array.isArray(value.collections))) {
    return null
  }
  const items = value.collections.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !expectedIds.has(item.id) ||
      typeof item.title !== "string" ||
      item.title.trim().length === 0
    ) {
      return []
    }
    return [{ id: item.id, title: item.title.trim() }]
  })
  return new Set(items.map((item) => item.id)).size === items.length
    ? items
    : null
}

const statusOf = (error: unknown) =>
  isRecord(error) && typeof error.status === "number" ? error.status : null

const mapError = <Value>(error: unknown): SourceReadResult<Value> => {
  const status = statusOf(error)
  return status === 408 ||
    status === 425 ||
    status === 429 ||
    (status ?? 0) >= 500
    ? { kind: "unavailable" }
    : {
        causeCode: "MEDUSA_REJECTED_COLLECTION_INDEX_REQUEST",
        kind: "invalid-response",
      }
}

const chunks = <Value>(values: readonly Value[], size: number): Value[][] => {
  const result: Value[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

export const readCollectionIndexSource = async (
  input: Readonly<{ market: string; routeSourceIds: readonly string[] }>,
  dependencies: CollectionIndexSourceDependencies
): Promise<SourceReadResult<readonly CollectionIndexItem[]>> => {
  const binding = dependencies.resolveMarket(input.market)
  if (!binding) {
    return {
      causeCode: "MISSING_MARKET_BINDING",
      kind: "invalid-response",
    }
  }
  if (input.routeSourceIds.length === 0) {
    return { kind: "found", value: [] }
  }

  try {
    const assignments: CollectionAssignment[] = []
    let offset = 0
    let count = Number.POSITIVE_INFINITY
    while (offset < count) {
      const rawPage = await dependencies.listAssignments({
        binding,
        limit: PAGE_SIZE,
        offset,
      })
      const page = readAssignmentPage(rawPage, binding, offset)
      if (!page || (page.items.length === 0 && offset < page.count)) {
        return {
          causeCode: "INVALID_COLLECTION_ASSIGNMENT_LIST_RESPONSE",
          kind: "invalid-response",
        }
      }
      assignments.push(...page.items)
      if (assignments.length > MAX_ASSIGNMENTS) {
        return {
          causeCode: "COLLECTION_ASSIGNMENT_LIMIT_EXCEEDED",
          kind: "invalid-response",
        }
      }
      count = page.count
      offset += page.items.length
    }

    if (
      assignments.length !== count ||
      new Set(assignments.map((assignment) => assignment.entityId)).size !==
        assignments.length
    ) {
      return {
        causeCode: "INVALID_COLLECTION_ASSIGNMENT_LIST_RESPONSE",
        kind: "invalid-response",
      }
    }

    const routeIds = new Set(input.routeSourceIds)
    const assignedIds = assignments.flatMap((assignment) =>
      routeIds.has(assignment.entityId) ? [assignment.entityId] : []
    )
    const itemPages = await Promise.all(
      chunks(assignedIds, PAGE_SIZE).map(async (ids) => {
        const rawCollections = await dependencies.listCollections({
          binding,
          ids,
        })
        return readCollections(rawCollections, new Set(ids))
      })
    )
    if (itemPages.some((page) => page === null)) {
      return {
        causeCode: "INVALID_MEDUSA_COLLECTION_LIST_RESPONSE",
        kind: "invalid-response",
      }
    }
    const items = itemPages.flatMap((page) => page ?? [])
    if (items.length !== assignedIds.length) {
      return {
        causeCode: "MISSING_ASSIGNED_COLLECTION_SOURCE",
        kind: "invalid-response",
      }
    }
    const byId = new Map(items.map((item) => [item.id, item] as const))
    return {
      kind: "found",
      value: input.routeSourceIds.flatMap((id) => {
        const item = byId.get(id)
        return item ? [item] : []
      }),
    }
  } catch (error) {
    return mapError(error)
  }
}

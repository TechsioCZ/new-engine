import { randomUUID } from "node:crypto"
import type { Market, UrlKind, UrlRecord } from "@/lib/url/types"
import {
  type CreateUrlRecordInput,
  normalizeListBounds,
  type UrlLookupResult,
  type UrlRegistry,
  type UrlRegistryListQuery,
  type UrlRegistryListResult,
} from "./contracts"
import { UrlRegistryError } from "./errors"

const routeKey = (record: Pick<UrlRecord, "market" | "kind" | "slug">) =>
  `${record.market}\u0000${record.kind}\u0000${record.slug}`

const cloneRecord = (record: UrlRecord): UrlRecord => ({
  ...record,
  updatedAt: new Date(record.updatedAt),
})

const sameEntity = (
  record: UrlRecord,
  market: Market,
  kind: UrlKind,
  entityId: string
) =>
  record.market === market &&
  record.kind === kind &&
  record.entityId === entityId

const assertAliasInvariant = (
  record: UrlRecord,
  records: ReadonlyMap<string, UrlRecord>
) => {
  if (record.status !== "alias") {
    if (record.aliasOf !== null) {
      throw new UrlRegistryError(
        "INVALID_STATE",
        `${record.status} record ${record.id} cannot have aliasOf`
      )
    }
    return
  }

  const target = record.aliasOf ? records.get(record.aliasOf) : undefined
  if (
    !target ||
    target.status !== "current" ||
    !sameEntity(target, record.market, record.kind, record.entityId)
  ) {
    throw new UrlRegistryError(
      "INVALID_ALIAS",
      `Alias ${record.id} must point directly to its entity's current URL`
    )
  }
}

export class InMemoryUrlRegistry implements UrlRegistry {
  private records: Map<string, UrlRecord>

  constructor(fixtures: readonly UrlRecord[] = []) {
    this.records = new Map(
      fixtures.map((record) => [record.id, cloneRecord(record)])
    )
    this.assertInvariants(this.records)
  }

  async lookup(
    market: Market,
    kind: UrlKind,
    slug: string
  ): Promise<UrlLookupResult> {
    await Promise.resolve()
    const record = [...this.records.values()].find(
      (candidate) => routeKey(candidate) === routeKey({ market, kind, slug })
    )

    if (!record) {
      return { type: "missing" }
    }
    if (record.status === "current") {
      return { type: "current", record: cloneRecord(record) }
    }
    if (record.status === "tombstone") {
      return { type: "tombstone", record: cloneRecord(record) }
    }

    const currentRecord = record.aliasOf
      ? this.records.get(record.aliasOf)
      : undefined
    if (!currentRecord || currentRecord.status !== "current") {
      throw new UrlRegistryError(
        "INVALID_ALIAS",
        `Alias ${record.id} does not point to a current record`
      )
    }

    return {
      type: "alias",
      record: cloneRecord(record),
      currentRecord: cloneRecord(currentRecord),
    }
  }

  async findByEntity(
    market: Market,
    kind: UrlKind,
    entityId: string
  ): Promise<UrlRecord | null> {
    await Promise.resolve()
    const record = [...this.records.values()].find(
      (candidate) =>
        sameEntity(candidate, market, kind, entityId) &&
        candidate.status === "current"
    )
    return record ? cloneRecord(record) : null
  }

  async findAlternates(equivalenceKey: string): Promise<UrlRecord[]> {
    await Promise.resolve()
    return [...this.records.values()]
      .filter(
        (record) =>
          record.equivalenceKey === equivalenceKey &&
          record.status === "current"
      )
      .sort((left, right) => left.market.localeCompare(right.market))
      .map(cloneRecord)
  }

  async create(input: CreateUrlRecordInput): Promise<UrlRecord> {
    await Promise.resolve()
    this.assertRouteAvailable(input.market, input.kind, input.slug)
    if (
      [...this.records.values()].some(
        (candidate) =>
          sameEntity(candidate, input.market, input.kind, input.entityId) &&
          candidate.status === "current"
      )
    ) {
      throw new UrlRegistryError(
        "UNIQUE_VIOLATION",
        `Entity ${input.entityId} already has a current URL`
      )
    }

    const record: UrlRecord = {
      ...input,
      id: randomUUID(),
      status: "current",
      aliasOf: null,
      updatedAt: new Date(),
    }
    const next = new Map(this.records)
    next.set(record.id, record)
    this.assertInvariants(next)
    this.records = next
    return cloneRecord(record)
  }

  async sync(input: CreateUrlRecordInput): Promise<UrlRecord> {
    await Promise.resolve()
    const next = new Map(this.records)
    const history = [...next.values()].filter((record) =>
      sameEntity(record, input.market, input.kind, input.entityId)
    )
    const current = history.find((record) => record.status === "current")
    const requestedRoute = [...next.values()].find(
      (record) => routeKey(record) === routeKey(input)
    )
    const synced = current
      ? this.syncExistingCurrent(next, input, current, requestedRoute)
      : this.syncWithoutCurrent(next, input, history, requestedRoute)

    this.assertInvariants(next)
    this.records = next
    return cloneRecord(synced)
  }

  async changeSlug(
    market: Market,
    kind: UrlKind,
    entityId: string,
    newSlug: string
  ): Promise<UrlRecord> {
    await Promise.resolve()
    this.assertRouteAvailable(market, kind, newSlug)
    const oldCurrent = [...this.records.values()].find(
      (record) =>
        sameEntity(record, market, kind, entityId) &&
        record.status === "current"
    )
    if (!oldCurrent) {
      throw new UrlRegistryError(
        "NOT_FOUND",
        `No current URL for ${market}/${kind}/${entityId}`
      )
    }

    const now = new Date()
    const currentRecord: UrlRecord = {
      ...oldCurrent,
      id: randomUUID(),
      slug: newSlug,
      aliasOf: null,
      status: "current",
      updatedAt: now,
    }
    const next = new Map(this.records)
    for (const [id, record] of next) {
      if (
        sameEntity(record, market, kind, entityId) &&
        (record.status === "alias" || record.id === oldCurrent.id)
      ) {
        next.set(id, {
          ...record,
          aliasOf: currentRecord.id,
          status: "alias",
          updatedAt: now,
        })
      }
    }
    next.set(currentRecord.id, currentRecord)
    this.assertInvariants(next)
    this.records = next
    return cloneRecord(currentRecord)
  }

  async tombstone(
    market: Market,
    kind: UrlKind,
    entityId: string
  ): Promise<UrlRecord> {
    await Promise.resolve()
    const current = [...this.records.values()].find(
      (record) =>
        sameEntity(record, market, kind, entityId) &&
        record.status === "current"
    )
    if (!current) {
      throw new UrlRegistryError(
        "NOT_FOUND",
        `No current URL for ${market}/${kind}/${entityId}`
      )
    }

    const now = new Date()
    const next = new Map(this.records)
    for (const [id, record] of next) {
      if (sameEntity(record, market, kind, entityId)) {
        next.set(id, {
          ...record,
          aliasOf: null,
          status: "tombstone",
          updatedAt: now,
        })
      }
    }
    this.assertInvariants(next)
    this.records = next
    return cloneRecord(next.get(current.id) as UrlRecord)
  }

  async tombstoneAllMarkets(
    kind: UrlKind,
    entityId: string
  ): Promise<UrlRecord[]> {
    await Promise.resolve()
    const next = new Map(this.records)
    const now = new Date()
    const currentIds = new Set(
      [...next.values()]
        .filter(
          (record) =>
            record.kind === kind &&
            record.entityId === entityId &&
            record.status === "current"
        )
        .map((record) => record.id)
    )
    for (const [id, record] of next) {
      if (record.kind === kind && record.entityId === entityId) {
        next.set(id, {
          ...record,
          aliasOf: null,
          status: "tombstone",
          updatedAt: now,
        })
      }
    }
    this.assertInvariants(next)
    this.records = next
    return [...next.values()]
      .filter((record) => currentIds.has(record.id))
      .map(cloneRecord)
  }

  async list(query: UrlRegistryListQuery = {}): Promise<UrlRegistryListResult> {
    await Promise.resolve()
    const { limit, offset } = normalizeListBounds(query)
    const matching = this.matchingRecords(query).sort((left, right) => {
      if (query.orderBy === "route") {
        return (
          left.market.localeCompare(right.market) ||
          left.kind.localeCompare(right.kind) ||
          left.slug.localeCompare(right.slug) ||
          left.id.localeCompare(right.id)
        )
      }
      return (
        right.updatedAt.getTime() - left.updatedAt.getTime() ||
        left.id.localeCompare(right.id)
      )
    })
    return {
      records: matching.slice(offset, offset + limit).map(cloneRecord),
      limit,
      offset,
      hasMore: matching.length > offset + limit,
    }
  }

  async count(query: UrlRegistryListQuery = {}): Promise<number> {
    await Promise.resolve()
    return this.matchingRecords(query).length
  }

  private matchingRecords(query: UrlRegistryListQuery): UrlRecord[] {
    return [...this.records.values()]
      .filter((record) => !query.id || record.id === query.id)
      .filter((record) => !query.market || record.market === query.market)
      .filter((record) => !query.kind || record.kind === query.kind)
      .filter((record) => !query.entityId || record.entityId === query.entityId)
      .filter(
        (record) =>
          !query.equivalenceKey ||
          record.equivalenceKey === query.equivalenceKey
      )
      .filter((record) => !query.status || record.status === query.status)
      .filter(
        (record) =>
          query.indexable === undefined || record.indexable === query.indexable
      )
  }

  private syncExistingCurrent(
    next: Map<string, UrlRecord>,
    input: CreateUrlRecordInput,
    current: UrlRecord,
    requestedRoute: UrlRecord | undefined
  ) {
    const now = new Date()
    if (current.slug === input.slug) {
      if (requestedRoute?.id !== current.id) {
        throw this.routeCollision(input)
      }
      const updated = {
        ...current,
        equivalenceKey: input.equivalenceKey,
        indexable: input.indexable,
        updatedAt: now,
      }
      next.set(updated.id, updated)
      return updated
    }
    if (requestedRoute) {
      if (
        !sameEntity(requestedRoute, input.market, input.kind, input.entityId)
      ) {
        throw this.routeCollision(input)
      }
      const reclaimed: UrlRecord = {
        ...requestedRoute,
        equivalenceKey: input.equivalenceKey,
        indexable: input.indexable,
        status: "current",
        aliasOf: null,
        updatedAt: now,
      }
      this.retargetActiveHistory(next, {
        input,
        currentId: current.id,
        targetId: reclaimed.id,
        updatedAt: now,
      })
      next.set(reclaimed.id, reclaimed)
      return reclaimed
    }

    const inserted: UrlRecord = {
      ...input,
      id: randomUUID(),
      status: "current",
      aliasOf: null,
      updatedAt: now,
    }
    this.retargetActiveHistory(next, {
      input,
      currentId: current.id,
      targetId: inserted.id,
      updatedAt: now,
    })
    next.set(inserted.id, inserted)
    return inserted
  }

  private retargetActiveHistory(
    next: Map<string, UrlRecord>,
    {
      input,
      currentId,
      targetId,
      updatedAt,
    }: {
      input: CreateUrlRecordInput
      currentId: string
      targetId: string
      updatedAt: Date
    }
  ) {
    for (const [id, record] of next) {
      if (
        id !== targetId &&
        sameEntity(record, input.market, input.kind, input.entityId) &&
        (record.status === "alias" || record.id === currentId)
      ) {
        next.set(id, {
          ...record,
          aliasOf: targetId,
          status: "alias",
          updatedAt,
        })
      }
    }
  }

  private syncWithoutCurrent(
    next: Map<string, UrlRecord>,
    input: CreateUrlRecordInput,
    history: UrlRecord[],
    requestedRoute: UrlRecord | undefined
  ) {
    const now = new Date()
    if (history.some((record) => record.status !== "tombstone")) {
      throw new UrlRegistryError(
        "UNIQUE_VIOLATION",
        `Entity ${input.entityId} has incompatible active URL history`
      )
    }
    if (requestedRoute) {
      if (
        requestedRoute.status !== "tombstone" ||
        !sameEntity(requestedRoute, input.market, input.kind, input.entityId)
      ) {
        throw this.routeCollision(input)
      }
      const restored: UrlRecord = {
        ...requestedRoute,
        equivalenceKey: input.equivalenceKey,
        indexable: input.indexable,
        status: "current",
        aliasOf: null,
        updatedAt: now,
      }
      next.set(restored.id, restored)
      return restored
    }

    const inserted: UrlRecord = {
      ...input,
      id: randomUUID(),
      status: "current",
      aliasOf: null,
      updatedAt: now,
    }
    next.set(inserted.id, inserted)
    return inserted
  }

  private routeCollision(route: Pick<UrlRecord, "market" | "kind" | "slug">) {
    return new UrlRegistryError(
      "UNIQUE_VIOLATION",
      `URL ${route.market}/${route.kind}/${route.slug} is already reserved`
    )
  }

  private assertRouteAvailable(market: Market, kind: UrlKind, slug: string) {
    if (
      [...this.records.values()].some(
        (record) => routeKey(record) === routeKey({ market, kind, slug })
      )
    ) {
      throw this.routeCollision({ market, kind, slug })
    }
  }

  private assertInvariants(records: Map<string, UrlRecord>) {
    const routes = new Set<string>()
    const currentEntities = new Set<string>()

    for (const record of records.values()) {
      const key = routeKey(record)
      if (routes.has(key)) {
        throw new UrlRegistryError("UNIQUE_VIOLATION", `Duplicate URL ${key}`)
      }
      routes.add(key)

      const entityKey = `${record.market}\u0000${record.kind}\u0000${record.entityId}`
      if (record.status === "current") {
        if (currentEntities.has(entityKey)) {
          throw new UrlRegistryError(
            "UNIQUE_VIOLATION",
            `Entity ${entityKey} has multiple current URLs`
          )
        }
        currentEntities.add(entityKey)
      }

      assertAliasInvariant(record, records)
    }
  }
}

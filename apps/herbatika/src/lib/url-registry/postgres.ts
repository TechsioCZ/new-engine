import "server-only"

import { randomUUID } from "node:crypto"
import type { PoolClient, PoolConfig, QueryResultRow } from "pg"
import { Pool } from "pg"
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

type UrlRow = QueryResultRow & {
  id: string
  market: Market
  kind: UrlKind
  slug: string
  entity_id: string
  equivalence_key: string
  indexable: boolean
  status: UrlRecord["status"]
  alias_of: string | null
  updated_at: Date | string
}

type LookupRow = UrlRow & { target: UrlRow | null }

const COLUMNS =
  "id, market, kind, slug, entity_id, equivalence_key, indexable, status, alias_of, updated_at"

const mapRow = (row: UrlRow): UrlRecord => ({
  id: row.id,
  market: row.market,
  kind: row.kind,
  slug: row.slug,
  entityId: row.entity_id,
  equivalenceKey: row.equivalence_key,
  indexable: row.indexable,
  status: row.status,
  aliasOf: row.alias_of,
  updatedAt: new Date(row.updated_at),
})

const databaseErrorCode = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : null

const translateDatabaseError = (error: unknown): never => {
  if (error instanceof UrlRegistryError) {
    throw error
  }
  const code = databaseErrorCode(error)
  if (code === "23505") {
    throw new UrlRegistryError(
      "UNIQUE_VIOLATION",
      "The URL or entity current record is already reserved",
      { cause: error }
    )
  }
  if (code === "23503" || code === "23514") {
    throw new UrlRegistryError(
      "INVALID_ALIAS",
      "The URL registry alias invariant was rejected",
      { cause: error }
    )
  }
  throw error
}

export class PostgresUrlRegistry implements UrlRegistry {
  readonly pool: Pool

  constructor(poolOrConfig: Pool | PoolConfig) {
    this.pool =
      poolOrConfig instanceof Pool ? poolOrConfig : new Pool(poolOrConfig)
  }

  async close() {
    await this.pool.end()
  }

  async lookup(
    market: Market,
    kind: UrlKind,
    slug: string
  ): Promise<UrlLookupResult> {
    const result = await this.pool.query<LookupRow>(
      `SELECT record.*, CASE WHEN target.id IS NULL THEN NULL ELSE to_jsonb(target) END AS target
       FROM url_registry.url_records AS record
       LEFT JOIN url_registry.url_records AS target ON target.id = record.alias_of
       WHERE record.market = $1 AND record.kind = $2 AND record.slug = $3
       LIMIT 1`,
      [market, kind, slug]
    )
    const row = result.rows[0]
    if (!row) {
      return { type: "missing" }
    }
    const record = mapRow(row)
    if (record.status === "current") {
      return { type: "current", record }
    }
    if (record.status === "tombstone") {
      return { type: "tombstone", record }
    }

    const currentRow = row.target
    if (!currentRow || currentRow.status !== "current") {
      throw new UrlRegistryError(
        "INVALID_ALIAS",
        `Alias ${record.id} does not point to a current URL`
      )
    }
    return { type: "alias", record, currentRecord: mapRow(currentRow) }
  }

  async findByEntity(
    market: Market,
    kind: UrlKind,
    entityId: string
  ): Promise<UrlRecord | null> {
    const result = await this.pool.query<UrlRow>(
      `SELECT ${COLUMNS} FROM url_registry.url_records
       WHERE market = $1 AND kind = $2 AND entity_id = $3 AND status = 'current'
       LIMIT 1`,
      [market, kind, entityId]
    )
    return result.rows[0] ? mapRow(result.rows[0]) : null
  }

  async findAlternates(equivalenceKey: string): Promise<UrlRecord[]> {
    const result = await this.pool.query<UrlRow>(
      `SELECT ${COLUMNS} FROM url_registry.url_records
       WHERE equivalence_key = $1 AND status = 'current'
       ORDER BY market, kind, id
       LIMIT 100`,
      [equivalenceKey]
    )
    return result.rows.map(mapRow)
  }

  async create(input: CreateUrlRecordInput): Promise<UrlRecord> {
    try {
      const result = await this.pool.query<UrlRow>(
        `INSERT INTO url_registry.url_records
          (id, market, kind, slug, entity_id, equivalence_key, indexable, status, alias_of)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'current', NULL)
         RETURNING ${COLUMNS}`,
        [
          randomUUID(),
          input.market,
          input.kind,
          input.slug,
          input.entityId,
          input.equivalenceKey,
          input.indexable,
        ]
      )
      return mapRow(result.rows[0] as UrlRow)
    } catch (error) {
      return translateDatabaseError(error)
    }
  }

  changeSlug(
    market: Market,
    kind: UrlKind,
    entityId: string,
    newSlug: string
  ): Promise<UrlRecord> {
    return this.withTransaction(async (client) => {
      const currentResult = await client.query<UrlRow>(
        `SELECT ${COLUMNS} FROM url_registry.url_records
         WHERE market = $1 AND kind = $2 AND entity_id = $3 AND status = 'current'
         FOR UPDATE`,
        [market, kind, entityId]
      )
      const oldCurrent = currentResult.rows[0]
      if (!oldCurrent) {
        throw new UrlRegistryError(
          "NOT_FOUND",
          `No current URL for ${market}/${kind}/${entityId}`
        )
      }

      const newId = randomUUID()
      await client.query(
        `UPDATE url_registry.url_records
         SET status = 'alias', alias_of = $4, updated_at = now()
         WHERE market = $1 AND kind = $2 AND entity_id = $3
           AND status IN ('current', 'alias')`,
        [market, kind, entityId, newId]
      )
      const inserted = await client.query<UrlRow>(
        `INSERT INTO url_registry.url_records
          (id, market, kind, slug, entity_id, equivalence_key, indexable, status, alias_of)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'current', NULL)
         RETURNING ${COLUMNS}`,
        [
          newId,
          market,
          kind,
          newSlug,
          entityId,
          oldCurrent.equivalence_key,
          oldCurrent.indexable,
        ]
      )
      return mapRow(inserted.rows[0] as UrlRow)
    })
  }

  tombstone(
    market: Market,
    kind: UrlKind,
    entityId: string
  ): Promise<UrlRecord> {
    return this.withTransaction(async (client) => {
      const currentResult = await client.query<UrlRow>(
        `SELECT ${COLUMNS} FROM url_registry.url_records
         WHERE market = $1 AND kind = $2 AND entity_id = $3 AND status = 'current'
         FOR UPDATE`,
        [market, kind, entityId]
      )
      const current = currentResult.rows[0]
      if (!current) {
        throw new UrlRegistryError(
          "NOT_FOUND",
          `No current URL for ${market}/${kind}/${entityId}`
        )
      }
      const updated = await client.query<UrlRow>(
        `UPDATE url_registry.url_records
         SET status = 'tombstone', alias_of = NULL, updated_at = now()
         WHERE market = $1 AND kind = $2 AND entity_id = $3
         RETURNING ${COLUMNS}`,
        [market, kind, entityId]
      )
      const currentTombstone = updated.rows.find((row) => row.id === current.id)
      return mapRow(currentTombstone as UrlRow)
    })
  }

  async list(query: UrlRegistryListQuery = {}): Promise<UrlRegistryListResult> {
    const { limit, offset } = normalizeListBounds(query)
    const clauses: string[] = []
    const values: unknown[] = []
    const add = (column: string, value: unknown) => {
      if (value !== undefined) {
        values.push(value)
        clauses.push(`${column} = $${values.length}`)
      }
    }
    add("id", query.id)
    add("market", query.market)
    add("kind", query.kind)
    add("entity_id", query.entityId)
    add("equivalence_key", query.equivalenceKey)
    add("status", query.status)
    values.push(limit + 1, offset)
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""
    const result = await this.pool.query<UrlRow>(
      `SELECT ${COLUMNS} FROM url_registry.url_records
       ${where}
       ORDER BY updated_at DESC, id ASC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    )
    return {
      records: result.rows.slice(0, limit).map(mapRow),
      limit,
      offset,
      hasMore: result.rows.length > limit,
    }
  }

  private async withTransaction<T>(
    operation: (client: PoolClient) => Promise<T>
  ) {
    const client = await this.pool.connect()
    try {
      await client.query("BEGIN")
      const result = await operation(client)
      await client.query("COMMIT")
      return result
    } catch (error) {
      await client.query("ROLLBACK")
      return translateDatabaseError(error)
    } finally {
      client.release()
    }
  }
}

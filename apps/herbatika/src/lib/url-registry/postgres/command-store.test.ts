import { describe, expect, it, vi } from "vitest"
import {
  type CreateEntityRouteRequest,
  createUrlRegistryCommand,
} from "../contracts"
import { claimCommand } from "./command-store"
import type { SqlExecutor } from "./sql"

const request: CreateEntityRouteRequest = {
  commandType: "create-entity-route",
  expectedVersion: 0,
  source: {
    producer: "catalog-sync",
    sourceSystem: "medusa",
    sourceType: "product",
    sourceId: "prod_1",
    sourceVersion: "7",
    sourceEventId: "event_7:sk",
  },
  route: {
    market: "sk",
    kind: "product",
    identity: {
      targetType: "entity",
      sourceSystem: "medusa",
      sourceType: "product",
      sourceId: "prod_1",
      staticRouteKey: null,
    },
    equivalenceKey: "product:prod_1",
    indexPolicy: "indexable",
  },
  slug: { normalizedSlug: "produkt", normalizationVersion: 1 },
}

const command = createUrlRegistryCommand({
  idempotencyKey: "catalog:event_7:sk",
  request,
})

describe("Postgres URL registry command claim", () => {
  it("claims by insert without locking a route first", async () => {
    const query = vi.fn(async (_sql: string, _values?: readonly unknown[]) => ({
      rows: [{ idempotency_key: command.idempotencyKey }],
      rowCount: 1,
    }))
    const executor: SqlExecutor = {
      query,
    }

    await expect(claimCommand(executor, command)).resolves.toEqual({
      kind: "claimed",
    })
    expect(executor.query).toHaveBeenCalledOnce()
    expect(query.mock.calls[0]?.[0]).toContain("ON CONFLICT DO NOTHING")
  })

  it("replays an exact completed source event under another key", async () => {
    const stored = {
      snapshot: {
        projectionType: "entity",
        route: {
          id: "00000000-0000-4000-8000-000000000001",
          market: "sk",
          kind: "product",
          targetType: "entity",
          sourceSystem: "medusa",
          sourceType: "product",
          sourceId: "prod_1",
          staticRouteKey: null,
          equivalenceKey: "product:prod_1",
          indexPolicy: "indexable",
          status: "active",
          successorRouteId: null,
          version: 1,
          createdAt: "2026-08-17T10:00:00.000Z",
          updatedAt: "2026-08-17T10:00:00.000Z",
        },
        currentSlug: {
          id: "00000000-0000-4000-8000-000000000002",
          market: "sk",
          kind: "product",
          normalizedSlug: "produkt",
          routeId: "00000000-0000-4000-8000-000000000001",
          disposition: "current",
          normalizationVersion: 1,
          createdAt: "2026-08-17T10:00:00.000Z",
        },
        slugHistory: [],
      },
      affectedRouteIds: ["00000000-0000-4000-8000-000000000001"],
      commit: {
        outcome: "applied",
        replayed: false,
        audit: {
          id: "1",
          commandVersion: 1,
          idempotencyKey: "original-key",
          requestFingerprint: command.requestFingerprint,
          action: "create-entity-route",
          outcome: "applied",
          routeId: "00000000-0000-4000-8000-000000000001",
          affectedRouteIds: ["00000000-0000-4000-8000-000000000001"],
          source: request.source,
          previousVersion: null,
          resultVersion: 1,
          details: {},
          createdAt: "2026-08-17T10:00:00.000Z",
        },
        invalidation: {
          id: "2",
          auditId: "1",
          idempotencyKey: "original-key",
          status: "pending",
          tags: ["url-registry"],
          createdAt: "2026-08-17T10:00:00.000Z",
        },
      },
    }
    const executor: SqlExecutor = {
      query: vi
        .fn<SqlExecutor["query"]>()
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [
            {
              idempotency_key: "original-key",
              producer: request.source.producer,
              command_version: 1,
              command_type: request.commandType,
              request_fingerprint: command.requestFingerprint,
              source_system: request.source.sourceSystem,
              source_type: request.source.sourceType,
              source_id: request.source.sourceId,
              source_version: request.source.sourceVersion,
              source_event_id: request.source.sourceEventId,
              expected_route_version: 0,
              status: "completed",
              outcome: "applied",
              route_id: "00000000-0000-4000-8000-000000000001",
              result_route_version: 1,
              response_snapshot: stored,
            },
          ],
          rowCount: 1,
        }),
    }

    const replay = await claimCommand(executor, {
      ...command,
      idempotencyKey: "replacement-key",
    })
    expect(replay).toMatchObject({
      kind: "replay",
      result: { commit: { replayed: true } },
    })
  })
})

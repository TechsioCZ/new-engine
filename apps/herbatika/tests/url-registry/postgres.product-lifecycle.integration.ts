import { setTimeout as delay } from "node:timers/promises"
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import {
  command,
  createEntityRequest,
  entityIdentity,
  entitySource,
} from "@/lib/url-registry/behavior-helpers"
import type { CatalogLifecycleDeliveryV1 } from "@/lib/url-registry/catalog-lifecycle-parser"
import type { SourceReadResult } from "@/lib/url-registry/contracts"
import {
  createPostgresProductLifecycleConsumer,
  createPostgresUrlRegistry,
  type SqlClient,
  type SqlPool,
} from "@/lib/url-registry/postgres"
import type { ProductLifecycleDeliveryV1 } from "@/lib/url-registry/product-lifecycle-parser"
import {
  createPostgresTestContext,
  type PostgresTestContext,
} from "./postgres-test-harness"

let context: PostgresTestContext

beforeAll(() => {
  context = createPostgresTestContext()
})

beforeEach(async () => {
  await context.reset()
})

afterAll(async () => {
  await context?.close()
})

const delivery = (
  sourceId: string,
  sequence: number,
  overrides: Partial<ProductLifecycleDeliveryV1> = {}
): ProductLifecycleDeliveryV1 => ({
  schemaVersion: 1,
  outboxEventId: `${sourceId}:outbox:${sequence}`,
  eventId: `${sourceId}:event:${sequence}`,
  envelopeFingerprint: `sha256:${"a".repeat(64)}`,
  source: "medusa",
  entityKind: "product",
  entityId: sourceId,
  marketCode: "sk",
  streamSequence: sequence,
  changeType: "reconcile",
  occurredAt: `2026-08-18T10:00:0${sequence}.000Z`,
  payload: {
    assignment: {
      publicationStatus: "published",
      publicSlug: "product-01",
      salesChannelId: "sc_sk",
    },
    schemaVersion: 1,
    productId: sourceId,
    reason: "updated",
    changeType: "reconcile",
    sourceVersion: "2026-08-18T09:00:00.000Z",
  },
  ...overrides,
})

const deletedDelivery = (
  sourceId: string,
  sequence = 1
): ProductLifecycleDeliveryV1 =>
  delivery(sourceId, sequence, {
    changeType: "delete",
    payload: {
      assignment: null,
      schemaVersion: 1,
      productId: sourceId,
      reason: "deleted",
      changeType: "delete",
      sourceVersion: "2026-08-18T09:00:00.000Z",
    },
  })

const catalogDelivery = (
  input: Readonly<{
    entityKind: CatalogLifecycleDeliveryV1["entityKind"]
    marketCode?: CatalogLifecycleDeliveryV1["marketCode"]
    publicSlug?: string
    sequence: number
    sourceId: string
  }>
): CatalogLifecycleDeliveryV1 => {
  const marketCode = input.marketCode ?? "ro"
  const publicSlug = input.publicSlug ?? `${input.entityKind}-${marketCode}`
  return {
    changeType: "reconcile",
    entityId: input.sourceId,
    entityKind: input.entityKind,
    envelopeFingerprint: `sha256:${"b".repeat(64)}`,
    eventId: `${input.sourceId}:catalog-event:${input.sequence}:${marketCode}`,
    marketCode,
    occurredAt: `2026-08-20T10:00:0${input.sequence}.000Z`,
    outboxEventId: `${input.sourceId}:catalog-outbox:${input.sequence}:${marketCode}`,
    payload: {
      assignment: {
        publicationStatus: "published",
        publicSlug,
        salesChannelId: `sc_${marketCode}`,
      },
      changeType: "reconcile",
      entityId: input.sourceId,
      entityKind: input.entityKind,
      reason: "assignment-upsert",
      schemaVersion: 1,
      sourceVersion: String(input.sequence),
    },
    schemaVersion: 1,
    source: "medusa",
    streamSequence: input.sequence,
  }
}

const readSource = (result: SourceReadResult<unknown>) =>
  vi.fn().mockResolvedValue(result)

const deferred = () => {
  let resolve: (() => void) | undefined
  const promise = new Promise<void>((complete) => {
    resolve = complete
  })
  return { promise, resolve: () => resolve?.() }
}

const controlFirstAdvisoryLock = (
  base: SqlPool,
  pauseAfterAcquire: boolean
) => {
  const attempted = deferred()
  const acquired = deferred()
  const resumed = deferred()
  let observed = false
  const wrapClient = (client: SqlClient): SqlClient => ({
    async query(sql, values) {
      const controlsThisQuery =
        !observed && sql.includes("pg_advisory_xact_lock")
      if (controlsThisQuery) {
        observed = true
        attempted.resolve()
      }
      const result = await client.query(sql, values)
      if (controlsThisQuery) {
        acquired.resolve()
        if (pauseAfterAcquire) {
          await resumed.promise
        }
      }
      return result
    },
    release(error) {
      client.release(error)
    },
  })
  const pool: SqlPool = {
    connect: async () => wrapClient(await base.connect()),
    query: (sql, values) => base.query(sql, values),
  }
  return {
    acquired: acquired.promise,
    attempted: attempted.promise,
    pool,
    resume: resumed.resolve,
  }
}

const observationPrecededSettlement = (
  observation: Promise<void>,
  operation: Promise<unknown>
) =>
  Promise.race([
    observation.then(() => true),
    operation.then(
      () => false,
      () => false
    ),
    delay(5000, false, { ref: false }),
  ])

const advisoryWaiterAppeared = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const locks = await context.admin.query(
      `SELECT (count(*) FILTER (WHERE NOT granted))::integer AS waiting
         FROM pg_locks
        WHERE locktype = 'advisory'`
    )
    if ((locks.rows[0]?.waiting ?? 0) >= 1) {
      return true
    }
    await delay(20)
  }
  return false
}

const persistedStream = async (sourceId: string) => {
  const result = await context.runtime.query(
    `SELECT cursor.last_sequence,
            count(receipt.*)::integer AS receipt_count
       FROM url_registry.url_registry_source_event_cursor AS cursor
       INNER JOIN url_registry.url_registry_source_event_receipt AS receipt
         USING (source_system, source_type, source_id, market)
      WHERE cursor.source_system = 'medusa'
        AND cursor.source_type = 'product'
        AND cursor.source_id = $1
        AND cursor.market = 'sk'
      GROUP BY cursor.last_sequence`,
    [sourceId]
  )
  return result.rows[0] ?? null
}

describe.sequential("PostgreSQL 18.1 product lifecycle consumer", () => {
  it.each([
    "category",
    "brand",
    "collection",
  ] as const)("publishes and forward-changes a %s slug while preserving the old alias", async (entityKind) => {
    const sourceId = context.nextNamespace(`catalog-${entityKind}`)
    const readCatalog = vi.fn(async () => ({
      kind: "found" as const,
      value: { id: sourceId },
    }))
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readCatalog,
      readProduct: readSource({ kind: "missing" }),
    })
    const originalSlug = `${sourceId}-old`
    const renamedSlug = `${sourceId}-nou`

    await expect(
      consumer.consume(
        catalogDelivery({
          entityKind,
          publicSlug: originalSlug,
          sequence: 1,
          sourceId,
        })
      )
    ).resolves.toMatchObject({ action: "published", kind: "acknowledged" })
    await expect(
      consumer.consume(
        catalogDelivery({
          entityKind,
          publicSlug: renamedSlug,
          sequence: 2,
          sourceId,
        })
      )
    ).resolves.toMatchObject({
      action: "slug-changed",
      kind: "acknowledged",
    })
    await expect(
      context.registry.resolve({
        kind: entityKind,
        market: "ro",
        normalizedSlug: originalSlug,
      })
    ).resolves.toMatchObject({
      kind: "found",
      value: {
        currentSlug: { normalizedSlug: renamedSlug },
        disposition: "alias",
        route: { kind: entityKind, sourceId },
      },
    })
  })

  it("keeps a stale queued catalog slug non-mutating before applying the current slug", async () => {
    const sourceId = context.nextNamespace("catalog-backlog")
    const oldSlug = `${sourceId}-old`
    const newSlug = `${sourceId}-new`
    let currentSlug = oldSlug
    let currentVersion = "1"
    const readCatalog = vi.fn(async (input: CatalogLifecycleDeliveryV1) =>
      input.payload.assignment?.publicSlug === currentSlug &&
      input.payload.sourceVersion === currentVersion
        ? { kind: "found" as const, value: { id: sourceId } }
        : { kind: "missing" as const }
    )
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readCatalog,
      readProduct: readSource({ kind: "missing" }),
    })

    await expect(
      consumer.consume(
        catalogDelivery({
          entityKind: "category",
          publicSlug: oldSlug,
          sequence: 1,
          sourceId,
        })
      )
    ).resolves.toMatchObject({ action: "published", kind: "acknowledged" })

    currentSlug = newSlug
    currentVersion = "3"
    await expect(
      consumer.consume(
        catalogDelivery({
          entityKind: "category",
          publicSlug: oldSlug,
          sequence: 2,
          sourceId,
        })
      )
    ).resolves.toMatchObject({
      action: "noop-source-missing",
      kind: "acknowledged",
    })
    await expect(
      context.registry.findEntityRoute({
        market: "ro",
        sourceId,
        sourceSystem: "medusa",
        sourceType: "category",
      })
    ).resolves.toMatchObject({
      kind: "found",
      value: {
        currentSlug: { normalizedSlug: oldSlug },
        route: { status: "active", version: 1 },
      },
    })

    await expect(
      consumer.consume(
        catalogDelivery({
          entityKind: "category",
          publicSlug: newSlug,
          sequence: 3,
          sourceId,
        })
      )
    ).resolves.toMatchObject({
      action: "slug-changed",
      kind: "acknowledged",
    })
    await expect(
      context.registry.resolve({
        kind: "category",
        market: "ro",
        normalizedSlug: oldSlug,
      })
    ).resolves.toMatchObject({
      kind: "found",
      value: {
        currentSlug: { normalizedSlug: newSlug },
        disposition: "alias",
        route: { status: "active", version: 2 },
      },
    })

    currentVersion = "5"
    await expect(
      consumer.consume(
        catalogDelivery({
          entityKind: "category",
          publicSlug: newSlug,
          sequence: 4,
          sourceId,
        })
      )
    ).resolves.toMatchObject({
      action: "noop-source-missing",
      kind: "acknowledged",
    })
    await expect(
      consumer.consume(
        catalogDelivery({
          entityKind: "category",
          publicSlug: newSlug,
          sequence: 5,
          sourceId,
        })
      )
    ).resolves.toMatchObject({
      action: "noop-source-present",
      kind: "acknowledged",
    })
    const stream = await context.runtime.query(
      `SELECT cursor.last_sequence,
              count(receipt.*)::integer AS receipt_count
         FROM url_registry.url_registry_source_event_cursor AS cursor
         INNER JOIN url_registry.url_registry_source_event_receipt AS receipt
           USING (source_system, source_type, source_id, market)
        WHERE cursor.source_system = 'medusa'
          AND cursor.source_type = 'category'
          AND cursor.source_id = $1
          AND cursor.market = 'ro'
        GROUP BY cursor.last_sequence`,
      [sourceId]
    )
    expect(stream.rows).toEqual([{ last_sequence: 5, receipt_count: 5 }])
  })

  it.each([
    "category",
    "brand",
    "collection",
  ] as const)("retires an active %s route when its assignment becomes draft", async (entityKind) => {
    const sourceId = context.nextNamespace(`catalog-draft-${entityKind}`)
    const source = vi.fn(async () => ({
      kind: "found" as const,
      value: { id: sourceId },
    }))
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readCatalog: source,
      readProduct: readSource({ kind: "missing" }),
    })
    const publicSlug = `${sourceId}-public`

    await expect(
      consumer.consume(
        catalogDelivery({
          entityKind,
          publicSlug,
          sequence: 1,
          sourceId,
        })
      )
    ).resolves.toMatchObject({ action: "published", kind: "acknowledged" })
    const draft = catalogDelivery({
      entityKind,
      publicSlug,
      sequence: 2,
      sourceId,
    })
    await expect(
      consumer.consume({
        ...draft,
        payload: {
          ...draft.payload,
          assignment: {
            ...draft.payload.assignment,
            publicationStatus: "draft",
          },
        },
      })
    ).resolves.toMatchObject({ action: "unpublished", kind: "acknowledged" })

    await expect(
      context.registry.findEntityRoute({
        market: "ro",
        sourceId,
        sourceSystem: "medusa",
        sourceType: entityKind,
      })
    ).resolves.toMatchObject({
      kind: "found",
      value: {
        currentSlug: { normalizedSlug: publicSlug },
        route: { status: "retired", version: 2 },
      },
    })
    expect(source).toHaveBeenCalledTimes(1)
  })

  it("keeps identical category slugs isolated between SK and RO", async () => {
    const sourceId = context.nextNamespace("catalog-market-isolation")
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readCatalog: readSource({ kind: "found", value: { id: sourceId } }),
      readProduct: readSource({ kind: "missing" }),
    })
    const slug = `${sourceId}-shared`

    await consumer.consume(
      catalogDelivery({
        entityKind: "category",
        marketCode: "sk",
        publicSlug: slug,
        sequence: 1,
        sourceId,
      })
    )
    await consumer.consume(
      catalogDelivery({
        entityKind: "category",
        marketCode: "ro",
        publicSlug: slug,
        sequence: 1,
        sourceId,
      })
    )
    const invalidatedRo = catalogDelivery({
      entityKind: "category",
      marketCode: "ro",
      publicSlug: slug,
      sequence: 2,
      sourceId,
    })
    await consumer.consume({
      ...invalidatedRo,
      payload: {
        ...invalidatedRo.payload,
        assignment: {
          ...invalidatedRo.payload.assignment,
          publicationStatus: "draft",
        },
      },
    })

    await expect(
      context.registry.resolve({
        kind: "category",
        market: "sk",
        normalizedSlug: slug,
      })
    ).resolves.toMatchObject({ kind: "found" })
    await expect(
      context.registry.findEntityRoute({
        market: "ro",
        sourceId,
        sourceSystem: "medusa",
        sourceType: "category",
      })
    ).resolves.toMatchObject({
      kind: "found",
      value: { route: { status: "retired" } },
    })
  })

  it("persists once and replays the exact delivery without rereading Medusa", async () => {
    const sourceId = context.nextNamespace("lifecycle-replay")
    const source = readSource({ kind: "found", value: { id: sourceId } })
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: source,
    })
    const input = delivery(sourceId, 1)

    await expect(consumer.consume(input)).resolves.toMatchObject({
      kind: "acknowledged",
      action: "published",
      replayed: false,
    })
    await expect(consumer.consume(input)).resolves.toMatchObject({
      kind: "acknowledged",
      action: "published",
      replayed: true,
    })
    expect(source).toHaveBeenCalledTimes(1)
    await expect(persistedStream(sourceId)).resolves.toEqual({
      last_sequence: 1,
      receipt_count: 1,
    })
  })

  it("publishes, changes the public slug atomically, then retires the public route on unpublish", async () => {
    const sourceId = context.nextNamespace("lifecycle-publication")
    const source = readSource({ kind: "found", value: { id: sourceId } })
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: source,
    })

    await expect(
      consumer.consume(delivery(sourceId, 1))
    ).resolves.toMatchObject({ action: "published", kind: "acknowledged" })
    const changed = delivery(sourceId, 2, {
      payload: {
        ...delivery(sourceId, 2).payload,
        assignment: {
          publicationStatus: "published",
          publicSlug: "renamed-product-01",
          salesChannelId: "sc_sk",
        },
      },
    })
    await expect(consumer.consume(changed)).resolves.toMatchObject({
      action: "slug-changed",
      kind: "acknowledged",
    })
    const unpublished = delivery(sourceId, 3, {
      payload: { ...delivery(sourceId, 3).payload, assignment: null },
    })
    await expect(consumer.consume(unpublished)).resolves.toMatchObject({
      action: "unpublished",
      kind: "acknowledged",
    })

    await expect(
      context.registry.findEntityRoute({
        market: "sk",
        sourceSystem: "medusa",
        sourceType: "product",
        sourceId,
      })
    ).resolves.toMatchObject({
      kind: "found",
      value: {
        currentSlug: { normalizedSlug: "renamed-product-01" },
        route: { status: "retired", version: 3 },
      },
    })
    expect(source).toHaveBeenCalledTimes(2)
    await expect(persistedStream(sourceId)).resolves.toEqual({
      last_sequence: 3,
      receipt_count: 3,
    })
  })

  it("retires only the RO product route when its exact Translation is invalidated", async () => {
    const sourceId = context.nextNamespace("translation-invalid-product")
    const source = readSource({ kind: "found", value: { id: sourceId } })
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: source,
    })
    const publication = (marketCode: "sk" | "ro", slug: string) =>
      delivery(sourceId, 1, {
        eventId: `${sourceId}:event:${marketCode}:1`,
        marketCode,
        outboxEventId: `${sourceId}:outbox:${marketCode}:1`,
        payload: {
          ...delivery(sourceId, 1).payload,
          assignment: {
            publicationStatus: "published",
            publicSlug: slug,
            salesChannelId: `sc_${marketCode}`,
          },
        },
      })

    await consumer.consume(publication("sk", `${sourceId}-sk`))
    await consumer.consume(publication("ro", `${sourceId}-ro`))
    const invalidated = delivery(sourceId, 2, {
      eventId: `${sourceId}:event:ro:2`,
      marketCode: "ro",
      outboxEventId: `${sourceId}:outbox:ro:2`,
      payload: {
        ...delivery(sourceId, 2).payload,
        assignment: null,
        reason: "translation-invalidated",
        sourceVersion: "translation:trans_ro:2026-08-20T11:00:00.000Z",
      },
    })

    await expect(consumer.consume(invalidated)).resolves.toMatchObject({
      action: "unpublished",
      kind: "acknowledged",
    })
    await expect(
      context.registry.findEntityRoute({
        market: "ro",
        sourceId,
        sourceSystem: "medusa",
        sourceType: "product",
      })
    ).resolves.toMatchObject({
      kind: "found",
      value: { route: { status: "retired" } },
    })
    await expect(
      context.registry.findEntityRoute({
        market: "sk",
        sourceId,
        sourceSystem: "medusa",
        sourceType: "product",
      })
    ).resolves.toMatchObject({
      kind: "found",
      value: { route: { status: "active" } },
    })
    expect(source).toHaveBeenCalledTimes(2)
  })

  it("rejects drift, stale deliveries, and gaps without advancing", async () => {
    const sourceId = context.nextNamespace("lifecycle-order")
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: readSource({ kind: "missing" }),
    })
    const first = delivery(sourceId, 1)
    const second = delivery(sourceId, 2)
    await consumer.consume(first)

    await expect(
      consumer.consume({
        ...first,
        occurredAt: "2026-08-18T11:00:01.000Z",
      })
    ).rejects.toMatchObject({ code: "DELIVERY_DRIFT" })
    await expect(consumer.consume(delivery(sourceId, 3))).rejects.toMatchObject(
      { code: "SEQUENCE_GAP" }
    )
    await consumer.consume(second)
    await expect(
      consumer.consume({
        ...first,
        outboxEventId: `${sourceId}:different-old-outbox`,
      })
    ).rejects.toMatchObject({ code: "STALE_DELIVERY" })
    await expect(persistedStream(sourceId)).resolves.toEqual({
      last_sequence: 2,
      receipt_count: 2,
    })
  })

  it("serializes concurrent adjacent sequences", async () => {
    const sourceId = context.nextNamespace("lifecycle-adjacent")
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: readSource({ kind: "missing" }),
    })

    const results = await Promise.all([
      consumer.consume(delivery(sourceId, 1)),
      consumer.consume(delivery(sourceId, 2)),
    ])

    expect(results.map(({ kind }) => kind)).toEqual([
      "acknowledged",
      "acknowledged",
    ])
    await expect(persistedStream(sourceId)).resolves.toEqual({
      last_sequence: 2,
      receipt_count: 2,
    })
  })

  it.each([
    ["unavailable", { kind: "unavailable" }],
    [
      "invalid",
      { kind: "invalid-response", causeCode: "INVALID_MEDUSA_RESPONSE" },
    ],
  ] as const)("does not advance for an %s source read", async (_label, sourceResult) => {
    const sourceId = context.nextNamespace("lifecycle-source-retry")
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: readSource(sourceResult),
    })

    await expect(
      consumer.consume(delivery(sourceId, 1))
    ).resolves.toMatchObject({ kind: "retry" })
    await expect(persistedStream(sourceId)).resolves.toBeNull()
  })

  it("does not advance a live-source conflict on a terminal route", async () => {
    const sourceId = context.nextNamespace("lifecycle-terminal-live")
    const identity = entityIdentity(sourceId)
    const created = await context.registry.createEntityRoute(
      command(
        `${sourceId}:create`,
        createEntityRequest({
          identity,
          eventId: `${sourceId}:create-event`,
          slug: `${sourceId}-slug`,
          equivalenceKey: null,
        })
      )
    )
    await context.registry.retireRoute(
      command(`${sourceId}:manual-retire`, {
        commandType: "retire-route",
        expectedVersion: created.snapshot.route.version,
        source: entitySource(identity, `${sourceId}:manual-retire-event`),
        target: { identity, routeId: created.snapshot.route.id },
      })
    )
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: readSource({ kind: "found", value: { id: sourceId } }),
    })

    await expect(consumer.consume(delivery(sourceId, 1))).resolves.toEqual({
      kind: "conflict",
      action: null,
      cause: "live-source-has-terminal-route",
    })
    await expect(persistedStream(sourceId)).resolves.toBeNull()
  })

  it("retires the route and links the receipt to the exact outbox row", async () => {
    const sourceId = context.nextNamespace("lifecycle-retire")
    const identity = entityIdentity(sourceId)
    await context.registry.createEntityRoute(
      command(
        `${sourceId}:create`,
        createEntityRequest({
          identity,
          eventId: `${sourceId}:create-event`,
          slug: `${sourceId}-slug`,
          equivalenceKey: null,
        })
      )
    )
    const source = readSource({ kind: "missing" })
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: source,
    })
    const input = deletedDelivery(sourceId)

    const applied = await consumer.consume(input)
    expect(applied).toMatchObject({
      kind: "acknowledged",
      action: "retired",
      replayed: false,
    })
    const rows = await context.runtime.query(
      `SELECT route.status, receipt.source_event_id,
              receipt.command_idempotency_key, command.status AS command_status,
              command.outcome AS command_outcome
         FROM url_registry.url_registry_source_event_receipt AS receipt
         INNER JOIN url_registry.url_registry_command AS command
           ON command.idempotency_key = receipt.command_idempotency_key
         INNER JOIN url_registry.url_route AS route
           ON route.id = command.route_id
        WHERE receipt.source_id = $1`,
      [sourceId]
    )
    expect(rows.rows).toEqual([
      expect.objectContaining({
        status: "retired",
        source_event_id: input.outboxEventId,
        command_status: "completed",
        command_outcome: "applied",
      }),
    ])

    source.mockResolvedValue({ kind: "unavailable" })
    await expect(consumer.consume(input)).resolves.toMatchObject({
      kind: "acknowledged",
      action: "retired",
      replayed: true,
    })
    expect(source).toHaveBeenCalledTimes(1)
  })

  it("rolls the retirement command back when the deferred receipt commit fails", async () => {
    const sourceId = context.nextNamespace("lifecycle-rollback")
    const identity = entityIdentity(sourceId)
    const created = await context.registry.createEntityRoute(
      command(
        `${sourceId}:create`,
        createEntityRequest({
          identity,
          eventId: `${sourceId}:create-event`,
          slug: `${sourceId}-slug`,
          equivalenceKey: null,
        })
      )
    )
    await context.admin.query(`
      CREATE FUNCTION url_registry.fail_product_lifecycle_receipt_for_test()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'forced product lifecycle receipt failure'
          USING ERRCODE = '23514';
      END;
      $$;
      CREATE CONSTRAINT TRIGGER fail_product_lifecycle_receipt_for_test
      AFTER INSERT ON url_registry.url_registry_source_event_receipt
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION
        url_registry.fail_product_lifecycle_receipt_for_test();
    `)
    const input = deletedDelivery(sourceId)
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: readSource({ kind: "missing" }),
    })

    try {
      await expect(consumer.consume(input)).rejects.toMatchObject({
        code: "23514",
      })
    } finally {
      await context.admin.query(`
        DROP TRIGGER IF EXISTS fail_product_lifecycle_receipt_for_test
          ON url_registry.url_registry_source_event_receipt;
        DROP FUNCTION IF EXISTS
          url_registry.fail_product_lifecycle_receipt_for_test();
      `)
    }

    await expect(
      context.runtime.query(
        "SELECT status, version FROM url_registry.url_route WHERE id = $1",
        [created.snapshot.route.id]
      )
    ).resolves.toMatchObject({
      rows: [{ status: "active", version: 1 }],
    })
    await expect(
      context.runtime.query(
        `SELECT count(*)::integer AS count
           FROM url_registry.url_registry_command
          WHERE source_event_id = $1`,
        [input.outboxEventId]
      )
    ).resolves.toMatchObject({ rows: [{ count: 0 }] })
    await expect(persistedStream(sourceId)).resolves.toBeNull()
  })

  it("prevents a create that races behind a terminal delete receipt", async () => {
    const sourceId = context.nextNamespace("lifecycle-delete-first")
    const identity = entityIdentity(sourceId)
    const deleteLock = controlFirstAdvisoryLock(context.sqlPool, true)
    const createLock = controlFirstAdvisoryLock(context.sqlPool, false)
    const consumer = createPostgresProductLifecycleConsumer(deleteLock.pool, {
      readProduct: readSource({ kind: "missing" }),
    })
    const deletion = consumer.consume(deletedDelivery(sourceId))
    const deleteAcquiredLock = await observationPrecededSettlement(
      deleteLock.acquired,
      deletion
    )
    if (!deleteAcquiredLock) {
      deleteLock.resume()
      await deletion
      expect(deleteAcquiredLock).toBe(true)
      return
    }
    const registry = createPostgresUrlRegistry(createLock.pool, {
      transaction: { maxAttempts: 1 },
    })
    const creation = registry.createEntityRoute(
      command(
        `${sourceId}:create`,
        createEntityRequest({
          identity,
          eventId: `${sourceId}:create-event`,
          slug: `${sourceId}-slug`,
          equivalenceKey: null,
        })
      )
    )
    let createAttemptedLock = false
    try {
      createAttemptedLock = await observationPrecededSettlement(
        createLock.attempted,
        creation
      )
      if (createAttemptedLock) {
        expect(await advisoryWaiterAppeared()).toBe(true)
      }
    } finally {
      deleteLock.resume()
    }
    const [deleteResult, createResult] = await Promise.allSettled([
      deletion,
      creation,
    ])

    expect(createAttemptedLock).toBe(true)
    expect(deleteResult).toMatchObject({
      status: "fulfilled",
      value: { action: "noop-route-missing", kind: "acknowledged" },
    })
    expect(createResult).toMatchObject({
      status: "rejected",
      reason: { code: "INVALID_TRANSITION" },
    })
    await expect(
      context.registry.findEntityRoute({
        market: "sk",
        sourceSystem: identity.sourceSystem,
        sourceType: identity.sourceType,
        sourceId: identity.sourceId,
      })
    ).resolves.toEqual({ kind: "missing" })
  })

  it("retires a route when its creation owns the identity lock first", async () => {
    const sourceId = context.nextNamespace("lifecycle-create-first")
    const identity = entityIdentity(sourceId)
    const createLock = controlFirstAdvisoryLock(context.sqlPool, true)
    const deleteLock = controlFirstAdvisoryLock(context.sqlPool, false)
    const registry = createPostgresUrlRegistry(createLock.pool, {
      transaction: { maxAttempts: 1 },
    })
    const creation = registry.createEntityRoute(
      command(
        `${sourceId}:create`,
        createEntityRequest({
          identity,
          eventId: `${sourceId}:create-event`,
          slug: `${sourceId}-slug`,
          equivalenceKey: null,
        })
      )
    )
    const createAcquiredLock = await observationPrecededSettlement(
      createLock.acquired,
      creation
    )
    if (!createAcquiredLock) {
      createLock.resume()
      await creation
      expect(createAcquiredLock).toBe(true)
      return
    }
    const consumer = createPostgresProductLifecycleConsumer(deleteLock.pool, {
      readProduct: readSource({ kind: "missing" }),
    })
    const deletion = consumer.consume(deletedDelivery(sourceId))
    let deleteAttemptedLock = false
    try {
      deleteAttemptedLock = await observationPrecededSettlement(
        deleteLock.attempted,
        deletion
      )
      if (deleteAttemptedLock) {
        expect(await advisoryWaiterAppeared()).toBe(true)
      }
    } finally {
      createLock.resume()
    }
    const [createResult, deleteResult] = await Promise.allSettled([
      creation,
      deletion,
    ])

    expect(deleteAttemptedLock).toBe(true)
    expect(createResult).toMatchObject({ status: "fulfilled" })
    expect(deleteResult).toMatchObject({
      status: "fulfilled",
      value: { action: "retired", kind: "acknowledged" },
    })
    await expect(
      context.registry.findEntityRoute({
        market: "sk",
        sourceSystem: identity.sourceSystem,
        sourceType: identity.sourceType,
        sourceId: identity.sourceId,
      })
    ).resolves.toMatchObject({
      kind: "found",
      value: { route: { status: "retired" } },
    })
  })

  it("allows publication after a delete delivery finds the source still live", async () => {
    const sourceId = context.nextNamespace("lifecycle-live-delete")
    const identity = entityIdentity(sourceId)
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: readSource({ kind: "found", value: { id: sourceId } }),
    })

    await expect(
      consumer.consume(deletedDelivery(sourceId))
    ).resolves.toMatchObject({
      action: "noop-source-present",
      kind: "acknowledged",
    })
    await expect(
      context.registry.createEntityRoute(
        command(
          `${sourceId}:create`,
          createEntityRequest({
            identity,
            eventId: `${sourceId}:create-event`,
            slug: `${sourceId}-slug`,
            equivalenceKey: null,
          })
        )
      )
    ).resolves.toMatchObject({ snapshot: { route: { status: "active" } } })
  })

  it("allows lifecycle publication after an explicit unpublish once the source is live", async () => {
    const sourceId = context.nextNamespace("lifecycle-republished")
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: readSource({ kind: "found", value: { id: sourceId } }),
    })
    const unpublished = delivery(sourceId, 1, {
      payload: { ...delivery(sourceId, 1).payload, assignment: null },
    })

    await expect(consumer.consume(unpublished)).resolves.toMatchObject({
      action: "noop-unpublished",
      kind: "acknowledged",
    })
    await expect(
      consumer.consume(delivery(sourceId, 2))
    ).resolves.toMatchObject({
      action: "published",
      kind: "acknowledged",
    })
    await expect(
      context.registry.findEntityRoute({
        market: "sk",
        sourceSystem: "medusa",
        sourceType: "product",
        sourceId,
      })
    ).resolves.toMatchObject({
      kind: "found",
      value: { route: { status: "active" } },
    })
  })

  it("blocks manual route creation after an explicit unpublish", async () => {
    const sourceId = context.nextNamespace("lifecycle-still-missing")
    const identity = entityIdentity(sourceId)
    const consumer = createPostgresProductLifecycleConsumer(context.sqlPool, {
      readProduct: readSource({ kind: "missing" }),
    })

    await consumer.consume(deletedDelivery(sourceId))
    const unpublished = delivery(sourceId, 2, {
      payload: { ...delivery(sourceId, 2).payload, assignment: null },
    })
    await expect(consumer.consume(unpublished)).resolves.toMatchObject({
      action: "noop-unpublished",
      kind: "acknowledged",
    })
    await expect(
      context.registry.createEntityRoute(
        command(
          `${sourceId}:create`,
          createEntityRequest({
            identity,
            eventId: `${sourceId}:create-event`,
            slug: `${sourceId}-slug`,
            equivalenceKey: null,
          })
        )
      )
    ).rejects.toMatchObject({ code: "INVALID_TRANSITION" })
  })
})

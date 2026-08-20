import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  command,
  createEntityRequest,
  entityIdentity,
  entitySource,
} from "@/lib/url-registry/behavior-helpers"
import {
  advanceSourceEventCursor,
  appendSourceEvent,
  INSERT_SOURCE_EVENT_RECEIPT_SQL,
  insertSourceEventReceipt,
  inTransaction,
  SOURCE_EVENT_FINGERPRINT,
} from "./postgres-source-event-tracking-fixture"
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

describe.sequential("PostgreSQL 18.1 source-event tracking", () => {
  it("commits each receipt with a contiguous high-water cursor", async () => {
    const sourceId = context.nextNamespace("source-cursor")
    await appendSourceEvent(context, {
      action: "noop-source-present",
      changeType: "reconcile",
      eventId: `${sourceId}:1`,
      sequence: 1,
      sourceId,
    })
    await appendSourceEvent(context, {
      action: "noop-route-missing",
      changeType: "delete",
      eventId: `${sourceId}:2`,
      sequence: 2,
      sourceId,
    })

    const result = await context.runtime.query(
      `SELECT cursor.last_sequence, count(receipt.*)::integer AS receipts
       FROM url_registry.url_registry_source_event_cursor AS cursor
       INNER JOIN url_registry.url_registry_source_event_receipt AS receipt
         USING (source_system, source_type, source_id, market)
       WHERE cursor.source_id = $1
       GROUP BY cursor.last_sequence`,
      [sourceId]
    )
    expect(result.rows).toEqual([{ last_sequence: 2, receipts: 2 }])
  })

  it("rejects one-sided writes, gaps, and invalid cursor timestamps", async () => {
    const sourceId = context.nextNamespace("source-invariant")
    await appendSourceEvent(context, {
      action: "noop-source-present",
      changeType: "reconcile",
      eventId: `${sourceId}:1`,
      sequence: 1,
      sourceId,
    })

    await expect(
      inTransaction(context.runtime, (client) =>
        insertSourceEventReceipt(client, {
          action: "noop-source-present",
          changeType: "reconcile",
          eventId: `${sourceId}:2`,
          sequence: 2,
          sourceId,
        })
      )
    ).rejects.toMatchObject({ code: "23514" })
    await expect(
      inTransaction(context.runtime, (client) =>
        advanceSourceEventCursor(client, sourceId, 2)
      )
    ).rejects.toMatchObject({ code: "23503" })
    await expect(
      context.runtime.query(
        `UPDATE url_registry.url_registry_source_event_cursor
         SET last_sequence = 3 WHERE source_id = $1`,
        [sourceId]
      )
    ).rejects.toMatchObject({ code: "23514" })

    const invalidTimestampId = `${sourceId}-timestamp`
    await expect(
      inTransaction(context.runtime, async (client) => {
        await insertSourceEventReceipt(client, {
          action: "noop-source-present",
          changeType: "reconcile",
          eventId: `${invalidTimestampId}:1`,
          sequence: 1,
          sourceId: invalidTimestampId,
        })
        await client.query(
          `INSERT INTO url_registry.url_registry_source_event_cursor (
            source_system, source_type, source_id, market, last_sequence,
            created_at, updated_at
          ) VALUES (
            'medusa', 'product', $1, 'sk', 1,
            '2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z'
          )`,
          [invalidTimestampId]
        )
      })
    ).rejects.toMatchObject({ code: "23514" })
  })

  it("rejects a multi-step cursor jump that omits an intermediate receipt", async () => {
    const sourceId = context.nextNamespace("source-multi-step-gap")
    await appendSourceEvent(context, {
      action: "noop-source-present",
      changeType: "reconcile",
      eventId: `${sourceId}:1`,
      sequence: 1,
      sourceId,
    })

    await expect(
      inTransaction(context.runtime, async (client) => {
        await insertSourceEventReceipt(client, {
          action: "noop-source-present",
          changeType: "reconcile",
          eventId: `${sourceId}:3`,
          sequence: 3,
          sourceId,
        })
        await advanceSourceEventCursor(client, sourceId, 2)
        await advanceSourceEventCursor(client, sourceId, 3)
      })
    ).rejects.toMatchObject({ code: "23514" })

    const state = await context.runtime.query(
      `SELECT cursor.last_sequence, count(receipt.*)::integer AS receipts
       FROM url_registry.url_registry_source_event_cursor AS cursor
       INNER JOIN url_registry.url_registry_source_event_receipt AS receipt
         USING (source_system, source_type, source_id, market)
       WHERE cursor.source_id = $1
       GROUP BY cursor.last_sequence`,
      [sourceId]
    )
    expect(state.rows).toEqual([{ last_sequence: 1, receipts: 1 }])
  })

  it("enforces the action matrix and append-only identities", async () => {
    const sourceId = context.nextNamespace("source-actions")
    await appendSourceEvent(context, {
      action: "noop-source-present",
      changeType: "reconcile",
      eventId: `${sourceId}:1`,
      sequence: 1,
      sourceId,
    })

    await expect(
      context.runtime.query(INSERT_SOURCE_EVENT_RECEIPT_SQL, [
        "medusa",
        `${sourceId}-invalid`,
        1,
        `${sourceId}:invalid-action`,
        SOURCE_EVENT_FINGERPRINT,
        "reconcile",
        "noop-route-missing",
        null,
      ])
    ).rejects.toMatchObject({ code: "23514" })
    await expect(
      context.runtime.query(INSERT_SOURCE_EVENT_RECEIPT_SQL, [
        "medusa",
        `${sourceId}-invalid-command`,
        1,
        `${sourceId}:invalid-command`,
        SOURCE_EVENT_FINGERPRINT,
        "delete",
        "noop-route-missing",
        "unexpected-command",
      ])
    ).rejects.toMatchObject({ code: "23514" })
    await expect(
      context.admin.query(
        `UPDATE url_registry.url_registry_source_event_receipt
         SET action = action WHERE source_id = $1`,
        [sourceId]
      )
    ).rejects.toMatchObject({ code: "23514" })
    await expect(
      context.admin.query(
        `UPDATE url_registry.url_registry_source_event_cursor
         SET source_id = source_id || '-changed' WHERE source_id = $1`,
        [sourceId]
      )
    ).rejects.toMatchObject({ code: "23514" })
  })

  it("permits a retirement receipt only for its matching completed command", async () => {
    const namespace = context.nextNamespace("source-retire")
    const identity = entityIdentity(`${namespace}-product`)
    const createCommandKey = `${namespace}:create-command`
    const created = await context.registry.createEntityRoute(
      command(
        createCommandKey,
        createEntityRequest({
          equivalenceKey: `${namespace}:equivalent`,
          eventId: `${namespace}:create-event`,
          identity,
          slug: `${namespace}-slug`,
        })
      )
    )
    await expect(
      appendSourceEvent(context, {
        action: "retired",
        changeType: "delete",
        commandKey: createCommandKey,
        eventId: `${namespace}:invalid-retirement`,
        sequence: 1,
        sourceId: identity.sourceId,
      })
    ).rejects.toMatchObject({ code: "23514" })

    const commandKey = `${namespace}:retire-command`
    const eventId = `${namespace}:delete-event`
    await context.registry.retireRoute(
      command(commandKey, {
        commandType: "retire-route",
        expectedVersion: 1,
        source: entitySource(identity, eventId),
        target: { identity, routeId: created.snapshot.route.id },
      })
    )
    await expect(
      appendSourceEvent(context, {
        action: "retired",
        changeType: "delete",
        commandKey,
        eventId: `${namespace}:wrong-source`,
        sequence: 1,
        sourceId: `${identity.sourceId}-wrong`,
      })
    ).rejects.toMatchObject({ code: "23514" })
    await expect(
      appendSourceEvent(context, {
        action: "retired",
        changeType: "delete",
        commandKey,
        eventId: `${namespace}:wrong-event`,
        sequence: 1,
        sourceId: identity.sourceId,
      })
    ).rejects.toMatchObject({ code: "23514" })

    await appendSourceEvent(context, {
      action: "retired",
      changeType: "delete",
      commandKey,
      eventId,
      sequence: 1,
      sourceId: identity.sourceId,
    })
    await expect(
      context.runtime.query(
        `SELECT command_idempotency_key
         FROM url_registry.url_registry_source_event_receipt
         WHERE source_id = $1`,
        [identity.sourceId]
      )
    ).resolves.toMatchObject({
      rows: [{ command_idempotency_key: commandKey }],
    })
  })

  it("links publish and slug-change receipts to their exact completed commands", async () => {
    const namespace = context.nextNamespace("source-publication")
    const identity = entityIdentity(`${namespace}-product`)
    const publishEventId = `${namespace}:publish-event`
    const publishCommandKey = `${namespace}:publish-command`
    const created = await context.registry.createEntityRoute(
      command(
        publishCommandKey,
        createEntityRequest({
          equivalenceKey: `${namespace}:equivalent`,
          eventId: publishEventId,
          identity,
          slug: `${namespace}-slug`,
        })
      )
    )

    await expect(
      appendSourceEvent(context, {
        action: "slug-changed",
        changeType: "reconcile",
        commandKey: publishCommandKey,
        eventId: publishEventId,
        sequence: 1,
        sourceId: identity.sourceId,
      })
    ).rejects.toMatchObject({ code: "23514" })

    await appendSourceEvent(context, {
      action: "published",
      changeType: "reconcile",
      commandKey: publishCommandKey,
      eventId: publishEventId,
      sequence: 1,
      sourceId: identity.sourceId,
    })

    const changeEventId = `${namespace}:slug-event`
    const changeCommandKey = `${namespace}:slug-command`
    await context.registry.changeSlug(
      command(changeCommandKey, {
        commandType: "change-slug",
        expectedVersion: created.snapshot.route.version,
        source: entitySource(identity, changeEventId),
        target: { identity, routeId: created.snapshot.route.id },
        slug: {
          normalizedSlug: `${namespace}-renamed`,
          normalizationVersion: 1,
        },
      })
    )
    await appendSourceEvent(context, {
      action: "slug-changed",
      changeType: "reconcile",
      commandKey: changeCommandKey,
      eventId: changeEventId,
      sequence: 2,
      sourceId: identity.sourceId,
    })

    const receipts = await context.runtime.query(
      `SELECT action, command_idempotency_key
       FROM url_registry.url_registry_source_event_receipt
       WHERE source_id = $1
       ORDER BY stream_sequence`,
      [identity.sourceId]
    )
    expect(receipts.rows).toEqual([
      { action: "published", command_idempotency_key: publishCommandKey },
      { action: "slug-changed", command_idempotency_key: changeCommandKey },
    ])
  })

  it("records unpublished lifecycle outcomes without inventing URLR commands", async () => {
    const sourceId = context.nextNamespace("source-unpublished")

    await expect(
      appendSourceEvent(context, {
        action: "published",
        changeType: "reconcile",
        eventId: `${sourceId}:invalid-published`,
        sequence: 1,
        sourceId,
      })
    ).rejects.toMatchObject({ code: "23514" })

    await appendSourceEvent(context, {
      action: "unpublished",
      changeType: "reconcile",
      eventId: `${sourceId}:unpublished`,
      sequence: 1,
      sourceId,
    })
    await appendSourceEvent(context, {
      action: "noop-unpublished",
      changeType: "reconcile",
      eventId: `${sourceId}:noop-unpublished`,
      sequence: 2,
      sourceId,
    })

    const receipts = await context.runtime.query(
      `SELECT action, command_idempotency_key
       FROM url_registry.url_registry_source_event_receipt
       WHERE source_id = $1
       ORDER BY stream_sequence`,
      [sourceId]
    )
    expect(receipts.rows).toEqual([
      { action: "unpublished", command_idempotency_key: null },
      { action: "noop-unpublished", command_idempotency_key: null },
    ])
  })

  it("preserves a legacy commandless catalog unpublished receipt", async () => {
    const sourceId = context.nextNamespace("legacy-category-unpublished")

    await appendSourceEvent(context, {
      action: "unpublished",
      changeType: "reconcile",
      eventId: `${sourceId}:unpublished`,
      sequence: 1,
      sourceId,
      sourceType: "category",
    })

    const receipt = await context.runtime.query(
      `SELECT source_type, action, command_idempotency_key
       FROM url_registry.url_registry_source_event_receipt
       WHERE source_type = 'category' AND source_id = $1`,
      [sourceId]
    )
    expect(receipt.rows).toEqual([
      {
        action: "unpublished",
        command_idempotency_key: null,
        source_type: "category",
      },
    ])
  })
})

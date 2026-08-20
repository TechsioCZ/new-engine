import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  command,
  createEntityRequest,
  entityIdentity,
  entitySource,
} from "@/lib/url-registry/behavior-helpers"
import {
  createPostgresTestContext,
  type PostgresTestContext,
  rejectionCodes,
} from "./postgres-test-harness"

let context: PostgresTestContext

beforeAll(async () => {
  context = await createPostgresTestContext()
})

beforeEach(async () => {
  await context.reset()
})

afterAll(async () => {
  await context?.close()
})

const replayFlags = <Value extends { commit: { replayed: boolean } }>(
  results: readonly PromiseSettledResult<Value>[]
) =>
  results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value.commit.replayed] : []
  )

describe.sequential("PostgreSQL 18.1 URL registry concurrency", () => {
  it("uses distinct migration/runtime roles and denies destructive runtime DML", async () => {
    const [adminIdentity, runtimePrivileges] = await Promise.all([
      context.admin.query("SELECT current_user AS name"),
      context.runtime.query(`SELECT current_user AS name,
        has_table_privilege(current_user,
          'url_registry.url_route', 'SELECT') AS "canSelect",
        has_table_privilege(current_user,
          'url_registry.url_route', 'INSERT') AS "canInsert",
        has_table_privilege(current_user,
          'url_registry.url_route', 'UPDATE') AS "canUpdate",
        has_table_privilege(current_user,
          'url_registry.url_route', 'DELETE') AS "canDelete",
        has_table_privilege(current_user,
          'url_registry.url_route', 'TRUNCATE') AS "canTruncate",
        has_table_privilege(current_user,
          'url_registry.schema_migrations', 'SELECT') AS "canReadMigrations",
        has_table_privilege(current_user,
          'url_registry.schema_migrations', 'INSERT') AS "canInsertMigrations",
        has_table_privilege(current_user,
          'url_registry.schema_migrations', 'UPDATE') AS "canUpdateMigrations",
        has_table_privilege(current_user,
          'url_registry.url_registry_source_event_receipt', 'INSERT')
          AS "canInsertSourceReceipt",
        has_table_privilege(current_user,
          'url_registry.url_registry_source_event_receipt', 'UPDATE')
          AS "canUpdateSourceReceipt",
        has_table_privilege(current_user,
          'url_registry.url_registry_source_event_cursor', 'INSERT')
          AS "canInsertSourceCursor",
        has_table_privilege(current_user,
          'url_registry.url_registry_source_event_cursor', 'UPDATE')
          AS "canUpdateSourceCursor"`),
    ])
    expect(runtimePrivileges.rows[0]).toMatchObject({
      canDelete: false,
      canInsert: true,
      canInsertMigrations: false,
      canInsertSourceCursor: true,
      canInsertSourceReceipt: true,
      canReadMigrations: true,
      canSelect: true,
      canTruncate: false,
      canUpdate: true,
      canUpdateMigrations: false,
      canUpdateSourceCursor: true,
      canUpdateSourceReceipt: false,
    })
    expect(runtimePrivileges.rows[0]?.name).not.toBe(
      adminIdentity.rows[0]?.name
    )
  })

  it("serializes an exact idempotency-key race to one commit and one replay", async () => {
    const namespace = context.nextNamespace("same-key")
    const identity = entityIdentity(`${namespace}-entity`)
    const request = createEntityRequest({
      identity,
      eventId: `${namespace}:event`,
      slug: `${namespace}-slug`,
      equivalenceKey: `${namespace}:equivalent`,
    })
    const key = `${namespace}:command`
    const exactCommand = command(key, request)
    const results = await Promise.allSettled([
      context.registry.createEntityRoute(exactCommand),
      context.registry.createEntityRoute(exactCommand),
    ])

    expect(results.every(({ status }) => status === "fulfilled")).toBe(true)
    expect(replayFlags(results).sort()).toEqual([false, true])
    const snapshots = results.flatMap((settled) =>
      settled.status === "fulfilled" ? [settled.value.snapshot] : []
    )
    expect(snapshots[1]).toEqual(snapshots[0])
    await expect(context.countArtifacts([key])).resolves.toEqual({
      audits: 1,
      commands: 1,
      outbox: 1,
    })
  })

  it("replays an exact source-event race across keys and rejects event drift", async () => {
    const namespace = context.nextNamespace("source-race")
    const identity = entityIdentity(`${namespace}-entity`)
    const eventId = `${namespace}:event`
    const request = createEntityRequest({
      identity,
      eventId,
      slug: `${namespace}-slug`,
      equivalenceKey: `${namespace}:equivalent`,
    })
    const exactKeys = [`${namespace}:a`, `${namespace}:b`]
    const exactResults = await Promise.allSettled(
      exactKeys.map((key) =>
        context.registry.createEntityRoute(command(key, request))
      )
    )

    expect(exactResults.every(({ status }) => status === "fulfilled")).toBe(
      true
    )
    expect(replayFlags(exactResults).sort()).toEqual([false, true])
    await expect(context.countArtifacts(exactKeys)).resolves.toEqual({
      audits: 1,
      commands: 1,
      outbox: 1,
    })

    await context.reset()
    const driftKeys = [`${namespace}:drift-a`, `${namespace}:drift-b`]
    const driftResults = await Promise.allSettled([
      context.registry.createEntityRoute(
        command(
          driftKeys[0],
          createEntityRequest({
            identity: entityIdentity(`${namespace}-drift-a`),
            eventId,
            slug: `${namespace}-drift-a`,
            equivalenceKey: `${namespace}:drift-a`,
          })
        )
      ),
      context.registry.createEntityRoute(
        command(
          driftKeys[1],
          createEntityRequest({
            identity: entityIdentity(`${namespace}-drift-b`),
            eventId,
            slug: `${namespace}-drift-b`,
            equivalenceKey: `${namespace}:drift-b`,
          })
        )
      ),
    ])
    expect(
      driftResults.filter(({ status }) => status === "fulfilled")
    ).toHaveLength(1)
    expect(rejectionCodes(driftResults)).toEqual(["SOURCE_EVENT_CONFLICT"])
    await expect(context.countArtifacts(driftKeys)).resolves.toEqual({
      audits: 1,
      commands: 1,
      outbox: 1,
    })
  })

  it("rolls back the losing optimistic-version command without artifacts", async () => {
    const namespace = context.nextNamespace("version-race")
    const identity = entityIdentity(`${namespace}-entity`)
    const created = await context.registry.createEntityRoute(
      command(
        `${namespace}:create`,
        createEntityRequest({
          identity,
          eventId: `${namespace}:create`,
          slug: `${namespace}-initial`,
          equivalenceKey: `${namespace}:equivalent`,
        })
      )
    )
    const keys = [`${namespace}:change-a`, `${namespace}:change-b`]
    const changes = ["a", "b"].map((suffix, index) =>
      command(keys[index], {
        commandType: "change-slug" as const,
        expectedVersion: 1,
        source: entitySource(identity, `${namespace}:change-${suffix}`, "2"),
        target: { routeId: created.snapshot.route.id, identity },
        slug: {
          normalizedSlug: `${namespace}-${suffix}`,
          normalizationVersion: 1,
        },
      })
    )
    const results = await Promise.allSettled(
      changes.map((change) => context.registry.changeSlug(change))
    )

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1
    )
    expect(rejectionCodes(results)).toEqual(["VERSION_CONFLICT"])
    await expect(context.countArtifacts(keys)).resolves.toEqual({
      audits: 1,
      commands: 1,
      outbox: 1,
    })
  })
})

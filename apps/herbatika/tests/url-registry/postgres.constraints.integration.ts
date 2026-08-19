import { Pool } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  command,
  createEntityRequest,
  createStaticRequest,
  entityIdentity,
  entitySource,
  staticIdentity,
  staticSource,
} from "@/lib/url-registry/behavior-helpers"
import { createPostgresUrlRegistry } from "@/lib/url-registry/postgres"
import {
  createPostgresTestContext,
  type PostgresTestContext,
  rejectionCodes,
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

describe.sequential("PostgreSQL 18.1 URL registry constraints", () => {
  it("keeps a concurrent slug collision and alias-reuse failure atomic", async () => {
    const namespace = context.nextNamespace("slug-race")
    const collisionKeys = [
      `${namespace}:collision-a`,
      `${namespace}:collision-b`,
    ]
    const collision = await Promise.allSettled(
      collisionKeys.map((key, index) => {
        const suffix = index === 0 ? "a" : "b"
        return context.registry.createEntityRoute(
          command(
            key,
            createEntityRequest({
              identity: entityIdentity(`${namespace}-${suffix}`),
              eventId: `${namespace}:collision-${suffix}`,
              slug: `${namespace}-shared`,
              equivalenceKey: `${namespace}:${suffix}`,
            })
          )
        )
      })
    )
    expect(
      collision.filter(({ status }) => status === "fulfilled")
    ).toHaveLength(1)
    expect(rejectionCodes(collision)).toEqual(["SLUG_CONFLICT"])
    await expect(context.countArtifacts(collisionKeys)).resolves.toEqual({
      audits: 1,
      commands: 1,
      outbox: 1,
    })

    const winner = collision.find((settled) => settled.status === "fulfilled")
    if (!winner || winner.status !== "fulfilled") {
      throw new Error("Expected one slug-collision winner")
    }
    const winnerIdentity = entityIdentity(winner.value.snapshot.route.sourceId)
    await context.registry.changeSlug(
      command(`${namespace}:alias`, {
        commandType: "change-slug",
        expectedVersion: 1,
        source: entitySource(winnerIdentity, `${namespace}:alias`, "2"),
        target: {
          routeId: winner.value.snapshot.route.id,
          identity: winnerIdentity,
        },
        slug: {
          normalizedSlug: `${namespace}-current`,
          normalizationVersion: 1,
        },
      })
    )
    const failedKey = `${namespace}:alias-reuse`
    await expect(
      context.registry.createEntityRoute(
        command(
          failedKey,
          createEntityRequest({
            identity: entityIdentity(`${namespace}-alias-reuser`),
            eventId: `${namespace}:alias-reuse`,
            slug: `${namespace}-shared`,
            equivalenceKey: `${namespace}:alias-reuse`,
          })
        )
      )
    ).rejects.toMatchObject({ code: "SLUG_CONFLICT" })
    await expect(context.countArtifacts([failedKey])).resolves.toEqual({
      audits: 0,
      commands: 0,
      outbox: 0,
    })
  })

  it("serializes a static A-to-B/B-to-A write skew and rejects the cycle", async () => {
    const namespace = context.nextNamespace("static-cycle")
    const a = staticIdentity(`${namespace}-a`)
    const b = staticIdentity(`${namespace}-b`)
    const [aCreated, bCreated] = await Promise.all([
      context.registry.createStaticRoute(
        command(
          `${namespace}:create-a`,
          createStaticRequest({
            identity: a,
            eventId: `${namespace}:create-a`,
            segment: `${namespace}-a`,
          })
        )
      ),
      context.registry.createStaticRoute(
        command(
          `${namespace}:create-b`,
          createStaticRequest({
            identity: b,
            eventId: `${namespace}:create-b`,
            segment: `${namespace}-b`,
          })
        )
      ),
    ])
    const keys = [`${namespace}:a-to-b`, `${namespace}:b-to-a`]
    const results = await Promise.allSettled([
      context.registry.changeStaticPath(
        command(keys[0], {
          commandType: "change-static-path",
          expectedVersion: 1,
          source: staticSource(a, `${namespace}:a-to-b`, "2"),
          target: { routeId: aCreated.snapshot.route.id, identity: a },
          path: {
            parentRouteKey: b.staticRouteKey,
            segment: `${namespace}-a-next`,
            matchMode: "exact",
          },
        })
      ),
      context.registry.changeStaticPath(
        command(keys[1], {
          commandType: "change-static-path",
          expectedVersion: 1,
          source: staticSource(b, `${namespace}:b-to-a`, "2"),
          target: { routeId: bCreated.snapshot.route.id, identity: b },
          path: {
            parentRouteKey: a.staticRouteKey,
            segment: `${namespace}-b-next`,
            matchMode: "exact",
          },
        })
      ),
    ])

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1
    )
    expect(rejectionCodes(results)).toEqual(["INVALID_TRANSITION"])
    await expect(context.countArtifacts(keys)).resolves.toEqual({
      audits: 1,
      commands: 1,
      outbox: 1,
    })
    const snapshots = await context.registry.listStaticRouteSnapshots("sk")
    expect(snapshots.kind).toBe("found")
    if (snapshots.kind !== "found") {
      throw new Error("Expected static snapshots")
    }
    expect(
      snapshots.value.filter(
        ({ currentPath }) => currentPath.parentRouteKey !== null
      )
    ).toHaveLength(1)
  })

  it("maps a primary connection failure to a typed unavailable read", async () => {
    const unavailablePool = new Pool({
      connectionString: "postgresql://urlr:none@127.0.0.1:1/urlr",
      connectionTimeoutMillis: 100,
      max: 1,
    })
    const unavailableRegistry = createPostgresUrlRegistry({
      async connect() {
        const client = await unavailablePool.connect()
        return {
          async query(sql, values = []) {
            const queryResult = await client.query(sql, [...values])
            return { rows: queryResult.rows, rowCount: queryResult.rowCount }
          },
          release(error) {
            client.release(error)
          },
        }
      },
      async query(sql, values = []) {
        const queryResult = await unavailablePool.query(sql, [...values])
        return { rows: queryResult.rows, rowCount: queryResult.rowCount }
      },
    })
    try {
      await expect(
        unavailableRegistry.resolve({
          market: "sk",
          kind: "product",
          normalizedSlug: "unavailable-source",
        })
      ).resolves.toEqual({ kind: "unavailable" })
    } finally {
      await unavailablePool.end()
    }
  })
})

import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { sign } from "jsonwebtoken"
import { afterEach, describe, expect, it, vi } from "vitest"
import apiMiddlewareConfig from "../../../../../middlewares"
import {
  customerEmailpassUpdateGuardMatcher,
  customerEmailpassUpdateGuardMiddlewares,
  rejectGenericCustomerEmailpassUpdate,
} from "../middlewares"

const require = createRequire(import.meta.url)
const frameworkHttpEntry = require.resolve("@medusajs/framework/http")
const medusaEntry = require.resolve("@medusajs/medusa")
const express = require(
  require.resolve("express", { paths: [frameworkHttpEntry] })
)
const { RoutesSorter } = require(
  resolve(dirname(frameworkHttpEntry), "routes-sorter.js")
)
const coreApiMiddlewareConfig = require(
  resolve(dirname(medusaEntry), "api/middlewares.js")
).default

type Handler = (
  request: Record<string, unknown>,
  response: Record<string, unknown>,
  next: (error?: unknown) => void
) => unknown

type MiddlewareEntry = {
  handler: Handler
  matcher: string | RegExp
  methods?: string[]
}

const servers: Array<{ close: (callback: () => void) => void }> = []

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((done) => server.close(done)))
  )
})

function flattenRouteMiddlewares(route: {
  matcher: string | RegExp
  methods?: string[]
  middlewares: Handler[]
}): MiddlewareEntry[] {
  return route.middlewares.map((handler) => ({
    handler,
    matcher: route.matcher,
    methods: route.methods,
  }))
}

describe("customer emailpass update middleware order", () => {
  it("registers the canonicalizing POST guard in the application middleware config", () => {
    const guard = customerEmailpassUpdateGuardMiddlewares[0]
    const registeredGuard = apiMiddlewareConfig.routes.find((route) =>
      route.middlewares.includes(rejectGenericCustomerEmailpassUpdate)
    )

    expect(registeredGuard).toMatchObject({
      matcher: customerEmailpassUpdateGuardMatcher,
      methods: ["POST"],
    })
    expect(registeredGuard?.middlewares).toEqual(guard.middlewares)
  })

  it("rejects canonical, encoded, and unsafe variants before token consumption", async () => {
    const coreUpdateRoute = coreApiMiddlewareConfig.routes.find(
      (route: { matcher: string }) =>
        route.matcher === "/auth/:actor_type/:auth_provider/update"
    )
    expect(coreUpdateRoute).toBeDefined()

    const validateToken = vi.fn(coreUpdateRoute.middlewares.at(-1))
    const coreMiddlewares = flattenRouteMiddlewares({
      ...coreUpdateRoute,
      middlewares: [coreUpdateRoute.middlewares[0], validateToken],
    })
    const guardMiddlewares = flattenRouteMiddlewares(
      customerEmailpassUpdateGuardMiddlewares[0] as never
    )
    const consumePasswordResetToken = vi.fn()
    const updateProvider = vi.fn()
    const downstreamUpdate = vi.fn(
      (
        _request: unknown,
        routeResponse: { status: (code: number) => unknown }
      ) => routeResponse.status(204)
    )
    const sorted = new RoutesSorter([
      ...coreMiddlewares,
      ...guardMiddlewares,
      {
        handler: downstreamUpdate,
        isRoute: true,
        matcher: "/auth/customer/emailpass/update",
        method: "POST",
      },
    ]).sort()
    expect(
      sorted.findIndex(
        (entry: MiddlewareEntry) =>
          entry.handler === rejectGenericCustomerEmailpassUpdate
      )
    ).toBeLessThan(
      sorted.findIndex(
        (entry: MiddlewareEntry) => entry.handler === validateToken
      )
    )
    const app = express()
    const jwtSecret = "middleware-order-test-secret"

    app.use(
      (request: { scope?: unknown }, _response: unknown, next: () => void) => {
        request.scope = {
          resolve: (key: string) => {
            if (key === "configModule") {
              return {
                projectConfig: {
                  http: { authMethodsPerActor: {}, jwtSecret },
                },
              }
            }
            if (key === "auth") {
              return {
                consumePasswordResetToken,
                listProviderIdentities: vi.fn().mockResolvedValue([]),
                updateProvider,
              }
            }
            throw new Error(`Unexpected container key: ${key}`)
          },
        }
        next()
      }
    )
    for (const entry of sorted) {
      if ("isRoute" in entry) {
        app[entry.method.toLowerCase()](entry.matcher, entry.handler)
        continue
      }
      for (const method of entry.methods ?? ["use"]) {
        app[method.toLowerCase()](entry.matcher, entry.handler)
      }
    }

    const server = app.listen(0)
    servers.push(server)
    await new Promise<void>((done) => server.once("listening", done))
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("Expected the test server to bind an ephemeral TCP port")
    }
    const token = sign(
      {
        actor_type: "customer",
        entity_id: "customer@example.com",
        jti: "reset-jti",
        purpose: "reset",
      },
      jwtSecret
    )

    const protectedPaths = [
      "/auth/customer/emailpass/update",
      "/auth/customer/%65mailpass/update",
      "/auth/%63ustomer/emailpass/update",
      "/auth/customer/%2565mailpass/update",
      "/auth/%2563ustomer/emailpass/update",
      "/auth/customer/%E0%A4%A/update",
      "/auth/customer/%ZZmailpass/update",
    ]
    for (const path of protectedPaths) {
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
        body: JSON.stringify({ password: "new-secure-password" }),
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        method: "POST",
      })

      expect(response.status, path).toBe(404)
      expect(response.headers.get("cache-control"), path).toBe(
        "private, no-store"
      )
      expect(response.headers.get("pragma"), path).toBe("no-cache")
      await expect(response.json()).resolves.toEqual({
        message: "Resource was not found.",
        type: "not_found",
      })
    }
    expect(validateToken).not.toHaveBeenCalled()
    expect(consumePasswordResetToken).not.toHaveBeenCalled()
    expect(updateProvider).not.toHaveBeenCalled()
    expect(downstreamUpdate).not.toHaveBeenCalled()
  })

  it.each([
    "/auth/customer/google/update",
    "/auth/admin/emailpass/update",
    "/auth/%61dmin/%67oogle/update",
  ])("allows another canonical actor/provider route: %s", (path) => {
    const next = vi.fn()
    const response = {
      json: vi.fn(),
      setHeader: vi.fn(),
      status: vi.fn(),
    }

    rejectGenericCustomerEmailpassUpdate(
      { path } as never,
      response as never,
      next
    )

    expect(next).toHaveBeenCalledOnce()
    expect(response.status).not.toHaveBeenCalled()
    expect(response.json).not.toHaveBeenCalled()
    expect(response.setHeader).not.toHaveBeenCalled()
  })
})

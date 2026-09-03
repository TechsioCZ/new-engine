import { expect, it } from "vitest"
import {
  command,
  createStatic,
  createStaticRequest,
  type HarnessFactory,
  staticIdentity,
  staticSource,
} from "./behavior-helpers"

export const runStaticBehavior = (createHarness: HarnessFactory) => {
  it("resolves exact static paths, safe prefixes, and historical aliases", async () => {
    const harness = await createHarness()
    try {
      const parent = await createStatic(harness, "resolve-parent")
      const child = await createStatic(
        harness,
        "resolve-child",
        parent.identity.staticRouteKey
      )

      await expect(
        harness.registry.resolveStaticPath({
          market: "sk",
          pathSegments: ["resolve-parent", "resolve-child"],
        })
      ).resolves.toMatchObject({
        kind: "found",
        value: {
          canonicalPathSegments: ["resolve-parent", "resolve-child"],
          disposition: "current",
          route: { id: child.result.snapshot.route.id },
        },
      })

      await harness.registry.changeStaticPath(
        command(`${harness.namespace}:resolve-parent-path`, {
          commandType: "change-static-path",
          expectedVersion: 1,
          path: {
            matchMode: "exact",
            parentRouteKey: null,
            segment: "renamed-parent",
          },
          source: staticSource(
            parent.identity,
            `${harness.namespace}:resolve-parent-path`
          ),
          target: {
            identity: parent.identity,
            routeId: parent.result.snapshot.route.id,
          },
        })
      )

      await expect(
        harness.registry.resolveStaticPath({
          market: "sk",
          pathSegments: ["resolve-parent", "resolve-child"],
        })
      ).resolves.toMatchObject({
        kind: "found",
        value: {
          canonicalPathSegments: ["renamed-parent", "resolve-child"],
          disposition: "alias",
          route: { id: child.result.snapshot.route.id },
        },
      })
      await expect(
        harness.registry.resolveStaticPath({
          market: "sk",
          pathSegments: ["renamed-parent", "resolve-child", "extra"],
        })
      ).resolves.toEqual({ kind: "missing" })
      await expect(
        harness.registry.resolveStaticPath({
          market: "cz",
          pathSegments: ["renamed-parent", "resolve-child"],
        })
      ).resolves.toEqual({ kind: "missing" })

      const prefixIdentity = staticIdentity(
        `${harness.namespace}-resolve-prefix`
      )
      await harness.registry.createStaticRoute(
        command(`${harness.namespace}:resolve-prefix`, {
          ...createStaticRequest({
            eventId: `${harness.namespace}:resolve-prefix`,
            identity: prefixIdentity,
            segment: "resolve-prefix",
          }),
          path: {
            matchMode: "prefix",
            parentRouteKey: null,
            segment: "resolve-prefix",
          },
        })
      )
      await expect(
        harness.registry.resolveStaticPath({
          market: "sk",
          pathSegments: ["RESOLVE-PREFIX", "Opaque-AbC"],
        })
      ).resolves.toMatchObject({
        kind: "found",
        value: {
          canonicalPathSegments: ["resolve-prefix", "Opaque-AbC"],
          disposition: "current",
          remainderSegments: ["Opaque-AbC"],
          route: { staticRouteKey: prefixIdentity.staticRouteKey },
        },
      })
    } finally {
      await harness.cleanup()
    }
  })

  it("keeps static path history immutable and separate from entity slugs", async () => {
    const harness = await createHarness()
    try {
      const missingParent = staticIdentity(`${harness.namespace}-orphan`)
      await expect(
        harness.registry.createStaticRoute(
          command(
            `${harness.namespace}:orphan`,
            createStaticRequest({
              identity: missingParent,
              eventId: `${harness.namespace}:orphan`,
              parentRouteKey: `${harness.namespace}-absent`,
              segment: "orphan",
            })
          )
        )
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" })

      const parent = await createStatic(harness, "parent")
      const child = await createStatic(
        harness,
        "child",
        parent.identity.staticRouteKey
      )
      expect(child.result.snapshot.currentPath).toMatchObject({
        parentRouteKey: parent.identity.staticRouteKey,
        segment: "child",
        disposition: "current",
        introducedInVersion: 1,
      })
      expect("currentSlug" in child.result.snapshot).toBe(false)
      const changed = await harness.registry.changeStaticPath(
        command(`${harness.namespace}:child-path`, {
          commandType: "change-static-path",
          expectedVersion: 1,
          source: staticSource(
            child.identity,
            `${harness.namespace}:child-path`
          ),
          target: {
            routeId: child.result.snapshot.route.id,
            identity: child.identity,
          },
          path: {
            parentRouteKey: null,
            segment: "moved-child",
            matchMode: "prefix",
          },
        })
      )
      expect(changed.snapshot).toMatchObject({
        route: { version: 2 },
        currentPath: {
          parentRouteKey: null,
          segment: "moved-child",
          matchMode: "prefix",
          introducedInVersion: 2,
        },
      })
      expect(changed.snapshot.pathHistory).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ segment: "child", disposition: "alias" }),
          expect.objectContaining({
            segment: "moved-child",
            disposition: "current",
          }),
        ])
      )
      const reuse = staticIdentity(`${harness.namespace}-reuse`)
      await expect(
        harness.registry.createStaticRoute(
          command(
            `${harness.namespace}:reuse-static-path`,
            createStaticRequest({
              identity: reuse,
              eventId: `${harness.namespace}:reuse-static-path`,
              parentRouteKey: parent.identity.staticRouteKey,
              segment: "child",
            })
          )
        )
      ).rejects.toMatchObject({ code: "STATIC_PATH_CONFLICT" })
      const listed = await harness.registry.listStaticRouteSnapshots("sk")
      expect(listed.kind).toBe("found")
      if (listed.kind === "found") {
        expect(listed.value.map((item) => item.route.staticRouteKey)).toEqual(
          [...listed.value].map((item) => item.route.staticRouteKey).sort()
        )
      }
    } finally {
      await harness.cleanup()
    }
  })

  it("rejects missing, self, and descendant static parents", async () => {
    const harness = await createHarness()
    try {
      const parent = await createStatic(harness, "cycle-parent")
      const child = await createStatic(
        harness,
        "cycle-child",
        parent.identity.staticRouteKey
      )
      await expect(
        harness.registry.changeStaticPath(
          command(`${harness.namespace}:self-cycle`, {
            commandType: "change-static-path",
            expectedVersion: 1,
            source: staticSource(
              parent.identity,
              `${harness.namespace}:self-cycle`
            ),
            target: {
              routeId: parent.result.snapshot.route.id,
              identity: parent.identity,
            },
            path: {
              parentRouteKey: parent.identity.staticRouteKey,
              segment: "cycle-parent-self",
              matchMode: "exact",
            },
          })
        )
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" })
      await expect(
        harness.registry.changeStaticPath(
          command(`${harness.namespace}:descendant-cycle`, {
            commandType: "change-static-path",
            expectedVersion: 1,
            source: staticSource(
              parent.identity,
              `${harness.namespace}:descendant-cycle`
            ),
            target: {
              routeId: parent.result.snapshot.route.id,
              identity: parent.identity,
            },
            path: {
              parentRouteKey: child.identity.staticRouteKey,
              segment: "cycle-parent-moved",
              matchMode: "exact",
            },
          })
        )
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" })
      await expect(
        harness.registry.retireRoute(
          command(`${harness.namespace}:parent-retire`, {
            commandType: "retire-route",
            expectedVersion: 1,
            source: staticSource(
              parent.identity,
              `${harness.namespace}:parent-retire`
            ),
            target: {
              routeId: parent.result.snapshot.route.id,
              identity: parent.identity,
            },
          })
        )
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" })
    } finally {
      await harness.cleanup()
    }
  })
}

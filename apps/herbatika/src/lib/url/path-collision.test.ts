import { describe, expect, it } from "vitest"
import {
  assertPublicPathCollisionFree,
  type PublicPathClaim,
  type PublicPathClaimOwner,
  PublicPathCollisionError,
  validatePublicPathCollisionSet,
} from "./path-collision"
import { MARKETS, ROUTE_SEGMENT_REGISTRY } from "./segments"
import { RESERVED_PUBLIC_PATH_SEGMENTS } from "./slug"

const DEFAULT_OWNER = {
  equivalenceKey: "equivalence-product-1",
  routeId: "route-product-1",
  routeKind: "product",
  sourceId: "prod_1",
  sourceKind: "medusa-product",
} as const satisfies PublicPathClaimOwner

const createClaim = (
  overrides: Partial<PublicPathClaim> = {}
): PublicPathClaim => ({
  claimId: "claim-current-product-1",
  claimKind: "current-slug",
  market: "sk",
  owner: DEFAULT_OWNER,
  path: "/produkty/zeleny-caj",
  ...overrides,
})

const expectInvalid = (
  input: Parameters<typeof validatePublicPathCollisionSet>[0]
) => {
  const result = validatePublicPathCollisionSet(input)
  if (result.ok) {
    throw new Error("Expected collision validation to fail")
  }
  return result.diagnostics
}

describe("validatePublicPathCollisionSet", () => {
  it("accepts unique complete paths and host aliases in their own markets", () => {
    const result = validatePublicPathCollisionSet({
      hostAssignments: [
        { assignmentId: "sk-apex", host: "herbatica.sk", market: "sk" },
        { assignmentId: "sk-www", host: "www.herbatica.sk", market: "sk" },
        { assignmentId: "cz-apex", host: "herbatica.cz", market: "cz" },
      ],
      pathClaims: [
        createClaim(),
        createClaim({
          claimId: "claim-alias-product-1",
          claimKind: "alias",
          path: "/produkty/stary-zeleny-caj",
        }),
        createClaim({
          claimId: "claim-cz-product-1",
          market: "cz",
          path: "/produkty/zeleny-caj",
        }),
        createClaim({
          claimId: "claim-facet-1",
          claimKind: "facet",
          owner: {
            equivalenceKey: null,
            routeId: "facet-ingredient-1",
            routeKind: "ingredient-facet",
            sourceId: "ingredient_1",
            sourceKind: "medusa-attribute-value",
          },
          path: "/produkty/bylinka",
        }),
      ],
    })

    expect(result).toEqual({ ok: true })
  })

  it("accepts the proposed registry only when callers expand it into complete paths", () => {
    const pathClaims: PublicPathClaim[] = []

    for (const market of MARKETS) {
      const registry = ROUTE_SEGMENT_REGISTRY[market]
      const roots = [
        ...Object.entries(registry.typePrefixes).map(([key, segment]) => ({
          key: `type-${key}`,
          segment,
        })),
        ...Object.entries(registry.flowRoots).map(([key, segment]) => ({
          key: `flow-${key}`,
          segment,
        })),
        ...Object.entries(registry.staticRootPages).map(([key, segment]) => ({
          key: `static-${key}`,
          segment,
        })),
      ]

      for (const { key, segment } of roots) {
        pathClaims.push(
          createClaim({
            claimId: `${market}-${key}`,
            claimKind: "static",
            market,
            owner: {
              equivalenceKey: key,
              routeId: `${market}-${key}`,
              routeKind: key,
              sourceId: key,
              sourceKind: "route-registry",
            },
            path: `/${segment}`,
          })
        )
      }

      const childGroups = ["checkout", "account", "reviews"] as const
      const childClaimKinds = {
        account: "account",
        checkout: "checkout",
        reviews: "review",
      } as const
      for (const group of childGroups) {
        const children = registry.children[group]
        const root = registry.flowRoots[group]

        for (const [key, segment] of Object.entries(children)) {
          pathClaims.push(
            createClaim({
              claimId: `${market}-${group}-${key}`,
              claimKind: childClaimKinds[group],
              market,
              owner: {
                equivalenceKey: `${group}-${key}`,
                routeId: `${market}-${group}-${key}`,
                routeKind: `${group}-${key}`,
                sourceId: `${group}-${key}`,
                sourceKind: "route-registry",
              },
              path: `/${root}/${segment}`,
            })
          )
        }
      }
    }

    expect(validatePublicPathCollisionSet({ pathClaims })).toEqual({ ok: true })
  })

  it("rejects an exact path claimed by distinct owners", () => {
    const diagnostics = expectInvalid({
      pathClaims: [
        createClaim(),
        createClaim({
          claimId: "claim-static-conflict",
          claimKind: "static",
          owner: {
            equivalenceKey: "static-conflict",
            routeId: "route-static-conflict",
            routeKind: "static-page",
            sourceId: "static-conflict",
            sourceKind: "route-registry",
          },
        }),
      ],
    })

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        claimIds: ["claim-current-product-1", "claim-static-conflict"],
        code: "duplicate-public-path",
        market: "sk",
        normalizedPath: "/produkty/zeleny-caj",
      })
    )
  })

  it("rejects current and history rows that claim the same path for one owner", () => {
    const diagnostics = expectInvalid({
      pathClaims: [
        createClaim(),
        createClaim({ claimId: "claim-alias", claimKind: "alias" }),
      ],
    })

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        claimIds: ["claim-current-product-1", "claim-alias"],
        code: "duplicate-public-path",
      })
    )
  })

  it("groups case, percent, double-percent, and transliteration equivalents", () => {
    const diagnostics = expectInvalid({
      pathClaims: [
        createClaim({ path: "/produkty/caj" }),
        createClaim({
          claimId: "case",
          claimKind: "alias",
          path: "/PRODUKTY/CAJ",
        }),
        createClaim({
          claimId: "percent",
          claimKind: "gone",
          path: "/produkty/%63aj",
        }),
        createClaim({
          claimId: "double-percent",
          claimKind: "historical-combination",
          path: "/produkty/%2563aj",
        }),
        createClaim({
          claimId: "transliteration",
          claimKind: "historical-prefix",
          path: "/produkty/čaj",
        }),
      ],
    })

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        claimIds: [
          "claim-current-product-1",
          "case",
          "percent",
          "double-percent",
          "transliteration",
        ],
        code: "duplicate-public-path",
        normalizedPath: "/produkty/caj",
      })
    )
    expect(
      diagnostics.filter(
        (diagnostic) => diagnostic.code === "invalid-public-path"
      )
    ).toHaveLength(4)
  })

  it("rejects every reserved segment at any path depth", () => {
    for (const reservedSegment of RESERVED_PUBLIC_PATH_SEGMENTS) {
      const diagnostics = expectInvalid({
        pathClaims: [
          createClaim({
            path: `/produkty/${reservedSegment.toUpperCase()}/detail`,
          }),
        ],
      })

      expect(diagnostics).toContainEqual(
        expect.objectContaining({
          code: "reserved-public-segment",
          reservedSegment,
        })
      )
    }
  })

  it.each([
    ["direct", "/~SF/sk"],
    ["percent", "/%7Esf/sk"],
    ["double-percent", "/%257Esf/sk"],
  ])("rejects %s internal target spellings", (_name, path) => {
    const diagnostics = expectInvalid({
      pathClaims: [createClaim({ path })],
    })

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: "reserved-public-segment",
        reservedSegment: "~sf",
      })
    )
  })

  it.each([
    ["relative-path", "produkty/caj"],
    ["trailing-slash", "/produkty/caj/"],
    ["empty-segment", "/produkty//caj"],
    ["query-or-fragment", "/produkty/caj?q=x"],
    ["malformed-percent-encoding", "/produkty/%ZZ"],
    ["encoded-separator", "/produkty%2Fcaj"],
    ["unsafe-character", "/produkty/ca\u200Bj"],
    ["noncanonical-segment", "/produkty/[slug]"],
    ["noncanonical-segment", "/produkty/*"],
  ] as const)("rejects a %s instead of guessing precedence", (reason, path) => {
    const diagnostics = expectInvalid({
      pathClaims: [createClaim({ path })],
    })

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        claimId: "claim-current-product-1",
        code: "invalid-public-path",
        reason,
      })
    )
  })

  it("rejects route, source, and equivalence identity conflicts", () => {
    const diagnostics = expectInvalid({
      pathClaims: [
        createClaim({ path: "/produkty/prvy" }),
        createClaim({
          claimId: "route-conflict",
          owner: { ...DEFAULT_OWNER, routeKind: "category" },
          path: "/produkty/druhy",
        }),
        createClaim({
          claimId: "source-conflict",
          owner: {
            ...DEFAULT_OWNER,
            equivalenceKey: "another-equivalence",
            routeId: "another-route",
          },
          path: "/produkty/treti",
        }),
        createClaim({
          claimId: "equivalence-conflict",
          owner: {
            ...DEFAULT_OWNER,
            routeId: "third-route",
            sourceId: "prod_3",
          },
          path: "/produkty/stvrty",
        }),
      ],
    })

    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        "conflicting-route-binding",
        "conflicting-source-binding",
        "conflicting-equivalence-mapping",
      ])
    )
  })

  it("rejects incompatible cross-market equivalence metadata", () => {
    const diagnostics = expectInvalid({
      pathClaims: [
        createClaim({ path: "/produkty/caj" }),
        createClaim({
          claimId: "cz-conflict",
          market: "cz",
          owner: {
            ...DEFAULT_OWNER,
            routeId: "route-product-cz",
            routeKind: "category",
            sourceId: "prod_cz",
          },
          path: "/produkty/caj-cz",
        }),
      ],
    })

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        code: "conflicting-equivalence-mapping",
        equivalenceKey: "equivalence-product-1",
      })
    )
  })

  it("rejects host equivalents assigned to different markets", () => {
    const diagnostics = expectInvalid({
      hostAssignments: [
        { assignmentId: "sk", host: "herbatica.sk", market: "sk" },
        { assignmentId: "case", host: "HERBATICA.SK", market: "cz" },
        { assignmentId: "dot", host: "herbatica.sk.", market: "hu" },
        { assignmentId: "percent", host: "%68erbatica.sk", market: "ro" },
      ],
      pathClaims: [],
    })

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        assignmentIds: ["sk", "case", "dot", "percent"],
        code: "conflicting-host-assignment",
        normalizedHost: "herbatica.sk",
      })
    )
    expect(
      diagnostics.filter(
        (diagnostic) => diagnostic.code === "invalid-host-assignment"
      )
    ).toHaveLength(3)
  })
})

describe("assertPublicPathCollisionFree", () => {
  it("hard-fails with all typed diagnostics and never rewrites claims", () => {
    const pathClaims = [
      createClaim({ path: "/produkty/caj" }),
      createClaim({ claimId: "duplicate", path: "/PRODUKTY/CAJ" }),
    ] as const

    let thrown: unknown
    try {
      assertPublicPathCollisionFree({ pathClaims })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(PublicPathCollisionError)
    expect(thrown).toEqual(
      expect.objectContaining<Partial<PublicPathCollisionError>>({
        diagnostics: expect.arrayContaining([
          expect.objectContaining({ code: "duplicate-public-path" }),
          expect.objectContaining({ code: "invalid-public-path" }),
        ]),
      })
    )
    expect(pathClaims[1].path).toBe("/PRODUKTY/CAJ")
  })
})

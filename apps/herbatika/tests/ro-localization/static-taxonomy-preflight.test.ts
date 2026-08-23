import { describe, expect, it } from "vitest"
import { createUrlRegistryCommand } from "../../src/lib/url-registry/command-fingerprint"
import type { PopulationManifest } from "../../src/lib/url-registry/population/manifest-contracts"
import {
  APPROVED_STATIC_TAXONOMY_HASH,
  RO_DEMO_STATIC_ROOTS,
} from "./static-taxonomy-approval"
import { assertRoDemoPopulationScope } from "./static-taxonomy-population-manifest"
import type { StaticTaxonomyPreflightRow } from "./static-taxonomy-preflight-contract"
import { buildStaticTaxonomyPreflightSql } from "./static-taxonomy-preflight-sql"
import { buildStaticTaxonomyTransitionPlan } from "./static-taxonomy-transition-plan"

const MUTATION_SQL_PATTERN = /\b(?:delete|insert|update|truncate)\b/i
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/
const TAXONOMY_HASH = APPROVED_STATIC_TAXONOMY_HASH

const rows = (
  state: "absent" | "indexable" | "noindex" = "indexable"
): StaticTaxonomyPreflightRow[] =>
  RO_DEMO_STATIC_ROOTS.map(([pageKey, path], index) => ({
    currentPaths:
      state === "absent"
        ? []
        : [
            {
              matchMode: "exact",
              parentRouteKey: null,
              segment: path.slice(1),
            },
          ],
    equivalenceKey: state === "absent" ? null : `static:root:${pageKey}`,
    indexPolicy: state === "absent" ? null : state,
    routeId:
      state === "absent"
        ? null
        : `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    routeKey: `root:${pageKey}`,
    status: state === "absent" ? null : "active",
    version: state === "absent" ? null : 3,
  }))

describe("RO static taxonomy database preflight", () => {
  it("emits one read-only SELECT covering all 11 roots", () => {
    const sql = buildStaticTaxonomyPreflightSql()
    expect(sql).not.toMatch(MUTATION_SQL_PATTERN)
    expect(sql).toContain("url_registry.url_route")
    expect(sql).toContain("url_registry.static_route_path")
    for (const [pageKey] of RO_DEMO_STATIC_ROOTS) {
      expect(sql).toContain(`'root:${pageKey}'`)
    }
  })

  it("allows a complete greenfield inventory to proceed to population dry-run", () => {
    const plan = buildStaticTaxonomyTransitionPlan(rows("absent"))
    expect(plan).toMatchObject({
      actions: [],
      blockers: [],
      existingCount: 0,
      mode: "greenfield",
      ready: true,
      taxonomyApprovalHash: TAXONOMY_HASH,
    })
  })

  it("emits exact audited update-route and rollback commands for indexable rows", () => {
    const plan = buildStaticTaxonomyTransitionPlan(rows("indexable"))
    expect(plan.blockers).toEqual([])
    expect(plan.actions).toHaveLength(11)
    expect(plan.ready).toBe(false)
    expect(plan.actions[0]).toMatchObject({
      apply: {
        request: {
          commandType: "update-route",
          expectedVersion: 3,
          metadata: { indexPolicy: "noindex" },
          source: {
            producer: "urlr-taxonomy-cutover-v1",
            sourceEventId: expect.stringContaining("apply-noindex:v3"),
            sourceVersion: TAXONOMY_HASH,
          },
        },
      },
      from: "indexable",
      rollbackTemplate: {
        request: {
          commandType: "update-route",
          expectedVersion: 4,
          metadata: { indexPolicy: "indexable" },
        },
      },
      to: "noindex",
    })
    expect(createUrlRegistryCommand(plan.actions[0]?.apply)).toMatchObject({
      request: { commandType: "update-route" },
      requestFingerprint: expect.stringMatching(SHA256_PATTERN),
    })
    expect(plan.transitionPlanHash).toMatch(SHA256_PATTERN)
  })

  it("converges only after all existing rows are already noindex", () => {
    const plan = buildStaticTaxonomyTransitionPlan(rows("noindex"))
    const reordered = buildStaticTaxonomyTransitionPlan(
      rows("noindex").reverse()
    )
    expect(plan).toMatchObject({ actions: [], blockers: [], ready: true })
    expect(plan.noops).toHaveLength(11)
    expect(reordered).toEqual(plan)
  })

  it("hard-blocks partial, terminal, and path-conflicting inventories", () => {
    const partial = rows("indexable")
    partial[0] = rows("absent")[0]
    expect(buildStaticTaxonomyTransitionPlan(partial).blockers).toContainEqual(
      expect.objectContaining({ code: "PARTIAL_STATIC_INVENTORY" })
    )

    const terminal = rows("indexable")
    terminal[0] = { ...terminal[0], status: "retired" }
    expect(buildStaticTaxonomyTransitionPlan(terminal).blockers).toContainEqual(
      expect.objectContaining({ code: "TERMINAL_STATIC_ROUTE" })
    )

    const conflictingPath = rows("indexable")
    conflictingPath[0] = {
      ...conflictingPath[0],
      currentPaths: [
        {
          matchMode: "exact",
          parentRouteKey: null,
          segment: "wrong-path",
        },
      ],
    }
    expect(
      buildStaticTaxonomyTransitionPlan(conflictingPath).blockers
    ).toContainEqual(expect.objectContaining({ code: "STATIC_PATH_CONFLICT" }))
  })

  it("checks the exact Romanian catalog partition", () => {
    const exactEntities = Object.entries({
      brand: 103,
      category: 207,
      product: 2002,
    }).flatMap(([kind, count]) =>
      Array.from({ length: count }, () => ({ kind, market: "ro" }))
    )
    expect(
      assertRoDemoPopulationScope({
        entities: exactEntities,
      } as unknown as PopulationManifest)
    ).toEqual({ brand: 103, category: 207, collection: 0, product: 2002 })
    expect(() =>
      assertRoDemoPopulationScope({
        entities: exactEntities.slice(1),
      } as unknown as PopulationManifest)
    ).toThrow("RO population scope brand must be 103; found 102")
  })
})

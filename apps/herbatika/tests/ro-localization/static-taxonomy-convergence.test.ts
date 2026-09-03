import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  APPROVED_STATIC_CUTOVER_PLAN_HASH,
  APPROVED_STATIC_TAXONOMY_HASH,
} from "./static-taxonomy-approval"
import {
  parseStaticTaxonomyConvergence,
  serializeStaticTaxonomyConvergence,
} from "./static-taxonomy-convergence"
import {
  convergenceFromPopulationArtifact,
  writeStaticTaxonomyConvergence,
} from "./static-taxonomy-convergence-generate"

const MANIFEST_HASH = `sha256:${"b".repeat(64)}`
const SHA256 = /^sha256:[a-f0-9]{64}$/
const fixture = () => ({
  blockers: [],
  cutoverStatus: "GO_FOR_POPULATION_DRY_RUN",
  plan: {
    planHash: APPROVED_STATIC_CUTOVER_PLAN_HASH,
    taxonomyApprovalHash: APPROVED_STATIC_TAXONOMY_HASH,
  },
  populationManifestHash: MANIFEST_HASH,
  staticTransitionPlan: {
    actions: [],
    blockers: [],
    ready: true,
    taxonomyApprovalHash: APPROVED_STATIC_TAXONOMY_HASH,
  },
})

const provenance = {
  capturedAt: "2026-08-20T20:00:00.000Z",
  environmentId: "zane-production-ro",
  releaseId: "ro-demo-20260820",
}

describe("RO static taxonomy machine convergence artifact", () => {
  it("emits the exact strict GO schema and stable bytes", () => {
    const artifact = convergenceFromPopulationArtifact(fixture(), provenance)
    expect(artifact).toMatchObject({
      actionsRequired: 0,
      blockers: 0,
      kind: "ro-static-taxonomy-convergence",
      policy: {
        indexable: { count: 2, routeKeys: ["root:about", "root:faq"] },
        noindex: { count: 11 },
      },
      populationManifestSha256: MANIFEST_HASH,
      state: "converged",
      taxonomyApprovalHash: APPROVED_STATIC_TAXONOMY_HASH,
    })
    const bytes = serializeStaticTaxonomyConvergence(artifact)
    expect(parseStaticTaxonomyConvergence(JSON.parse(bytes))).toEqual(artifact)
    expect(
      `sha256:${createHash("sha256").update(bytes).digest("hex")}`
    ).toMatch(SHA256)
  })

  it("rejects non-GO inputs and any policy or schema drift", () => {
    expect(() =>
      convergenceFromPopulationArtifact(
        { ...fixture(), cutoverStatus: "NO_GO" },
        provenance
      )
    ).toThrow("population artifact is not converged")

    const approved = convergenceFromPopulationArtifact(fixture(), provenance)
    expect(() =>
      parseStaticTaxonomyConvergence({
        ...approved,
        policy: {
          ...approved.policy,
          noindex: { count: 10, routeKeys: approved.policy.noindex.routeKeys },
        },
      })
    ).toThrow("policy.noindex does not match the approved route set")
    expect(() =>
      parseStaticTaxonomyConvergence({ ...approved, extra: true })
    ).toThrow("convergence artifact has unexpected keys")
  })

  it("writes only the fixed gate path with exclusive deterministic bytes", async () => {
    const root = await mkdtemp(join(tmpdir(), "ro-static-convergence-"))
    try {
      const artifact = convergenceFromPopulationArtifact(fixture(), provenance)
      const path = await writeStaticTaxonomyConvergence(root, artifact)
      expect(path).toBe(join(root, "urlr/static-taxonomy-convergence.json"))
      expect(await readFile(path, "utf8")).toBe(
        serializeStaticTaxonomyConvergence(artifact)
      )
      await expect(
        writeStaticTaxonomyConvergence(root, artifact)
      ).rejects.toMatchObject({ code: "EEXIST" })
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})

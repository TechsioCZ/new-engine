import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { parseUrlrConvergenceCliOptions } from "./urlr-convergence-cli"
import {
  hashUrlrConvergenceImportPlanValue,
  parseUrlrConvergenceImportPlan,
} from "./urlr-convergence-import-plan"

describe("URLR convergence CLI options", () => {
  it("requires every release-bound input and resolves artifact paths", () => {
    expect(
      parseUrlrConvergenceCliOptions([
        "--import-plan",
        "plan.json",
        "--population-manifest",
        "population.json",
        "--static-taxonomy-convergence",
        "taxonomy.json",
        "--release-id",
        "ro-demo-20260820",
        "--generated-at",
        "2026-08-20T18:00:00.000Z",
        "--output",
        "proof.json",
      ])
    ).toEqual({
      generatedAt: "2026-08-20T18:00:00.000Z",
      importPlanPath: resolve("plan.json"),
      outputPath: resolve("proof.json"),
      populationManifestPath: resolve("population.json"),
      releaseId: "ro-demo-20260820",
      staticTaxonomyConvergencePath: resolve("taxonomy.json"),
    })
  })

  it("rejects missing, duplicate, and unknown arguments before any I/O", () => {
    expect(() => parseUrlrConvergenceCliOptions([])).toThrow(
      "--import-plan is required"
    )
    expect(() =>
      parseUrlrConvergenceCliOptions([
        "--release-id",
        "one",
        "--release-id",
        "two",
      ])
    ).toThrow("duplicate argument")
    expect(() =>
      parseUrlrConvergenceCliOptions(["--database-url", "secret"])
    ).toThrow("Unknown")
  })

  it("parses a locally hash-bound nested importer scope", () => {
    const scope = {
      brandExcludedIds: [],
      brandIds: ["brand_1"],
      categoryExcludedIds: [],
      categoryPublishedIds: ["category_1"],
      collectionIds: [],
      productExcludedIds: [],
      productPublishedIds: ["product_1"],
    }
    const plan = {
      scope,
      scopeSha256: hashUrlrConvergenceImportPlanValue(scope),
      summary: { products: 1 },
    }
    const artifact = {
      plan,
      planHash: hashUrlrConvergenceImportPlanValue(plan),
      schemaVersion: 1,
    }
    expect(parseUrlrConvergenceImportPlan(artifact)).toEqual({
      hash: plan.scopeSha256,
      planHash: artifact.planHash,
      scope,
    })
    expect(() =>
      parseUrlrConvergenceImportPlan({
        ...artifact,
        plan: { ...plan, summary: { products: 2 } },
      })
    ).toThrow("plan hash does not match")
  })

  it("has no runtime or type dependency on the Medusa application tree", async () => {
    const sources = await Promise.all(
      [
        "./urlr-convergence-cli.ts",
        "./urlr-convergence-contract.ts",
        "./urlr-convergence-identity.ts",
        "./urlr-convergence-import-plan.ts",
      ].map((path) => readFile(new URL(path, import.meta.url), "utf8"))
    )
    expect(sources.join("\n")).not.toContain("medusa-be")
    expect(sources.join("\n")).not.toContain('from "./cutover-receipt.mjs"')
  })
})

import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { parseUrlrConvergenceCliOptions } from "./urlr-convergence-cli"

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
})

import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { buildSegmentRegistryPublicationArtifacts } from "../../../scripts/segment-registry-publication/build"
import {
  canonicalPublicationJson,
  getStaticRoutePublicationDecision,
  parseSegmentRegistryPublicationArtifact,
} from "./segment-registry-publication"
import {
  parsedPublicationPlanFixture as parsedPlan,
  publicationFixtureSha as sha,
} from "./segment-registry-publication.fixture"
import { loadStaticRoutePublicationDecision } from "./segment-registry-publication.server"

const directories: string[] = []

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true }))
  )
})

describe("segment-registry G1 publication", () => {
  it("builds and parses exact market artifacts for every indexable root route", () => {
    const builds = buildSegmentRegistryPublicationArtifacts(
      parsedPlan(),
      "/private/market-static-content-plan.json"
    )
    expect(builds.map(({ market }) => market)).toEqual(["cz", "hu", "ro", "sk"])
    expect(builds.map(({ artifact }) => artifact.routes.length)).toEqual([
      8, 8, 2, 8,
    ])
    for (const build of builds) {
      const parsed = parseSegmentRegistryPublicationArtifact(
        build.canonicalJson
      )
      expect(parsed).toEqual({ artifact: build.artifact, sha256: build.sha256 })
      expect(build.canonicalJson.endsWith("\n")).toBe(true)
    }
  })

  it("rejects missing route evidence and cross-market/hash substitutions", () => {
    const original = parsedPlan()
    const source = {
      ...original,
      plan: {
        ...original.plan,
        operations: original.plan.operations.filter(
          ({ entityKey }) => entityKey !== "cz:about:about"
        ),
      },
    }
    expect(() =>
      buildSegmentRegistryPublicationArtifacts(source, "/private/plan.json")
    ).toThrow("cz:about:about")

    const built = buildSegmentRegistryPublicationArtifacts(
      parsedPlan(),
      "/private/plan.json"
    )[0].artifact
    const tampered = JSON.parse(JSON.stringify(built))
    tampered.routes[0].editorialApproval.artifactSha256 = sha("9")
    expect(() =>
      parseSegmentRegistryPublicationArtifact(
        canonicalPublicationJson(tampered)
      )
    ).toThrow("market/hash bound")
  })

  it("fails closed for missing/foreign approvals but exempts noindex routes", () => {
    const artifact = buildSegmentRegistryPublicationArtifacts(
      parsedPlan(),
      "/private/plan.json"
    )[0].artifact
    expect(
      getStaticRoutePublicationDecision({
        artifact,
        market: "cz",
        routeKey: "about",
      })
    ).toMatchObject({ kind: "approved" })
    expect(
      getStaticRoutePublicationDecision({
        artifact,
        market: "sk",
        routeKey: "about",
      })
    ).toEqual({ kind: "rejected", reason: "market-mismatch" })
    expect(
      getStaticRoutePublicationDecision({
        artifact: null,
        market: "cz",
        routeKey: "about",
      })
    ).toEqual({ kind: "rejected", reason: "artifact-unavailable" })
    expect(
      getStaticRoutePublicationDecision({
        artifact: null,
        market: "ro",
        routeKey: "contact",
      })
    ).toEqual({ kind: "not-required", reason: "route-not-indexable" })
  })

  it("loads exact private market files and rejects absent evidence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "segment-registry-g1-"))
    directories.push(directory)
    const build = buildSegmentRegistryPublicationArtifacts(
      parsedPlan(),
      "/private/plan.json"
    ).find(({ market }) => market === "sk")
    if (!build) {
      throw new Error("missing SK test build")
    }
    await writeFile(join(directory, "sk.json"), build.canonicalJson)
    const environment = { HERBATIKA_SEGMENT_REGISTRY_G1_DIR: directory }
    await expect(
      loadStaticRoutePublicationDecision(
        { market: "sk", routeKey: "about" },
        environment
      )
    ).resolves.toMatchObject({ kind: "approved" })
    await expect(
      loadStaticRoutePublicationDecision(
        { market: "hu", routeKey: "about" },
        environment
      )
    ).resolves.toEqual({ kind: "rejected", reason: "artifact-unavailable" })
    await expect(
      loadStaticRoutePublicationDecision(
        { market: "ro", routeKey: "contact" },
        {}
      )
    ).resolves.toEqual({ kind: "not-required", reason: "route-not-indexable" })
  })
})

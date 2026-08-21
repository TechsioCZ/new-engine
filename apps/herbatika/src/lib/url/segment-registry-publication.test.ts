import {
  chmod,
  link,
  mkdir,
  mkdtemp,
  realpath,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  canonicalStaticContentJson,
  hashStaticContentBytes,
} from "../../../scripts/market-static-content/primitives"
import { STATIC_CONTENT_POLICY_VERSIONS } from "../../../scripts/market-static-content/types"
import { buildSegmentRegistryPublicationArtifacts } from "../../../scripts/segment-registry-publication/build"
import {
  canonicalPublicationJson,
  getStaticRoutePublicationDecision,
  parseSegmentRegistryPublicationArtifact,
} from "./segment-registry-publication"
import { assertReviewedStaticRouteSource } from "./segment-registry-publication/reviewed-source.server"
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
    const artifactRoot = await realpath(
      await mkdtemp(join(tmpdir(), "static-artifacts-"))
    )
    directories.push(artifactRoot)
    const directory = join(artifactRoot, "segment-registry-g1")
    await mkdir(directory, { mode: 0o700 })
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

  it("rejects unsafe roots and linked G1 artifacts", async () => {
    const artifactRoot = await realpath(
      await mkdtemp(join(tmpdir(), "static-artifacts-"))
    )
    directories.push(artifactRoot)
    const publicationDirectory = join(artifactRoot, "segment-registry-g1")
    await mkdir(publicationDirectory, { mode: 0o700 })
    const build = buildSegmentRegistryPublicationArtifacts(
      parsedPlan(),
      "/private/plan.json"
    ).find(({ market }) => market === "sk")
    if (!build) {
      throw new Error("missing SK test build")
    }
    const targetPath = join(artifactRoot, "sk-target.json")
    const publicationPath = join(publicationDirectory, "sk.json")
    await writeFile(targetPath, build.canonicalJson, { mode: 0o600 })
    const load = (directory = publicationDirectory) =>
      loadStaticRoutePublicationDecision(
        { market: "sk", routeKey: "about" },
        { HERBATIKA_SEGMENT_REGISTRY_G1_DIR: directory }
      )

    await chmod(artifactRoot, 0o777)
    await expect(load()).resolves.toEqual({
      kind: "rejected",
      reason: "artifact-unavailable",
    })
    await chmod(artifactRoot, 0o700)

    await chmod(publicationDirectory, 0o777)
    await expect(load()).resolves.toEqual({
      kind: "rejected",
      reason: "artifact-unavailable",
    })
    await chmod(publicationDirectory, 0o700)

    const publicationAlias = join(artifactRoot, "segment-registry-g1-alias")
    await symlink(publicationDirectory, publicationAlias)
    await expect(load(publicationAlias)).resolves.toEqual({
      kind: "rejected",
      reason: "artifact-unavailable",
    })
    await expect(
      load(`${publicationDirectory}/../segment-registry-g1`)
    ).resolves.toEqual({
      kind: "rejected",
      reason: "artifact-unavailable",
    })

    const getuidDescriptor = Object.getOwnPropertyDescriptor(process, "getuid")
    if (!getuidDescriptor) {
      throw new Error("process.getuid descriptor is unavailable")
    }
    Object.defineProperty(process, "getuid", {
      ...getuidDescriptor,
      value: undefined,
    })
    try {
      await expect(load()).resolves.toEqual({
        kind: "rejected",
        reason: "artifact-unavailable",
      })
    } finally {
      Object.defineProperty(process, "getuid", getuidDescriptor)
    }

    await writeFile(publicationPath, build.canonicalJson, { mode: 0o600 })
    await chmod(publicationPath, 0o666)
    await expect(load()).resolves.toEqual({
      kind: "rejected",
      reason: "artifact-unavailable",
    })
    await unlink(publicationPath)

    await symlink(targetPath, publicationPath)
    await expect(load()).resolves.toEqual({
      kind: "rejected",
      reason: "artifact-unavailable",
    })
    await unlink(publicationPath)

    await link(targetPath, publicationPath)
    await expect(load()).resolves.toEqual({
      kind: "rejected",
      reason: "artifact-unavailable",
    })
  })

  it("binds rendered bytes through the approved artifact and payload hashes", async () => {
    const artifactRoot = await realpath(
      await mkdtemp(join(tmpdir(), "static-artifacts-"))
    )
    directories.push(artifactRoot)
    const publicationDirectory = join(artifactRoot, "segment-registry-g1")
    const payloadDirectory = join(
      artifactRoot,
      "market-static-content",
      "sk",
      "payload"
    )
    await mkdir(publicationDirectory)
    await mkdir(payloadDirectory, { recursive: true })

    const renderedSource = { hero: { title: "O nás" } }
    const payloadRaw = canonicalStaticContentJson(renderedSource)
    const artifactRaw = canonicalStaticContentJson({
      contentKind: "about",
      entryId: "about",
      kind: "market-static-content",
      locale: "sk-SK",
      market: "sk",
      payload: {
        kind: "market-static-content-reviewed-payload",
        mediaType: "application/json",
        ref: "market-static-content/sk/payload/about.json",
        sha256: hashStaticContentBytes(payloadRaw),
      },
      policyVersions: STATIC_CONTENT_POLICY_VERSIONS,
      provenance: "reviewed-official-source",
      schemaVersion: 1,
      segmentRegistrySha256: sha("e"),
      source: {
        rawSnapshotSha256: sha("1"),
        retrievedAt: "2026-08-20T10:00:00.000Z",
        url: "https://www.herbatica.sk/o-nas/",
      },
    })
    await writeFile(
      join(artifactRoot, "market-static-content", "sk", "about.json"),
      artifactRaw
    )
    await writeFile(join(payloadDirectory, "about.json"), payloadRaw)
    const publication = {
      evidence: {
        editorialApprovalReference: "SK-EDITORIAL-about",
        frozenRegistrySha256: sha("e"),
        legalApprovalReference: "SK-LEGAL-about",
        staticContentArtifactRef: "market-static-content/sk/about.json",
        staticContentArtifactSha256: hashStaticContentBytes(artifactRaw),
      },
      kind: "approved" as const,
    }
    const environment = {
      HERBATIKA_SEGMENT_REGISTRY_G1_DIR: publicationDirectory,
    }
    const sourceInput = {
      market: "sk" as const,
      pageKey: "about" as const,
      publication,
      renderedSource,
    }

    await expect(
      assertReviewedStaticRouteSource(sourceInput, environment)
    ).resolves.toBeUndefined()
    await expect(
      assertReviewedStaticRouteSource(
        {
          market: "sk",
          pageKey: "about",
          publication,
          renderedSource: { hero: { title: "Drifted" } },
        },
        environment
      )
    ).rejects.toThrow("drifted from reviewed payload")

    const artifactPath = join(
      artifactRoot,
      "market-static-content",
      "sk",
      "about.json"
    )
    const payloadPath = join(payloadDirectory, "about.json")
    await chmod(artifactPath, 0o666)
    await expect(
      assertReviewedStaticRouteSource(sourceInput, environment)
    ).rejects.toThrow()
    await chmod(artifactPath, 0o600)
    await chmod(payloadPath, 0o666)
    await expect(
      assertReviewedStaticRouteSource(sourceInput, environment)
    ).rejects.toThrow()
    await chmod(payloadPath, 0o600)

    const artifactTarget = join(artifactRoot, "artifact-target.json")
    await writeFile(artifactTarget, artifactRaw, { mode: 0o600 })
    await unlink(artifactPath)
    await symlink(artifactTarget, artifactPath)
    await expect(
      assertReviewedStaticRouteSource(sourceInput, environment)
    ).rejects.toThrow()
    await unlink(artifactPath)
    await link(artifactTarget, artifactPath)
    await expect(
      assertReviewedStaticRouteSource(sourceInput, environment)
    ).rejects.toThrow()
    await unlink(artifactPath)
    await writeFile(artifactPath, artifactRaw, { mode: 0o600 })

    const payloadTarget = join(artifactRoot, "payload-target.json")
    await writeFile(payloadTarget, payloadRaw, { mode: 0o600 })
    await unlink(payloadPath)
    await symlink(payloadTarget, payloadPath)
    await expect(
      assertReviewedStaticRouteSource(sourceInput, environment)
    ).rejects.toThrow()
    await unlink(payloadPath)
    await link(payloadTarget, payloadPath)
    await expect(
      assertReviewedStaticRouteSource(sourceInput, environment)
    ).rejects.toThrow()
  })
})

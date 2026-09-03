import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  parseMarketStaticContentApprovalArtifact,
  parseMarketStaticContentApprovalCollectionArtifact,
  parseMarketStaticContentArtifact,
  parseMarketStaticContentCollectionArtifact,
} from "./artifact-contract"
import {
  parseMarketStaticContentCliArgs,
  runMarketStaticContentCli,
} from "./cli"
import { parseMarketStaticContentManifest } from "./manifest"
import { buildMarketStaticContentPlan } from "./plan"
import { parseMarketStaticContentPlan } from "./plan-parser"
import {
  canonicalStaticContentJson,
  hashStaticContentBytes,
} from "./primitives"
import {
  STATIC_CONTENT_KINDS,
  STATIC_CONTENT_LOCALE_BY_MARKET,
  STATIC_CONTENT_MARKETS,
  STATIC_CONTENT_POLICY_VERSIONS,
  type StaticContentKind,
  type StaticContentMarket,
} from "./types"
import { writeStaticContentPlanNoClobber } from "./writer"

const testDirectories: string[] = []
const sha = (character: string) => character.repeat(64)
const COPY_FIELD = /"(?:body|html|text|copy)"/
const artifactCharacter: Record<StaticContentMarket, string> = {
  cz: "a",
  hu: "b",
  ro: "c",
  sk: "d",
}
const sourceHosts: Record<StaticContentMarket, string> = {
  cz: "www.herbatica.cz",
  hu: "www.herbatica.hu",
  ro: "www.herbatica.ro",
  sk: "www.herbatica.sk",
}

const entry = (
  market: StaticContentMarket,
  contentKind: StaticContentKind,
  suffix = ""
) => {
  const id = `${contentKind}${suffix}`
  const artifactSha256 = sha(artifactCharacter[market])
  const rawSnapshotSha256 = sha(contentKind === "about" ? "1" : "2")
  const approval = (role: "EDITORIAL" | "LEGAL") => ({
    approvalArtifact: {
      kind: `market-static-content-${role.toLowerCase()}-approval`,
      mediaType: "application/json",
      ref: `market-static-content/${market}/approvals/${role.toLowerCase()}/${id}.json`,
      sha256: sha(role === "EDITORIAL" ? "3" : "4"),
    },
    approvedAt: "2026-08-20T12:00:00.000Z",
    approvedBy: `${role.toLowerCase()}-reviewer`,
    artifactSha256,
    reference: `${market.toUpperCase()}-${role}-${id}`,
    sourceSnapshotSha256: rawSnapshotSha256,
    status: "approved",
  })
  return {
    approvals: {
      editorial: approval("EDITORIAL"),
      legal: approval("LEGAL"),
    },
    artifact: {
      kind: "market-static-content",
      mediaType: "application/json",
      ref: `market-static-content/${market}/${id}.json`,
      sha256: artifactSha256,
    },
    contentKind,
    id,
    provenance: "reviewed-official-source",
    source: {
      rawSnapshotSha256,
      retrievedAt: "2026-08-20T10:00:00.000Z",
      url: `https://${sourceHosts[market]}/${id}/`,
    },
  }
}

const manifest = (market: StaticContentMarket) => ({
  authorization: "customer-reviewed-static-content",
  capturedAt: "2026-08-20T14:00:00.000Z",
  entries: STATIC_CONTENT_KINDS.map((kind) => entry(market, kind)),
  kind: "market-static-content-source-manifest",
  locale: STATIC_CONTENT_LOCALE_BY_MARKET[market],
  market,
  marketArtifacts: {
    editorialApproval: {
      kind: "market-static-content-editorial-approval-collection",
      mediaType: "application/json",
      ref: `market-static-content/${market}/approvals/editorial.json`,
      sha256: sha("6"),
    },
    legalApproval: {
      kind: "market-static-content-legal-approval-collection",
      mediaType: "application/json",
      ref: `market-static-content/${market}/approvals/legal.json`,
      sha256: sha("7"),
    },
    staticContent: {
      kind: "market-static-content-collection",
      mediaType: "application/json",
      ref: `market-static-content/${market}/static-content.json`,
      sha256: sha("8"),
    },
  },
  operatorContactAuthority: {
    editorialApprovalReference: `${market.toUpperCase()}-EDITORIAL-operator-identity`,
    entryId: "operator-identity",
    fieldCoverage: {
      email: "approved",
      "legal-entity": "approved",
      phone: "approved",
      "social-ids": "approved",
      "support-origin": "approved",
    },
    legalApprovalReference: `${market.toUpperCase()}-LEGAL-operator-identity`,
    market,
  },
  provenance: "reviewed-official-source",
  schemaVersion: 1,
  segmentRegistry: {
    kind: "market-route-segment-registry",
    ref: "market-static-content/shared/segment-registry.json",
    sha256: sha("e"),
  },
})

const sourceInputs = () =>
  STATIC_CONTENT_MARKETS.map((market) => ({
    contents: JSON.stringify(manifest(market)),
    label: `${market}.json`,
  }))

const reviewedStaticArtifact = (
  market: StaticContentMarket,
  contentKind: StaticContentKind,
  entryId = contentKind
) => ({
  contentKind,
  entryId,
  kind: "market-static-content",
  locale: STATIC_CONTENT_LOCALE_BY_MARKET[market],
  market,
  payload: {
    kind: "market-static-content-reviewed-payload",
    mediaType: "application/json",
    ref: `market-static-content/${market}/payload/${entryId}.json`,
    sha256: sha("5"),
  },
  policyVersions: STATIC_CONTENT_POLICY_VERSIONS,
  provenance: "reviewed-official-source",
  schemaVersion: 1,
  segmentRegistrySha256: sha("e"),
  source: {
    rawSnapshotSha256: sha(contentKind === "about" ? "1" : "2"),
    retrievedAt: "2026-08-20T10:00:00.000Z",
    url: `https://${sourceHosts[market]}/${entryId}/`,
  },
})

const reviewedApprovalArtifact = (
  market: StaticContentMarket,
  contentKind: StaticContentKind,
  role: "editorial" | "legal",
  entryId = contentKind
) => ({
  approvedAt: "2026-08-20T12:00:00.000Z",
  approvedBy: `${role}-reviewer`,
  contentKind,
  entryId,
  kind: `market-static-content-${role}-approval`,
  locale: STATIC_CONTENT_LOCALE_BY_MARKET[market],
  market,
  reference: `${market.toUpperCase()}-${role.toUpperCase()}-${entryId}`,
  schemaVersion: 1,
  status: "approved",
  subject: {
    policyVersions: STATIC_CONTENT_POLICY_VERSIONS,
    segmentRegistrySha256: sha("e"),
    sourceSnapshotSha256: sha(contentKind === "about" ? "1" : "2"),
    staticContentArtifactRef: `market-static-content/${market}/${entryId}.json`,
    staticContentArtifactSha256: sha(artifactCharacter[market]),
  },
})

const staticCollection = (market: StaticContentMarket) => ({
  entries: STATIC_CONTENT_KINDS.map((contentKind) => ({
    contentKind,
    entryId: contentKind,
    payloadRef: `market-static-content/${market}/payload/${contentKind}.json`,
    payloadSha256: sha("5"),
    ref: `market-static-content/${market}/${contentKind}.json`,
    sha256: sha(artifactCharacter[market]),
  })),
  kind: "market-static-content-collection",
  locale: STATIC_CONTENT_LOCALE_BY_MARKET[market],
  market,
  policyVersions: STATIC_CONTENT_POLICY_VERSIONS,
  ready: true,
  schemaVersion: 1,
  segmentRegistrySha256: sha("e"),
})

const approvalCollection = (
  market: StaticContentMarket,
  role: "editorial" | "legal"
) => ({
  entries: STATIC_CONTENT_KINDS.map((contentKind) => ({
    contentKind,
    entryId: contentKind,
    ref: `market-static-content/${market}/approvals/${role}/${contentKind}.json`,
    sha256: sha(role === "editorial" ? "3" : "4"),
    sourceSnapshotSha256: sha(contentKind === "about" ? "1" : "2"),
    staticContentArtifactRef: `market-static-content/${market}/${contentKind}.json`,
    staticContentArtifactSha256: sha(artifactCharacter[market]),
  })),
  kind: `market-static-content-${role}-approval-collection`,
  locale: STATIC_CONTENT_LOCALE_BY_MARKET[market],
  market,
  policyVersions: STATIC_CONTENT_POLICY_VERSIONS,
  ready: true,
  schemaVersion: 1,
  segmentRegistrySha256: sha("e"),
})

afterEach(async () => {
  await Promise.all(
    testDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  )
})

describe("market static-content authority", () => {
  it("parses canonical copy-free static and approval artifact envelopes", () => {
    const staticArtifact = canonicalStaticContentJson(
      reviewedStaticArtifact("ro", "operator-identity")
    )
    const legalApproval = canonicalStaticContentJson(
      reviewedApprovalArtifact("ro", "operator-identity", "legal")
    )

    expect(parseMarketStaticContentArtifact(staticArtifact)).toMatchObject({
      contentKind: "operator-identity",
      market: "ro",
      policyVersions: STATIC_CONTENT_POLICY_VERSIONS,
    })
    expect(
      parseMarketStaticContentApprovalArtifact(legalApproval, "legal")
    ).toMatchObject({
      kind: "market-static-content-legal-approval",
      market: "ro",
    })
    expect(staticArtifact).not.toMatch(COPY_FIELD)
  })

  it("rejects wrong approval roles and stale legal policy versions", () => {
    const approval = reviewedApprovalArtifact("cz", "cms-legal", "legal")
    expect(() =>
      parseMarketStaticContentApprovalArtifact(
        canonicalStaticContentJson(approval),
        "editorial"
      )
    ).toThrow("identity")

    const staleApproval = JSON.parse(JSON.stringify(approval))
    staleApproval.subject.policyVersions.checkoutConsent = "2026-08-20"
    expect(() =>
      parseMarketStaticContentApprovalArtifact(
        canonicalStaticContentJson(staleApproval),
        "legal"
      )
    ).toThrow("frozen runtime policy versions")

    const generatedApproval = reviewedApprovalArtifact(
      "cz",
      "cms-legal",
      "legal"
    )
    generatedApproval.approvedBy = "demo-generated-unreviewed"
    expect(() =>
      parseMarketStaticContentApprovalArtifact(
        canonicalStaticContentJson(generatedApproval),
        "legal"
      )
    ).toThrow("demo-generated or unreviewed")
  })

  it("parses exhaustive per-market aggregate artifacts", () => {
    expect(
      parseMarketStaticContentCollectionArtifact(
        canonicalStaticContentJson(staticCollection("hu"))
      )
    ).toMatchObject({ market: "hu", ready: true })
    expect(
      parseMarketStaticContentApprovalCollectionArtifact(
        canonicalStaticContentJson(approvalCollection("hu", "legal")),
        "legal"
      )
    ).toMatchObject({
      kind: "market-static-content-legal-approval-collection",
      market: "hu",
      ready: true,
    })

    const incomplete = staticCollection("hu")
    incomplete.entries = incomplete.entries.filter(
      ({ contentKind }) => contentKind !== "faq"
    )
    expect(() =>
      parseMarketStaticContentCollectionArtifact(
        canonicalStaticContentJson(incomplete)
      )
    ).toThrow("faq coverage")
  })

  it("builds a deterministic four-market readiness plan without copy", () => {
    const inputs = sourceInputs()
    const first = buildMarketStaticContentPlan(inputs)
    const second = buildMarketStaticContentPlan([...inputs].reverse())

    expect(first).toEqual(second)
    expect(first.plan.readiness.ready).toBe(true)
    expect(first.plan.operations).toHaveLength(28)
    expect(first.canonicalJson.endsWith("\n")).toBe(true)
    expect(first.canonicalJson).not.toMatch(COPY_FIELD)
    for (const market of first.plan.readiness.markets) {
      expect(Object.values(market.counts)).toEqual([1, 1, 1, 1, 1, 1, 1])
    }
  })

  it("rejects locale and official-source cross-market substitutions", () => {
    const wrongLocale = manifest("cz")
    wrongLocale.locale = "ro-RO" as typeof wrongLocale.locale
    expect(() =>
      parseMarketStaticContentManifest(JSON.stringify(wrongLocale))
    ).toThrow("locale")

    const wrongSource = manifest("cz")
    wrongSource.entries[0] = {
      ...wrongSource.entries[0],
      source: {
        ...wrongSource.entries[0].source,
        url: "https://www.herbatica.ro/o-nas/",
      },
    }
    expect(() =>
      parseMarketStaticContentManifest(JSON.stringify(wrongSource))
    ).toThrow("official cz source")
  })

  it("rejects cross-market artifact refs and approval hash tampering", () => {
    const wrongRef = manifest("hu")
    wrongRef.entries[0].artifact.ref = "market-static-content/sk/about.json"
    expect(() =>
      parseMarketStaticContentManifest(JSON.stringify(wrongRef))
    ).toThrow("artifact.ref")

    const wrongApproval = manifest("ro")
    wrongApproval.entries[0].approvals.legal.artifactSha256 = sha("f")
    expect(() =>
      parseMarketStaticContentManifest(JSON.stringify(wrongApproval))
    ).toThrow("hash-bound")
  })

  it("rejects demo authority and any embedded copy field", () => {
    const unreviewed = manifest("sk")
    unreviewed.entries[0].approvals.editorial.approvedBy =
      "demo-generated-unreviewed"
    expect(() =>
      parseMarketStaticContentManifest(JSON.stringify(unreviewed))
    ).toThrow("demo-generated or unreviewed")

    const withCopy = manifest("sk") as ReturnType<typeof manifest> & {
      body?: string
    }
    withCopy.body = "forbidden"
    expect(() =>
      parseMarketStaticContentManifest(JSON.stringify(withCopy))
    ).toThrow("invalid fields")
  })

  it("requires market-bound reviewed operator contact coverage", () => {
    const crossMarket = manifest("cz")
    crossMarket.operatorContactAuthority.market = "sk"
    expect(() =>
      parseMarketStaticContentManifest(JSON.stringify(crossMarket))
    ).toThrow("market does not match")

    const incomplete = manifest("cz")
    incomplete.operatorContactAuthority.fieldCoverage.phone = "pending"
    expect(() =>
      parseMarketStaticContentManifest(JSON.stringify(incomplete))
    ).toThrow("phone must be approved")
  })

  it("requires exhaustive kind coverage and singleton authority", () => {
    const missing = manifest("cz")
    missing.entries = missing.entries.filter(
      ({ contentKind }) => contentKind !== "faq"
    )
    expect(() =>
      parseMarketStaticContentManifest(JSON.stringify(missing))
    ).toThrow("faq coverage")

    const duplicate = manifest("cz")
    duplicate.entries.push(entry("cz", "about", "-second"))
    expect(() =>
      parseMarketStaticContentManifest(JSON.stringify(duplicate))
    ).toThrow("about coverage")
  })

  it("binds the plan to exact source-manifest bytes", () => {
    const inputs = sourceInputs()
    const first = buildMarketStaticContentPlan(inputs)
    const tampered = inputs.map((input, index) =>
      index === 0 ? { ...input, contents: `${input.contents}\n` } : input
    )
    const second = buildMarketStaticContentPlan(tampered)

    expect(second.plan.sourceManifests[0].manifestSha256).not.toBe(
      first.plan.sourceManifests[0].manifestSha256
    )
    expect(second.plan.planSha256).not.toBe(first.plan.planSha256)
  })

  it("rejects mixing authorities from different route registries", () => {
    const inputs = sourceInputs()
    const changed = JSON.parse(inputs[0].contents)
    changed.segmentRegistry.sha256 = sha("f")
    inputs[0] = { ...inputs[0], contents: JSON.stringify(changed) }

    expect(() => buildMarketStaticContentPlan(inputs)).toThrow(
      "different route registries"
    )
  })

  it("strictly parses canonical plans and rejects recomputed cross-market tampering", () => {
    const build = buildMarketStaticContentPlan(sourceInputs())
    expect(parseMarketStaticContentPlan(build.canonicalJson)).toEqual({
      plan: build.plan,
      sha256: build.sha256,
    })

    const tampered = JSON.parse(build.canonicalJson)
    tampered.operations[0].artifact.ref = "market-static-content/sk/about.json"
    const { planSha256: _ignored, ...withoutPlanHash } = tampered
    tampered.planSha256 = hashStaticContentBytes(
      canonicalStaticContentJson(withoutPlanHash)
    )
    expect(() =>
      parseMarketStaticContentPlan(canonicalStaticContentJson(tampered))
    ).toThrow("artifact identity")
  })
})

describe("market static-content CLI", () => {
  it("rejects apply, duplicate inputs, incomplete scope, and input overwrite", () => {
    expect(() => parseMarketStaticContentCliArgs(["--apply"])).toThrow(
      "unknown"
    )
    expect(() =>
      parseMarketStaticContentCliArgs([
        "--manifest",
        "cz.json",
        "--output",
        "out.json",
      ])
    ).toThrow("exactly four")
    expect(() =>
      parseMarketStaticContentCliArgs([
        "--manifest",
        "same.json",
        "--manifest",
        "same.json",
        "--manifest",
        "ro.json",
        "--manifest",
        "sk.json",
        "--output",
        "out.json",
      ])
    ).toThrow("unique")
    expect(() =>
      parseMarketStaticContentCliArgs([
        "--manifest",
        "cz.json",
        "--manifest",
        "hu.json",
        "--manifest",
        "ro.json",
        "--manifest",
        "sk.json",
        "--output",
        "cz.json",
      ])
    ).toThrow("differ")
  })

  it("publishes privately and never clobbers an existing plan", async () => {
    const directory = await mkdtemp(join(tmpdir(), "market-static-content-"))
    testDirectories.push(directory)
    const output = join(directory, "plan.json")
    await writeStaticContentPlanNoClobber(output, "first\n")
    expect(await readFile(output, "utf8")).toBe("first\n")
    expect((await stat(output)).mode.toString(8).slice(-3)).toBe("600")

    await expect(
      writeStaticContentPlanNoClobber(output, "second\n")
    ).rejects.toMatchObject({ code: "EEXIST" })
    expect(await readFile(output, "utf8")).toBe("first\n")
  })

  it("runs end-to-end and writes the canonical readiness plan", async () => {
    const directory = await mkdtemp(join(tmpdir(), "market-static-content-"))
    testDirectories.push(directory)
    const paths = await Promise.all(
      sourceInputs().map(async (input) => {
        const path = join(directory, input.label)
        await writeFile(path, input.contents, { mode: 0o600 })
        return path
      })
    )
    const output = join(directory, "plan.json")
    const argv = paths.flatMap((path) => ["--manifest", path])
    const result = await runMarketStaticContentCli([
      ...argv,
      "--output",
      output,
    ])

    expect(result.outputPath).toBe(resolve(output))
    expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({
      kind: "market-static-content-import-readiness-plan",
      planSha256: result.planSha256,
      readiness: { ready: true },
    })
  })
})

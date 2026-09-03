import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { parseMarketStaticContentArtifact } from "../artifact-contract"
import { canonicalStaticContentJson } from "../primitives"
import { parseDraftGeneratorCliArgs, runDraftGeneratorCli } from "./cli"
import {
  buildAllMarketStaticContentDrafts,
  buildMarketStaticContentDrafts,
} from "./generator"
import {
  parseMarketStaticContentDraftBundle,
  parseMarketStaticContentDraftPayload,
  verifyMarketStaticContentDraftBuild,
} from "./parser"
import {
  DRAFT_ENTRY_IDS,
  DRAFT_MARKETS,
  LEGAL_TEMPLATE_ENTRY_IDS,
  NON_LEGAL_DRAFT_ENTRY_IDS,
} from "./types"

const testDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    testDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  )
})

describe("market static-content draft generator", () => {
  it("builds deterministic exhaustive native-language bundles", () => {
    const first = buildAllMarketStaticContentDrafts()
    const second = buildAllMarketStaticContentDrafts()

    expect(first).toEqual(second)
    expect(first.map(({ market }) => market)).toEqual(DRAFT_MARKETS)
    for (const build of first) {
      expect(() => verifyMarketStaticContentDraftBuild(build)).not.toThrow()
      expect(build.bundle.ready).toBe(false)
      expect(build.bundle.authorization).toBe("none")
      expect(build.bundle.provenance).toBe("ai-generated-unreviewed")
      expect(build.bundle.entries.map(({ entryId }) => entryId)).toEqual(
        DRAFT_ENTRY_IDS
      )
      expect(build.files).toHaveLength(DRAFT_ENTRY_IDS.length + 1)
    }

    const titles = first.map((build) => {
      const homepage = build.files.find(({ path }) =>
        path.endsWith("/payload/homepage.json")
      )
      expect(homepage).toBeDefined()
      return parseMarketStaticContentDraftPayload(homepage?.contents ?? "")
        .content.title
    })
    expect(new Set(titles).size).toBe(3)
    expect(titles).toEqual([
      "Přírodní péče pro každý den",
      "Természetes gondoskodás a mindennapokra",
      "Îngrijire naturală pentru fiecare zi",
    ])
  })

  it("keeps non-legal copy placeholder-free and legal copy operator-fill only", () => {
    const build = buildMarketStaticContentDrafts("cz")
    for (const entryId of NON_LEGAL_DRAFT_ENTRY_IDS) {
      const file = build.files.find(({ path }) =>
        path.endsWith(`/payload/${entryId}.json`)
      )
      const payload = parseMarketStaticContentDraftPayload(file?.contents ?? "")
      expect(payload.pageType).toBe("non-legal-draft")
      expect(payload.requiredOperatorFields).toEqual([])
      expect(file?.contents).not.toContain("{{")
    }
    for (const entryId of LEGAL_TEMPLATE_ENTRY_IDS) {
      const file = build.files.find(({ path }) =>
        path.endsWith(`/payload/${entryId}.json`)
      )
      const payload = parseMarketStaticContentDraftPayload(file?.contents ?? "")
      expect(payload.pageType).toBe("operator-fill-template")
      expect(payload.requiredOperatorFields.length).toBeGreaterThan(0)
      for (const field of payload.requiredOperatorFields) {
        expect(file?.contents).toContain(`{{${field}}}`)
      }
    }
  })

  it("binds every draft to final artifact and approval contract refs", () => {
    for (const build of buildAllMarketStaticContentDrafts()) {
      for (const entry of build.bundle.entries) {
        expect(entry.target).toEqual({
          artifactRef: `market-static-content/${build.market}/${entry.entryId}.json`,
          editorialApprovalRef: `market-static-content/${build.market}/approvals/editorial/${entry.entryId}.json`,
          legalApprovalRef: `market-static-content/${build.market}/approvals/legal/${entry.entryId}.json`,
          payloadRef: `market-static-content/${build.market}/payload/${entry.entryId}.json`,
        })
      }
    }
  })

  it("cannot be parsed as reviewed authority and rejects forged readiness", () => {
    const build = buildMarketStaticContentDrafts("ro")
    const homepage = build.files.find(({ path }) =>
      path.endsWith("/payload/homepage.json")
    )
    expect(() =>
      parseMarketStaticContentArtifact(homepage?.contents ?? "")
    ).toThrow("demo-generated or unreviewed")

    const forged = { ...build.bundle, ready: true }
    expect(() =>
      parseMarketStaticContentDraftBundle(canonicalStaticContentJson(forged))
    ).toThrow("fail-closed")
  })

  it("rejects missing legal fields and payload hash tampering", () => {
    const build = buildMarketStaticContentDrafts("hu")
    const terms = build.files.find(({ path }) =>
      path.endsWith("/payload/terms.json")
    )
    const parsed = JSON.parse(terms?.contents ?? "{}")
    parsed.content.sections[0].body[0] =
      parsed.content.sections[0].body[0].replace("{{VAT_ID}}", "")
    expect(() =>
      parseMarketStaticContentDraftPayload(canonicalStaticContentJson(parsed))
    ).toThrow("exact and exhaustive")

    const tampered = {
      ...build,
      files: build.files.map((file) =>
        file.path === terms?.path
          ? { ...file, contents: `${file.contents} ` }
          : file
      ),
    }
    expect(() => verifyMarketStaticContentDraftBuild(tampered)).toThrow("hash")
  })

  it("writes private no-clobber files through the CLI", async () => {
    const directory = await mkdtemp(join(tmpdir(), "market-drafts-"))
    testDirectories.push(directory)
    const results = await runDraftGeneratorCli([
      "--market",
      "ro",
      "--output-dir",
      directory,
    ])
    expect(results).toHaveLength(1)
    expect(results[0].outputs).toHaveLength(DRAFT_ENTRY_IDS.length + 1)

    const bundlePath = join(
      directory,
      "market-static-content-drafts/ro/bundle.json"
    )
    expect(
      parseMarketStaticContentDraftBundle(await readFile(bundlePath, "utf8"))
        .ready
    ).toBe(false)
    expect((await stat(bundlePath)).mode % 0o1000).toBe(0o600)
    await expect(
      runDraftGeneratorCli(["--market", "ro", "--output-dir", directory])
    ).rejects.toMatchObject({ code: "EEXIST" })
  })

  it("parses strict market selection", () => {
    expect(
      parseDraftGeneratorCliArgs(["--output-dir", "draft-output"]).markets
    ).toEqual(DRAFT_MARKETS)
    expect(() =>
      parseDraftGeneratorCliArgs([
        "--market",
        "sk",
        "--output-dir",
        "draft-output",
      ])
    ).toThrow("unsupported")
    expect(() =>
      parseDraftGeneratorCliArgs([
        "--market",
        "cz",
        "--market",
        "cz",
        "--output-dir",
        "draft-output",
      ])
    ).toThrow("unique")
  })
})

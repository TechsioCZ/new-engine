/** biome-ignore-all lint/suspicious/noMisplacedAssertion: assertThrowsText is a helper called from test callbacks. */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import { PNG } from "pngjs"
import {
  assertUsable,
  chooseRun,
  collectActualAttachments,
  explainGhFailure,
  invalidReason,
  isPng,
  parseCli,
  planWrites,
  targetName,
  uniqueScreenshots,
} from "./pull-ci-baselines.mjs"

const SHARD = "/tmp/shard-1"

/** @param {number} [width] */
function pngBytes(width = 1) {
  return PNG.sync.write(new PNG({ width, height: 1 }))
}

/**
 * @param {string} name
 * @param {string} projectName
 * @param {{ name: string, contentType: string, path?: string }[]} attachments
 */
function testWith(name, projectName, attachments) {
  return {
    projectName,
    annotations: [{ type: "visual-story-id", description: name }],
    results: [{ status: "failed", attachments }],
  }
}

/** @param {object[]} tests */
function reportWith(tests) {
  return { suites: [{ specs: tests.map((test) => ({ tests: [test] })) }] }
}

/**
 * An entry whose bytes come from a file, as collectActualAttachments builds it.
 * @param {string} target
 * @param {string} file
 */
function entryFor(target, file) {
  return { target, projectName: "p", source: file, file, body: null }
}

/** @param {string} name @param {(dir: string) => void} body */
function withTempDir(name, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), name))
  try {
    body(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Asserts the function throws an Error whose message contains `text`.
 * @param {() => unknown} fn
 * @param {string} text
 */
function assertThrowsText(fn, text) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message.includes(text)
  )
}

describe("targetName", () => {
  it("drops the -actual suffix and adds the project and linux platform", () => {
    assert.equal(
      targetName("atoms-actionicon--playground-actual", "akros-desktop-light"),
      "atoms-actionicon--playground-akros-desktop-light-linux.png"
    )
  })

  it("rejects names that are not actual-screenshot attachments", () => {
    assertThrowsText(
      () => targetName("atoms-x--y-expected", "akros-desktop-light"),
      "Not an actual-screenshot attachment: atoms-x--y-expected"
    )
  })
})

describe("isPng", () => {
  it("accepts a real PNG", () => {
    assert.equal(isPng(pngBytes()), true)
  })

  it("rejects other bytes and short buffers", () => {
    assert.equal(isPng(Buffer.from("GIF89a-not-a-png")), false)
    assert.equal(isPng(Buffer.from([0x89, 0x50])), false)
    assert.equal(isPng(Buffer.alloc(0)), false)
  })
})

describe("collectActualAttachments", () => {
  it("maps each -actual PNG to a target and a local source under the shard", () => {
    const report = reportWith([
      testWith("button--primary", "business-desktop-light", [
        {
          name: "button--primary-actual",
          contentType: "image/png",
          path: "/app/test-results/visual-a/button-actual.png",
        },
        {
          name: "button--primary-expected",
          contentType: "image/png",
          path: "/app/test-results/visual-a/button-expected.png",
        },
        {
          name: "button--primary-diff",
          contentType: "image/png",
          path: "/app/test-results/visual-a/button-diff.png",
        },
      ]),
    ])
    assert.deepEqual(collectActualAttachments(report, SHARD), [
      {
        target: "button--primary-business-desktop-light-linux.png",
        projectName: "business-desktop-light",
        source: path.join(
          SHARD,
          "test-results",
          "visual-a",
          "button-actual.png"
        ),
        file: path.join(SHARD, "test-results", "visual-a", "button-actual.png"),
        body: null,
      },
    ])
  })

  it("decodes an inline base64 body when the report has no path", () => {
    const bytes = pngBytes(2)
    const report = reportWith([
      testWith("card--a", "n1-mobile-light", [
        {
          name: "card--a-actual",
          contentType: "image/png",
          path: null,
          body: bytes.toString("base64"),
        },
      ]),
    ])
    const [entry] = collectActualAttachments(report, SHARD)
    assert.equal(entry.target, "card--a-n1-mobile-light-linux.png")
    assert.equal(entry.file, null)
    assert.ok(entry.body?.equals(bytes))
    assert.ok(entry.source.endsWith("all.json (card--a-actual)"))
  })

  it("rejects an attachment with neither a body nor a path", () => {
    const report = reportWith([
      testWith("x--y", "akros-desktop-light", [
        { name: "x--y-actual", contentType: "image/png", path: null },
      ]),
    ])
    assertThrowsText(
      () => collectActualAttachments(report, SHARD),
      "has neither a body nor a path"
    )
  })

  it("ignores -actual attachments that are not PNG", () => {
    const report = reportWith([
      testWith("x--y", "akros-mobile-light", [
        {
          name: "x--y-actual",
          contentType: "application/json",
          path: "/app/test-results/a.json",
        },
      ]),
    ])
    assert.deepEqual(collectActualAttachments(report, SHARD), [])
  })

  it("keeps retry attempts and walks nested suites", () => {
    const report = {
      suites: [
        {
          suites: [
            {
              specs: [
                {
                  tests: [
                    {
                      projectName: "n1-desktop-light",
                      results: [
                        {
                          attachments: [
                            {
                              name: "card--a-actual",
                              contentType: "image/png",
                              path: "/app/test-results/first.png",
                            },
                          ],
                        },
                        {
                          attachments: [
                            {
                              name: "card--a-actual",
                              contentType: "image/png",
                              path: "/app/test-results/second.png",
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    const entries = collectActualAttachments(report, SHARD)
    assert.deepEqual(
      entries.map((entry) => path.basename(entry.source)),
      ["first.png", "second.png"]
    )
    assert.ok(
      entries.every(
        (entry) => entry.target === "card--a-n1-desktop-light-linux.png"
      )
    )
  })

  it("rejects an attachment path outside the container results folder", () => {
    const report = reportWith([
      testWith("x--y", "akros-desktop-light", [
        {
          name: "x--y-actual",
          contentType: "image/png",
          path: "/somewhere/else.png",
        },
      ]),
    ])
    assertThrowsText(
      () => collectActualAttachments(report, SHARD),
      "Attachment path must start with /app/test-results/"
    )
  })

  it("rejects a PNG actual attachment that has no body and no path", () => {
    const report = reportWith([
      testWith("x--y", "akros-desktop-light", [
        { name: "x--y-actual", contentType: "image/png" },
      ]),
    ])
    assertThrowsText(
      () => collectActualAttachments(report, SHARD),
      "has neither a body nor a path"
    )
  })

  it("returns nothing for a passing run with no attachments", () => {
    assert.deepEqual(collectActualAttachments({ suites: [] }, SHARD), [])
  })
})

describe("uniqueScreenshots", () => {
  it("accepts identical bytes for a repeated target", () => {
    withTempDir("pull-ci-test-", (dir) => {
      const first = path.join(dir, "first.png")
      const second = path.join(dir, "second.png")
      fs.writeFileSync(first, pngBytes(2))
      fs.writeFileSync(second, pngBytes(2))
      const screenshots = uniqueScreenshots([
        entryFor("t-linux.png", first),
        entryFor("t-linux.png", second),
      ])
      assert.equal(screenshots.size, 1)
    })
  })

  it("fails and names the target when retries differ", () => {
    withTempDir("pull-ci-test-", (dir) => {
      const first = path.join(dir, "first.png")
      const second = path.join(dir, "second.png")
      fs.writeFileSync(first, pngBytes(2))
      fs.writeFileSync(second, pngBytes(3))
      assertThrowsText(
        () =>
          uniqueScreenshots([
            entryFor("card-n1-linux.png", first),
            entryFor("card-n1-linux.png", second),
          ]),
        "Conflicting screenshots for card-n1-linux.png"
      )
    })
  })

  it("reports a missing source file clearly", () => {
    assertThrowsText(
      () =>
        uniqueScreenshots([entryFor("t-linux.png", "/nonexistent/none.png")]),
      "Missing screenshot file /nonexistent/none.png"
    )
  })
})

describe("invalidReason and assertUsable", () => {
  it("flags empty, non-PNG and undecodable files", () => {
    assert.equal(invalidReason(Buffer.alloc(0)), "empty file")
    assert.equal(invalidReason(Buffer.from("hello")), "not a PNG")
    const broken = Buffer.concat([
      pngBytes().subarray(0, 8),
      Buffer.from("garbage-after-signature"),
    ])
    assert.ok(invalidReason(broken)?.startsWith("not decodable:"))
    assert.equal(invalidReason(pngBytes()), null)
  })

  it("throws before writing anything when one screenshot is invalid", () => {
    const screenshots = new Map([
      ["good-linux.png", { projectName: "p", source: "/a", bytes: pngBytes() }],
      [
        "bad-linux.png",
        { projectName: "p", source: "/b", bytes: Buffer.from("nope") },
      ],
    ])
    assertThrowsText(
      () => assertUsable(screenshots),
      "Refusing to write: 1 invalid screenshot(s), nothing was written:"
    )
    assertThrowsText(
      () => assertUsable(screenshots),
      "bad-linux.png (/b): not a PNG"
    )
  })

  it("accepts a set where every screenshot decodes", () => {
    const screenshots = new Map([
      ["ok-linux.png", { projectName: "p", source: "/a", bytes: pngBytes() }],
    ])
    assert.doesNotThrow(() => assertUsable(screenshots))
  })
})

describe("planWrites", () => {
  it("classifies new, replacement and identical targets", () => {
    withTempDir("pull-ci-out-", (dir) => {
      const same = pngBytes(2)
      const changed = pngBytes(3)
      fs.writeFileSync(path.join(dir, "same-linux.png"), same)
      fs.writeFileSync(path.join(dir, "changed-linux.png"), pngBytes(4))
      const screenshots = new Map([
        ["same-linux.png", { projectName: "p", source: "/s", bytes: same }],
        [
          "changed-linux.png",
          { projectName: "p", source: "/c", bytes: changed },
        ],
        ["fresh-linux.png", { projectName: "q", source: "/f", bytes: same }],
      ])
      const actions = Object.fromEntries(
        planWrites(screenshots, dir).map((item) => [item.target, item.action])
      )
      assert.deepEqual(actions, {
        "same-linux.png": "unchanged",
        "changed-linux.png": "replace",
        "fresh-linux.png": "new",
      })
    })
  })
})

describe("parseCli", () => {
  it("reads a run id, the default output folder and dry run", () => {
    const options = parseCli(["42729258156", "--dry-run"])
    assert.deepEqual(options.selector, { kind: "run", id: "42729258156" })
    assert.equal(options.dryRun, true)
    assert.ok(
      options.out.endsWith(
        path.join("libs", "ui", "test", "visual.spec.ts-snapshots")
      )
    )
  })

  it("reads --pr and --branch and an explicit --out", () => {
    assert.deepEqual(parseCli(["--pr", "657", "--out", "/tmp/x"]), {
      selector: { kind: "pr", number: "657" },
      out: "/tmp/x",
      dryRun: false,
    })
    assert.deepEqual(parseCli(["--branch", "fix/x"]).selector, {
      kind: "branch",
      name: "fix/x",
    })
  })

  it("rejects no selector, two selectors, and non-numeric ids", () => {
    assertThrowsText(() => parseCli([]), "Give exactly one of")
    assertThrowsText(() => parseCli(["1", "--pr", "2"]), "Give exactly one of")
    assertThrowsText(() => parseCli(["1", "2"]), "Give exactly one of")
    assertThrowsText(() => parseCli(["abc"]), "Run id must be a number")
    assertThrowsText(() => parseCli(["--pr", "x1"]), "--pr must be a number")
  })
})

describe("chooseRun", () => {
  it("picks the newest completed run and skips running ones", () => {
    const runs = [
      { databaseId: 9, status: "in_progress", headSha: "aaa" },
      { databaseId: 8, status: "completed", headSha: "bbb" },
      { databaseId: 7, status: "completed", headSha: "ccc" },
    ]
    assert.deepEqual(chooseRun(runs, "branch x"), { id: "8", headSha: "bbb" })
  })

  it("fails when no run has completed", () => {
    assertThrowsText(
      () =>
        chooseRun(
          [{ databaseId: 1, status: "queued", headSha: "a" }],
          "branch x"
        ),
      "No completed CI run found for branch x"
    )
  })
})

describe("explainGhFailure", () => {
  it("explains a missing gh binary", () => {
    assert.ok(
      explainGhFailure({ code: "ENOENT" }).includes("gh is not installed")
    )
  })

  it("explains an unauthenticated gh", () => {
    assert.ok(
      explainGhFailure({
        stderr: "To get started with GitHub CLI, please run:  gh auth login",
      }).includes("not authenticated; run `gh auth login`")
    )
  })

  it("explains a run without artifacts", () => {
    assert.ok(
      explainGhFailure({
        stderr: "no valid artifacts found to download",
      }).includes("no ui-component-results artifacts")
    )
  })

  it("passes other gh output through", () => {
    assert.equal(
      explainGhFailure({ stderr: "could not find run\n" }),
      "gh failed: could not find run"
    )
  })
})

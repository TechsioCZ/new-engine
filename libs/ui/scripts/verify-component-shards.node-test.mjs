/** biome-ignore-all lint/suspicious/noMisplacedAssertion: assertThrowsText is a helper called from test callbacks. */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import {
  assertChangedShard,
  loadChangedShards,
  summarizeChangedShards,
  verifyShards,
} from "./verify-component-shards.mjs"

/** @param {object} stats */
function cleanReport(stats = {}) {
  return {
    errors: [],
    stats: { expected: 1, unexpected: 0, flaky: 0, ...stats },
    suites: [],
  }
}

/** @param {string} id @param {string} project @param {string} [status] */
function testEntry(id, project, status = "expected") {
  return {
    specs: [
      {
        tests: [
          {
            projectName: project,
            annotations: [{ type: "visual-story-id", description: id }],
            results: [{ status }],
          },
        ],
      },
    ],
  }
}

/**
 * Writes files relative to a fresh temp root and runs `body` with its path.
 * @param {Record<string, string>} files
 * @param {(root: string) => void} body
 */
function withShardTree(files, body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "verify-shards-"))
  try {
    for (const [name, text] of Object.entries(files)) {
      const file = path.join(root, name)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, text)
    }
    body(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
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

describe("assertChangedShard", () => {
  it("accepts a clean all.json report", () => {
    assert.doesNotThrow(() =>
      assertChangedShard({
        name: "shard-1",
        reports: [cleanReport()],
        markers: [],
      })
    )
  })

  it("accepts a none marker without a report", () => {
    assert.doesNotThrow(() =>
      assertChangedShard({
        name: "shard-2",
        reports: [],
        markers: [{ mode: "none", reason: "no stories" }],
      })
    )
  })

  it("rejects a shard with neither report nor marker", () => {
    assertThrowsText(
      () => assertChangedShard({ name: "shard-3", reports: [], markers: [] }),
      "shard-3 must contain exactly one of all.json or changed-none.json, found 0"
    )
  })

  it("rejects a shard holding both a report and a marker", () => {
    assertThrowsText(
      () =>
        assertChangedShard({
          name: "shard-4",
          reports: [cleanReport()],
          markers: [{ mode: "none" }],
        }),
      "found 2"
    )
  })

  it("rejects a marker with a mode other than none", () => {
    assertThrowsText(
      () =>
        assertChangedShard({
          name: "shard-5",
          reports: [],
          markers: [{ mode: "subset" }],
        }),
      "shard-5 has a changed-none.json with mode subset"
    )
  })

  it("rejects runner errors", () => {
    assertThrowsText(
      () =>
        assertChangedShard({
          name: "shard-6",
          reports: [{ ...cleanReport(), errors: [{ message: "boom" }] }],
          markers: [],
        }),
      "shard-6 has 1 runner errors"
    )
  })

  it("rejects unexpected failures", () => {
    assertThrowsText(
      () =>
        assertChangedShard({
          name: "shard-7",
          reports: [cleanReport({ unexpected: 2 })],
          markers: [],
        }),
      "shard-7 has 2 unexpected failures"
    )
  })

  it("rejects flaky tests", () => {
    assertThrowsText(
      () =>
        assertChangedShard({
          name: "shard-8",
          reports: [cleanReport({ flaky: 1 })],
          markers: [],
        }),
      "shard-8 has 1 flaky tests"
    )
  })

  it("accepts a clean report with zero tests", () => {
    assert.doesNotThrow(() =>
      assertChangedShard({
        name: "shard-9",
        reports: [{ errors: [], stats: {}, suites: [] }],
        markers: [],
      })
    )
  })
})

describe("summarizeChangedShards", () => {
  it("counts executed tests and distinct story ids across shards", () => {
    const shards = [
      {
        name: "a",
        reports: [
          {
            ...cleanReport(),
            suites: [
              {
                specs: [],
                suites: [
                  testEntry("button--primary", "business-desktop-light"),
                  testEntry("button--primary", "akros-desktop-light"),
                ],
              },
            ],
          },
        ],
        markers: [],
      },
      {
        name: "b",
        reports: [],
        markers: [{ mode: "none" }],
      },
    ]
    assert.deepEqual(summarizeChangedShards(shards), {
      shards: 2,
      markers: 1,
      tests: 2,
      stories: 1,
    })
  })

  it("does not count tests that never produced a result", () => {
    const report = {
      ...cleanReport(),
      suites: [
        {
          specs: [
            {
              tests: [
                {
                  annotations: [
                    { type: "visual-story-id", description: "x--y" },
                  ],
                  results: [],
                },
              ],
            },
          ],
        },
      ],
    }
    assert.deepEqual(
      summarizeChangedShards([{ name: "a", reports: [report], markers: [] }]),
      { shards: 1, markers: 0, tests: 0, stories: 0 }
    )
  })
})

describe("loadChangedShards", () => {
  it("reads one entry per shard folder, including nested report files", () => {
    withShardTree(
      {
        "ui-component-report-x-shard-1/test-results/visual-reports/all.json":
          JSON.stringify(cleanReport()),
        "ui-component-report-x-shard-2/test-results/visual-reports/changed-none.json":
          JSON.stringify({ mode: "none", reason: "no pixels" }),
      },
      (root) => {
        const shards = loadChangedShards(root)
        assert.deepEqual(
          shards.map((shard) => shard.name),
          ["ui-component-report-x-shard-1", "ui-component-report-x-shard-2"]
        )
        assert.equal(shards[0].reports.length, 1)
        assert.equal(shards[0].markers.length, 0)
        assert.equal(shards[1].reports.length, 0)
        assert.equal(shards[1].markers[0].mode, "none")
      }
    )
  })

  it("ignores plain files at the top level", () => {
    withShardTree({ "stray.json": "{}" }, (root) => {
      assert.deepEqual(loadChangedShards(root), [])
    })
  })
})

describe("verifyShards", () => {
  it("throws the usage message without a directory", () => {
    assertThrowsText(
      () => verifyShards(undefined, {}),
      "Usage: verify-component-shards.mjs"
    )
  })

  it("rejects an unknown VISUAL_SHARD_MODE", () => {
    assertThrowsText(
      () => verifyShards("/unused", { VISUAL_SHARD_MODE: "partial" }),
      "VISUAL_SHARD_MODE must be full or changed, got partial"
    )
  })

  it("passes a changed run where every shard reported or left a marker", () => {
    withShardTree(
      {
        "shard-1/all.json": JSON.stringify(cleanReport()),
        "shard-2/changed-none.json": JSON.stringify({ mode: "none" }),
      },
      (root) => {
        assert.doesNotThrow(() =>
          verifyShards(root, {
            VISUAL_SHARD_MODE: "changed",
            PLAYWRIGHT_RELEASE_SHARDS: "2",
          })
        )
      }
    )
  })

  it("fails a changed run when the shard count is short", () => {
    withShardTree(
      { "shard-1/changed-none.json": JSON.stringify({ mode: "none" }) },
      (root) => {
        assertThrowsText(
          () =>
            verifyShards(root, {
              VISUAL_SHARD_MODE: "changed",
              PLAYWRIGHT_RELEASE_SHARDS: "8",
            }),
          "Expected 8 shard folders, found 1"
        )
      }
    )
  })

  it("fails a changed run with no shard folders", () => {
    withShardTree({}, (root) => {
      assertThrowsText(
        () => verifyShards(root, { VISUAL_SHARD_MODE: "changed" }),
        "No shard folders found"
      )
    })
  })

  it("fails a changed run when a shard reports a failure", () => {
    withShardTree(
      {
        "shard-1/all.json": JSON.stringify(cleanReport({ unexpected: 1 })),
      },
      (root) => {
        assertThrowsText(
          () => verifyShards(root, { VISUAL_SHARD_MODE: "changed" }),
          "shard-1 has 1 unexpected failures"
        )
      }
    )
  })

  it("keeps the full mode strict about missing shard reports", () => {
    withShardTree(
      { "shard-1/index.json": "{}", "shard-1/all.json": "{}" },
      (root) => {
        assertThrowsText(
          () => verifyShards(root, { PLAYWRIGHT_RELEASE_SHARDS: "2" }),
          "Expected 2 shard reports, found 1"
        )
      }
    )
  })
})

/** biome-ignore-all lint/suspicious/noMisplacedAssertion: assertThrowsText is a helper called from test callbacks. */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import {
  assertChangedShard,
  loadChangedShards,
  parseShardArgs,
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

/**
 * The matrix the plan job declares and uploads as expected.json. The scope and
 * the per-group shard counts are what quality-gate verifies its collected
 * artifacts against, so a shard that never reported cannot pass as silence.
 * @param {{scope?: string, groups?: Record<string, number>, total?: number}} [overrides]
 */
function expectedPlan({ scope = "full", groups, total } = {}) {
  const declared = groups ?? (scope === "none" ? {} : { visual: 2 })
  const include = Object.entries(declared).flatMap(([group, count]) =>
    Array.from({ length: count }, (_, index) => ({
      group,
      shard: index + 1,
      total: count,
    }))
  )
  return JSON.stringify({
    scope,
    components: {
      include,
      groups: declared,
      total: total ?? include.length,
    },
    a11y: { themes: [], shards: {}, total: 0 },
  })
}

/** Artifact folder name for one shard, as ui-quality.yml uploads it. */
function shardFolder(group, index) {
  return `ui-component-report-abc1234-${group}-shard-${index}`
}

describe("parseShardArgs", () => {
  it("requires both flags", () => {
    for (const argv of [[], ["--expect"], ["--expect", "a"], ["--nope", "a"]]) {
      assertThrowsText(
        () => parseShardArgs(argv),
        "Usage: verify-component-shards.mjs --expect <expected.json> --reports <directory>"
      )
    }
    assert.deepEqual(
      parseShardArgs(["--expect", "a.json", "--reports", "dir"]),
      { expect: "a.json", reports: "dir" }
    )
  })
})

describe("verifyShards", () => {
  it("throws the usage message without both inputs", () => {
    assertThrowsText(
      () => verifyShards({}),
      "Usage: verify-component-shards.mjs"
    )
  })

  it("rejects a plan that declares an unknown scope", () => {
    withShardTree(
      { "expected.json": expectedPlan({ scope: "partial" }) },
      (root) => {
        assertThrowsText(
          () =>
            verifyShards({
              expect: path.join(root, "expected.json"),
              reports: root,
            }),
          'declares scope "partial"'
        )
      }
    )
  })

  it("rejects a plan that declares an unknown component group", () => {
    withShardTree(
      { "expected.json": expectedPlan({ groups: { rest: 1 } }) },
      (root) => {
        assertThrowsText(
          () =>
            verifyShards({
              expect: path.join(root, "expected.json"),
              reports: root,
            }),
          'declares unknown component group "rest"'
        )
      }
    )
  })

  it("rejects a plan whose total disagrees with its groups", () => {
    withShardTree(
      {
        "expected.json": expectedPlan({
          groups: { visual: 2, desktop: 2, mobile: 1 },
          total: 8,
        }),
      },
      (root) => {
        assertThrowsText(
          () =>
            verifyShards({
              expect: path.join(root, "expected.json"),
              reports: root,
            }),
          "components.total 8 but its groups add up to 5"
        )
      }
    )
  })

  it("fails when one group's shard never reported", () => {
    withShardTree(
      {
        "expected.json": expectedPlan({
          scope: "ui",
          groups: { desktop: 2 },
        }),
        [`${shardFolder("desktop", 1)}/all.json`]: JSON.stringify(
          cleanReport()
        ),
      },
      (root) => {
        assertThrowsText(
          () =>
            verifyShards({
              expect: path.join(root, "expected.json"),
              reports: root,
            }),
          "Group desktop declared 2 shards, found 1"
        )
      }
    )
  })

  it("fails when a group reported shards the plan never declared", () => {
    withShardTree(
      {
        "expected.json": expectedPlan({ scope: "ui", groups: { desktop: 1 } }),
        [`${shardFolder("desktop", 1)}/all.json`]: JSON.stringify(
          cleanReport()
        ),
        [`${shardFolder("rest", 1)}/all.json`]: JSON.stringify(cleanReport()),
      },
      (root) => {
        assertThrowsText(
          () =>
            verifyShards({
              expect: path.join(root, "expected.json"),
              reports: root,
            }),
          "Group rest reported shards that the plan did not declare"
        )
      }
    )
  })

  it("rejects an artifact folder that carries no group and index", () => {
    withShardTree(
      {
        "expected.json": expectedPlan({ scope: "ui", groups: { desktop: 1 } }),
        "ui-component-report-abc1234/all.json": JSON.stringify(cleanReport()),
      },
      (root) => {
        assertThrowsText(
          () =>
            verifyShards({
              expect: path.join(root, "expected.json"),
              reports: root,
            }),
          "does not end in -<group>-shard-<index>"
        )
      }
    )
  })

  it("passes an idle commit and fails one that reported anyway", () => {
    withShardTree(
      { "expected.json": expectedPlan({ scope: "none" }) },
      (root) => {
        assert.doesNotThrow(() =>
          verifyShards({
            expect: path.join(root, "expected.json"),
            reports: root,
          })
        )
      }
    )
    withShardTree(
      {
        "expected.json": expectedPlan({ scope: "none" }),
        [`${shardFolder("visual", 1)}/all.json`]: JSON.stringify(cleanReport()),
      },
      (root) => {
        assertThrowsText(
          () =>
            verifyShards({
              expect: path.join(root, "expected.json"),
              reports: root,
            }),
          "Group visual reported shards that the plan did not declare"
        )
      }
    )
  })

  it("passes a changed run where every shard reported or left a marker", () => {
    withShardTree(
      {
        "expected.json": expectedPlan({
          scope: "ui",
          groups: { visual: 1, desktop: 2, mobile: 1 },
        }),
        [`${shardFolder("visual", 1)}/all.json`]: JSON.stringify(cleanReport()),
        [`${shardFolder("desktop", 1)}/all.json`]: JSON.stringify(
          cleanReport()
        ),
        [`${shardFolder("desktop", 2)}/changed-none.json`]: JSON.stringify({
          mode: "none",
        }),
        [`${shardFolder("mobile", 1)}/changed-none.json`]: JSON.stringify({
          mode: "none",
        }),
      },
      (root) => {
        assert.doesNotThrow(() =>
          verifyShards({
            expect: path.join(root, "expected.json"),
            reports: root,
          })
        )
      }
    )
  })

  it("fails a changed run when a shard reports a failure", () => {
    withShardTree(
      {
        "expected.json": expectedPlan({ scope: "ui", groups: { visual: 1 } }),
        [`${shardFolder("visual", 1)}/all.json`]: JSON.stringify(
          cleanReport({ unexpected: 1 })
        ),
      },
      (root) => {
        assertThrowsText(
          () =>
            verifyShards({
              expect: path.join(root, "expected.json"),
              reports: root,
            }),
          "shard-1 has 1 unexpected failures"
        )
      }
    )
  })

  it("keeps the full mode strict about missing shard reports", () => {
    withShardTree(
      {
        "expected.json": expectedPlan({ groups: { visual: 2 } }),
        [`${shardFolder("visual", 1)}/index.json`]: "{}",
        [`${shardFolder("visual", 1)}/all.json`]: "{}",
        [`${shardFolder("visual", 2)}/index.json`]: "{}",
      },
      (root) => {
        assertThrowsText(
          () =>
            verifyShards({
              expect: path.join(root, "expected.json"),
              reports: root,
            }),
          "Expected 2 shard reports, found 1"
        )
      }
    )
  })
})

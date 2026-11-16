import assert from "node:assert/strict"
import path from "node:path"
import { describe, it } from "node:test"
import {
  baseDiskError,
  buildManifestEntries,
  cacheKeepFrom,
  cacheKey,
  cachePathsFor,
  childEnv,
  defaultWorkers,
  harnessHash,
  harnessKey,
  isBrowserMissing,
  mergeBaseError,
  needsBaseBuild,
  parseArgs,
  planBase,
  pruneCandidates,
  ranTests,
  resolveCacheRoot,
  snapshotOwner,
} from "./visual-local.mjs"

const unknownNope = /Unknown argument "--nope"/
const unknownButton = /Unknown argument "button"/
const missingBase = /Missing value for --base/
const missingStories = /Missing value for --stories/
const positiveInteger = /positive integer/
const cannotCombine = /cannot be combined/
const atLeastOne = /at least one/
const hexHash = /^[0-9a-f]{12}$/
const originRef = /origin\/master/
const gitFatal = /fatal: Not a valid object name origin\/master/
const fetchHint = /run `git fetch origin` or pass --base <ref>/
const baseDirNeeded = /needs the base Storybook directory/
const keepMessage = /VISUAL_LOCAL_CACHE_KEEP must be a positive integer/

const projectNames = ["business-desktop-light", "business-mobile-light"]
const platform = "darwin"
const badge = "atoms-badge--playground"
const avatar = "atoms-avatar--playground"
const dialog = "molecules-dialog--playground"

/**
 * @param {string} id
 * @param {string} project
 * @param {string} [suffix]
 * @param {string} [os]
 */
function file(id, project, suffix = "", os = platform) {
  return `${id}${suffix}-${project}-${os}.png`
}

describe("parseArgs", () => {
  it("uses origin/master and no flags by default", () => {
    const options = parseArgs([])
    assert.equal(options.base, "origin/master")
    assert.equal(options.all, false)
    assert.deepEqual(options.stories, [])
    assert.equal(options.workers, defaultWorkers())
    assert.equal(options.rebuildBase, false)
    assert.equal(options.dryRun, false)
  })

  it("parses every flag", () => {
    const options = parseArgs([
      "--base",
      "origin/main",
      "--stories",
      "atoms-badge--playground, atoms-avatar--playground",
      "--workers",
      "3",
      "--rebuild-base",
      "--dry-run",
    ])
    assert.equal(options.base, "origin/main")
    assert.deepEqual(options.stories, [badge, avatar])
    assert.equal(options.workers, 3)
    assert.equal(options.rebuildBase, true)
    assert.equal(options.dryRun, true)
  })

  it("accepts --all", () => {
    assert.equal(parseArgs(["--all"]).all, true)
  })

  it("rejects an unknown flag", () => {
    assert.throws(() => parseArgs(["--nope"]), unknownNope)
  })

  it("rejects a positional argument", () => {
    assert.throws(() => parseArgs(["button"]), unknownButton)
  })

  it("rejects a value flag without a value", () => {
    assert.throws(() => parseArgs(["--base"]), missingBase)
  })

  it("rejects a value flag followed by another flag", () => {
    assert.throws(() => parseArgs(["--stories", "--dry-run"]), missingStories)
  })

  it("rejects a non-positive or non-numeric worker count", () => {
    assert.throws(() => parseArgs(["--workers", "0"]), positiveInteger)
    assert.throws(() => parseArgs(["--workers", "two"]), positiveInteger)
  })

  it("rejects --all combined with --stories", () => {
    assert.throws(() => parseArgs(["--all", "--stories", badge]), cannotCombine)
  })

  it("rejects an empty story list", () => {
    assert.throws(() => parseArgs(["--stories", " , "]), atLeastOne)
  })
})

describe("defaultWorkers", () => {
  it("stays between 2 and 8", () => {
    const workers = defaultWorkers()
    assert.ok(workers >= 2 && workers <= 8, `got ${workers}`)
  })
})

describe("cacheKey", () => {
  it("combines platform, arch and Playwright version", () => {
    assert.equal(
      cacheKey({
        platform: "darwin",
        arch: "arm64",
        playwrightVersion: "1.64.0",
      }),
      "darwin-arm64-pw1.64.0"
    )
  })

  it("differs when the Playwright version differs", () => {
    const a = cacheKey({
      platform: "linux",
      arch: "x64",
      playwrightVersion: "1.63.0",
    })
    const b = cacheKey({
      platform: "linux",
      arch: "x64",
      playwrightVersion: "1.64.0",
    })
    assert.notEqual(a, b)
  })
})

describe("resolveCacheRoot", () => {
  const home = path.join("/home", "dev")

  it("uses the macOS caches folder on darwin", () => {
    assert.equal(
      resolveCacheRoot({}, "darwin", home),
      path.join(home, "Library", "Caches", "techsio-ui-visual")
    )
  })

  it("uses ~/.cache elsewhere", () => {
    assert.equal(
      resolveCacheRoot({}, "linux", home),
      path.join(home, ".cache", "techsio-ui-visual")
    )
    assert.equal(
      resolveCacheRoot({}, "win32", home),
      path.join(home, ".cache", "techsio-ui-visual")
    )
  })

  it("lets VISUAL_LOCAL_CACHE override the platform default", () => {
    const override = path.join("/tmp", "visual-cache")
    assert.equal(
      resolveCacheRoot({ VISUAL_LOCAL_CACHE: override }, "darwin", home),
      override
    )
  })
})

describe("snapshotOwner", () => {
  const storyIds = [dialog, badge]

  it("assigns a variant file to the story it was captured from", () => {
    assert.equal(
      snapshotOwner(file(dialog, projectNames[0], "--interaction-open"), {
        storyIds,
        projectNames,
        platform,
      }),
      dialog
    )
  })

  it("prefers the longest story id when one id extends another", () => {
    assert.equal(
      snapshotOwner(file("x--a-b", projectNames[0]), {
        storyIds: ["x--a", "x--a-b"],
        projectNames,
        platform,
      }),
      "x--a-b"
    )
  })

  it("does not match an id that only shares a text prefix", () => {
    assert.equal(
      snapshotOwner(file("x--ab", projectNames[0]), {
        storyIds: ["x--a"],
        projectNames,
        platform,
      }),
      null
    )
  })

  it("ignores files captured for another platform", () => {
    assert.equal(
      snapshotOwner(file(badge, projectNames[0], "", "linux"), {
        storyIds,
        projectNames,
        platform,
      }),
      null
    )
  })
})

describe("buildManifestEntries", () => {
  it("groups captured stories with their variant files and skips the rest", () => {
    const entries = buildManifestEntries({
      captured: [dialog],
      baseVisualIds: [dialog, badge],
      fileNames: [
        file(dialog, projectNames[0]),
        file(dialog, projectNames[0], "--interaction-open"),
        file(badge, projectNames[0]),
        "unrelated.png",
      ],
      projectNames,
      platform,
    })
    assert.deepEqual(entries, {
      [dialog]: [
        file(dialog, projectNames[0], "--interaction-open"),
        file(dialog, projectNames[0]),
      ].sort(),
    })
  })

  it("keeps an empty list for a captured story with no files", () => {
    assert.deepEqual(
      buildManifestEntries({
        captured: [avatar],
        baseVisualIds: [avatar],
        fileNames: [],
        projectNames,
        platform,
      }),
      { [avatar]: [] }
    )
  })
})

describe("planBase", () => {
  it("treats a story as cached only when its recorded files exist", () => {
    const plan = planBase({
      selected: [badge, avatar],
      baseVisualIds: [badge, avatar],
      projectNames,
      platform,
      existingSnapshotNames: [
        file(badge, projectNames[0]),
        file(badge, projectNames[1]),
        file(avatar, projectNames[0]),
      ],
      manifest: {
        [badge]: [file(badge, projectNames[0]), file(badge, projectNames[1])],
        [avatar]: [
          file(avatar, projectNames[0]),
          file(avatar, projectNames[1]),
        ],
      },
    })
    assert.deepEqual(plan.baseStories, [badge, avatar])
    assert.deepEqual(plan.missingBase, [avatar])
    assert.deepEqual(plan.newStories, [])
  })

  it("re-captures a story whose variant file was deleted", () => {
    const interaction = file(dialog, projectNames[0], "--interaction-open")
    const existing = [
      file(dialog, projectNames[0]),
      file(dialog, projectNames[1]),
    ]
    const plan = planBase({
      selected: [dialog],
      baseVisualIds: [dialog],
      projectNames,
      platform,
      existingSnapshotNames: existing,
      manifest: {
        [dialog]: [...existing, interaction],
      },
    })
    assert.deepEqual(plan.missingBase, [dialog])
  })

  it("re-captures a story that has no manifest entry", () => {
    const plan = planBase({
      selected: [badge],
      baseVisualIds: [badge],
      projectNames,
      platform,
      existingSnapshotNames: [
        file(badge, projectNames[0]),
        file(badge, projectNames[1]),
      ],
    })
    assert.deepEqual(plan.missingBase, [badge])
  })

  it("treats a story with only partial project coverage as missing", () => {
    const plan = planBase({
      selected: [badge],
      baseVisualIds: [badge],
      projectNames,
      platform,
      existingSnapshotNames: [file(badge, projectNames[0])],
      manifest: { [badge]: [file(badge, projectNames[0])] },
    })
    assert.deepEqual(plan.missingBase, [badge])
  })

  it("ignores snapshots captured for another platform", () => {
    const plan = planBase({
      selected: [badge],
      baseVisualIds: [badge],
      projectNames,
      platform,
      existingSnapshotNames: [
        file(badge, projectNames[0], "", "linux"),
        file(badge, projectNames[1], "", "linux"),
      ],
      manifest: { [badge]: [] },
    })
    assert.deepEqual(plan.missingBase, [badge])
  })

  it("reports selected stories absent from the base build as new", () => {
    const plan = planBase({
      selected: ["atoms-new--playground", badge],
      baseVisualIds: [badge],
      projectNames,
      platform,
      existingSnapshotNames: [],
    })
    assert.deepEqual(plan.newStories, ["atoms-new--playground"])
    assert.deepEqual(plan.baseStories, [badge])
    assert.deepEqual(plan.missingBase, [badge])
  })

  it("returns empty lists when nothing is selected", () => {
    assert.deepEqual(
      planBase({
        selected: [],
        baseVisualIds: [],
        projectNames,
        platform,
        existingSnapshotNames: [],
      }),
      { baseStories: [], newStories: [], missingBase: [] }
    )
  })
})

describe("needsBaseBuild", () => {
  const startedAt = Date.parse("2026-11-10T10:00:00.000Z")
  const before = startedAt - 60_000
  const after = startedAt + 60_000

  it("builds when no base index exists", () => {
    assert.equal(
      needsBaseBuild({
        hasIndex: false,
        rebuildBase: false,
        builtAt: null,
        startedAt,
      }),
      true
    )
  })

  it("reuses a cached base build", () => {
    assert.equal(
      needsBaseBuild({
        hasIndex: true,
        rebuildBase: false,
        builtAt: before,
        startedAt,
      }),
      false
    )
  })

  it("rebuilds on request when the build predates this run", () => {
    assert.equal(
      needsBaseBuild({
        hasIndex: true,
        rebuildBase: true,
        builtAt: before,
        startedAt,
      }),
      true
    )
    assert.equal(
      needsBaseBuild({
        hasIndex: true,
        rebuildBase: true,
        builtAt: null,
        startedAt,
      }),
      true
    )
  })

  it("skips a requested rebuild when another run published one during the wait", () => {
    assert.equal(
      needsBaseBuild({
        hasIndex: true,
        rebuildBase: true,
        builtAt: after,
        startedAt,
      }),
      false
    )
  })
})

describe("harnessHash", () => {
  const spec = { path: "test/visual.spec.ts", bytes: "spec one" }
  const helper = { path: "test/visual-shared.spec.mjs", bytes: "helper" }

  it("returns 12 lowercase hex characters", () => {
    assert.match(harnessHash([spec]), hexHash)
  })

  it("does not depend on the order of the files", () => {
    assert.equal(harnessHash([spec, helper]), harnessHash([helper, spec]))
  })

  it("changes when a file's bytes change", () => {
    assert.notEqual(
      harnessHash([spec]),
      harnessHash([{ ...spec, bytes: "spec two" }])
    )
  })

  it("changes when a file is renamed but its bytes stay the same", () => {
    assert.notEqual(
      harnessHash([spec]),
      harnessHash([{ path: "test/visual-renamed.spec.ts", bytes: spec.bytes }])
    )
  })

  it("does not confuse two splits of the same bytes across files", () => {
    assert.notEqual(
      harnessHash([
        { path: "a", bytes: "bc" },
        { path: "d", bytes: "e" },
      ]),
      harnessHash([
        { path: "a", bytes: "b" },
        { path: "cd", bytes: "e" },
      ])
    )
  })

  it("accepts Buffers as well as strings", () => {
    assert.equal(
      harnessHash([{ path: "x", bytes: Buffer.from("same") }]),
      harnessHash([{ path: "x", bytes: "same" }])
    )
  })
})

describe("harnessKey and cachePathsFor", () => {
  it("adds the harness hash to the platform key", () => {
    assert.equal(
      harnessKey({
        platform: "darwin",
        arch: "arm64",
        playwrightVersion: "1.64.0",
        harness: "0123456789ab",
      }),
      "darwin-arm64-pw1.64.0-h0123456789ab"
    )
  })

  it("keeps the build shared and the snapshots under the harness key", () => {
    const root = path.join("/cache")
    const sha = "abc123"
    const key = "darwin-arm64-pw1.64.0-h0123456789ab"
    const paths = cachePathsFor(root, sha, key)
    assert.equal(paths.buildDir, path.join(root, "builds", sha))
    assert.equal(
      paths.storybookDir,
      path.join(root, "builds", sha, "storybook-static")
    )
    assert.equal(paths.cacheDir, path.join(root, key, sha))
    assert.equal(paths.snapshotDir, path.join(root, key, sha, "snapshots"))
    assert.equal(paths.manifestPath, path.join(root, key, sha, "captured.json"))
  })

  it("gives two harnesses the same build but different snapshot dirs", () => {
    const a = cachePathsFor("/c", "sha", "k-one")
    const b = cachePathsFor("/c", "sha", "k-two")
    assert.equal(a.storybookDir, b.storybookDir)
    assert.notEqual(a.snapshotDir, b.snapshotDir)
  })
})

describe("cacheKeepFrom", () => {
  it("defaults to 5", () => {
    assert.equal(cacheKeepFrom({}), 5)
  })

  it("reads VISUAL_LOCAL_CACHE_KEEP", () => {
    assert.equal(cacheKeepFrom({ VISUAL_LOCAL_CACHE_KEEP: "2" }), 2)
  })

  it("rejects zero, negatives and non-numbers", () => {
    for (const value of ["0", "-1", "two", "1.5"]) {
      assert.throws(
        () => cacheKeepFrom({ VISUAL_LOCAL_CACHE_KEEP: value }),
        keepMessage
      )
    }
  })
})

describe("childEnv", () => {
  const polluted = {
    PATH: "/bin",
    VISUAL_BRANDS: "akros",
    VISUAL_RELEASE_READINESS: "1",
    VISUAL_CHANGED_SINCE: "main",
    VISUAL_CHANGED_FILES: "a.tsx",
    VISUAL_CHANGED_DRY_RUN: "1",
    VISUAL_CANONICAL: "1",
    TEST_STORIES: "atoms-badge--playground",
    VISUAL_STORYBOOK_STATIC_DIR: "/somewhere/else",
    VISUAL_NATIVE: "0",
    VISUAL_SNAPSHOT_DIR: "relative/dir",
  }
  const common = {
    env: polluted,
    snapshotDir: "snaps",
    storyIds: ["atoms-badge--playground"],
    port: 4321,
    workers: 2,
  }
  const storybookDir = "built/storybook-static"

  it("strips every runner variable from a compare run", () => {
    const env = childEnv({ ...common, kind: "compare" })
    assert.equal(env.VISUAL_STORYBOOK_STATIC_DIR, undefined)
    assert.equal(env.VISUAL_BRANDS, undefined)
    assert.equal(env.VISUAL_RELEASE_READINESS, undefined)
    assert.equal(env.VISUAL_CHANGED_SINCE, undefined)
    assert.equal(env.VISUAL_CHANGED_FILES, undefined)
    assert.equal(env.VISUAL_CHANGED_DRY_RUN, undefined)
    assert.equal(env.PATH, "/bin")
  })

  it("keeps VISUAL_CANONICAL for a compare run only", () => {
    assert.equal(childEnv({ ...common, kind: "compare" }).VISUAL_CANONICAL, "1")
    assert.equal(
      childEnv({ ...common, kind: "base", storybookDir }).VISUAL_CANONICAL,
      undefined
    )
  })

  it("points a compare run at the working-tree build it is given", () => {
    const env = childEnv({ ...common, kind: "compare", storybookDir })
    assert.equal(env.VISUAL_STORYBOOK_STATIC_DIR, path.resolve(storybookDir))
  })

  it("always points a base run at the base Storybook build", () => {
    const env = childEnv({ ...common, kind: "base", storybookDir })
    assert.equal(env.VISUAL_STORYBOOK_STATIC_DIR, path.resolve(storybookDir))
    assert.equal(env.VISUAL_BRANDS, undefined)
  })

  it("refuses a base run without a Storybook directory", () => {
    assert.throws(() => childEnv({ ...common, kind: "base" }), baseDirNeeded)
  })

  it("always sets VISUAL_NATIVE=1 and an absolute VISUAL_SNAPSHOT_DIR", () => {
    for (const kind of ["base", "compare"]) {
      const env = childEnv({ ...common, kind, storybookDir })
      assert.equal(env.VISUAL_NATIVE, "1")
      assert.equal(env.VISUAL_SNAPSHOT_DIR, path.resolve("snaps"))
      assert.ok(path.isAbsolute(env.VISUAL_SNAPSHOT_DIR))
    }
  })

  it("sets the story list, port and workers for the run", () => {
    const env = childEnv({ ...common, kind: "compare" })
    assert.equal(env.TEST_STORIES, "atoms-badge--playground")
    assert.equal(env.TEST_BASE_URL, "http://127.0.0.1:4321")
    assert.equal(env.PLAYWRIGHT_WORKERS, "2")
  })

  it("does not change the caller's env object", () => {
    childEnv({ ...common, kind: "compare" })
    assert.equal(polluted.VISUAL_BRANDS, "akros")
  })
})

describe("pruneCandidates", () => {
  const entries = [
    { name: "old", mtimeMs: 1 },
    { name: "newest", mtimeMs: 5 },
    { name: "mid", mtimeMs: 3 },
    { name: "recent", mtimeMs: 4 },
  ]

  it("keeps the newest N and drops the rest", () => {
    assert.deepEqual(
      pruneCandidates({ entries, keep: 2, protectedNames: [] }),
      ["mid", "old"]
    )
  })

  it("never drops protected names", () => {
    assert.deepEqual(
      pruneCandidates({ entries, keep: 1, protectedNames: ["old", "mid"] }),
      ["recent"]
    )
  })

  it("keeps entries used within the minimum age, even beyond N", () => {
    assert.deepEqual(
      pruneCandidates({
        entries,
        keep: 1,
        protectedNames: [],
        now: 10,
        minAgeMs: 7,
      }),
      ["mid", "old"]
    )
  })

  it("drops nothing when there are at most N entries", () => {
    assert.deepEqual(
      pruneCandidates({ entries, keep: 4, protectedNames: [] }),
      []
    )
  })

  it("does not mutate its input order", () => {
    const before = entries.map((entry) => entry.name)
    pruneCandidates({ entries, keep: 1, protectedNames: [] })
    assert.deepEqual(
      entries.map((entry) => entry.name),
      before
    )
  })
})

describe("baseDiskError", () => {
  const gib = 1024 ** 3

  it("returns null with at least 3 GiB free", () => {
    assert.equal(baseDiskError(3 * gib), null)
  })

  it("names the free and needed space below 3 GiB", () => {
    assert.equal(
      baseDiskError(2 * gib),
      "Not enough free disk space for the base build (2.0 GiB free, 3 GiB needed)"
    )
  })
})

describe("mergeBaseError", () => {
  it("includes git's stderr and the fetch hint", () => {
    const message = mergeBaseError(
      "origin/master",
      "fatal: Not a valid object name origin/master\n"
    )
    assert.match(message, originRef)
    assert.match(message, gitFatal)
    assert.match(message, fetchHint)
  })
})

describe("browser and test output checks", () => {
  it("recognises a missing browser executable", () => {
    assert.equal(
      isBrowserMissing(
        "browserType.launch: Executable doesn't exist at /x/chromium"
      ),
      true
    )
    assert.equal(isBrowserMissing("1 failed"), false)
  })

  it("recognises a Playwright result summary", () => {
    assert.equal(ranTests("  2 passed (4.1s)"), true)
    assert.equal(ranTests("  1 failed"), true)
    assert.equal(ranTests("Error: config file not found"), false)
  })
})

import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import { visualStories } from "../test/visual-completion.mjs"
import { buildStoryClosures } from "./visual-affected-stories.mjs"
import {
  ensureStorybookBuild,
  inputsHash,
  isBuildInput,
  storybookInputEntries,
} from "./visual-storybook-build.mjs"

const REAL_REPO = path.resolve(import.meta.dirname, "../../..")
const REAL_UI = path.join(REAL_REPO, "libs/ui")
const REAL_INDEX = path.join(REAL_UI, "storybook-static/index.json")
const REAL_SKIP = fs.existsSync(REAL_INDEX)
  ? false
  : "Storybook index.json not built"
const HEX16 = /^[0-9a-f]{16}$/
const ENTRY_ID = /^([0-9a-f]{40}|wt:[0-9a-f]{64}|deleted)$/
const BUILD_NOT_FOUND = /Storybook build not found/

/** @param {string} file */
function isFile(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile()
}

/**
 * @param {Record<string, string>} files relative to a fresh temporary directory
 * @param {(dir: string) => void} body
 */
function withStorybookDir(files, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "visual-storybook-"))
  try {
    for (const [name, text] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), text)
    }
    body(dir)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

describe("inputsHash", () => {
  it("is 16 hex characters and does not depend on entry order", () => {
    const a = { path: "libs/ui/a.tsx", id: "1" }
    const b = { path: "libs/ui/b.tsx", id: "2" }
    const hash = inputsHash([a, b])
    assert.match(hash, HEX16)
    assert.equal(inputsHash([b, a]), hash)
  })

  it("changes with any path or id", () => {
    const hash = inputsHash([{ path: "libs/ui/a.tsx", id: "1" }])
    assert.notEqual(inputsHash([{ path: "libs/ui/a.tsx", id: "2" }]), hash)
    assert.notEqual(inputsHash([{ path: "libs/ui/b.tsx", id: "1" }]), hash)
  })

  it("frames path and id so that shifting the boundary changes the hash", () => {
    assert.notEqual(
      inputsHash([{ path: "a", id: "bc" }]),
      inputsHash([{ path: "ab", id: "c" }])
    )
  })
})

describe("isBuildInput", () => {
  it("keeps sources, config, tooling and root dependency files", () => {
    for (const file of [
      "libs/ui/src/atoms/button.tsx",
      "libs/ui/.storybook/preview.ts",
      "libs/ui/stories/atoms/button.stories.tsx",
      "libs/ui/skills/x/references/ux.md",
      "libs/ui/scripts/visual-storybook-build.mjs",
      ".github/workflows/ui-quality.yml",
      ".gitattributes",
      "pnpm-lock.yaml",
      "patches/x.patch",
    ]) {
      assert.equal(isBuildInput(file), true, file)
    }
  })

  it("keeps test helpers the bundler config imports and files Tailwind scans", () => {
    for (const file of [
      "libs/ui/test/visual-rsc-boundaries.mjs",
      "libs/ui/test/visual.spec.ts",
      "libs/ui/tests/anything.ts",
      "libs/ui/agent-plugin/plugin.json",
      "libs/ui/src/atoms/README.md",
    ]) {
      assert.equal(isBuildInput(file), true, file)
    }
  })

  it("drops only the committed baseline screenshots", () => {
    assert.equal(
      isBuildInput(
        "libs/ui/test/visual.spec.ts-snapshots/atoms-badge--playground-n1-mobile-light-linux.png"
      ),
      false
    )
  })
})

describe("storybookInputEntries (real tree)", () => {
  it("lists tracked build inputs only, without the baseline screenshots", () => {
    const entries = storybookInputEntries(REAL_REPO)
    const paths = entries.map((entry) => entry.path)
    assert.ok(paths.includes("libs/ui/package.json"))
    assert.ok(paths.includes("pnpm-lock.yaml"))
    assert.deepEqual(
      paths.filter((file) => !isBuildInput(file)),
      []
    )
    for (const entry of entries) {
      assert.match(entry.id, ENTRY_ID)
    }
  })
})

describe("ensureStorybookBuild without building", () => {
  it("uses an external build as it is", () => {
    withStorybookDir({ "iframe.html": "" }, (storybookDir) => {
      assert.equal(
        ensureStorybookBuild({
          uiRoot: REAL_UI,
          repoRoot: REAL_REPO,
          storybookDir,
          externalBuild: true,
          rebuild: undefined,
        }),
        "external"
      )
    })
  })

  it("keeps an existing build when PLAYWRIGHT_STORYBOOK_REBUILD is 0", () => {
    withStorybookDir({ "iframe.html": "" }, (storybookDir) => {
      assert.equal(
        ensureStorybookBuild({
          uiRoot: REAL_UI,
          repoRoot: REAL_REPO,
          storybookDir,
          externalBuild: false,
          rebuild: "0",
        }),
        "kept"
      )
    })
  })

  it("requires iframe.html after every action", () => {
    withStorybookDir({}, (storybookDir) => {
      assert.throws(
        () =>
          ensureStorybookBuild({
            uiRoot: REAL_UI,
            repoRoot: REAL_REPO,
            storybookDir,
            externalBuild: true,
            rebuild: undefined,
          }),
        BUILD_NOT_FOUND
      )
    })
  })

  it("reports a build as current when its marker matches the checked-out inputs", () => {
    const inputs = inputsHash(storybookInputEntries(REAL_REPO))
    withStorybookDir(
      { "iframe.html": "", ".visual-build.json": JSON.stringify({ inputs }) },
      (storybookDir) => {
        assert.equal(
          ensureStorybookBuild({
            uiRoot: REAL_UI,
            repoRoot: REAL_REPO,
            storybookDir,
            externalBuild: false,
            rebuild: undefined,
          }),
          "current"
        )
      }
    )
  })
})

describe("Storybook build inputs cover the story closures (real tree)", () => {
  it("every file a visual story or the preview imports is a build input", {
    skip: REAL_SKIP,
  }, () => {
    const entries = JSON.parse(fs.readFileSync(REAL_INDEX, "utf8")).entries
    const pkg = JSON.parse(
      fs.readFileSync(path.join(REAL_UI, "package.json"), "utf8")
    )
    const storyFiles = visualStories(entries).map((entry) => entry.importPath)
    const { closures } = buildStoryClosures({
      uiRoot: REAL_UI,
      storyFiles: [...storyFiles, "./.storybook/preview.ts"],
      readFile: (absPath) => fs.readFileSync(absPath, "utf8"),
      exists: isFile,
      packageExports: pkg.exports ?? {},
    })
    assert.ok(closures.has(".storybook/preview.ts"))
    const files = new Set(
      [...closures.values()].flatMap((closure) => [...closure])
    )
    assert.ok(files.has("libs/ui/.storybook/preview.ts"))
    assert.deepEqual(
      [...files].filter((file) => !isBuildInput(file)),
      []
    )
    // classifyScope answers "none" for other workspace libraries on the
    // strength of these two facts; if either changes, update it first.
    assert.deepEqual(
      [...files].filter((file) => !file.startsWith("libs/ui/")),
      []
    )
    const workspaceDependencies = Object.entries({
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    }).filter(([, range]) => String(range).startsWith("workspace:"))
    assert.deepEqual(workspaceDependencies, [])
  })
})

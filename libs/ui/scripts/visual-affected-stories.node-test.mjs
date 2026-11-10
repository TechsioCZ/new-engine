import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import { visualStories } from "../test/visual-completion.mjs"
import {
  affectedStoriesFromDisk,
  buildStoryClosures,
  collectImportSpecifiers,
  createResolver,
  GIT_MAX_BUFFER,
  gitChangedFiles,
  NON_LITERAL_SPECIFIER,
  parseCliArgs,
  selectAffectedStories,
} from "./visual-affected-stories.mjs"

const UI = "/repo/libs/ui"
const NON_LITERAL_PATTERN = /non-literal import/

/** @param {Record<string, string>} files */
function fakeFs(files) {
  const map = new Map(
    Object.entries(files).map(([rel, text]) => [`${UI}/${rel}`, text])
  )
  return {
    exists: (absPath) => map.has(absPath),
    readFile: (absPath) => {
      if (!map.has(absPath)) {
        throw new Error(`unexpected read ${absPath}`)
      }
      return map.get(absPath)
    },
  }
}

const PACKAGE_EXPORTS = {
  "./atoms/*": {
    types: "./dist/src/atoms/*.d.ts",
    import: "./dist/atoms/*.js",
  },
  "./utils": { import: "./dist/utils.js" },
  "./tokens/*": { style: "./src/tokens/*.css", default: "./src/tokens/*.css" },
  "./both": { import: "./dist/both.js", default: "./src/both.tsx" },
}

/** @param {string} id @param {string} importPath @param {string[]} [tags] */
function story(id, importPath, tags = []) {
  return { id, type: "story", importPath, tags }
}

const ENTRIES = {
  "atoms-button--default": story(
    "atoms-button--default",
    "./stories/atoms/button.stories.tsx"
  ),
  "atoms-button--playground": story(
    "atoms-button--playground",
    "./stories/atoms/button.stories.tsx"
  ),
  "atoms-button--playground--portal-open-n1": story(
    "atoms-button--playground--portal-open-n1",
    "./stories/atoms/button.stories.tsx"
  ),
  "atoms-button--docs": {
    id: "atoms-button--docs",
    type: "docs",
    importPath: "./stories/atoms/button.stories.tsx",
  },
  "other--story": story("other--story", "./stories/other.stories.tsx"),
  "changelog--fixture": story(
    "changelog--fixture",
    "./stories/changelog.stories.tsx",
    ["visual-skip"]
  ),
}

const CLOSURES = new Map([
  [
    "stories/atoms/button.stories.tsx",
    new Set([
      "libs/ui/stories/atoms/button.stories.tsx",
      "libs/ui/src/atoms/button.tsx",
      "libs/ui/src/shared.tsx",
    ]),
  ],
  [
    "stories/other.stories.tsx",
    new Set([
      "libs/ui/stories/other.stories.tsx",
      "libs/ui/src/other.tsx",
      "libs/ui/src/shared.tsx",
    ]),
  ],
  [
    "stories/changelog.stories.tsx",
    new Set([
      "libs/ui/stories/changelog.stories.tsx",
      "libs/ui/src/changelog-helper.tsx",
    ]),
  ],
])

/** @param {string[]} changedFiles @param {object} [overrides] */
function select(changedFiles, overrides = {}) {
  return selectAffectedStories({
    changedFiles,
    entries: ENTRIES,
    closures: CLOSURES,
    unresolved: [],
    ...overrides,
  })
}

describe("collectImportSpecifiers", () => {
  it("finds every import form once, sorted", () => {
    const source = [
      'import React, { useState } from "react"',
      "import type { Ref } from 'react'",
      'import * as ns from "./ns"',
      "import {",
      "  multi,",
      '} from "./multi"',
      'import "./side-effect.css"',
      'export * from "./reexport-all"',
      'export { a } from "./reexport-named"',
      'const lazy = import("./lazy")',
      'const cjs = require("./cjs")',
      'import("./lazy")',
      'import x from "./multi"',
    ].join("\n")
    assert.deepEqual(collectImportSpecifiers(source), [
      "./cjs",
      "./lazy",
      "./multi",
      "./ns",
      "./reexport-all",
      "./reexport-named",
      "./side-effect.css",
      "react",
    ])
  })

  it("ignores identifiers that only mention import or from", () => {
    assert.deepEqual(
      collectImportSpecifiers("const from = 1\nconst x = 'import'"),
      []
    )
  })

  it("keeps a multi-line import whose comments hold quotes, semicolons or slashes", () => {
    const cases = [
      'import {\n  Button, // don\'t\n} from "./button"',
      'import {\n  Button, // a; b\n} from "./button"',
      'import {\n  /* it\'s */ Button,\n} from "./button"',
      'import {\n  Button, // see https://example.com\n} from "./button"',
    ]
    for (const source of cases) {
      assert.deepEqual(collectImportSpecifiers(source), ["./button"], source)
    }
  })

  it("keeps an import after a glob or URL string that contains comment markers", () => {
    assert.deepEqual(
      collectImportSpecifiers(
        'const glob = "src/**/*.ts"\nimport x from "./a"'
      ),
      ["./a"]
    )
    assert.deepEqual(
      collectImportSpecifiers(
        'const glob = "src/*"\nimport x from "./a"\nconst y = 1 /* c */'
      ),
      ["./a"]
    )
    assert.deepEqual(
      collectImportSpecifiers(
        'const url = "https://example.com"\n; import x from "./a"'
      ),
      ["./a"]
    )
    assert.deepEqual(
      collectImportSpecifiers(
        'const url = "https://example.com"; import x from "./a"'
      ),
      ["./a"]
    )
    assert.deepEqual(
      collectImportSpecifiers('const note = "see //x"\nimport x from "./a"'),
      ["./a"]
    )
  })

  it("reports a non-literal dynamic import or require as NON_LITERAL_SPECIFIER", () => {
    assert.deepEqual(collectImportSpecifiers("await import(`./lazy`)"), [
      NON_LITERAL_SPECIFIER,
    ])
    assert.deepEqual(collectImportSpecifiers("const m = require(name)"), [
      NON_LITERAL_SPECIFIER,
    ])
    assert.deepEqual(collectImportSpecifiers('await import("./lazy")'), [
      "./lazy",
    ])
  })

  it("marks a story closure with a non-literal import as unresolved", () => {
    const files = fakeFs({
      "stories/a.stories.tsx": "const m = await import(modulePath)",
    })
    const { unresolved } = buildStoryClosures({
      uiRoot: UI,
      storyFiles: ["stories/a.stories.tsx"],
      readFile: files.readFile,
      exists: files.exists,
      packageExports: {},
    })
    assert.equal(unresolved.length, 1)
    assert.match(unresolved[0], NON_LITERAL_PATTERN)
  })
})

describe("gitChangedFiles", () => {
  it("raises the git output cap well above the 1 MiB default", () => {
    assert.ok(GIT_MAX_BUFFER >= 64 * 1024 * 1024, String(GIT_MAX_BUFFER))
  })

  it("returns a non-ASCII file name unquoted", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "visual-changed-"))
    try {
      const git = (args) =>
        execFileSync("git", args, { cwd: dir, encoding: "utf8" })
      git(["init", "-q"])
      git(["config", "user.email", "test@example.com"])
      git(["config", "user.name", "test"])
      fs.mkdirSync(path.join(dir, "libs/ui/src/atoms"), { recursive: true })
      fs.writeFileSync(path.join(dir, "libs/ui/src/atoms/seed.tsx"), "")
      git(["add", "-A"])
      git(["commit", "-q", "-m", "seed"])
      fs.writeFileSync(path.join(dir, "libs/ui/src/atoms/ř-card.tsx"), "")
      fs.writeFileSync(path.join(dir, "libs/ui/src/atoms/seed.tsx"), "x")
      git(["add", "-A"])
      git(["commit", "-q", "-m", "change"])
      assert.deepEqual(gitChangedFiles(dir, "HEAD~1"), [
        "libs/ui/src/atoms/seed.tsx",
        "libs/ui/src/atoms/ř-card.tsx",
      ])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("createResolver", () => {
  const files = fakeFs({
    "stories/a.stories.tsx": "",
    "src/atoms/button.tsx": "",
    "src/atoms/index.tsx": "",
    "src/utils.ts": "",
    "src/tokens/buttons.css": "",
    "src/both.tsx": "",
    "src/both.ts": "",
    "src/dup.tsx": "",
    "src/dup.ts": "",
    "src/dir/index.ts": "",
    "src/x.json": "",
  })
  const resolve = createResolver({
    uiRoot: UI,
    packageExports: PACKAGE_EXPORTS,
    exists: files.exists,
  })
  const from = `${UI}/stories/a.stories.tsx`

  it("resolves relative specifiers", () => {
    assert.equal(
      resolve(from, "../src/atoms/button"),
      `${UI}/src/atoms/button.tsx`
    )
    assert.equal(resolve(from, "../src/x.json"), `${UI}/src/x.json`)
  })

  it("resolves @/ to libs/ui/src", () => {
    assert.equal(resolve(from, "@/atoms/button"), `${UI}/src/atoms/button.tsx`)
  })

  it("resolves self-package exports, including * patterns and dist-to-src mapping", () => {
    assert.equal(
      resolve(from, "@techsio/ui-kit/atoms/button"),
      `${UI}/src/atoms/button.tsx`
    )
    assert.equal(resolve(from, "@techsio/ui-kit/utils"), `${UI}/src/utils.ts`)
    assert.equal(
      resolve(from, "@techsio/ui-kit/tokens/buttons"),
      `${UI}/src/tokens/buttons.css`
    )
  })

  it("prefers default over import when both exist", () => {
    assert.equal(resolve(from, "@techsio/ui-kit/both"), `${UI}/src/both.tsx`)
  })

  it("prefers the .tsx extension and resolves directory index files", () => {
    assert.equal(resolve(from, "../src/dup"), `${UI}/src/dup.tsx`)
    assert.equal(resolve(from, "../src/dir"), `${UI}/src/dir/index.ts`)
    assert.equal(resolve(from, "../src/atoms"), `${UI}/src/atoms/index.tsx`)
  })

  it("returns null for internal but unresolvable specifiers", () => {
    assert.equal(resolve(from, "./missing"), null)
    assert.equal(resolve(from, "@/missing"), null)
    assert.equal(resolve(from, "@techsio/ui-kit/unknown/thing"), null)
  })

  it("returns undefined for external packages", () => {
    assert.equal(resolve(from, "react"), undefined)
    assert.equal(resolve(from, "@zag-js/react"), undefined)
  })
})

describe("buildStoryClosures", () => {
  it("follows imports transitively, handles cycles, and leaves css unparsed", () => {
    const files = fakeFs({
      "stories/s.stories.tsx":
        'import { a } from "../src/a"\nimport "../src/s.css"',
      "src/a.tsx": 'import { b } from "./b"\nimport "./a.css"',
      "src/b.ts": 'import { a } from "./a"\nexport { x } from "@/c"',
      "src/c.ts": "",
      "src/a.css": 'import "./never-parsed-missing"',
      "src/s.css": "",
    })
    const { closures, unresolved } = buildStoryClosures({
      uiRoot: UI,
      storyFiles: ["./stories/s.stories.tsx"],
      readFile: files.readFile,
      exists: files.exists,
    })
    assert.deepEqual(unresolved, [])
    assert.deepEqual([...closures.get("stories/s.stories.tsx")].sort(), [
      "libs/ui/src/a.css",
      "libs/ui/src/a.tsx",
      "libs/ui/src/b.ts",
      "libs/ui/src/c.ts",
      "libs/ui/src/s.css",
      "libs/ui/stories/s.stories.tsx",
    ])
  })

  it("reports unresolved internal specifiers", () => {
    const files = fakeFs({ "stories/s.stories.tsx": 'import "./gone"' })
    const { unresolved } = buildStoryClosures({
      uiRoot: UI,
      storyFiles: ["stories/s.stories.tsx"],
      readFile: files.readFile,
      exists: files.exists,
    })
    assert.deepEqual(unresolved, [
      'libs/ui/stories/s.stories.tsx imports "./gone"',
    ])
  })
})

describe("selectAffectedStories", () => {
  describe("rule 1: visual snapshots", () => {
    it("maps a snapshot with a suffix to the longest matching story id", () => {
      const result = select([
        "libs/ui/test/visual.spec.ts-snapshots/atoms-button--playground--portal-open-n1-mobile-light-linux.png",
      ])
      assert.equal(result.mode, "subset")
      assert.deepEqual(result.storyIds, [
        "atoms-button--playground--portal-open-n1",
      ])
    })

    it("maps a snapshot to the shorter sibling when no longer id matches", () => {
      const result = select([
        "libs/ui/test/visual.spec.ts-snapshots/atoms-button--playground-mobile-linux.png",
      ])
      assert.deepEqual(result.storyIds, ["atoms-button--playground"])
    })

    it("requires a dash boundary after the id", () => {
      assert.deepEqual(
        select([
          "libs/ui/test/visual.spec.ts-snapshots/atoms-button--playgroundX-linux.png",
        ]),
        {
          mode: "none",
          storyIds: [],
          reason: "no changed file can affect a visual story",
        }
      )
    })

    it("ignores snapshots without a visual story, including visual-skip ones", () => {
      assert.equal(
        select([
          "libs/ui/test/visual.spec.ts-snapshots/deleted--story-linux.png",
        ]).mode,
        "none"
      )
      assert.equal(
        select([
          "libs/ui/test/visual.spec.ts-snapshots/changelog--fixture-linux.png",
        ]).mode,
        "none"
      )
    })
  })

  describe("rule 2: outside libs/ui", () => {
    it("treats lockfiles, package manifests and playwright image inputs as all", () => {
      for (const file of [
        "pnpm-lock.yaml",
        "package.json",
        "pnpm-workspace.yaml",
        "docker/development/playwright/Dockerfile",
      ]) {
        assert.equal(select([file]).mode, "all", file)
      }
    })

    it("treats patches and root build config files as all", () => {
      for (const file of [
        "patches/x.patch",
        "tsconfig.base.json",
        "nx.json",
        ".npmrc",
        ".mise.toml",
        ".prototools",
      ]) {
        assert.equal(select([file]).mode, "all", file)
      }
    })

    it("ignores nested look-alikes of patches and config files", () => {
      for (const file of [
        "docs/patches/x.md",
        "libs/storefront-data/tsconfig.json",
      ]) {
        assert.equal(select([file]).mode, "none", file)
      }
    })

    it("ignores unrelated files outside libs/ui", () => {
      assert.deepEqual(select(["apps/web/src/page.tsx", "README.md"]), {
        mode: "none",
        storyIds: [],
        reason: "no changed file can affect a visual story",
      })
    })

    it("treats an outside file imported by a visual story as all", () => {
      const closures = new Map([
        ["stories/other.stories.tsx", new Set(["libs/analytics/src/track.ts"])],
      ])
      const result = selectAffectedStories({
        changedFiles: ["libs/analytics/src/track.ts"],
        entries: ENTRIES,
        closures,
      })
      assert.equal(result.mode, "all")
    })
  })

  describe("rule 3: ignored files under libs/ui", () => {
    it("ignores docs, types, figma, tests, skills and behavior specs", () => {
      for (const file of [
        "libs/ui/README.md",
        "libs/ui/src/atoms/button.mdx",
        "libs/ui/src/types.d.ts",
        "libs/ui/src/atoms/button.figma.tsx",
        "libs/ui/src/atoms/button.test.tsx",
        "libs/ui/scripts/validate.node-test.mjs",
        "libs/ui/tests/anything.ts",
        "libs/ui/skills/x/SKILL.md",
        "libs/ui/agent-plugin/plugin.json",
        "libs/ui/test/button.spec.ts",
        "libs/ui/test/tour.playwright.config.ts",
      ]) {
        const result = select([file])
        assert.deepEqual(result.storyIds, [], file)
        assert.notEqual(result.mode, "all", file)
      }
    })

    it("does not ignore visual.spec.ts", () => {
      assert.equal(select(["libs/ui/test/visual.spec.ts"]).mode, "all")
    })
  })

  describe("rule 4: source files in a story closure", () => {
    it("maps a shared source file to every visual story of each story file that imports it", () => {
      const result = select(["libs/ui/src/atoms/button.tsx"])
      assert.equal(result.mode, "subset")
      assert.deepEqual(result.storyIds, [
        "atoms-button--default",
        "atoms-button--playground",
        "atoms-button--playground--portal-open-n1",
      ])
    })

    it("maps a story file to its own visual stories", () => {
      assert.deepEqual(select(["libs/ui/stories/other.stories.tsx"]).storyIds, [
        "other--story",
      ])
    })

    it("unions stories across files that share a dependency, without duplicates", () => {
      const result = select(["libs/ui/src/shared.tsx"])
      assert.deepEqual(result.storyIds, [
        "atoms-button--default",
        "atoms-button--playground",
        "atoms-button--playground--portal-open-n1",
        "other--story",
      ])
    })

    it("never includes visual-skip stories", () => {
      assert.ok(
        !select(["libs/ui/src/shared.tsx"]).storyIds.includes(
          "changelog--fixture"
        )
      )
    })

    it("returns none for a file that only feeds visual-skip stories", () => {
      assert.equal(select(["libs/ui/src/changelog-helper.tsx"]).mode, "none")
    })
  })

  describe("rule 5: everything else under libs/ui", () => {
    it("treats an unreachable or deleted src/stories file as all", () => {
      assert.equal(select(["libs/ui/src/orphan.tsx"]).mode, "all")
      assert.equal(select(["libs/ui/stories/deleted.stories.tsx"]).mode, "all")
    })

    it("treats storybook config, global css, package.json and scripts as all", () => {
      for (const file of [
        "libs/ui/.storybook/preview.tsx",
        "libs/ui/src/tokens/index.css",
        "libs/ui/package.json",
        "libs/ui/scripts/check.mjs",
        "libs/ui/test/visual-completion.mjs",
        "libs/ui/test/fixtures/data.json",
      ]) {
        const result = select([file])
        assert.equal(result.mode, "all", file)
        assert.ok(result.reason.includes(file), file)
      }
    })
  })

  it("returns all when any closure has an unresolved internal import", () => {
    const result = select(["libs/ui/src/other.tsx"], {
      unresolved: ['libs/ui/src/other.tsx imports "./gone"'],
    })
    assert.equal(result.mode, "all")
    assert.ok(result.reason.includes("./gone"))
  })

  it("reports all with the first triggering file in sorted order", () => {
    const result = select([
      "pnpm-lock.yaml",
      "libs/ui/src/orphan.tsx",
      "libs/ui/README.md",
    ])
    assert.equal(result.mode, "all")
    assert.ok(result.reason.startsWith("libs/ui/src/orphan.tsx"), result.reason)
  })

  it("returns sorted, unique story ids and none for no changes", () => {
    const result = select([
      "libs/ui/src/other.tsx",
      "libs/ui/src/atoms/button.tsx",
      "libs/ui/src/other.tsx",
    ])
    assert.deepEqual(result.storyIds, [...result.storyIds].sort())
    assert.equal(new Set(result.storyIds).size, result.storyIds.length)
    assert.equal(select([]).mode, "none")
  })
})

describe("parseCliArgs", () => {
  it("accepts --since or --files, not both or neither", () => {
    assert.deepEqual(parseCliArgs(["--since", "origin/master"]), {
      since: "origin/master",
    })
    assert.deepEqual(parseCliArgs(["--files", "a.ts,b.ts"]), {
      files: ["a.ts", "b.ts"],
    })
    assert.throws(() => parseCliArgs([]))
    assert.throws(() => parseCliArgs(["--since", "x", "--files", "a"]))
  })
})

const REAL_REPO = path.resolve(import.meta.dirname, "../../..")
const REAL_INDEX = path.join(REAL_REPO, "libs/ui/storybook-static/index.json")
const REAL_SKIP = fs.existsSync(REAL_INDEX)
  ? false
  : "Storybook index.json not built"

describe("affectedStoriesFromDisk storybookDir", () => {
  it("reads the index from storybookDir, not the default build directory", () => {
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "visual-empty-storybook-")
    )
    try {
      assert.throws(
        () =>
          affectedStoriesFromDisk({
            repoRoot: REAL_REPO,
            changedFiles: ["libs/ui/README.md"],
            storybookDir: dir,
          }),
        /Storybook index\.json not found/
      )
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("affectedStoriesFromDisk (real tree)", () => {
  it("selects a subset for a button atom change", { skip: REAL_SKIP }, () => {
    const total = visualStories(
      JSON.parse(fs.readFileSync(REAL_INDEX, "utf8")).entries
    ).length
    const result = affectedStoriesFromDisk({
      repoRoot: REAL_REPO,
      changedFiles: ["libs/ui/src/atoms/button.tsx"],
    })
    assert.equal(result.mode, "subset")
    assert.ok(result.storyIds.length >= 1)
    assert.ok(result.storyIds.length < total)
  })

  it("selects none for a README change", { skip: REAL_SKIP }, () => {
    const result = affectedStoriesFromDisk({
      repoRoot: REAL_REPO,
      changedFiles: ["libs/ui/README.md"],
    })
    assert.equal(result.mode, "none")
  })

  it("selects all for a token css change", { skip: REAL_SKIP }, () => {
    const result = affectedStoriesFromDisk({
      repoRoot: REAL_REPO,
      changedFiles: ["libs/ui/src/tokens/index.css"],
    })
    assert.equal(result.mode, "all")
  })
})

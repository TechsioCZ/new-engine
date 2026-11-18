import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const script = fileURLToPath(new URL("./ci-ui-plan.mjs", import.meta.url))
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ui-plan-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "CI",
    GIT_AUTHOR_EMAIL: "ci@example.invalid",
    GIT_COMMITTER_NAME: "CI",
    GIT_COMMITTER_EMAIL: "ci@example.invalid",
  }
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      env,
      encoding: "utf8",
      stdio: "pipe",
    }).trim()
  git("init", "-q")
  const commit = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    fs.writeFileSync(path.join(root, file), content)
    git("add", ".")
    git("commit", "-qm", "fixture")
    return git("rev-parse", "HEAD")
  }
  const base = commit("README.md", "base")
  function plan(mode, head, baseSha = base) {
    const temporary = fs.mkdtempSync(path.join(root, "run-"))
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...env,
        MODE: mode,
        HEAD_SHA: head,
        BASE_SHA: baseSha,
        RUNNER_TEMP: temporary,
      },
    })
    assert.equal(result.status, 0, result.stderr)
    return {
      expected: JSON.parse(
        fs.readFileSync(path.join(temporary, "ui-build-plan/expected.json")),
      ),
      temporary,
    }
  }
  function commitPaths(paths) {
    const blob = git("rev-parse", `${base}:README.md`)
    const tree = execFileSync("git", ["mktree", "-z"], {
      cwd: root,
      input: paths.map((file) => `100644 blob ${blob}\t${file}\0`).join(""),
      encoding: "utf8",
    }).trim()
    return git("commit-tree", tree, "-p", base, "-m", "large diff")
  }
  return { base, commit, commitPaths, plan }
}

test("pushes and unavailable bases keep the full ten-bundle regression gate", (t) => {
  const f = fixture(t)
  for (const run of [
    f.plan("full", f.base),
    f.plan("changed", f.base, "0".repeat(40)),
  ]) {
    assert.equal(run.expected.scope, "full")
    assert.deepEqual(run.expected.components.groups, {
      visual: 10,
      desktop: 10,
      mobile: 10,
    })
    assert.equal(run.expected.components.total, 30)
    assert.deepEqual(run.expected.a11y.themes, [
      "business-light",
      "akros-light",
      "n1-light",
    ])
    // main scans business-light and akros-light 1/2; bundle 2 the rest.
    assert.deepEqual(run.expected.a11y.shards, {
      "business-light": 1,
      "akros-light": 2,
      "n1-light": 1,
    })
    assert.equal(run.expected.a11y.total, 4)
    assert.deepEqual(
      run.expected.components.include.map((bundle) => bundle.a11y),
      ["", "n1-light@1/1 akros-light@2/2", "", "", "", "", "", "", "", ""],
    )
    // The reusable workflow actually starts this matrix. A stale YAML count
    // would either omit suites or leave the required gate waiting for reports.
    const workflow = fs.readFileSync(
      new URL("../../../.github/workflows/ui-quality.yml", import.meta.url),
      "utf8"
    )
    const matrix = [...workflow.matchAll(
      /\{group: (\w+), shard: (\d+), total: (\d+), a11y: "([^"]*)"\}/g
    )].map(([, group, shard, total, a11y]) => ({
      group, shard: Number(shard), total: Number(total), a11y,
    }))
    assert.deepEqual(matrix, run.expected.components.include)
    assert.equal(Number(workflow.match(/max-parallel: (\d+)/)[1]), matrix.length)
  }
})

test("all consumers derive the same UI scope and NUL-separated changed paths", (t) => {
  const f = fixture(t)
  const file = "libs/ui/src/český button.tsx"
  const head = f.commit(file, "export {}")
  const a = f.plan("changed", head)
  const b = f.plan("changed", head)
  assert.deepEqual(a.expected, b.expected)
  assert.equal(a.expected.scope, "ui")
  assert.equal(
    fs.readFileSync(
      path.join(a.temporary, "ui-changed-files/changed-files.txt"),
      "utf8",
    ),
    file + "\0",
  )
})

test("scope-neutral diffs declare zero heavy reports; workflow diffs require full coverage", (t) => {
  const f = fixture(t)
  const none = f.plan("changed", f.commit("README.md", "docs only"))
  assert.equal(none.expected.scope, "none")
  assert.equal(none.expected.components.total, 0)
  assert.equal(none.expected.a11y.total, 0)
  const full = f.plan(
    "changed",
    f.commit(".github/workflows/ui-quality.yml", "workflow"),
  )
  assert.equal(full.expected.scope, "full")
})

test("changed-file lists above one MiB still produce a complete plan", (t) => {
  const f = fixture(t)
  const paths = Array.from(
    { length: 6000 },
    (_, index) => `changed-${index}-${"x".repeat(180)}.md`,
  )
  const changed = paths.sort().join("\0") + "\0"
  assert.ok(Buffer.byteLength(changed) > 1024 * 1024)
  const head = f.commitPaths(["README.md", ...paths])
  const run = f.plan("changed", head)
  assert.equal(run.expected.scope, "none")
  assert.equal(
    fs.readFileSync(
      path.join(run.temporary, "ui-changed-files/changed-files.txt"),
      "utf8",
    ),
    changed,
  )
})

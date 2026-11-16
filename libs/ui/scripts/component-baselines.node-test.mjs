import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { baselinePathsForShard, trackedBaselines } from "./component-baselines.mjs"

test("a shard checks out every capture variant but no retired project", () => {
  const prefix = "libs/ui/test/visual.spec.ts-snapshots/"
  const chosen = [
    "atoms-button--default-business-desktop-light-linux.png",
    "atoms-button--default--portal-open-business-desktop-light-linux.png",
    "atoms-button--default--tile-2-1-business-desktop-light-linux.png",
    "atoms-button--default-business-mobile-light-linux.png",
  ]
  const files = [
    ...chosen,
    "atoms-button--default-retired-mobile-light-linux.png",
    "atoms-checkbox--default-business-desktop-light-linux.png",
  ].map((name) => prefix + name)
  assert.deepEqual(baselinePathsForShard({
    files,
    stories: [{ id: "atoms-checkbox--default" }, { id: "atoms-button--default" }],
    projects: [{ name: "business-desktop-light" }, { name: "business-mobile-light" }],
    shard: { index: 1, total: 2 },
  }), chosen.map((name) => prefix + name))
})

test("the reviewed inventory survives sparse checkout and selected blobs remain real", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "component-baselines-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "CI test", GIT_AUTHOR_EMAIL: "ci@example.invalid",
    GIT_COMMITTER_NAME: "CI test", GIT_COMMITTER_EMAIL: "ci@example.invalid",
  }
  const git = (...args) => execFileSync("git", args, { cwd: root, env, stdio: "pipe" })
  git("init", "-q")
  const prefix = "libs/ui/test/visual.spec.ts-snapshots/"
  fs.mkdirSync(path.join(root, prefix), { recursive: true })
  const selected = prefix + "selected.png"
  const other = prefix + "other.png"
  fs.writeFileSync(path.join(root, selected), "reviewed pixels")
  fs.writeFileSync(path.join(root, other), "other reviewed pixels")
  fs.writeFileSync(path.join(root, "package.json"), "{}")
  git("add", ".")
  git("commit", "-qm", "Reviewed baselines")
  const inventory = trackedBaselines(root)
  git("sparse-checkout", "set", "--no-cone", "/*", `!/${prefix}*`)
  assert.ok(!fs.existsSync(path.join(root, selected)))
  git("sparse-checkout", "add", `/${selected}`)
  assert.equal(fs.readFileSync(path.join(root, selected), "utf8"), "reviewed pixels")
  assert.ok(!fs.existsSync(path.join(root, other)))
  assert.deepEqual(trackedBaselines(root), inventory)
})

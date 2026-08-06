// @ts-check
/// <reference types="node" />

import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

import { installHooks } from "./install.mjs"

const GIT = process.platform === "win32" ? "git.exe" : "/usr/bin/git"
const PRE_PUSH = "pre-push"
const PRE_PUSH_OLD = "pre-push.old"
const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url))
const USER_HOOK = Buffer.from("#!/bin/sh\necho user hook\n")
const OTHER_HOOK = Buffer.from("#!/bin/sh\necho other hook\n")

/**
 * @param {string} cwd - Git working directory.
 * @param {string[]} args - Git arguments.
 * @returns {string} Captured output.
 */
const git = (cwd, args) => {
  const result = spawnSync(GIT, args, {
    cwd,
    encoding: "utf-8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  })
  if (result.error !== undefined) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(result.stderr)
  }
  return result.stdout.trim()
}

/** @returns {string} Run-owned Git repository. */
const createRepository = () => {
  const repository = mkdtempSync(path.join(os.tmpdir(), "hook-install-test-"))
  git(repository, ["init", "--quiet"])
  writeFileSync(
    path.join(repository, "lefthook.yml"),
    "pre-push:\n  commands:\n    test:\n      run: true\n",
  )
  symlinkSync(
    path.join(PROJECT_ROOT, "node_modules"),
    path.join(repository, "node_modules"),
    "dir",
  )
  return repository
}

/**
 * @param {string} repository - Repository working directory.
 * @returns {string} Shared hooks directory.
 */
const hooksDirectory = (repository) =>
  git(repository, [
    "rev-parse",
    "--path-format=absolute",
    "--git-path",
    "hooks",
  ])

/** @param {string} hookPath - Hook path. */
const mode = (hookPath) => lstatSync(hookPath).mode % 0o1000

/**
 * @param {{error?: Error, signal: NodeJS.Signals | null, status: number | null}} result - Injected failure.
 */
const assertPreservedAfterFailure = (result) => {
  const repository = createRepository()
  try {
    const hooks = hooksDirectory(repository)
    const prePush = path.join(hooks, PRE_PUSH)
    const old = path.join(hooks, PRE_PUSH_OLD)
    writeFileSync(prePush, USER_HOOK, { mode: 0o751 })
    writeFileSync(old, USER_HOOK, { mode: 0o741 })

    assert.throws(
      () => installHooks({ cwd: repository, runner: () => result }),
      /failed|could not start/u,
    )
    assert.deepEqual(readFileSync(prePush), USER_HOOK)
    assert.deepEqual(readFileSync(old), USER_HOOK)
    assert.equal(mode(prePush), 0o751)
    assert.equal(mode(old), 0o741)
  } finally {
    rmSync(repository, { force: true, recursive: true })
  }
}

void describe("safe Lefthook installation", () => {
  void it("installs fresh executable hooks and is idempotent", () => {
    const repository = createRepository()
    try {
      assert.equal(installHooks({ cwd: repository }), true)
      const prePush = path.join(hooksDirectory(repository), PRE_PUSH)
      const first = readFileSync(prePush)
      const firstMode = mode(prePush)
      assert.match(first.toString("utf-8"), /call_lefthook run "pre-push"/u)
      assert.equal(firstMode, 0o755)

      assert.equal(installHooks({ cwd: repository }), true)
      assert.deepEqual(readFileSync(prePush), first)
      assert.equal(mode(prePush), firstMode)
    } finally {
      rmSync(repository, { force: true, recursive: true })
    }
  })

  void it("repairs an identical duplicate collision without losing backup mode", () => {
    const repository = createRepository()
    try {
      const hooks = hooksDirectory(repository)
      const prePush = path.join(hooks, PRE_PUSH)
      const old = path.join(hooks, PRE_PUSH_OLD)
      writeFileSync(prePush, USER_HOOK, { mode: 0o751 })
      writeFileSync(old, USER_HOOK, { mode: 0o741 })

      assert.equal(installHooks({ cwd: repository }), true)
      assert.match(
        readFileSync(prePush, "utf-8"),
        /call_lefthook run "pre-push"/u,
      )
      assert.deepEqual(readFileSync(old), USER_HOOK)
      assert.equal(mode(old), 0o741)
    } finally {
      rmSync(repository, { force: true, recursive: true })
    }
  })

  void it("preserves a distinct user backup during a managed reinstall", () => {
    const repository = createRepository()
    try {
      assert.equal(installHooks({ cwd: repository }), true)
      const hooks = hooksDirectory(repository)
      const old = path.join(hooks, PRE_PUSH_OLD)
      writeFileSync(old, OTHER_HOOK, { mode: 0o745 })

      assert.equal(installHooks({ cwd: repository }), true)
      assert.deepEqual(readFileSync(old), OTHER_HOOK)
      assert.equal(mode(old), 0o745)
    } finally {
      rmSync(repository, { force: true, recursive: true })
    }
  })

  void it("refuses distinct unrecognized hooks without invoking Lefthook", () => {
    const repository = createRepository()
    try {
      const hooks = hooksDirectory(repository)
      const prePush = path.join(hooks, PRE_PUSH)
      const old = path.join(hooks, PRE_PUSH_OLD)
      writeFileSync(prePush, USER_HOOK, { mode: 0o751 })
      writeFileSync(old, OTHER_HOOK, { mode: 0o745 })
      let invoked = false

      assert.throws(
        () =>
          installHooks({
            cwd: repository,
            runner: () => {
              invoked = true
              return { signal: null, status: 0 }
            },
          }),
        /distinct user hooks/u,
      )
      assert.equal(invoked, false)
      assert.deepEqual(readFileSync(prePush), USER_HOOK)
      assert.deepEqual(readFileSync(old), OTHER_HOOK)
      assert.equal(mode(prePush), 0o751)
      assert.equal(mode(old), 0o745)
    } finally {
      rmSync(repository, { force: true, recursive: true })
    }
  })

  void it("uses the shared hooks directory from a linked worktree", () => {
    const repository = createRepository()
    const linked = `${repository}-linked`
    try {
      git(repository, ["config", "user.email", "hooks@example.invalid"])
      git(repository, ["config", "user.name", "Hook Tests"])
      writeFileSync(path.join(repository, "tracked"), "tracked\n")
      git(repository, ["add", "tracked", "lefthook.yml"])
      git(repository, ["commit", "--quiet", "-m", "seed"])
      git(repository, ["worktree", "add", "--quiet", "-b", "linked", linked])
      symlinkSync(
        path.join(PROJECT_ROOT, "node_modules"),
        path.join(linked, "node_modules"),
        "dir",
      )

      assert.equal(installHooks({ cwd: linked }), true)
      assert.equal(
        realpathSync(hooksDirectory(linked)),
        realpathSync(path.join(repository, ".git", "hooks")),
      )
      assert.match(
        readFileSync(path.join(repository, ".git", "hooks", PRE_PUSH), "utf-8"),
        /call_lefthook run "pre-push"/u,
      )
    } finally {
      rmSync(linked, { force: true, recursive: true })
      rmSync(repository, { force: true, recursive: true })
    }
  })

  void it("restores exact hooks after process errors or interruption", () => {
    assertPreservedAfterFailure({
      error: new Error("launch failed"),
      signal: null,
      status: null,
    })
    assertPreservedAfterFailure({ signal: "SIGTERM", status: null })
  })

  void it("skips package installation outside Git", () => {
    const directory = mkdtempSync(
      path.join(os.tmpdir(), "hook-install-no-git-"),
    )
    try {
      assert.equal(installHooks({ cwd: directory }), false)
    } finally {
      rmSync(directory, { force: true, recursive: true })
    }
  })
})

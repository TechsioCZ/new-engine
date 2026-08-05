#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"

import {
  formattableFiles,
  hasUploadedCommits,
  lintableFiles,
  parsePushLines,
  touchesDangerPolicy,
  ZERO_SHA,
} from "./files.mjs"

const NODE_SHEBANG = /^#!\/usr\/bin\/env\s+(?:-S\s+)?node(?:\s|$)/
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: options.capture ? "utf-8" : undefined,
    input: options.input,
    shell: false,
    stdio: options.capture
      ? ["ignore", "pipe", "inherit"]
      : options.input === undefined
        ? "inherit"
        : ["pipe", "inherit", "inherit"],
  })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }

  return options.capture ? result.stdout.trim() : ""
}

// Run the hook as a real file so CommonJS, relative imports, import.meta.url
// and argv all behave exactly as they would under the hook's own shebang.
function runNodeHook(hook, args, stdin) {
  run(process.execPath, [hook, ...args], { input: stdin })
}

function runPreviousHook(stdin) {
  const gitDir = run("git", ["rev-parse", "--absolute-git-dir"], {
    capture: true,
  })
  const previousHook = path.join(gitDir, "hooks", "pre-push.old")
  if (!existsSync(previousHook)) {
    return
  }

  const firstLine = readFileSync(previousHook, "utf-8").split("\n", 1)[0] ?? ""
  if (NODE_SHEBANG.test(firstLine)) {
    // Node's loader refuses the lefthook-renamed ".old" extension, so run a
    // sibling extensionless copy; staying in the same directory preserves
    // file-relative discovery for the chained hook.
    // Unique per invocation so overlapping pushes cannot race on the copy;
    // the exit handler also cleans up when a chained check fails.
    const runnable = path.join(
      gitDir,
      "hooks",
      `pre-push-chained-${process.pid}-${Date.now()}`,
    )
    copyFileSync(previousHook, runnable)
    process.once("exit", () => {
      rmSync(runnable, { force: true })
    })
    runNodeHook(runnable, process.argv.slice(2), stdin)
    return
  }

  run(previousHook, process.argv.slice(2), { input: stdin })
}

function runUiGate(stdin) {
  const hook = path.resolve("libs/ui/agent-plugin/hooks/pre-push")
  if (existsSync(hook)) {
    runNodeHook(hook, process.argv.slice(2), stdin)
  }
}

// The working tree can differ from the pushed tip (unstaged edits, or
// pushing a branch that is not checked out), so checks must run against
// content materialized from the pushed revision, never worktree copies.
// The whole revision is required, not just the changed files: type-aware
// lint rules resolve imports and tsconfigs from unchanged files.
function materializePushedTree(sha) {
  const workdir = mkdtempSync(path.join(os.tmpdir(), "pre-push-checks-"))
  process.once("exit", () => {
    rmSync(workdir, { force: true, recursive: true })
  })

  const archive = spawnSync("git", ["archive", "--format=tar", sha], {
    maxBuffer: 1024 * 1024 * 1024,
    shell: false,
  })
  if (archive.status !== 0) {
    process.stderr.write(archive.stderr ?? "")
    process.exit(archive.status ?? 1)
  }

  const extract = spawnSync("tar", ["-xf", "-", "-C", workdir], {
    input: archive.stdout,
    shell: false,
    stdio: ["pipe", "inherit", "inherit"],
  })
  if (extract.status !== 0) {
    process.exit(extract.status ?? 1)
  }

  // Workspace packages resolve dependencies through their own node_modules,
  // so every installed package directory must be linked, not just the root.
  const manifestDirs = new Set(
    run("git", ["ls-tree", "-r", "--name-only", sha], { capture: true })
      .split("\n")
      .filter((file) => path.basename(file) === "package.json")
      .map((file) => path.dirname(file)),
  )
  for (const dir of manifestDirs) {
    const source = path.resolve(dir, "node_modules")
    const target = path.join(workdir, dir, "node_modules")
    if (existsSync(source) && existsSync(path.dirname(target))) {
      symlinkSync(source, target, "dir")
    }
  }
  return workdir
}

function pushedFileGroups(stdin) {
  const groups = []

  for (const { localSha, remoteSha } of parsePushLines(stdin)) {
    if (ZERO_SHA.test(localSha)) {
      continue
    }

    let base = remoteSha
    if (ZERO_SHA.test(remoteSha)) {
      const commits = run("git", ["rev-list", localSha, "--not", "--remotes"], {
        capture: true,
      })
        .split("\n")
        .filter(Boolean)
      if (commits.length === 0) {
        continue
      }

      const oldest = commits.at(-1)
      const parent = spawnSync("git", ["rev-parse", "--verify", `${oldest}^`], {
        encoding: "utf-8",
        shell: false,
        stdio: ["ignore", "pipe", "ignore"],
      })
      base = parent.status === 0 ? parent.stdout.trim() : EMPTY_TREE
    }

    const files = run(
      "git",
      ["diff", "--name-only", "--diff-filter=ACMR", base, localSha],
      {
        capture: true,
      },
    )
      .split("\n")
      .filter(Boolean)
    if (files.length > 0) {
      groups.push({ files, sha: localSha })
    }
  }

  return groups
}

let stdin = ""
process.stdin.setEncoding("utf-8")
process.stdin.on("data", (chunk) => {
  stdin += chunk
})
process.stdin.on("end", () => {
  runPreviousHook(stdin)
  runUiGate(stdin)

  if (!hasUploadedCommits(stdin)) {
    process.exit(0)
  }

  const groups = pushedFileGroups(stdin)
  const files = [...new Set(groups.flatMap((group) => group.files))]

  for (const group of groups) {
    // Classify against the materialized pushed tree: the pushed branch may
    // contain files that do not exist in the checked-out worktree.
    const workdir = materializePushedTree(group.sha)
    const formatFiles = formattableFiles(group.files, workdir)
    const lintFiles = lintableFiles(group.files, workdir)
    if (formatFiles.length === 0 && lintFiles.length === 0) {
      continue
    }
    if (formatFiles.length > 0) {
      // The pushed set can consist entirely of config-ignored files (e.g. the
      // generated a11y baseline); that must pass, not exit 2.
      run(
        path.resolve("node_modules/.bin/oxfmt"),
        ["--check", "--no-error-on-unmatched-pattern", ...formatFiles],
        { cwd: workdir },
      )
    }
    if (lintFiles.length > 0) {
      run(
        path.resolve("node_modules/.bin/oxlint"),
        ["--deny-warnings", ...lintFiles],
        { cwd: workdir },
      )
    }
  }

  if (touchesDangerPolicy(files)) {
    run(process.execPath, [
      "--test",
      "scripts/danger/check-migration-immutability.test.mjs",
      "scripts/danger/policy.test.ts",
      "scripts/hooks/files.test.mjs",
    ])
  }
})

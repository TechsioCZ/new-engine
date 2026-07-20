#!/usr/bin/env node
/**
 * SessionStart hook: install the plugin's `pre-push` git hook into the repo.
 *
 * The git hook is the real gate — git hands it the exact refs and SHAs being pushed, so unlike
 * an agent-side command-string parser it cannot be fooled by aliases, refspec forms, or config.
 *
 * ONLY in the ui-kit source repo. The plugin is installed globally, so sessions start in
 * arbitrary consumer repos; the gate only guards paths under `libs/ui/` (excluding the plugin
 * itself), so a repo without those sources gets nothing installed — and anything a previous
 * version of this installer left there is removed, restoring what it had moved aside.
 *
 * Collisions with existing hooks are RESOLVED, never won by force:
 *
 * - An untracked foreign `pre-push` (hand-written, `.git/hooks`) is moved aside to a
 *   `pre-push.pre-ui-kit[.N]` slot; the gate runs every moved-aside hook first, oldest first,
 *   and honours their exit codes.
 * - A hook TRACKED in the repo (a committed `.husky/pre-push`, lefthook output, a default
 *   hooks dir some other tool committed) is never renamed or overwritten — that would dirty
 *   the worktree. Instead `core.hooksPath` (repo-local config, untracked) is pointed at a
 *   shim directory inside `.git/` that forwards EVERY hook type to the original hooks dir
 *   and only adds the gate to `pre-push`, after the original hook has run and passed.
 */
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "git pre-push hook — the REAL ui-kit quality gate";
const source = join(dirname(dirname(fileURLToPath(import.meta.url))), "hooks", "pre-push");

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const note = (msg) => process.stderr.write(`ui-kit: ${msg}\n`);

let gitDir;
let topLevel;
try {
  gitDir = git("rev-parse", "--absolute-git-dir");
  topLevel = git("rev-parse", "--show-toplevel");
} catch {
  process.exit(0); // not a git repo (or bare) — nothing to install
}

const shimDir = join(gitDir, "ui-kit-hooks");

/**
 * The gate blocks pushes touching `libs/ui/` outside `libs/ui/agent-plugin/`. A repo is only a
 * candidate if it actually contains such paths — i.e. it is the ui-kit source repo, not a
 * consumer that merely installed this plugin (or vendored the plugin bundle itself).
 */
function isUiKitSourceRepo() {
  try {
    return readdirSync(join(topLevel, "libs", "ui")).some((entry) => entry !== "agent-plugin");
  } catch {
    return false; // no libs/ui at all
  }
}

// Respect a configured hooksPath (husky, lefthook, …) so we install where git actually looks.
// Git resolves a relative core.hooksPath against the worktree root, not our cwd — do the same.
let configuredHooksPath = "";
try {
  configuredHooksPath = git("config", "--get", "core.hooksPath");
} catch {
  // unset → default
}

let hooksDir = join(gitDir, "hooks");
if (configuredHooksPath) {
  hooksDir = isAbsolute(configuredHooksPath)
    ? configuredHooksPath
    : join(topLevel, configuredHooksPath);
}

const target = join(hooksDir, "pre-push");
const chainedBase = `${target}.pre-ui-kit`;

/**
 * A hook tracked in the repo (a committed .husky/pre-push, lefthook output, …) belongs to the
 * repo's own tooling. Renaming it would dirty the worktree and hand the agent our copy to
 * commit by accident. `.git/hooks` is outside the worktree, so plain hooks are never tracked.
 */
function isTrackedInRepo(file) {
  try {
    execFileSync("git", ["-C", topLevel, "ls-files", "--error-unmatch", "--", file], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

/** Hooks moved aside by this installer over time, oldest first, plus the next free slot. */
function backupSlots() {
  const existing = [];
  if (existsSync(chainedBase)) existing.push(chainedBase);
  let n = 1;
  for (; existsSync(`${chainedBase}.${n}`); n++) existing.push(`${chainedBase}.${n}`);
  return { existing, next: existing.length ? `${chainedBase}.${n}` : chainedBase };
}

/** Every hook name current git dispatches, so the shim forwards all of them. */
const GIT_HOOK_NAMES = [
  "applypatch-msg",
  "pre-applypatch",
  "post-applypatch",
  "pre-commit",
  "pre-merge-commit",
  "prepare-commit-msg",
  "commit-msg",
  "post-commit",
  "pre-rebase",
  "post-checkout",
  "post-merge",
  "pre-push",
  "pre-receive",
  "update",
  "proc-receive",
  "post-receive",
  "post-update",
  "reference-transaction",
  "push-to-checkout",
  "pre-auto-gc",
  "post-rewrite",
  "sendemail-validate",
  "fsmonitor-watchman",
  "p4-changelist",
  "p4-prepare-changelist",
  "p4-post-changelist",
  "p4-pre-submit",
  "post-index-change",
];

const FORWARDER = `#!/bin/sh
# ui-kit hooks shim — forwards to the same-named hook in the repo's original hooks directory.
dir=$(dirname "$0")
orig=$(cat "$dir/original-hooks-path" 2>/dev/null) || exit 0
case "$orig" in
  "") exit 0 ;;
  /*) ;;
  *) orig="$(git rev-parse --show-toplevel)/$orig" ;;
esac
hook="$orig/$(basename "$0")"
[ -x "$hook" ] && exec "$hook" "$@"
exit 0
`;

/**
 * Resolve a collision with a TRACKED hooks dir without touching any tracked file: point
 * core.hooksPath (repo-local config — never part of the worktree) at a shim inside .git/ that
 * forwards every hook type to the original dir. The gate's pre-push reads
 * `original-hooks-path` and runs the original pre-push first, honouring its exit code.
 */
function installRedirect() {
  try {
    mkdirSync(shimDir, { recursive: true });
    writeFileSync(join(shimDir, "original-hooks-path"), `${configuredHooksPath}\n`);
    for (const name of GIT_HOOK_NAMES) {
      if (name === "pre-push") continue;
      const file = join(shimDir, name);
      writeFileSync(file, FORWARDER);
      chmodSync(file, 0o755);
    }
    copyFileSync(source, join(shimDir, "pre-push"));
    chmodSync(join(shimDir, "pre-push"), 0o755);
    git("config", "core.hooksPath", shimDir);
    note(
      `"${target}" is tracked in the repo — left untouched. core.hooksPath now points at ` +
        `"${shimDir}", which forwards every hook to "${configuredHooksPath}" (originals run ` +
        "first) and adds the pre-push gate.",
    );
  } catch (err) {
    note(`could not set up the hooks shim (${err.message}) — gate NOT installed.`);
  }
  process.exit(0);
}

/** Undo installRedirect: restore the original core.hooksPath and drop the shim. */
function removeRedirect() {
  let original = "";
  try {
    original = readFileSync(join(shimDir, "original-hooks-path"), "utf8").trim();
  } catch {
    // shim without the marker file — just unset
  }
  try {
    if (original) git("config", "core.hooksPath", original);
    else execFileSync("git", ["config", "--unset", "core.hooksPath"], { stdio: "ignore" });
  } catch (err) {
    note(`could not restore core.hooksPath: ${err.message}`);
  }
  try {
    rmSync(shimDir, { recursive: true, force: true });
  } catch {
    // best effort
  }
  note(
    `removed the ui-kit hooks shim from this non-ui-kit repo; core.hooksPath restored to ` +
      `"${original || "(unset)"}".`,
  );
}

if (!isUiKitSourceRepo()) {
  // Consumer repo — the gate has nothing to guard here. Also undo what an earlier version of
  // this installer may have done: remove our hook/shim and put any moved-aside original back.
  if (existsSync(shimDir) && resolve(hooksDir) === resolve(shimDir)) {
    removeRedirect();
    process.exit(0);
  }
  if (existsSync(target) && readFileSync(target, "utf8").includes(MARKER)) {
    const { existing } = backupSlots();
    try {
      if (existing.length) {
        const newest = existing[existing.length - 1];
        renameSync(newest, target);
        note(
          `removed the ui-kit pre-push hook from this non-ui-kit repo and restored "${newest}".`,
        );
      } else {
        rmSync(target);
        note("removed the ui-kit pre-push hook from this non-ui-kit repo.");
      }
    } catch (err) {
      note(`could not remove stale pre-push hook: ${err.message}`);
    }
  }
  process.exit(0);
}

if (existsSync(target)) {
  const current = readFileSync(target, "utf8");

  if (current.includes(MARKER)) {
    // Ours already — refresh it if the plugin shipped a newer version.
    if (current === readFileSync(source, "utf8")) process.exit(0);
  } else if (isTrackedInRepo(target)) {
    installRedirect(); // never returns
  } else {
    // An untracked foreign hook (hand-written, husky's untracked output, …). Do NOT skip
    // installation — that would leave the gate unenforced in exactly the repos that already
    // care about hooks. Move it to the next free backup slot; the gate runs every moved-aside
    // hook first, oldest first, and honours their exit codes.
    const { next } = backupSlots();
    try {
      renameSync(target, next);
      chmodSync(next, 0o755);
      note(`existing pre-push hook preserved as "${next}" and chained — it runs first.`);
    } catch (err) {
      note(
        `could not preserve the existing pre-push hook (${err.message}) — leaving it ` +
          "untouched, gate NOT installed.",
      );
      process.exit(0); // never destroy a hook we cannot back up
    }
  }
}

try {
  mkdirSync(hooksDir, { recursive: true });
  copyFileSync(source, target);
  chmodSync(target, 0o755);
} catch (err) {
  note(`could not install pre-push hook: ${err.message}`);
}

process.exit(0);

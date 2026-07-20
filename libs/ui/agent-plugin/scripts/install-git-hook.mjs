#!/usr/bin/env node
/**
 * SessionStart hook: install the plugin's `pre-push` git hook into the repo.
 *
 * The git hook is the real gate — git hands it the exact refs and SHAs being pushed, so unlike
 * an agent-side command-string parser it cannot be fooled by aliases, refspec forms, or config.
 *
 * ONLY in the ui-kit source repo. The plugin is installed globally, so sessions start in
 * arbitrary consumer repos; the gate only guards paths under `libs/ui/` (excluding the plugin
 * itself), so a repo without those sources gets nothing installed — and a hook a previous
 * version of this installer left there is removed, restoring whatever it had chained aside.
 *
 * Idempotent. Never clobbers a pre-push hook this plugin did not write: if a foreign hook is
 * present it warns and leaves it alone, so the human's own hook always wins.
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
} from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MARKER = "git pre-push hook — the REAL ui-kit quality gate";
const source = join(dirname(dirname(fileURLToPath(import.meta.url))), "hooks", "pre-push");

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

let gitDir;
let topLevel;
try {
  gitDir = git("rev-parse", "--absolute-git-dir");
  topLevel = git("rev-parse", "--show-toplevel");
} catch {
  process.exit(0); // not a git repo (or bare) — nothing to install
}

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
let hooksDir = join(gitDir, "hooks");
try {
  const configured = git("config", "--get", "core.hooksPath");
  if (configured) hooksDir = isAbsolute(configured) ? configured : join(topLevel, configured);
} catch {
  // unset → default
}

const target = join(hooksDir, "pre-push");

const chained = `${target}.pre-ui-kit`;

if (!isUiKitSourceRepo()) {
  // Consumer repo — the gate has nothing to guard here. Also undo what an earlier version of
  // this installer may have done: remove our hook and put any chained-aside original back.
  if (existsSync(target) && readFileSync(target, "utf8").includes(MARKER)) {
    try {
      if (existsSync(chained)) {
        renameSync(chained, target);
        process.stderr.write(
          "ui-kit: removed the ui-kit pre-push hook from this non-ui-kit repo and restored the original hook.\n",
        );
      } else {
        rmSync(target);
        process.stderr.write(
          "ui-kit: removed the ui-kit pre-push hook from this non-ui-kit repo.\n",
        );
      }
    } catch (err) {
      process.stderr.write(`ui-kit: could not remove stale pre-push hook: ${err.message}\n`);
    }
  }
  process.exit(0);
}

if (existsSync(target)) {
  const current = readFileSync(target, "utf8");

  if (current.includes(MARKER)) {
    // Ours already — refresh it if the plugin shipped a newer version.
    if (current === readFileSync(source, "utf8")) process.exit(0);
  } else {
    // A foreign hook (husky, lefthook, hand-written). Do NOT skip installation — that would
    // leave the gate unenforced in exactly the repos that already care about hooks. Move it
    // aside instead; our hook runs it first and honours its exit code, so it still wins.
    if (!existsSync(chained)) {
      try {
        renameSync(target, chained);
        chmodSync(chained, 0o755);
        process.stderr.write(
          `ui-kit: existing pre-push hook preserved as "${chained}" and chained — it runs first.\n`,
        );
      } catch (err) {
        process.stderr.write(
          `ui-kit: could not preserve the existing pre-push hook (${err.message}) — leaving it untouched, gate NOT installed.\n`,
        );
        process.exit(0); // never destroy a hook we cannot back up
      }
    }
  }
}

try {
  mkdirSync(hooksDir, { recursive: true });
  copyFileSync(source, target);
  chmodSync(target, 0o755);
} catch (err) {
  process.stderr.write(`ui-kit: could not install pre-push hook: ${err.message}\n`);
}

process.exit(0);

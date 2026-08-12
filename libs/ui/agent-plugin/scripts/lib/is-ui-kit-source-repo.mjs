/**
 * Identify THE ui-kit source repository — the only place the push gate may activate.
 *
 * The marker is specific and tracked: `libs/ui` must be the `@techsio/ui-kit` package. An earlier
 * check keyed off "`libs/ui` contains anything besides `agent-plugin`", which a consumer repo that
 * happens to have its own unrelated `libs/ui/` package would satisfy too — reinstalling the hook
 * and blocking `git push --no-verify` there, the exact interference this scoping exists to prevent.
 * A package name is unique to this repo and lives in a committed file, so a consumer that merely
 * vendors the plugin bundle never matches.
 *
 * Shared by both the SessionStart installer and the PreToolUse guard so the two can never disagree
 * on scope. Accepts any path inside the repo (worktree root or cwd) and resolves the worktree root
 * itself, so callers pass whatever they already hold.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const UI_KIT_PACKAGE = "@techsio/ui-kit";

export function isUiKitSourceRepo(cwd) {
  let topLevel;
  try {
    topLevel = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return false; // not a git worktree (or bare) — nothing to guard
  }
  try {
    const pkg = JSON.parse(readFileSync(join(topLevel, "libs", "ui", "package.json"), "utf8"));
    return pkg?.name === UI_KIT_PACKAGE;
  } catch {
    return false; // no libs/ui/package.json, unreadable, or not the ui-kit package
  }
}

#!/usr/bin/env node
/**
 * PreToolUse gate (Codex + Claude Code): blocks `git push` when the outgoing
 * commits touch libs/ui and the $ui-validate gate has not passed for the
 * current HEAD.
 *
 * The gate is marked passed by writing HEAD into
 * `$(git rev-parse --absolute-git-dir)/ui-validate-passed` — done automatically
 * at the end of the ui-validate skill / ui-qa-validator agent. Any new commit
 * invalidates the marker.
 *
 * Exit codes: 0 = allow, 2 = block (stderr is fed back to the agent).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let raw = "";
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let input = {};
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const command = input?.tool_input?.command ?? input?.tool_input?.cmd ?? "";
  if (typeof command !== "string" || !/\bgit\b[\s\S]*\bpush\b/.test(command)) {
    process.exit(0);
  }

  const cwd = input?.cwd || process.cwd();
  const git = (args) =>
    execSync(`git ${args}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

  let head;
  let gitDir;
  try {
    head = git("rev-parse HEAD");
    gitDir = git("rev-parse --absolute-git-dir");
  } catch {
    process.exit(0); // not a git repo — nothing to gate
  }

  // Gate only pushes whose outgoing commits touch libs/ui (excluding this plugin's own docs).
  let touchesUi = false;
  try {
    const upstream = git("rev-parse --abbrev-ref --symbolic-full-name @{upstream}");
    const changed = git(`diff --name-only ${upstream}...HEAD`);
    touchesUi = changed.split("\n").some((f) => f.startsWith("libs/ui/") && !f.startsWith("libs/ui/agent-plugin/"));
  } catch {
    // No upstream (first push) — fall back to comparing against origin/master.
    try {
      const changed = git("diff --name-only origin/master...HEAD");
      touchesUi = changed.split("\n").some((f) => f.startsWith("libs/ui/") && !f.startsWith("libs/ui/agent-plugin/"));
    } catch {
      process.exit(0); // cannot determine — do not block
    }
  }
  if (!touchesUi) process.exit(0);

  let marker = "";
  try {
    marker = readFileSync(join(gitDir, "ui-validate-passed"), "utf8").trim();
  } catch {
    // no marker yet
  }

  if (marker === head) process.exit(0);

  process.stderr.write(
    [
      "BLOCKED: this push contains libs/ui changes but the ui-kit quality gate has not passed for the current HEAD.",
      "Run the `ui-validate` skill (build, validate:tokens, biome on changed files, visual tests),",
      'then mark it passed: git rev-parse HEAD > "$(git rev-parse --absolute-git-dir)/ui-validate-passed"',
    ].join("\n"),
  );
  process.exit(2);
});

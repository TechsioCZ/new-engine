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
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Extract the remote and the local ref being pushed from a `git push` command line.
 * Falls back to `origin` / `HEAD` when they are implicit (`git push`, `git push -u origin`).
 */
function parsePushArgs(command) {
  const tokens = command.trim().split(/\s+/);
  const pushIdx = tokens.findIndex((t) => t === "push");
  const rest = pushIdx === -1 ? [] : tokens.slice(pushIdx + 1);

  const FLAGS_WITH_VALUE = new Set(["--repo", "--exec", "--receive-pack", "-o", "--push-option"]);
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i];
    if (FLAGS_WITH_VALUE.has(t)) {
      i++; // skip its value
      continue;
    }
    if (t.startsWith("-")) continue; // -u, --force, --set-upstream, --force-with-lease=…, …
    positional.push(t);
  }

  const remote = positional[0] ?? "origin";
  const refspec = positional[1];
  // A refspec may be `src:dst`, `+src:dst`, or bare `src`. We gate on the source side.
  const localRef = refspec ? refspec.replace(/^\+/, "").split(":")[0] || "HEAD" : "HEAD";
  return { remote, localRef };
}

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

  // Claude Code passes tool_input.command as a string; Codex's shell tool passes an
  // argv array (e.g. ["bash", "-lc", "git push"]). Normalize both.
  const rawCommand = input?.tool_input?.command ?? input?.tool_input?.cmd ?? "";
  const command = Array.isArray(rawCommand) ? rawCommand.join(" ") : rawCommand;
  if (typeof command !== "string" || !/\bgit\b[\s\S]*\bpush\b/.test(command)) {
    process.exit(0);
  }

  const cwd = input?.cwd || process.cwd();
  // execFileSync (no shell) — refs come from an agent-supplied command line, so never
  // interpolate them into a shell string.
  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

  let gitDir;
  try {
    gitDir = git("rev-parse", "--absolute-git-dir");
  } catch {
    process.exit(0); // not a git repo — nothing to gate
  }

  // Resolve what is actually being pushed. `git push origin some-branch` from a different
  // checkout must be gated on `some-branch`, not on the current HEAD.
  const { remote, localRef } = parsePushArgs(command);
  let tip;
  try {
    tip = git("rev-parse", "--verify", localRef);
  } catch {
    process.exit(0); // unresolvable ref (e.g. --delete, tag, or typo) — do not block
  }

  // Gate only pushes whose outgoing commits touch libs/ui (excluding this plugin's own files).
  const touchesUi = (...range) => {
    const changed = git("diff", "--name-only", ...range);
    return changed
      .split("\n")
      .some((f) => f.startsWith("libs/ui/") && !f.startsWith("libs/ui/agent-plugin/"));
  };

  // Resolve the base to diff the pushed ref against. Prefer the ref's own upstream, then the
  // matching remote branch, then the remote's default branch.
  const resolves = (rev) => {
    try {
      git("rev-parse", "--verify", "--quiet", `${rev}^{commit}`);
      return true;
    } catch {
      return false;
    }
  };

  const branch = localRef.replace(/^refs\/heads\//, "");
  const candidates = [
    `${localRef}@{upstream}`,
    `${remote}/${branch}`,
    `${remote}/HEAD`,
    `${remote}/master`,
    `${remote}/main`,
  ];
  const base = candidates.find((c) => resolves(c));

  let uiChanged;
  if (base) {
    uiChanged = touchesUi(`${base}...${tip}`);
  } else {
    // No base to compare against (e.g. a brand-new repo with no remote refs). Fail closed:
    // diff the whole tree against the empty tree rather than silently allowing the push.
    const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
    uiChanged = touchesUi(EMPTY_TREE, tip);
  }
  if (!uiChanged) process.exit(0);

  let marker = "";
  try {
    marker = readFileSync(join(gitDir, "ui-validate-passed"), "utf8").trim();
  } catch {
    // no marker yet
  }

  if (marker === tip) process.exit(0);

  process.stderr.write(
    [
      `BLOCKED: this push contains libs/ui changes but the ui-kit quality gate has not passed for ${localRef} (${tip.slice(0, 8)}).`,
      "Run the `ui-validate` skill (build, validate:tokens, biome on changed files, visual tests),",
      `then mark it passed: git rev-parse ${localRef} > "$(git rev-parse --absolute-git-dir)/ui-validate-passed"`,
    ].join("\n"),
  );
  process.exit(2);
});

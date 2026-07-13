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
 * Extract the remote and EVERY local ref being pushed from a `git push` command line.
 * `git push origin main feature` pushes both refs, so every one of them must be gated —
 * checking only the first would let an unvalidated branch ride along with a validated one.
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
  // Every remaining positional is a refspec: `src`, `src:dst`, or `+src:dst`. Gate the source side.
  const localRefs = positional
    .slice(1)
    .map((spec) => spec.replace(/^\+/, "").split(":")[0])
    .filter((ref) => ref && ref !== "."); // `.` means "current branch" in some forms
  return { remote, localRefs: localRefs.length ? localRefs : ["HEAD"] };
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
  // checkout must be gated on `some-branch`, not on the current HEAD — and a multi-ref push
  // (`git push origin main feature`) must gate EVERY ref, or an unvalidated branch rides along.
  const { remote, localRefs } = parsePushArgs(command);

  // Gate only pushes whose outgoing commits touch libs/ui (excluding this plugin's own files).
  const touchesUi = (...range) => {
    const changed = git("diff", "--name-only", ...range);
    return changed
      .split("\n")
      .some((f) => f.startsWith("libs/ui/") && !f.startsWith("libs/ui/agent-plugin/"));
  };

  const resolves = (rev) => {
    try {
      git("rev-parse", "--verify", "--quiet", `${rev}^{commit}`);
      return true;
    } catch {
      return false;
    }
  };

  let marker = "";
  try {
    marker = readFileSync(join(gitDir, "ui-validate-passed"), "utf8").trim();
  } catch {
    // no marker yet
  }

  const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

  for (const localRef of localRefs) {
    let tip;
    try {
      tip = git("rev-parse", "--verify", localRef);
    } catch {
      continue; // unresolvable ref (e.g. a --delete target or a tag) — nothing to gate
    }

    // Base to diff against: the ref's own upstream, then the matching remote branch, then the
    // remote's default branch.
    const branch = localRef.replace(/^refs\/heads\//, "");
    const base = [
      `${localRef}@{upstream}`,
      `${remote}/${branch}`,
      `${remote}/HEAD`,
      `${remote}/master`,
      `${remote}/main`,
    ].find((c) => resolves(c));

    // No base (e.g. a fresh repo with no remote refs) → fail closed by diffing the whole tree.
    const uiChanged = base ? touchesUi(`${base}...${tip}`) : touchesUi(EMPTY_TREE, tip);
    if (!uiChanged) continue;
    if (marker === tip) continue; // this ref has been validated

    process.stderr.write(
      [
        `BLOCKED: this push contains libs/ui changes but the ui-kit quality gate has not passed for ${localRef} (${tip.slice(0, 8)}).`,
        "Run the `ui-validate` skill (build, validate:tokens, biome on changed files, visual tests),",
        `then mark it passed: git rev-parse ${localRef} > "$(git rev-parse --absolute-git-dir)/ui-validate-passed"`,
        localRefs.length > 1
          ? `Note: this command pushes ${localRefs.length} refs (${localRefs.join(", ")}); each UI-changing ref must be validated.`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    process.exit(2);
  }

  process.exit(0); // every pushed ref is clean or validated
});

#!/usr/bin/env node
/**
 * PreToolUse hook — a NARROW companion to the real gate.
 *
 * The enforcement lives in the git `pre-push` hook (`hooks/pre-push`, installed by
 * `scripts/install-git-hook.mjs`), which git calls with the exact refs and SHAs it is about to
 * upload. This file deliberately does NOT try to work out which refs a push will send — an
 * earlier version did and was bypassable eleven different ways.
 *
 * It has one job: refuse commands that would SKIP the git hook. `--no-verify` / `-n` is the only
 * way past a pre-push hook, so an agent must not be allowed to use it.
 *
 * Crucially, that check resolves git ALIASES first. `alias.publish = push --no-verify` contains
 * neither "push" nor "--no-verify" at the call site, so matching the raw text is not enough —
 * git expands aliases after the command is written, and so must we.
 *
 * Exit codes: 0 = allow, 2 = block (stderr is fed back to the agent).
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { isUiKitSourceRepo } from "./lib/is-ui-kit-source-repo.mjs";

// Boundaries include quotes and `=`, not just whitespace: an alias definition inlined into the
// command (`git -c alias.x='push --no-verify' x`) puts the tokens inside a quoted value, where
// they are bounded by `'` and `=` rather than spaces.
const B = "[\\s'\"=]";
const SKIPS_HOOKS = new RegExp(`(^|${B})(--no-verify|-n)(${B}|$)`);
const IS_PUSH = new RegExp(`(^|${B})push(${B}|$)`);

/** Flags that take a separate value, so the following token is not the subcommand. */
const GIT_GLOBAL_WITH_VALUE = new Set(["-c", "-C", "--git-dir", "--work-tree", "--namespace", "--exec-path"]);

// Characters in a `-C` value that make its real target unknowable BEFORE the shell expands the
// command (which this hook receives verbatim): variables, command substitution, tilde, globs.
const SHELL_EXPANSION = /[$`~*?[\]{}()]/;

/** Drop one layer of matched surrounding quotes so a plain quoted literal path stays resolvable. */
function stripQuotes(s) {
  if (s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * The directory the git command actually operates in. `git -C <dir>` (repeatable, applied
 * cumulatively) changes it before the subcommand runs, so `git -C /path/to/ui-kit push
 * --no-verify` issued from a consumer cwd still targets the ui-kit worktree — resolve it so the
 * scope check uses the real target, not the shell tool's cwd.
 *
 * Returns `trusted: false` when a `-C` value contains shell-expansion syntax (`$VAR`, `$(…)`, `~`,
 * globs). This hook sees the command PRE-expansion, so `git -C "$UI_KIT_DIR" push --no-verify`
 * would otherwise resolve to a literal `$UI_KIT_DIR` dir that does not exist, the scope check would
 * return "not the ui-kit repo", and the guard would wave the push through for the shell to then
 * expand and run. When we cannot prove where such a command points, the caller fails closed.
 */
function effectiveGitCwd(command, startCwd) {
  const tokens = command.trim().split(/\s+/);
  const gitIdx = tokens.findIndex((t) => t === "git" || t.endsWith("/git"));
  if (gitIdx === -1) return { dir: startCwd, trusted: true };
  let dir = startCwd;
  let trusted = true;
  for (let i = gitIdx + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "-C" && tokens[i + 1] !== undefined) {
      const raw = tokens[i + 1];
      if (SHELL_EXPANSION.test(raw)) trusted = false; // real target unknown until the shell expands
      dir = resolve(dir, stripQuotes(raw)); // -C is relative to the current effective dir
      i++;
      continue;
    }
    if (GIT_GLOBAL_WITH_VALUE.has(t)) {
      i++;
      continue;
    }
    if (t.startsWith("-")) continue;
    break; // first non-flag token = the subcommand; -C only precedes it
  }
  return { dir, trusted };
}

// Git never lets an alias shadow a built-in command, so a subcommand that IS a built-in provably
// cannot be an alias hiding `push --no-verify`. Used only on the unresolvable-`-C` path, where we
// cannot read the target repo's config to expand its aliases: a NON-built-in subcommand there is
// treated as a possible push-alias and blocked. (Not exhaustive — an unlisted built-in only costs a
// rare, safe over-block under a shell-variable `-C`, never a bypass.)
const GIT_BUILTINS = new Set([
  "add", "am", "annotate", "apply", "archive", "bisect", "blame", "branch", "bundle", "cat-file",
  "checkout", "cherry", "cherry-pick", "clean", "clone", "commit", "config", "count-objects",
  "describe", "diff", "fetch", "for-each-ref", "format-patch", "fsck", "gc", "grep", "init", "log",
  "ls-files", "ls-remote", "ls-tree", "maintenance", "merge", "merge-base", "mv", "name-rev", "notes",
  "pull", "push", "range-diff", "rebase", "reflog", "remote", "repack", "replace", "reset", "restore",
  "revert", "rev-list", "rev-parse", "rm", "shortlog", "show", "show-ref", "sparse-checkout", "stash",
  "status", "submodule", "switch", "symbolic-ref", "tag", "update-index", "update-ref", "verify-commit",
  "verify-tag", "whatchanged", "worktree",
]);

/** The git subcommand token (first non-flag after `git` and its global value-taking flags), or "". */
function gitSubcommand(command) {
  const tokens = command.trim().split(/\s+/);
  const gitIdx = tokens.findIndex((t) => t === "git" || t.endsWith("/git"));
  if (gitIdx === -1) return "";
  for (let i = gitIdx + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (GIT_GLOBAL_WITH_VALUE.has(t)) {
      i++;
      continue;
    }
    if (t.startsWith("-")) continue;
    return t;
  }
  return "";
}

const gitConfig = (key, cwd) => {
  try {
    return execFileSync("git", ["config", "--get", key], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
};

/**
 * Expand git aliases in a command so the guard sees what git will actually run.
 * Bounded to a few rounds — aliases can chain, but we are not writing an interpreter.
 */
function expandAliases(command, cwd) {
  let expanded = command;

  for (let round = 0; round < 5; round++) {
    const tokens = expanded.trim().split(/\s+/);
    const gitIdx = tokens.findIndex((t) => t === "git" || t.endsWith("/git"));
    if (gitIdx === -1) return expanded;

    // Inline `-c alias.x=...` definitions are part of this very command — honour them.
    const inline = new Map();
    let i = gitIdx + 1;
    for (; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === "-c" && tokens[i + 1]) {
        const [k, ...v] = tokens[i + 1].split("=");
        if (k.startsWith("alias.")) inline.set(k.slice("alias.".length), v.join("="));
        i++;
        continue;
      }
      if (GIT_GLOBAL_WITH_VALUE.has(t)) {
        i++;
        continue;
      }
      if (t.startsWith("-")) continue;
      break; // first non-flag token = the subcommand
    }

    const sub = tokens[i];
    if (!sub) return expanded;

    const definition = inline.get(sub) ?? gitConfig(`alias.${sub}`, cwd);
    if (!definition) return expanded; // not an alias — done

    // Replace the subcommand with its definition and go round again (aliases can nest).
    const next = [...tokens.slice(0, i), definition, ...tokens.slice(i + 1)].join(" ");
    if (next === expanded) return expanded;
    expanded = next;
  }

  return expanded;
}

let raw = "";
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  // Claude Code passes a string; Codex's shell tool passes an argv array.
  const rawCommand = input?.tool_input?.command ?? input?.tool_input?.cmd ?? "";
  const command = Array.isArray(rawCommand) ? rawCommand.join(" ") : rawCommand;
  if (typeof command !== "string" || !/\bgit\b/.test(command)) process.exit(0);

  const cwd = input?.cwd || process.cwd();
  // Honour `git -C <dir>`: the command may target the ui-kit repo from a different cwd.
  const { dir: gitCwd, trusted } = effectiveGitCwd(command, cwd);

  if (!trusted) {
    // A `-C` value we can't resolve before the shell expands it (e.g. `git -C "$UI_KIT_DIR" …`).
    // We can neither confirm the target repo nor read its config to expand its aliases, so we fail
    // closed: refuse anything that could push there — a literal `push --no-verify`, or a NON-built-in
    // subcommand that could be an alias expanding to it in that repo (`alias.publish = push
    // --no-verify`). A built-in subcommand can't be an alias, and a bare `push` without `--no-verify`
    // still runs the target's pre-push hook, so both stay allowed.
    const sub = gitSubcommand(command);
    const literalPushSkip = IS_PUSH.test(command) && SKIPS_HOOKS.test(command);
    const possibleAlias = sub !== "" && !GIT_BUILTINS.has(sub);
    if (literalPushSkip || possibleAlias) {
      process.stderr.write(
        [
          "BLOCKED: this command targets a git repo through an unresolved `-C` path (a shell",
          "variable/expansion), so the guard cannot confirm it is not a push that skips the ui-kit gate.",
          possibleAlias
            ? `\`${sub}\` is not a git built-in — it may be an alias expanding to \`push --no-verify\` in that repo.`
            : "`--no-verify` is not permitted on a push.",
          "Use a literal path in `-C` (not a shell variable) so the target can be verified, then push normally.",
        ].join("\n"),
      );
      process.exit(2);
    }
    process.exit(0);
  }

  // Scope out only when we can prove the target is a non-ui-kit repo (resolvable `-C`/cwd).
  if (!isUiKitSourceRepo(gitCwd)) process.exit(0);

  const resolved = expandAliases(command, gitCwd);

  // Check the raw text AND the alias-resolved text. The resolved form catches an alias stored in
  // config (`alias.publish = push --no-verify`, whose call site shows neither token); the raw form
  // catches a definition inlined into this very command (`git -c alias.x='push --no-verify' x`),
  // where the flags are inside a quoted value that no whitespace tokenizer can see into.
  const hit = (re) => re.test(command) || re.test(resolved);

  if (hit(IS_PUSH) && hit(SKIPS_HOOKS)) {
    const viaAlias = resolved !== command;
    process.stderr.write(
      [
        "BLOCKED: this command skips the pre-push hook that enforces the ui-kit quality gate.",
        viaAlias ? `The git alias expands to: ${resolved.trim()}` : "",
        "`--no-verify` is not permitted. Run the `ui-validate` skill and push normally.",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    process.exit(2);
  }

  process.exit(0);
});

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
import { basename, dirname, resolve } from "node:path";
import { isUiKitSourceRepo } from "./lib/is-ui-kit-source-repo.mjs";

// Boundaries include quotes and `=`, not just whitespace: an alias definition inlined into the
// command (`git -c alias.x='push --no-verify' x`) puts the tokens inside a quoted value, where
// they are bounded by `'` and `=` rather than spaces.
const B = "[\\s'\"=]";
const SKIPS_HOOKS = new RegExp(`(^|${B})(--no-verify|-n)(${B}|$)`);
const IS_PUSH = new RegExp(`(^|${B})push(${B}|$)`);

/** Flags that take a separate value, so the following token is not the subcommand. */
const GIT_GLOBAL_WITH_VALUE = new Set(["-c", "-C", "--git-dir", "--work-tree", "--namespace", "--exec-path"]);

// Characters in a `-C`/`--git-dir`/`--work-tree` value that make its real target unknowable BEFORE
// the shell expands the command (which this hook receives verbatim): variables, command
// substitution, tilde, globs.
const SHELL_EXPANSION = /[$`~*?[\]{}()]/;

/** Drop one layer of matched surrounding quotes so a plain quoted literal path stays resolvable. */
function stripQuotes(s) {
  if (s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))) {
    return s.slice(1, -1);
  }
  return s;
}

/**
 * The repository selectors a git command carries. Only these change WHICH REPO a push targets, and
 * therefore whether the scope check should trust the shell tool's cwd:
 *   - `git -C <dir>` (repeatable, applied cumulatively) changes the cwd git discovers the repo from;
 *   - `git --git-dir <dir>` points git at a DIFFERENT repository entirely.
 * (`--work-tree` only relocates the working tree; the repo is still the one `--git-dir`/cwd select,
 * so it can't retarget a push and is deliberately NOT treated as a selector here — keying off it
 * would over-block a legitimate consumer `git --work-tree <x> push --no-verify`.)
 *
 * Either selector lets `git … push --no-verify` issued from a consumer cwd still hit the ui-kit repo,
 * so we extract them and resolve the real target rather than trusting cwd.
 *
 * Returns `trusted: false` when a selector value contains shell-expansion syntax (`$VAR`, `$(…)`,
 * `~`, globs). This hook sees the command PRE-expansion, so `git -C "$UI_KIT_DIR" push --no-verify`
 * (or `--git-dir "$UI_KIT_DIR/.git"`) would otherwise resolve to a literal, non-existent path, the
 * scope check would return "not the ui-kit repo", and the guard would wave the push through for the
 * shell to then expand and run. When we cannot prove where such a command points, the caller fails
 * closed.
 */
function effectiveGitCwd(command, startCwd) {
  const tokens = command.trim().split(/\s+/);
  const gitIdx = tokens.findIndex((t) => t === "git" || t.endsWith("/git"));
  if (gitIdx === -1) return { dir: startCwd, trusted: true };
  let dir = startCwd;
  let gitDir;
  let trusted = true;

  // Apply a selector's value. `-C` is cumulative and also shifts the flags that follow it; a bare
  // `--git-dir` retargets the repo. Shell-expansion syntax makes the value unresolvable here (this
  // hook sees the command PRE-expansion), so mark the target untrusted → the caller fails closed.
  const apply = (name, rawValue) => {
    if (SHELL_EXPANSION.test(rawValue)) trusted = false;
    const value = resolve(dir, stripQuotes(rawValue)); // relative to the current effective dir
    if (name === "-C") dir = value;
    else gitDir = value;
  };

  // Environment assignments prefixed before the git executable (`GIT_DIR=… git …`, incl. via `env`
  // or other leading `NAME=value` tokens). Only GIT_DIR selects the repository — GIT_WORK_TREE just
  // relocates the working tree, exactly like `--work-tree`, so it can't retarget a push. A
  // command-line `--git-dir` overrides the env var, so we seed gitDir here and let the flag loop win.
  for (let i = 0; i < gitIdx; i++) {
    const m = /^GIT_DIR=(.*)$/.exec(tokens[i]);
    if (m) apply("--git-dir", m[1]);
  }

  for (let i = gitIdx + 1; i < tokens.length; i++) {
    const t = tokens[i];
    // Space form: `-C <dir>` / `--git-dir <dir>` (git requires the space for the short `-C`).
    if ((t === "-C" || t === "--git-dir") && tokens[i + 1] !== undefined) {
      apply(t, tokens[i + 1]);
      i++;
      continue;
    }
    // Attached form (long option only): `--git-dir=<dir>`. Missing this leaves the target at the
    // consumer cwd, so `git --git-dir=/path/to/ui-kit/.git push --no-verify` would slip through.
    if (t.startsWith("--git-dir=")) {
      apply("--git-dir", t.slice("--git-dir=".length));
      continue;
    }
    if (GIT_GLOBAL_WITH_VALUE.has(t)) {
      i++;
      continue;
    }
    if (t.startsWith("-")) continue;
    break; // first non-flag token = the subcommand; the selectors only precede it
  }
  return { dir, gitDir, trusted };
}

/**
 * The worktree a command actually operates on, honouring `--git-dir`. Returns null when the target
 * can't be pinned down — an unreadable git dir, a bare repo, or a linked worktree whose worktree
 * isn't its git dir's parent — so the caller fails closed instead of guessing.
 *
 * Why cwd can't be trusted here: `git --git-dir /path/to/ui-kit/.git push --no-verify` from a
 * consumer cwd pushes the ui-kit repo while skipping its gate, yet `git rev-parse --show-toplevel`
 * run from that cwd reports the CONSUMER — git assumes the cwd is the top level when only
 * `--git-dir` is set. So we resolve the git dir explicitly and derive its worktree.
 */
function resolveTargetWorktree({ dir, gitDir }) {
  if (!gitDir) return dir; // no repo-selection override — the effective cwd is the target
  try {
    const absGitDir = execFileSync("git", ["--git-dir", gitDir, "rev-parse", "--absolute-git-dir"], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    // Standard layout only (`<worktree>/.git`). A bare repo or linked worktree has no worktree we
    // can derive cheaply — return null so the caller fails closed rather than mis-scope the push.
    return basename(absGitDir) === ".git" ? dirname(absGitDir) : null;
  } catch {
    return null; // unreadable / not a git dir — can't verify the target
  }
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
  // Honour the repo selectors: the command may target the ui-kit repo from a different cwd via
  // `git -C <dir>` or `git --git-dir <dir>`.
  const { dir: gitCwd, gitDir, trusted } = effectiveGitCwd(command, cwd);
  // The real worktree the command hits. null = target can't be proven (shell-expansion value, or a
  // git dir we can't resolve to a worktree) — fall through to the fail-closed branch below.
  const target = trusted ? resolveTargetWorktree({ dir: gitCwd, gitDir }) : null;

  if (target === null) {
    // A target we can't resolve before the shell expands the command (e.g. `git -C "$UI_KIT_DIR" …`
    // or `git --git-dir "$X/.git" …`), or a git dir with no derivable worktree. We can neither
    // confirm the target repo nor read its config to expand its aliases, so we fail closed: refuse
    // anything that could push there — a literal `push --no-verify`, or a NON-built-in subcommand
    // that could be an alias expanding to it in that repo (`alias.publish = push --no-verify`). A
    // built-in subcommand can't be an alias, and a bare `push` without `--no-verify` still runs the
    // target's pre-push hook, so both stay allowed.
    const sub = gitSubcommand(command);
    const literalPushSkip = IS_PUSH.test(command) && SKIPS_HOOKS.test(command);
    const possibleAlias = sub !== "" && !GIT_BUILTINS.has(sub);
    if (literalPushSkip || possibleAlias) {
      process.stderr.write(
        [
          "BLOCKED: this command targets a git repo through a path the guard cannot resolve (a shell",
          "variable/expansion, or a `--git-dir` with no verifiable worktree), so it cannot confirm the",
          "command is not a push that skips the ui-kit gate.",
          possibleAlias
            ? `\`${sub}\` is not a git built-in — it may be an alias expanding to \`push --no-verify\` in that repo.`
            : "`--no-verify` is not permitted on a push.",
          "Use a literal path (not a shell variable) so the target can be verified, then push normally.",
        ].join("\n"),
      );
      process.exit(2);
    }
    process.exit(0);
  }

  // Scope out only when we can prove the target is a non-ui-kit repo (resolvable target).
  if (!isUiKitSourceRepo(target)) process.exit(0);

  const resolved = expandAliases(command, target);

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

#!/usr/bin/env node
/// <reference types="node" />
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
import { execFileSync } from "node:child_process"
import path from "node:path"
import process from "node:process"

import { isUiKitSourceRepo } from "./lib/is-ui-kit-source-repo.mjs"

interface GitTarget {
  dir: string
  gitDir?: string
  trusted: boolean
}

interface HookInput {
  command: string
  cwd: string
}

interface HookResult {
  code: 0 | 2
  message?: string
}

// Boundaries include quotes and `=`, not just whitespace: an alias definition inlined into the
// command (`git -c alias.x='push --no-verify' x`) puts the tokens inside a quoted value, where
// they are bounded by `'` and `=` rather than spaces.
const B = "[\\s'\"=]"
const SKIPS_HOOKS = new RegExp(`(^|${B})(--no-verify|-n)(${B}|$)`, "u")
const IS_PUSH = new RegExp(`(^|${B})push(${B}|$)`, "u")
const GIT_EXECUTABLE = "/usr/bin/git"
const MAX_ALIAS_EXPANSIONS = 5

/** Flags that take a separate value, so the following token is not the subcommand. */
const GIT_GLOBAL_WITH_VALUE = new Set([
  "-c",
  "-C",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
])

// Characters in a `-C`/`--git-dir`/`--work-tree` value that make its real target unknowable BEFORE
// the shell expands the command (which this hook receives verbatim): variables, command
// substitution, tilde, globs.
const SHELL_EXPANSION = /[$`~*?[\]{}()]/u

/** Drop one layer of matched surrounding quotes so a plain quoted literal path stays resolvable. */
const stripQuotes = (value: string) => {
  if (value.length < 2) {
    return value
  }

  const [first] = value
  const last = value.at(-1)
  const hasDoubleQuotes = first === '"' && last === '"'
  const hasSingleQuotes = first === "'" && last === "'"
  return hasDoubleQuotes || hasSingleQuotes ? value.slice(1, -1) : value
}

const tokenize = (command: string) => command.trim().split(/\s+/u)

const findGitIndex = (tokens: string[]) =>
  tokens.findIndex((token) => token === "git" || token.endsWith("/git"))

/**
 * Scan git's global options and return the first possible subcommand index.
 */
const scanGitGlobalOptions = (
  tokens: string[],
  gitIndex: number,
  visitValue?: (name: string, value: string) => void,
) => {
  let index = gitIndex + 1
  let scanning = true

  while (index < tokens.length && scanning) {
    const token = tokens[index] ?? ""
    const next = tokens[index + 1]

    if ((token === "-C" || token === "--git-dir") && next !== undefined) {
      visitValue?.(token, next)
      index += 2
    } else if (token.startsWith("--git-dir=")) {
      visitValue?.("--git-dir", token.slice("--git-dir=".length))
      index += 1
    } else if (GIT_GLOBAL_WITH_VALUE.has(token)) {
      if (next !== undefined) {
        visitValue?.(token, next)
      }
      index += 2
    } else if (token.startsWith("-")) {
      index += 1
    } else {
      scanning = false
    }
  }

  return index
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
const effectiveGitCwd = (command: string, startCwd: string): GitTarget => {
  const tokens = tokenize(command)
  const gitIndex = findGitIndex(tokens)
  if (gitIndex === -1) {
    return { dir: startCwd, trusted: true }
  }

  let dir = startCwd
  let gitDir: string | undefined
  let trusted = true

  const apply = (name: string, rawValue: string) => {
    if (SHELL_EXPANSION.test(rawValue)) {
      trusted = false
    }

    // Relative selectors are resolved from the current effective directory.
    const value = path.resolve(dir, stripQuotes(rawValue))
    if (name === "-C") {
      dir = value
    } else {
      gitDir = value
    }
  }

  // Environment assignments prefixed before the git executable (`GIT_DIR=… git …`, incl. via `env`
  // or other leading `NAME=value` tokens). Only GIT_DIR selects the repository — GIT_WORK_TREE just
  // relocates the working tree, exactly like `--work-tree`, so it can't retarget a push. A
  // command-line `--git-dir` overrides the env var, so we seed gitDir here and let the flag loop win.
  for (let index = 0; index < gitIndex; index += 1) {
    const token = tokens[index] ?? ""
    if (token.startsWith("GIT_DIR=")) {
      apply("--git-dir", token.slice("GIT_DIR=".length))
    }
  }

  scanGitGlobalOptions(tokens, gitIndex, (name, value) => {
    if (name === "-C" || name === "--git-dir") {
      apply(name, value)
    }
  })

  return { dir, gitDir, trusted }
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
const resolveTargetWorktree = ({
  dir,
  gitDir,
}: Pick<GitTarget, "dir" | "gitDir">): string | null => {
  if (gitDir === undefined) {
    // No repo-selection override: the effective cwd is the target.
    return dir
  }

  try {
    const absoluteGitDir = execFileSync(
      GIT_EXECUTABLE,
      ["--git-dir", gitDir, "rev-parse", "--absolute-git-dir"],
      {
        cwd: dir,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim()

    // Standard layout only (`<worktree>/.git`). A bare repo or linked worktree has no worktree we
    // can derive cheaply — return null so the caller fails closed rather than mis-scope the push.
    return path.basename(absoluteGitDir) === ".git"
      ? path.dirname(absoluteGitDir)
      : null
  } catch {
    // Unreadable or not a git dir: the target cannot be verified.
    return null
  }
}

// Git never lets an alias shadow a built-in command, so a subcommand that IS a built-in provably
// cannot be an alias hiding `push --no-verify`. Used only on the unresolvable-`-C` path, where we
// cannot read the target repo's config to expand its aliases: a NON-built-in subcommand there is
// treated as a possible push-alias and blocked. (Not exhaustive — an unlisted built-in only costs a
// rare, safe over-block under a shell-variable `-C`, never a bypass.)
const GIT_BUILTINS = new Set([
  "add",
  "am",
  "annotate",
  "apply",
  "archive",
  "bisect",
  "blame",
  "branch",
  "bundle",
  "cat-file",
  "checkout",
  "cherry",
  "cherry-pick",
  "clean",
  "clone",
  "commit",
  "config",
  "count-objects",
  "describe",
  "diff",
  "fetch",
  "for-each-ref",
  "format-patch",
  "fsck",
  "gc",
  "grep",
  "init",
  "log",
  "ls-files",
  "ls-remote",
  "ls-tree",
  "maintenance",
  "merge",
  "merge-base",
  "mv",
  "name-rev",
  "notes",
  "pull",
  "push",
  "range-diff",
  "rebase",
  "reflog",
  "remote",
  "repack",
  "replace",
  "reset",
  "restore",
  "revert",
  "rev-list",
  "rev-parse",
  "rm",
  "shortlog",
  "show",
  "show-ref",
  "sparse-checkout",
  "stash",
  "status",
  "submodule",
  "switch",
  "symbolic-ref",
  "tag",
  "update-index",
  "update-ref",
  "verify-commit",
  "verify-tag",
  "whatchanged",
  "worktree",
])

/** The git subcommand token, or an empty string when none exists. */
const gitSubcommand = (command: string) => {
  const tokens = tokenize(command)
  const gitIndex = findGitIndex(tokens)
  if (gitIndex === -1) {
    return ""
  }

  const index = scanGitGlobalOptions(tokens, gitIndex)
  return tokens[index] ?? ""
}

const gitConfig = (key: string, cwd: string) => {
  try {
    return execFileSync(GIT_EXECUTABLE, ["config", "--get", key], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return ""
  }
}

const addInlineAlias = (inline: Map<string, string>, value: string) => {
  const separator = value.indexOf("=")
  const key = separator === -1 ? value : value.slice(0, separator)
  if (key.startsWith("alias.")) {
    const definition = separator === -1 ? "" : value.slice(separator + 1)
    inline.set(key.slice("alias.".length), definition)
  }
}

/**
 * Expand git aliases in a command so the guard sees what git will actually run.
 * Bounded to a few rounds — aliases can chain, but we are not writing an interpreter.
 */
const expandAliases = (command: string, cwd: string) => {
  let expanded = command
  let round = 0

  while (round < MAX_ALIAS_EXPANSIONS) {
    const tokens = tokenize(expanded)
    const gitIndex = findGitIndex(tokens)
    if (gitIndex === -1) {
      return expanded
    }

    // Inline `-c alias.x=...` definitions are part of this very command — honour them.
    const inline = new Map<string, string>()
    const subcommandIndex = scanGitGlobalOptions(
      tokens,
      gitIndex,
      (name, value) => {
        if (name === "-c") {
          addInlineAlias(inline, value)
        }
      },
    )
    const subcommand = tokens[subcommandIndex]
    if (subcommand === undefined || subcommand === "") {
      return expanded
    }

    const definition =
      inline.get(subcommand) ?? gitConfig(`alias.${subcommand}`, cwd)
    if (definition === "") {
      return expanded
    }

    // Replace the subcommand with its definition and repeat because aliases can nest.
    const next = [
      ...tokens.slice(0, subcommandIndex),
      definition,
      ...tokens.slice(subcommandIndex + 1),
    ].join(" ")
    if (next === expanded) {
      return expanded
    }

    expanded = next
    round += 1
  }

  return expanded
}

const parseHookInput = (raw: string): HookInput | null => {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null
  }

  const toolInput = "tool_input" in parsed ? parsed.tool_input : undefined
  if (
    typeof toolInput !== "object" ||
    toolInput === null ||
    Array.isArray(toolInput)
  ) {
    return null
  }

  const rawCommand =
    ("command" in toolInput ? toolInput.command : undefined) ??
    ("cmd" in toolInput ? toolInput.cmd : undefined)
  let command = ""
  if (typeof rawCommand === "string") {
    command = rawCommand
  } else if (
    Array.isArray(rawCommand) &&
    rawCommand.every((value) => typeof value === "string")
  ) {
    command = rawCommand.join(" ")
  }

  const parsedCwd = "cwd" in parsed ? parsed.cwd : undefined
  const cwd = typeof parsedCwd === "string" ? parsedCwd : process.cwd()
  return { command, cwd }
}

const blocksPush = (command: string, resolved: string) => {
  const matches = (pattern: RegExp) =>
    pattern.test(command) || pattern.test(resolved)
  return matches(IS_PUSH) && matches(SKIPS_HOOKS)
}

const unresolvedTargetResult = (command: string): HookResult => {
  const subcommand = gitSubcommand(command)
  const literalPushSkip = IS_PUSH.test(command) && SKIPS_HOOKS.test(command)
  const possibleAlias = subcommand !== "" && !GIT_BUILTINS.has(subcommand)
  if (!(literalPushSkip || possibleAlias)) {
    return { code: 0 }
  }

  const detail = possibleAlias
    ? `\`${subcommand}\` is not a git built-in — it may be an alias expanding to \`push --no-verify\` in that repo.`
    : "`--no-verify` is not permitted on a push."
  return {
    code: 2,
    message: [
      "BLOCKED: this command targets a git repo through a path the guard cannot resolve (a shell",
      "variable/expansion, or a `--git-dir` with no verifiable worktree), so it cannot confirm the",
      "command is not a push that skips the ui-kit gate.",
      detail,
      "Use a literal path (not a shell variable) so the target can be verified, then push normally.",
    ].join("\n"),
  }
}

const evaluate = ({ command, cwd }: HookInput): HookResult => {
  if (!/\bgit\b/u.test(command)) {
    return { code: 0 }
  }

  // Honour selectors because a command can target ui-kit from another cwd via `-C` or `--git-dir`.
  const gitTarget = effectiveGitCwd(command, cwd)
  const target = gitTarget.trusted ? resolveTargetWorktree(gitTarget) : null
  if (target === null) {
    return unresolvedTargetResult(command)
  }

  // Scope out only when we can prove the target is a non-ui-kit repo.
  if (!isUiKitSourceRepo(target)) {
    return { code: 0 }
  }

  const resolved = expandAliases(command, target)
  if (!blocksPush(command, resolved)) {
    return { code: 0 }
  }

  const viaAlias = resolved !== command
  return {
    code: 2,
    message: [
      "BLOCKED: this command skips the pre-push hook that enforces the ui-kit quality gate.",
      viaAlias ? `The git alias expands to: ${resolved.trim()}` : "",
      "`--no-verify` is not permitted. Run the `ui-validate` skill and push normally.",
    ]
      .filter(Boolean)
      .join("\n"),
  }
}

let raw = ""
process.stdin.on("data", (chunk) => {
  raw += String(chunk)
})
process.stdin.on("end", () => {
  const input = parseHookInput(raw)
  if (input === null) {
    return
  }

  const result = evaluate(input)
  if (result.message !== undefined) {
    process.stderr.write(result.message)
  }
  process.exitCode = result.code
})

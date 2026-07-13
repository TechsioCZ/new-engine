#!/usr/bin/env node
/**
 * PreToolUse hook — a NARROW companion to the real gate.
 *
 * The enforcement lives in the git `pre-push` hook (`hooks/pre-push`, installed by
 * `scripts/install-git-hook.mjs`), which git calls with the exact refs and SHAs it is about to
 * upload. This file deliberately does NOT try to work out which refs a `git push` command will
 * push: an earlier version did, and got it wrong ten separate ways (wrong ref, multi-ref,
 * deletions, --all, --mirror, --follow-tags, annotated tags, push.default=matching, glob and `:`
 * refspecs, remote.<name>.push, and finally git aliases — which no amount of string parsing can
 * see through, because git expands them after the command is written).
 *
 * It has exactly one job, which string inspection *can* do soundly: refuse the flags that skip
 * git hooks. `--no-verify` / `-n` is the only way to walk past the pre-push hook, so an agent
 * must not be allowed to use it.
 *
 * Exit codes: 0 = allow, 2 = block (stderr is fed back to the agent).
 */

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
  if (typeof command !== "string") process.exit(0);

  const isPush = /\bgit\b[\s\S]*\bpush\b/.test(command);
  const skipsHooks = /(^|\s)(--no-verify|-n)(\s|=|$)/.test(command);

  if (isPush && skipsHooks) {
    process.stderr.write(
      [
        "BLOCKED: `--no-verify` skips the pre-push hook that enforces the ui-kit quality gate.",
        "Run the `ui-validate` skill and push normally instead.",
      ].join("\n"),
    );
    process.exit(2);
  }

  process.exit(0);
});

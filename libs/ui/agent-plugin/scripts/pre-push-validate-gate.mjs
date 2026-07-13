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
 * Parse a `git push` command line into the remote, the explicit refspecs, and the modes that
 * change WHICH refs git uploads. Ref expansion needs real repo state, so it is done by the
 * caller (`resolvePushedRefs`); this function stays pure.
 */
function parsePushArgs(command) {
  const tokens = command.trim().split(/\s+/);
  const pushIdx = tokens.findIndex((t) => t === "push");
  const rest = pushIdx === -1 ? [] : tokens.slice(pushIdx + 1);

  const FLAGS_WITH_VALUE = new Set(["--repo", "--exec", "--receive-pack", "-o", "--push-option"]);
  const positional = [];
  let deleteMode = false;
  let allMode = false; // --all / --branches: every local branch
  let mirrorMode = false; // --mirror: EVERY ref under refs/ (branches AND tags)
  let tagsMode = false; // --tags: every local tag, in addition to the refspecs
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i];
    if (FLAGS_WITH_VALUE.has(t)) {
      i++; // skip its value
      continue;
    }
    if (t === "--delete" || t === "-d") {
      deleteMode = true;
      continue;
    }
    if (t === "--mirror") {
      mirrorMode = true;
      continue;
    }
    if (t === "--all" || t === "--branches") {
      allMode = true;
      continue;
    }
    // `--tags` sends EVERY local tag, including tags on no pushed branch — those must be gated.
    // `--follow-tags` is different: it only sends annotated tags *reachable from the refs being
    // pushed*, so their commits are already covered by those refs' own diff. It adds no
    // ungated content, and expanding it to all tags would falsely block on an unrelated tag.
    if (t === "--tags") {
      tagsMode = true;
      continue;
    }
    if (t === "--follow-tags") continue;
    if (t.startsWith("-")) continue; // -u, --force, --set-upstream, --force-with-lease=…, …
    positional.push(t);
  }

  const remote = positional[0] ?? "origin";
  const refspecs = positional.slice(1);
  return { remote, refspecs, deleteMode, allMode, mirrorMode, tagsMode };
}

/**
 * Work out every local ref the command will actually upload. Anything that cannot be
 * determined resolves to a superset (fail closed) rather than being skipped.
 */
function resolvePushedRefs(parsed, git) {
  const { remote, refspecs, deleteMode, allMode, mirrorMode, tagsMode } = parsed;

  // Deletes a remote ref and uploads no commits — nothing to gate.
  if (deleteMode) return [];

  const listRefs = (...globs) => {
    try {
      return git("for-each-ref", "--format=%(refname:short)", ...globs)
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  };

  // --mirror uploads EVERY ref under refs/ — branches and tags alike. A tag can point at a
  // commit that is on no local branch, so expanding to branches only would miss it.
  if (mirrorMode) {
    const refs = listRefs("refs/heads/", "refs/tags/");
    return refs.length ? refs : ["HEAD"]; // fail closed
  }

  const refs = new Set();

  if (allMode) {
    const branches = listRefs("refs/heads/");
    if (!branches.length) return ["HEAD"]; // fail closed
    for (const b of branches) refs.add(b);
  }

  if (tagsMode) for (const t of listRefs("refs/tags/")) refs.add(t);

  // Branches that already exist on the remote — the set a "matching" push uploads.
  const matchingBranches = () =>
    listRefs("refs/heads/").filter((b) => {
      try {
        git("rev-parse", "--verify", "--quiet", `${remote}/${b}^{commit}`);
        return true;
      } catch {
        return false;
      }
    });

  /**
   * Expand one refspec into the local refs it uploads. Used for BOTH command-line refspecs and
   * the ones configured in `remote.<name>.push` — git treats them identically, so they must not
   * be parsed by two different code paths.
   * @returns true if the spec contributed anything gateable
   */
  const addRefspec = (spec) => {
    const bare = spec.replace(/^\+/, "");

    // A lone `:` is an EXPLICIT matching push — every branch that exists on the remote,
    // regardless of push.default. Dropping it as an "empty source" let those through.
    if (bare === ":" || bare === "") {
      const m = matchingBranches();
      for (const b of (m.length ? m : listRefs("refs/heads/"))) refs.add(b); // fail closed
      return true;
    }

    // `src`, `src:dst`, `+src:dst`. An empty source (`:foo`) is a deletion — pushes nothing.
    const src = bare.split(":")[0];
    if (!src || src === ".") return false;

    // A glob refspec (`refs/heads/*:refs/heads/*`) is not a resolvable rev — it stands for
    // every matching local ref. Expand it rather than letting rev-parse fail and skip it.
    if (src.includes("*")) {
      const pattern = src.startsWith("refs/") ? src : `refs/heads/${src}`;
      const expanded = listRefs(pattern);
      for (const r of (expanded.length ? expanded : listRefs("refs/heads/"))) refs.add(r); // fail closed
      return true;
    }

    refs.add(src);
    return true;
  };

  // Any refspec on the command line means the user named the refs explicitly — even a pure
  // deletion, which contributes nothing to gate but must not fall through to the implicit path.
  const sawExplicitRefspec = refspecs.length > 0;
  for (const spec of refspecs) addRefspec(spec);

  if (refs.size) return [...refs];
  // An explicit refspec was given but resolved to nothing gateable (pure deletions) — allow.
  if (sawExplicitRefspec) return [];

  // Implicit push (`git push`, `git push origin`). Git does NOT necessarily send HEAD:
  //   1. `remote.<name>.push` refspecs, when configured, decide what is pushed and OVERRIDE
  //      push.default entirely (e.g. `refs/heads/*:refs/heads/*` uploads every branch).
  //   2. otherwise push.default applies; `matching` sends every branch already on the remote.
  let configured = [];
  try {
    configured = git("config", "--get-all", `remote.${remote}.push`)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    // none configured
  }

  if (configured.length) {
    for (const spec of configured) addRefspec(spec);
    return refs.size ? [...refs] : ["HEAD"]; // fail closed
  }

  let pushDefault = "simple";
  try {
    pushDefault = git("config", "--get", "push.default") || "simple";
  } catch {
    // unset → git's default (`simple`)
  }

  if (pushDefault === "matching") {
    const matching = matchingBranches();
    return matching.length ? matching : ["HEAD"];
  }

  // simple / current / upstream / nothing → at most the current branch.
  return ["HEAD"];
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
  const parsed = parsePushArgs(command);
  const { remote } = parsed;
  const localRefs = resolvePushedRefs(parsed, git);

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
      // Peel to the COMMIT. An annotated tag's own SHA is the tag object, not the commit it
      // points at, so comparing it against the marker (which is a commit SHA) never matches.
      tip = git("rev-parse", "--verify", `${localRef}^{commit}`);
    } catch {
      // Fail CLOSED. Skipping here was fail-open: anything this gate could not resolve — a glob
      // it did not expand, an odd refspec form — was waved through without inspection, which is
      // exactly how a bypass hides. If we cannot see what a ref contains, we do not allow it.
      process.stderr.write(
        [
          `BLOCKED: cannot resolve the pushed ref "${localRef}", so the ui-kit gate cannot verify what it contains.`,
          "Push an explicit branch or refspec (e.g. `git push origin <branch>`), or resolve the ref and retry.",
        ].join("\n"),
      );
      process.exit(2);
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
        // `^{commit}` matters for annotated tags: `git rev-parse <tag>` writes the tag object
        // SHA, which would never match the commit SHA this gate compares against.
        `then mark it passed: git rev-parse "${localRef}^{commit}" > "$(git rev-parse --absolute-git-dir)/ui-validate-passed"`,
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

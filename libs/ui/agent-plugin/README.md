# techsio-ui-kit-ai v0.1.0

Agent plugin for the **@techsio/ui-kit** design system — built for **OpenAI Codex** (CLI,
IDE extension, and the Codex app), compatible with **Claude Code** (skills use the shared
[Agent Skills](https://agentskills.io) standard; a `.claude-plugin/plugin.json` manifest is
included).

The plugin is **self-contained and published separately** from the `new-engine` monorepo.
It currently lives at `libs/ui/agent-plugin` only as its authoring location — deep skills are
bundled in (see *Syncing bundled skills*), so the folder can be moved to its own repo or
marketplace as-is.

Inspired by the Neuron FE AI plugin, scoped to design-system development and consumption —
no spec-driven workflow.

## What's included

| Type | Count | Purpose |
| --- | --- | --- |
| Workflow skills | 8 | `$ui-*` entry points: scaffold, tokens, stories, theming, Figma sync, validation, release, usage routing |
| Bundled deep skills | 58 | Synced 1:1 from `libs/ui/skills/`: per-component `*-usage` guides, `component-authoring`, `tailwind-token-authoring`, `storybook-authoring`, `zag-compound-components`, … |
| Subagents (Codex TOML) | 6 | design-system expert, component-dev orchestrator, token/story/figma specialists, QA gate |
| Hooks | 2 | Real git `pre-push` gate (auto-installed in the ui-kit source repo only) + a `--no-verify` guard |
| MCP servers | 3 | context7 (docs), figma (design context + Code Connect), chrome-devtools (browser) |

> **Note on slash commands:** Codex deprecated `~/.codex/prompts` custom prompts in favor of
> skills. Skills ARE the slash commands now — invoke them explicitly with `$skill-name` (or
> `/skills` in the CLI/IDE), or let Codex trigger them implicitly from their descriptions.

## Workflow skills

| Skill | Invoke | Use for |
| --- | --- | --- |
| `ui-new-component` | `$ui-new-component <name>` | Scaffold atom/molecule/organism/template (4-file checklist) |
| `ui-tokens` | `$ui-tokens` | Token CSS: cascade, two-layer rules, shared utilities, validation |
| `ui-story` | `$ui-story <component>` | CSF3 Storybook stories |
| `ui-validate` | `$ui-validate` | Full quality gate; writes the pre-push marker |
| `ui-theme-brand` | `$ui-theme-brand` | Brand themes — Figma pipeline or code-authored ("vibed") |
| `ui-figma-sync` | `$ui-figma-sync` | Code Connect + Figma variables |
| `ui-release-check` | `$ui-release-check` | semantic-release / publish readiness |
| `ui-component-usage` | `$ui-component-usage <component>` | Router to the bundled `<component>-usage` skills for app work |

## Subagents

Codex subagents are TOML files in `agents/`. Copy (or symlink) them into `~/.codex/agents/`
(personal) or a repo's `.codex/agents/` (project-scoped — the project must be trusted in
Codex). Hooks additionally require `features.hooks` enabled in Codex `config.toml`.

| Agent | Role |
| --- | --- |
| `ui-design-system-expert` | Knows the whole system — patterns, nesting/composition policy, token flows, validation pipeline. Architecture questions, placement decisions, design reviews |
| `ui-component-dev` | Orchestrator — builds components end-to-end, delegates, always finishes with the QA gate |
| `ui-token-stylist` | Token CSS specialist (two-layer tokens, form-control-base, validation scripts) |
| `ui-storybook-writer` | CSF3 stories, visual snapshots, a11y sweep |
| `ui-figma-connector` | Code Connect mappings + Figma variable rules + export pipeline |
| `ui-qa-validator` | Mandatory last step — build, tokens, lint, visual tests, consistency checklist |

## Installation

### Codex CLI / IDE

From wherever this plugin is published (its own git repo, or any repo containing a
marketplace):

```sh
codex plugin marketplace add <marketplace-repo-or-path>
codex plugin install techsio-ui-kit-ai
```

Marketplace entry for the repo that hosts the plugin (`.agents/plugins/marketplace.json`):

```json
{
  "name": "techsio-marketplace",
  "plugins": [
    {
      "name": "techsio-ui-kit-ai",
      "source": { "source": "local", "path": "./techsio-ui-kit-ai" },
      "category": "development"
    }
  ]
}
```

(`git`/`npm` sources work too — the package is publishable as `@techsio/ui-kit-ai`.)

### Codex app (desktop)

Enable developer mode → Plugins → add the marketplace source → install **techsio-ui-kit-ai**.

### Claude Code

```sh
claude plugin marketplace add <marketplace-repo-or-path>
claude plugin install techsio-ui-kit-ai
```

Skills and hooks work as-is via `.claude-plugin/plugin.json`. The TOML subagents are
Codex-specific — Claude Code users get equivalent behavior through the skills.

## Syncing bundled skills

`libs/ui/skills/` in the `new-engine` repo is the **single source of truth** for the deep
skills. Before each plugin release, refresh the bundle from a checkout of `new-engine`:

```sh
node scripts/sync-skills.mjs   # or: pnpm sync-skills
```

The script copies every skill (except `_artifacts`) into `skills/` and fails on a name
collision with the 8 authored workflow skills. Never edit bundled skills inside the plugin —
edit them in `libs/ui/skills/` and re-sync.

## The pre-push quality gate

Pushes carrying `libs/ui` changes are blocked until `$ui-validate` has passed for the ref being
pushed. Enforcement is a real **git `pre-push` hook** (`hooks/pre-push`), installed into the
repo by a `SessionStart` hook (`scripts/install-git-hook.mjs`).

**Scoped to the ui-kit source repo.** The plugin may be installed globally, so sessions start
in arbitrary repos. Both hooks first check whether the repo actually contains the guarded
paths — a `libs/ui/` directory with anything besides the plugin bundle itself. In any other
repo the installer installs nothing and the `--no-verify` guard allows everything. If an
earlier plugin version already installed the git hook into a consumer repo, the installer
removes it on the next session start and restores any original hook it had chained aside.

That matters: git invokes `pre-push` with the *resolved* push operation and hands it the exact
refs and SHAs on stdin. There is nothing to infer, so no phrasing of the command gets around it
— not `--all`, `--mirror`, glob refspecs, `push.default=matching`, `remote.<name>.push`, nor a
git alias. An earlier agent-side version of this gate tried to derive the same information by
parsing the `git push` command string and was bypassable **eleven** different ways; that
approach is gone.

A narrow `PreToolUse` hook remains, with one job: refusing `--no-verify`, the only way an agent
could skip the git hook. It does no ref parsing.

Passing `$ui-validate` records the marker:

```sh
git rev-parse HEAD > "$(git rev-parse --absolute-git-dir)/ui-validate-passed"
```

Any new commit invalidates it. The installer is idempotent, honours `core.hooksPath` (husky,
lefthook), and **never destroys a pre-push hook it did not write** — a pre-existing hook is
moved aside to `pre-push.pre-ui-kit` and chained: it runs first, and its non-zero exit still
rejects the push.

**Collision resolution.** The plugin's agent-level hooks (`hooks.json`) are additive — Codex
and Claude Code run every plugin's hooks side by side, so they cannot collide with default or
other plugins' hooks, and ours exit silently outside the ui-kit repo. For the git `pre-push`
slot, collisions are resolved so existing hooks keep running — never won by force:

- an **untracked** foreign hook (hand-written, `.git/hooks`) is moved aside to a
  `pre-push.pre-ui-kit[.N]` slot — the gate runs every moved-aside hook first, oldest first,
  and any non-zero exit still rejects the push;
- a hook **tracked in the repo** (a committed `.husky/pre-push`, lefthook output, a default
  hooks dir committed by another tool) is never renamed or overwritten. Instead
  `core.hooksPath` (repo-local config — nothing in the worktree changes) is pointed at a shim
  directory inside `.git/` that forwards *every* hook type to the original hooks dir and only
  adds the gate to `pre-push`, after the original hook has run and passed;
- uninstalling (which the installer does itself in non-ui-kit repos) restores the original
  `core.hooksPath` and the most recently moved-aside hook.

## Layout

```
techsio-ui-kit-ai/
├── .codex-plugin/plugin.json    # Codex manifest
├── .claude-plugin/plugin.json   # Claude Code manifest (same plugin)
├── package.json                 # npm packaging (@techsio/ui-kit-ai)
├── AGENTS.md                    # routing table
├── .mcp.json                    # context7, figma, chrome-devtools
├── agents/*.toml                # 6 Codex subagents
├── skills/                      # 8 authored workflow skills + 58 bundled deep skills
├── hooks/
│   ├── hooks.json               # SessionStart installer + --no-verify guard
│   └── pre-push                 # the real gate (git hands it the exact refs/SHAs)
└── scripts/                     # install-git-hook.mjs, pre-push-validate-gate.mjs, sync-skills.mjs
```

## License

[MIT](./LICENSE) — including the bundled skills.

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
| Hooks | 1 | Pre-push gate: blocks `git push` of `libs/ui` changes until `ui-validate` passed for HEAD |
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

## Hook: pre-push validate gate

`hooks/hooks.json` registers a `PreToolUse` hook that blocks `git push` when outgoing commits
touch `libs/ui/**` (excluding the plugin folder itself) and the quality gate hasn't passed for
the current HEAD — so it is only active when working inside the `new-engine` repo. Passing
`$ui-validate` writes the marker:

```sh
git rev-parse HEAD > "$(git rev-parse --absolute-git-dir)/ui-validate-passed"
```

Any new commit invalidates the marker.

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
├── hooks/hooks.json             # pre-push validate gate
└── scripts/                     # pre-push-validate-gate.mjs, sync-skills.mjs
```

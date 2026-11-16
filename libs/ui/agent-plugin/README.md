# techsio-ui-kit-ai v0.5.0

Agent plugin for the **@techsio/ui-kit** design system, packaged to the
**[Agent Plugins 1.0.0](https://agent-plugins.org)** standard
([spec](https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md)) — one
portable directory of [Agent Skills](https://agentskills.io) and MCP servers. Works in three
harnesses from the same folder:

| Harness | Reads | Client-specific extras |
| --- | --- | --- |
| **OpenAI Codex** | root `plugin.json`, `mcp.json`, `skills/` (native Agent Plugins 1.0) | `com.openai/` — hooks (via `extensions["com.openai"]`), TOML subagents |
| **GitHub Copilot** (CLI, VS Code, Copilot app) | root `plugin.json`, `mcp.json`, `skills/` (native Agent Plugins 1.0) | `com.github.copilot/` — hooks, `.agent.md` agents (generated) |
| **Claude Code** | `.claude-plugin/plugin.json` (generated — Claude Code does not read the portable manifest yet) | `com.anthropic/` — hooks, agents (generated) |

Any other conformant client loads the portable core and ignores the vendor directories.

The plugin is **self-contained and published separately** from the `new-engine` monorepo.
It currently lives at `libs/ui/agent-plugin` only as its authoring location — deep skills are
bundled in (see *Syncing bundled skills*), so the folder can be moved to its own repo or
marketplace as-is.

## What's included

| Type | Count | Purpose |
| --- | --- | --- |
| Workflow skills | 8 | `$ui-*` entry points: scaffold, tokens, stories, theming, Figma sync, validation, release, usage routing |
| Bundled deep skills | 79 | Synced from `libs/ui/skills/`: 64 per-component `*-usage` guides (each with a **UX/UI guidelines** section), `ux-guidelines`, `component-authoring`, `tailwind-token-authoring`, `storybook-authoring`, `zag-compound-components`, … |
| MCP servers | 3 | context7 (docs), figma (design context + Code Connect), chrome-devtools (browser) — `mcp.json` |
| Agents | 6 | Design-system expert, component-dev orchestrator, token/story/figma specialists, QA gate — authored in `com.openai/agents/*.toml`, generated for Claude Code and Copilot |
| Hooks | 2 | Real git `pre-push` gate installer (`SessionStart`) + `--no-verify` guard (`PreToolUse`) — authored in `com.openai/hooks.json`, generated for Claude Code and Copilot |

## UX/UI guidelines

`ux-guidelines` is the house rulebook every screen follows, distilled from the Storybook page
compositions (`Pages/*`) and the kit's components:

- **UX writing** — sentence case; verb + object buttons (`New product`, `Create product`,
  `Save changes`, `Delete product`, `Discard changes`); toasts as `<Object> <past participle>`;
  errors say what, why and how to fix; one status vocabulary mapped to Badge variants.
- **Formatting** — dates and numbers only through `Intl` with the app locale (never raw ISO,
  never `"$" + n.toFixed(2)`); pass `locale` explicitly because kit defaults differ.
- **Alignment** — money/quantities/percentages end-aligned with tabular figures; text, IDs
  and dates start-aligned; missing values as `—`.
- **States** — when to disable (only with a visible reason), read-only vs disabled, loading
  (`isLoading` vs Skeleton), validation, empty, dirty.
- **Where things live** — page actions top-right in the page header, form/dialog actions
  bottom-right with the primary last, danger zone separated; one `<Toaster />` at bottom-end;
  which feedback surface (inline, FormErrorSummary, toast, alertdialog) for which event.
- **Component selection** — intent → component, with the look-alike to avoid.
- **Value lifecycle** — draft, pending, confirmed and rejected values: browsing never commits,
  failure keeps the draft, Cancel restores the last confirmed value, stale responses are dropped.
- **Accessibility** — lasting names, focus ≠ selected ≠ hover, nothing hover- or drag-only,
  never colour alone.

Every `<component>-usage` skill applies these rules in its own **UX/UI guidelines** section:
when to use it, what to use instead, do, don't, copy and states, plus a Figma → code table.
Each one also ships the component's full UX page as `references/ux.md` (anatomy, states,
behaviour, edge cases); the Icon page carries the glyph → meaning → host table. The same Markdown files render in Storybook — the house rules under
`UX/`, each component's page as **UX guidelines** next to its stories — so edit them once in
`libs/ui/skills/`. `scripts/validate-plugin.mjs` fails when a usage skill has no page.

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

Agents are not a portable Agent Plugins component type, so each harness gets them from its own
extension directory. They are written once, as Codex TOML in `com.openai/agents/`, and
`scripts/build-client-manifests.mjs` generates the rest (`developer_instructions` becomes the
Markdown body; Codex-only keys such as `sandbox_mode` are dropped):

- **Codex** — copy (or symlink) the TOML files into `~/.codex/agents/` (personal) or a repo's
  `.codex/agents/` (project-scoped — the project must be trusted in Codex).
- **Claude Code** — loaded automatically from `com.anthropic/agents/*.md` as
  `techsio-ui-kit-ai:<agent>`.
- **GitHub Copilot** — loaded automatically from `com.github.copilot/agents/*.agent.md`
  (`/agent` in the CLI).

Codex runs plugin hooks only after you trust them (`/hooks` in the interactive CLI); until then
they are skipped silently, including in `codex exec`.

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
codex plugin add techsio-ui-kit-ai@<marketplace>
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

Claude Code does not read the portable root `plugin.json` yet, so the plugin ships a
**generated** `.claude-plugin/plugin.json`: metadata from `plugin.json`, MCP servers inlined
from `mcp.json` (`streamable-http` → `http`), and paths to `com.anthropic/hooks/hooks.json` and
`com.anthropic/agents/*.md`. Never edit generated files by hand — change the sources and run
`node scripts/build-client-manifests.mjs`.

### GitHub Copilot (CLI, VS Code, Copilot app)

```sh
copilot plugin marketplace add <marketplace-repo-or-path>
copilot plugin install techsio-ui-kit-ai@<marketplace>
# or straight from the folder:
copilot plugin install ./techsio-ui-kit-ai
```

Copilot reads the portable manifest natively (Agent Plugins 1.0) and its own components from
`com.github.copilot/`. The generated `hooks/hooks.json` uses Copilot's `version: 1` format with
PascalCase events (`SessionStart`, `PreToolUse`), so Copilot sends the same Claude-compatible
payload (`tool_name`, `tool_input.command`, `cwd`) the hook scripts already read. Copilot runs
plugin hooks from the plugin root, so the scripts take the project directory from the payload's
`cwd`, never from the process cwd. Copilot CLI caches plugins at install time — reinstall after
an update.

### Any other Agent Plugins client

Point the client at the plugin directory. It discovers `plugin.json`, `skills/*/SKILL.md` and
`mcp.json`, and ignores the vendor directories (`com.openai/`, `com.anthropic/`,
`com.github.copilot/`) and `.claude-plugin/`.

## Agent Plugins 1.0.0 conformance

| Spec | How this package complies |
| --- | --- |
| §5 manifest | root `plugin.json`, `$schema` `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`, closed field set, client data only under `extensions` |
| §6–7.1 skills | fixed location `skills/<name>/SKILL.md`; frontmatter limited to Agent Skills keys — library metadata (`type`, `library_version`, `component_version`, `requires`, `sources`, …) lives under `metadata` as strings |
| §7.2 MCP | root `mcp.json` with the matching `$schema`, explicit `type` per server (`streamable-http`, `stdio`) |
| §8 extensions | Codex data in `extensions["com.openai"]` + `com.openai/`; Copilot in `com.github.copilot/`; Claude Code in `com.anthropic/` — each harness reads only its own namespace |
| §4.1 containment | no path or symlink resolves outside the plugin root |

Check it locally (also verifies the generated files are current):

```sh
node scripts/validate-plugin.mjs   # or: pnpm validate
```

## Syncing bundled skills

`libs/ui/skills/` in the `new-engine` repo is the **single source of truth** for the deep
skills. Before each plugin release, refresh the bundle from a checkout of `new-engine`:

```sh
node scripts/sync-skills.mjs           # or: pnpm sync-skills
node scripts/sync-skills.mjs --check   # fail if the bundle is stale
```

The script copies every skill (except `_artifacts`) into `skills/`, removes skills deleted
from the source, and fails on a name collision with the 8 authored workflow skills. The
source keeps the TanStack Intent authoring format (`requires` / `sources` lists at top
level); on the way into the bundle each `SKILL.md` frontmatter is rewritten to the strict
Agent Skills form (every non-spec key moved under `metadata`, lists joined with spaces).
Required contract/rule paths in skill bodies and metadata become skill-relative
`../../references/...` paths. The generator bundles the canonical
`docs/component-contracts.md` and `skills/_artifacts/consumer_app_usage_rules.md`
into `references/`, adapts consumer-rule source exploration to installed package
subpaths, separates repo-only `contributor_sources` from portable sources, and
adds an audience/scope notice. Other skill files are copied byte-for-byte.
Authored workflow bodies remain intact; their `metadata.requires` declarations and
portable scope notice are maintained by the same generator. Never hand-edit generated
skill bodies or bundled references — edit canonical sources and re-sync; the repo's pre-commit
`scripts/check-skill-sync.mjs` rejects a stale bundle.

## Installed consumers versus kit contributors

For app work, start with `ui-component-usage` → `component-usage-ux` →
`ux-guidelines` → the matching `<component>-usage` skill. Check props in the
installed package's exported declarations, not `libs/ui/src`. Read bundled
`references/component-contracts.md` and `references/consumer_app_usage_rules.md`;
paths inside a skill resolve from that skill's folder, never the app's cwd.
No monorepo checkout, `_artifacts`, or kit build is required for consumer work.
Repository citations are optional contributor evidence. Use the app's own checks.

Source-authoring workflows (`ui-new-component`, `ui-tokens`, `ui-story`,
`ui-validate`, `ui-theme-brand`, `ui-figma-sync`, `ui-release-check`) intentionally
require an explicit source checkout. Their monorepo commands do not apply to
installed consumer apps. Packaging validation (`node scripts/validate-plugin.mjs`)
works standalone and fails if a required bundled skill or reference is missing.
`sync-skills.mjs` and its `--check` mode are contributor-only generation commands.

## The pre-push quality gate

Pushes carrying `libs/ui` changes are blocked until `$ui-validate` has passed for the ref being
pushed. Enforcement is a real **git `pre-push` hook** (`scripts/git-hooks/pre-push`), installed into the
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

**Collision resolution.** The plugin's agent-level hooks (`hooks.json`) are additive — Codex,
Claude Code and Copilot run every plugin's hooks side by side, so they cannot collide with default or
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
├── plugin.json                  # Agent Plugins 1.0.0 manifest (portable, canonical)
├── mcp.json                     # MCP servers: context7, figma, chrome-devtools (portable)
├── skills/                      # 8 authored workflow skills + 79 bundled deep skills (portable)
├── com.openai/                  # Codex extension directory — SOURCE of hooks + agents
│   ├── hooks.json               # SessionStart installer + --no-verify guard
│   └── agents/*.toml            # 6 subagents
├── com.github.copilot/          # GENERATED GitHub Copilot extension — do not edit
│   ├── hooks/hooks.json         # Copilot hooks format (version 1, PascalCase events)
│   └── agents/*.agent.md        # 6 agents
├── com.anthropic/               # GENERATED Claude Code extension — do not edit
│   ├── hooks/hooks.json
│   └── agents/*.md              # 6 agents
├── .claude-plugin/plugin.json   # GENERATED Claude Code manifest (metadata, MCP, paths above)
├── scripts/
│   ├── git-hooks/pre-push       # the real gate (git hands it the exact refs/SHAs)
│   ├── install-git-hook.mjs     # SessionStart installer
│   ├── pre-push-validate-gate.mjs
│   ├── sync-skills.mjs          # libs/ui/skills → skills/ (portable frontmatter)
│   ├── build-client-manifests.mjs  # com.openai/ + plugin.json + mcp.json → Claude Code + Copilot files
│   ├── validate-plugin.mjs      # Agent Plugins 1.0.0 + Agent Skills conformance
│   └── lib/                     # shared helpers
├── AGENTS.md                    # routing table
├── package.json                 # npm packaging (@techsio/ui-kit-ai)
└── LICENSE
```

## License

[MIT](./LICENSE) — including the bundled skills.

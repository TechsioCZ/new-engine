---
name: ui-kit-workflow-orchestrator
description: >
  Use first when a task could touch @techsio/ui-kit in libs/ui or an apps/*
  consumer. Routes component authoring, app usage, token work, Storybook,
  validation, framework adapters, Figma handoff, and Intent skill maintenance
  without crossing library/app scope accidentally.
type: lifecycle
library: "@techsio/ui-kit"
library_version: "0.3.2"
sources:
  - "libs/ui/AGENTS.md"
  - "libs/ui/skills/_artifacts/domain_map.yaml"
  - "libs/ui/skills/_artifacts/skill_spec.md"
  - "libs/ui/skills/_artifacts/skill_tree.yaml"
---

# @techsio/ui-kit Workflow Orchestrator

Load this before deciding how to work with `@techsio/ui-kit`. It separates
library authoring in `libs/ui` from app adoption in `apps/*`.

## Routing Setup

Classify the task first.

```text
Change inside libs/ui component source, token CSS, or stories
-> component-authoring
-> tailwind-token-authoring if CSS tokens change
-> storybook-authoring if stories change
-> component-consistency-validation before handoff
-> figma-sync-handoff if public component API or visuals changed

Change inside apps/* that consumes @techsio/ui-kit
-> component-usage-ux
-> load the exact per-component *-usage skill
-> app-token-overrides for visual differences
-> framework-consumer-integration for NextLink/NextImage or other adapters
-> app-ui-kit-audit before handoff
```

## Core Patterns

### Keep libs/ui and apps/* work separate

```text
libs/ui task:
  change shared component API, tokens, stories, validation, package exports

apps/* task:
  choose existing UI-kit component, pass valid props, map app visuals through tokens
```

Cross the boundary only when app work exposes a real UI-kit API or token gap.

### Use component-usage-ux as a router

```text
Need a destructive action button
-> component-usage-ux
-> button-usage
-> app-token-overrides only if Button tokens cannot express the app visual
```

Do not make `component-usage-ux` decide every prop by itself. It routes to the
component-specific skill.

### Treat Figma as a handoff

```text
New public component or visual/API change
-> figma-sync-handoff
-> point to .agents/skills/component-to-figma/SKILL.md
```

Do not edit Figma automatically from ordinary UI-kit skills.

### Recommend validation by touched area

```sh
bunx biome check --write libs/ui/src/atoms/button.tsx
pnpm --dir libs/ui validate:tokens
bunx nx run ui:build
```

Run narrow checks by default. Ask the maintainer before broader Storybook,
a11y, or screenshot runs unless the task already requires them.

## Common Mistakes

### HIGH Crossing library and app scope

Wrong:

```text
An app page needs different Button padding.
Rewrite libs/ui/src/atoms/button.tsx immediately.
```

Correct:

```text
Check Button props and tokens first.
Use app-token-overrides.
Escalate to component-authoring only if the UI kit has an API gap.
```

This keeps app-specific design from becoming a shared library regression.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

### HIGH Skipping follow-up skills

Wrong:

```text
Add src/molecules/tree-view.tsx changes and stop.
```

Correct:

```text
Run component-authoring.
Update Storybook if behavior or examples changed.
Run component-consistency-validation.
Use figma-sync-handoff for public API or visual changes.
```

Component work in this repo normally spans TSX, CSS tokens, stories, and
validation.

Source: libs/ui/AGENTS.md

### MEDIUM Solving data fetching in UI skills

Wrong:

```text
Rewrite app loader/query logic while choosing Dialog and Button props.
```

Correct:

```text
Keep the UI-kit skill focused on component choice, presentation state, tokens,
and accessibility. Leave data fetching to app-specific skills.
```

The maintainer scope for these skills is UI/UX, not app data flow.

Source: libs/ui/skills/_artifacts/domain_map.yaml

## Validation Commands

```sh
node -e 'const fs=require("node:fs"); const YAML=require("yaml"); YAML.parse(fs.readFileSync("libs/ui/skills/_artifacts/skill_tree.yaml","utf8"))'
bunx biome check --write libs/ui/skills/ui-kit-workflow-orchestrator/SKILL.md
```

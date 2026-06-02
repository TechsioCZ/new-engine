---
name: intent-skill-maintenance
description: >
  Use when @techsio/ui-kit component APIs, token rules, Storybook rules, app
  usage patterns, Figma handoff practices, validation commands, or generated
  skills change and the TanStack Intent skill artifacts or SKILL.md files need
  review or regeneration.
type: lifecycle
library: "@techsio/ui-kit"
library_version: "0.3.2"
sources:
  - "libs/ui/skills/_artifacts/domain_map.yaml"
  - "libs/ui/skills/_artifacts/skill_spec.md"
  - "libs/ui/skills/_artifacts/skill_tree.yaml"
  - "/home/home/025/projects/new-engine/node_modules/.pnpm/@tanstack+intent@0.0.41/node_modules/@tanstack/intent/meta/domain-discovery/SKILL.md"
  - "/home/home/025/projects/new-engine/node_modules/.pnpm/@tanstack+intent@0.0.41/node_modules/@tanstack/intent/meta/tree-generator/SKILL.md"
  - "/home/home/025/projects/new-engine/node_modules/.pnpm/@tanstack+intent@0.0.41/node_modules/@tanstack/intent/meta/generate-skill/SKILL.md"
---

# @techsio/ui-kit Intent Skill Maintenance

Use this when skills may be stale.

## Setup

Check the change type:

```text
New/changed component prop, variant, theme, size, slot, token, story rule,
framework adapter rule, Figma handoff rule, validation command, or app usage
pattern
-> review affected skills
```

Use TanStack Intent meta-skills in order when regenerating the tree:

```text
1. domain-discovery
2. tree-generator
3. generate-skill
```

## Core Patterns

### Update source artifacts first

```text
skills/_artifacts/domain_map.yaml
skills/_artifacts/skill_spec.md
skills/_artifacts/skill_tree.yaml
```

Do not patch many `SKILL.md` files from memory when the source artifacts are
stale.

### Keep examples grounded

```text
Use examples from libs/ui/src, libs/ui/stories, libs/ui/src/tokens, scripts,
consumer_app_usage_rules.md, and maintainer interview evidence.
```

Generic React or Storybook advice is not enough for this library.

### Propose skill updates during normal work

```text
Button adds theme="ghost"
-> update button-usage
-> update component-usage-ux if routing changes
-> update Storybook and Figma handoff skills if public docs/mapping change
```

Skill maintenance can be advisory unless the user asks to update skills now.

## Common Mistakes

### HIGH Stale skill after API change

Wrong:

```text
Add Button theme="ghost" and leave button-usage warning that ghost is invalid.
```

Correct:

```text
Update component source, stories, Figma mapping, and affected usage skills
together.
```

Skills must track the public API they teach.

Source: libs/ui/skills/_artifacts/domain_map.yaml

### HIGH Meta-skill order skipped

Wrong:

```text
Regenerate skill files without checking domain_map.yaml or skill_tree.yaml.
```

Correct:

```text
Re-read domain_map.yaml and skill_tree.yaml, then generate or surgically update
affected SKILL.md files.
```

The artifacts are the source of truth for generated skill structure.

Source: libs/ui/skills/_artifacts/skill_tree.yaml

### MEDIUM Generic skill drift

Wrong:

```text
Write broad "React component best practices" with no ui-kit sources.
```

Correct:

```text
Tie every rule to libs/ui code, AGENTS.md, token scripts, Storybook stories,
consumer usage rules, or maintainer interview findings.
```

Skills are loaded into coding agents, so local specificity matters.

Source: libs/ui/skills/_artifacts/skill_spec.md

## Validation Commands

```sh
node -e 'const fs=require("node:fs"); const YAML=require("yaml"); YAML.parse(fs.readFileSync("libs/ui/skills/_artifacts/domain_map.yaml","utf8")); YAML.parse(fs.readFileSync("libs/ui/skills/_artifacts/skill_tree.yaml","utf8"))'
rg -n '^name:|^description:|^type:|^library_version:' libs/ui/skills
```


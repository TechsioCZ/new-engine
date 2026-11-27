---
name: bulk-action-bar-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit BulkActionBar for
  the action bar for the selected rows of a table, shown only while rows are selected.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  resources: "references/ux.md ../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  sources: ""
  contributor_sources: "libs/ui/src/molecules/bulk-action-bar.tsx libs/ui/src/tokens/components/molecules/_bulk-action-bar.css libs/ui/stories/molecules/bulk-action-bar.stories.tsx"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit BulkActionBar Usage

Use BulkActionBar above a table while rows are selected. It renders nothing at zero, so the table's toolbar never changes shape.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `BulkActionBar`.

**Use it when**

- Actions that apply to every selected row (Assign, Export, Delete).

**Use something else when**

| Need | Use instead |
| --- | --- |
| One row's actions | the row's own action menu |
| Page-wide actions | PageHeader `actions` |

**Do**

- Order actions primary first, destructive last.
- Confirm destructive bulk actions with a Dialog.

**Don't**

- Render the bar when nothing is selected.
- Put filters in it.

**Copy and states**

- The count and Clear selection come from the catalog (`bulkActionBar`).

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Molecules/BulkActionBar → UX guidelines*.

## Setup

```tsx
import { BulkActionBar } from "@techsio/ui-kit/molecules/bulk-action-bar"

<BulkActionBar onClear={clear} selectedCount={selected.length}>
  <Button size="sm">Assign</Button>
</BulkActionBar>
```

Props (from `src/molecules/bulk-action-bar.tsx`):

```text
selectedCount: number
onClear: () => void
selectedLabel?: string
clearLabel?: string
children: actions
```

Words the component shows itself come from the `UiMessagesProvider` catalog;
pass `csUiMessages` (`@techsio/ui-kit/messages/ui-messages-cs`) for Czech.

## Common Mistakes

### HIGH Hard-coded count text

Wrong:

```tsx
<span>{count} selected</span>
```

Correct:

```tsx
<BulkActionBar onClear={clear} selectedCount={count}>…</BulkActionBar>
```

Source: libs/ui/src/molecules/bulk-action-bar.tsx

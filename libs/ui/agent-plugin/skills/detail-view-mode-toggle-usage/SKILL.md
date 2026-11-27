---
name: detail-view-mode-toggle-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit DetailViewModeToggle for
  the switch between opening a list's records as a full page or in a side panel.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  resources: "references/ux.md ../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  sources: ""
  contributor_sources: "libs/ui/src/molecules/detail-view-mode-toggle.tsx libs/ui/src/tokens/components/molecules/_detail-view-mode-toggle.css libs/ui/stories/molecules/detail-view-mode-toggle.stories.tsx"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit DetailViewModeToggle Usage

Use DetailViewModeToggle on a list page whose records can open either as a full page or in a SidePanel. The app owns the value and remembers the choice.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `DetailViewModeToggle`.

**Use it when**

- A list page that supports both detail views.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Switching between views of the same data (table, board) | Tabs or RadioGroup |
| A setting on a settings page | Switch or RadioGroup |

**Do**

- Place it in the list's toolbar or the PageHeader actions.
- Remember the choice per user or browser in the app.

**Don't**

- Offer it on a page whose records have only one detail view.

**Copy and states**

- All words come from the catalog (`detailViewMode`).

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Molecules/DetailViewModeToggle → UX guidelines*.

## Setup

```tsx
import { DetailViewModeToggle } from "@techsio/ui-kit/molecules/detail-view-mode-toggle"

<DetailViewModeToggle onValueChange={setMode} value={mode} />
```

Props (from `src/molecules/detail-view-mode-toggle.tsx`):

```text
value: "page" | "panel"
onValueChange: (value: "page" | "panel") => void
size?: "sm" | "md"
```

Words the component shows itself come from the `UiMessagesProvider` catalog;
pass `csUiMessages` (`@techsio/ui-kit/messages/ui-messages-cs`) for Czech.

## Common Mistakes

### HIGH Two unrelated buttons

Wrong:

```tsx
<Button onClick={() => setMode("page")}>Page</Button>
```

Correct:

```tsx
<DetailViewModeToggle onValueChange={setMode} value={mode} />
```

Source: libs/ui/src/molecules/detail-view-mode-toggle.tsx

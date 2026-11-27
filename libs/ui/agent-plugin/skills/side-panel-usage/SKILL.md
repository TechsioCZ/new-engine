---
name: side-panel-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit SidePanel for
  the right-hand panel for create, edit and quick-view forms, with remembered resizing, close guarding and draft keeping.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  resources: "references/ux.md ../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  sources: ""
  contributor_sources: "libs/ui/src/molecules/side-panel.tsx libs/ui/src/tokens/components/molecules/_side-panel.css libs/ui/stories/molecules/side-panel.stories.tsx"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit SidePanel Usage

Use SidePanel for a create, edit or quick-view form next to a list. It is Dialog's right placement plus resizing, a close guard and draft keeping.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `SidePanel`.

**Use it when**

- Editing or creating a record without leaving the list.
- A non-blocking quick view of a record (`peek`).

**Use something else when**

| Need | Use instead |
| --- | --- |
| A short confirmation | Dialog |
| A bottom sheet on touch | Drawer |
| A long multi-section editor | a full page |

**Do**

- Route every close through `onCloseRequest` when the form can hold unsaved changes.
- Put the form's SaveBar last in `actions`.
- Use the same `widthStorageKey` for panels that should share a width.

**Don't**

- Nest a SidePanel in a SidePanel.
- Draw frames inside it; SectionCards inside it are flattened.

**Copy and states**

- Title: the action and the object (`Edit customer`, `New invoice`).

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Molecules/SidePanel → UX guidelines*.

## Setup

```tsx
import { SidePanel } from "@techsio/ui-kit/molecules/side-panel"

<SidePanel
  actions={<SaveBar onSave={save} status={status} />}
  onCloseRequest={guard.request}
  onOpenChange={setOpen}
  open={open}
  title="Edit customer"
>
  <CustomerForm />
</SidePanel>
```

Props (from `src/molecules/side-panel.tsx`):

```text
open: boolean
onOpenChange: (open: boolean) => void
onCloseRequest?: (close: () => void) => void
title: ReactNode
description?: ReactNode
actions?: ReactNode
size?: "sm" | "md" | "lg" | "xl"
peek?: boolean
resizable?: boolean
widthStorageKey?: string
initialFocusEl?, finalFocusEl?, closeLabel?, resizeLabel?
```

Words the component shows itself come from the `UiMessagesProvider` catalog;
pass `csUiMessages` (`@techsio/ui-kit/messages/ui-messages-cs`) for Czech.

## Common Mistakes

### HIGH Dialog with its own resize and Escape fixes

Wrong:

```tsx
<Dialog placement="right" contentStyle={{ width }} …>
```

Correct:

```tsx
<SidePanel onOpenChange={setOpen} open={open} title="Edit customer">…</SidePanel>
```

Source: libs/ui/src/molecules/side-panel.tsx

---
name: unsaved-changes-dialog-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit UnsavedChangesDialog for
  the Save, Discard changes or Stay question asked before unsaved changes are left.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  resources: "references/ux.md ../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  sources: ""
  contributor_sources: "libs/ui/src/molecules/unsaved-changes-dialog.tsx libs/ui/src/tokens/components/molecules/_unsaved-changes-dialog.css libs/ui/stories/molecules/unsaved-changes-dialog.stories.tsx"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit UnsavedChangesDialog Usage

Use UnsavedChangesDialog when the user is about to leave a form with unsaved changes. The app decides when to ask and what each answer does.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `UnsavedChangesDialog`.

**Use it when**

- Closing a SidePanel with an edited form (from `onCloseRequest`).
- Navigating away or switching record while a draft is unsaved.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Confirming a destructive action | Dialog with role="alertdialog" |
| Telling the user a save failed | SaveBar status |

**Do**

- Leave only after Save succeeded or after Discard changes.
- Keep the form open on Stay, Escape or a press outside.

**Don't**

- Ask when nothing is unsaved.
- Save without the user choosing Save.

**Copy and states**

- All words come from the catalog (`unsavedChanges`).

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Molecules/UnsavedChangesDialog → UX guidelines*.

## Setup

```tsx
import { UnsavedChangesDialog } from "@techsio/ui-kit/molecules/unsaved-changes-dialog"

<UnsavedChangesDialog
  canSave={draft.canSave}
  onDiscard={discardAndLeave}
  onSave={saveAndLeave}
  onStay={stay}
  open={asking}
/>
```

Props (from `src/molecules/unsaved-changes-dialog.tsx`):

```text
open: boolean
canSave: boolean
saving?: boolean
onSave: () => void
onDiscard: () => void
onStay: () => void
```

Words the component shows itself come from the `UiMessagesProvider` catalog;
pass `csUiMessages` (`@techsio/ui-kit/messages/ui-messages-cs`) for Czech.

## Common Mistakes

### HIGH Browser confirm

Wrong:

```tsx
if (window.confirm("Discard changes?")) leave()
```

Correct:

```tsx
<UnsavedChangesDialog open={asking} … />
```

Source: libs/ui/src/molecules/unsaved-changes-dialog.tsx

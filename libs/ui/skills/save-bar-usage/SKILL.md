---
name: save-bar-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit SaveBar for
  the save control of an edit form: one Save button with the draft's status, conflict and reload actions.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
resources:
  - "references/ux.md"
sources:
  - "libs/ui/src/molecules/save-bar.tsx"
  - "libs/ui/src/tokens/components/molecules/_save-bar.css"
  - "libs/ui/stories/molecules/save-bar.stories.tsx"
---

# @techsio/ui-kit SaveBar Usage

Use SaveBar as the one save control of an edit form. One click sends one save; nothing else in the form saves.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `SaveBar`.

**Use it when**

- Any form that edits an existing record with explicit save.
- The footer of a SidePanel edit form (last in `actions`).

**Use something else when**

| Need | Use instead |
| --- | --- |
| Confirming leaving with unsaved changes | UnsavedChangesDialog |
| A one-shot create dialog | Dialog with a primary Button |

**Do**

- Drive `status` from the form's draft state.
- Pass `onReloadLatest` so a conflict can be resolved.
- Pass the server's reason as `error` when there is one.

**Don't**

- Save on blur, on a timer or on unmount.
- Add a second Save button to the same form.

**Copy and states**

- All words come from the catalog (`saveBar`); `error` overrides the failure text only.

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Molecules/SaveBar → UX guidelines*.

## Setup

```tsx
import { SaveBar } from "@techsio/ui-kit/molecules/save-bar"

<SaveBar onReloadLatest={reload} onSave={save} status={draft.status} />
```

Props (from `src/molecules/save-bar.tsx`):

```text
status: "idle" | "ready" | "dirty" | "invalid" | "saving" | "saved" | "proposed" | "error" | "conflict" | "reload-required"
onSave: () => void
onReloadLatest?: () => void
onReloadKeepingDrafts?: () => void
error?: ReactNode
size?: "sm" | "md"
```

Words the component shows itself come from the `UiMessagesProvider` catalog;
pass `csUiMessages` (`@techsio/ui-kit/messages/ui-messages-cs`) for Czech.

## Common Mistakes

### HIGH Save button without status

Wrong:

```tsx
<Button onClick={save}>Save</Button>
```

Correct:

```tsx
<SaveBar onSave={save} status={draft.status} />
```

Source: libs/ui/src/molecules/save-bar.tsx

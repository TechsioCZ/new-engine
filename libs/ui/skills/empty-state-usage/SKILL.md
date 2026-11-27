---
name: empty-state-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit EmptyState for
  an empty list or section that says what is missing and offers the one useful next step.
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
  - "libs/ui/src/molecules/empty-state.tsx"
  - "libs/ui/src/tokens/components/molecules/_empty-state.css"
  - "libs/ui/stories/molecules/empty-state.stories.tsx"
---

# @techsio/ui-kit EmptyState Usage

Use EmptyState when a list or section has nothing to show. It says what is missing and offers one next step.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `EmptyState`.

**Use it when**

- A list with no records yet (offer Create).
- Filters that match nothing (offer Clear filters).

**Use something else when**

| Need | Use instead |
| --- | --- |
| An empty DataTable | DataTable's own empty state |
| Loading | Skeleton |
| An error | StatusText or an error Toast with Try again |

**Do**

- Say what is missing in the title (`No invoices yet`).
- Offer exactly one action.

**Don't**

- Show an EmptyState while data is loading.
- Offer several competing actions.

**Copy and states**

- Title: what is missing; description: why, or what happens once something exists.

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Molecules/EmptyState → UX guidelines*.

## Setup

```tsx
import { EmptyState } from "@techsio/ui-kit/molecules/empty-state"

<EmptyState
  action={<Button size="sm">New invoice</Button>}
  description="Invoices appear here once an order is confirmed."
  title="No invoices yet"
/>
```

Props (from `src/molecules/empty-state.tsx`):

```text
title: ReactNode
description?: ReactNode
action?: ReactNode
icon?: IconType
...HTMLAttributes<HTMLDivElement>, ref
```

Words the component shows itself come from the `UiMessagesProvider` catalog;
pass `csUiMessages` (`@techsio/ui-kit/messages/ui-messages-cs`) for Czech.

## Common Mistakes

### HIGH Empty state while loading

Wrong:

```tsx
isLoading ? <EmptyState title="No orders" /> : …
```

Correct:

```tsx
isLoading ? <Skeleton.Text /> : <EmptyState title="No orders" />
```

Source: libs/ui/src/molecules/empty-state.tsx
